"""Wiki accounts + server-side curriculum progress.

Sign-in is Firebase Auth (project `dojopop`, the same project the KIWAMI app uses),
so one Firebase UID identifies a person across the wiki and the app. This module
verifies the Firebase ID token the browser sends and stores which Learn steps the
account has passed, in the app's Neon Postgres under a separate `wiki` schema.

Merge-ready by design:
  * `wiki.accounts.uid` is the Firebase UID. KIWAMI's `Student.firebaseUid` holds the
    same value, so wiki and app accounts join on it with no migration.
  * `wiki.accounts.email` / `provider` are kept so accounts created with different
    providers can be matched by verified email later.
  * `wiki.accounts.merged_into` is reserved for pointing one UID at another.

Environment:
  WIKI_DATABASE_URL (or TENSHINRYU_DATABASE_URL)  Postgres connection string
  FIREBASE_PROJECT_ID                             default "dojopop"
"""

from __future__ import annotations

import os
import re
import threading
import time
from typing import Any

import httpx
import jwt
from cryptography import x509
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

router = APIRouter()

FIREBASE_PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID", "dojopop")
CERTS_URL = (
    "https://www.googleapis.com/robot/v1/metadata/x509/"
    "securetoken@system.gserviceaccount.com"
)

# Track id -> number of steps. Mirrors data-track / data-total in wiki/*/learn/*.md.
TRACKS: dict[str, int] = {
    "foundations": 21,
    "foundations-ja": 21,
    "foundations-de": 21,
    "foundations-el": 21,
    "foundations-es": 21,
    "foundations-fr": 21,
    "foundations-it": 21,
    "den-no-ichi-i": 14,
}

SCHEMA_SQL = """
CREATE SCHEMA IF NOT EXISTS wiki;
CREATE TABLE IF NOT EXISTS wiki.accounts (
  uid          text PRIMARY KEY,
  email        text,
  email_verified boolean NOT NULL DEFAULT false,
  provider     text,
  display_name text,
  merged_into  text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS wiki_accounts_email_idx ON wiki.accounts (lower(email));
CREATE TABLE IF NOT EXISTS wiki.progress (
  uid       text NOT NULL,
  track     text NOT NULL,
  step      integer NOT NULL CHECK (step >= 1),
  passed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (uid, track, step)
);
"""

_schema_ready = False
_schema_lock = threading.Lock()


def _db_url() -> str:
    return os.getenv("WIKI_DATABASE_URL") or os.getenv("TENSHINRYU_DATABASE_URL") or ""


def _connect():
    import psycopg

    url = _db_url()
    if not url:
        raise HTTPException(503, "Accounts are not configured on this server.")
    try:
        conn = psycopg.connect(url, connect_timeout=10, autocommit=False)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(503, "Progress store unavailable.") from exc
    global _schema_ready
    if not _schema_ready:
        with _schema_lock:
            if not _schema_ready:
                with conn.cursor() as cur:
                    cur.execute(SCHEMA_SQL)
                conn.commit()
                _schema_ready = True
    return conn


# ---------------------------------------------------------------- Firebase tokens

_certs: dict[str, Any] = {"keys": {}, "expires": 0.0}
_certs_lock = threading.Lock()


def _load_certs(force: bool = False) -> dict[str, Any]:
    now = time.time()
    with _certs_lock:
        if not force and _certs["keys"] and now < _certs["expires"]:
            return _certs["keys"]
        resp = httpx.get(CERTS_URL, timeout=10)
        resp.raise_for_status()
        max_age = 3600
        m = re.search(r"max-age=(\d+)", resp.headers.get("cache-control", ""))
        if m:
            max_age = int(m.group(1))
        keys = {
            kid: x509.load_pem_x509_certificate(pem.encode()).public_key()
            for kid, pem in resp.json().items()
        }
        _certs["keys"] = keys
        _certs["expires"] = now + max_age
        return keys


def verify_firebase_token(token: str) -> dict[str, Any]:
    """Return the verified claims, or raise HTTP 401."""
    try:
        header = jwt.get_unverified_header(token)
        if header.get("alg") != "RS256" or not header.get("kid"):
            raise ValueError("bad header")
        keys = _load_certs()
        key = keys.get(header["kid"])
        if key is None:
            key = _load_certs(force=True).get(header["kid"])
        if key is None:
            raise ValueError("unknown key id")
        claims = jwt.decode(
            token,
            key,
            algorithms=["RS256"],
            audience=FIREBASE_PROJECT_ID,
            issuer=f"https://securetoken.google.com/{FIREBASE_PROJECT_ID}",
            options={"require": ["exp", "iat", "aud", "iss", "sub"]},
        )
        if not claims.get("sub"):
            raise ValueError("no subject")
        return claims
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(401, "Sign in again.") from exc


def _claims(authorization: str | None) -> dict[str, Any]:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "Sign in required.")
    return verify_firebase_token(authorization[7:].strip())


# ------------------------------------------------------------------- data layer


def _touch_account(cur, claims: dict[str, Any]) -> None:
    firebase = claims.get("firebase") or {}
    cur.execute(
        """
        INSERT INTO wiki.accounts (uid, email, email_verified, provider, display_name)
        VALUES (%s, %s, %s, %s, %s)
        ON CONFLICT (uid) DO UPDATE SET
          email = COALESCE(EXCLUDED.email, wiki.accounts.email),
          email_verified = EXCLUDED.email_verified OR wiki.accounts.email_verified,
          provider = COALESCE(EXCLUDED.provider, wiki.accounts.provider),
          display_name = COALESCE(EXCLUDED.display_name, wiki.accounts.display_name),
          last_seen_at = now()
        """,
        (
            claims["sub"],
            claims.get("email"),
            bool(claims.get("email_verified")),
            firebase.get("sign_in_provider"),
            claims.get("name"),
        ),
    )


def _passed(cur, uid: str, track: str) -> list[int]:
    cur.execute(
        "SELECT step FROM wiki.progress WHERE uid = %s AND track = %s ORDER BY step",
        (uid, track),
    )
    return [r[0] for r in cur.fetchall()]


def _check_track(track: str) -> int:
    if track not in TRACKS:
        raise HTTPException(404, "Unknown track.")
    return TRACKS[track]


class StepBody(BaseModel):
    track: str = Field(min_length=1, max_length=40)
    step: int = Field(ge=1, le=200)


class ImportBody(BaseModel):
    track: str = Field(min_length=1, max_length=40)
    passed: list[int] = Field(default_factory=list, max_length=200)


# --------------------------------------------------------------------- endpoints


@router.get("/api/progress")
def get_progress(track: str, authorization: str | None = Header(default=None)):
    claims = _claims(authorization)
    total = _check_track(track)
    conn = _connect()
    try:
        with conn.cursor() as cur:
            _touch_account(cur, claims)
            passed = _passed(cur, claims["sub"], track)
        conn.commit()
    finally:
        conn.close()
    return {"track": track, "total": total, "passed": passed}


@router.post("/api/progress")
def pass_step(body: StepBody, authorization: str | None = Header(default=None)):
    """Record a passed step. A step opens only after the one before it is passed."""
    claims = _claims(authorization)
    total = _check_track(body.track)
    if body.step > total:
        raise HTTPException(400, "Step out of range.")
    conn = _connect()
    try:
        with conn.cursor() as cur:
            _touch_account(cur, claims)
            passed = _passed(cur, claims["sub"], body.track)
            if body.step != 1 and (body.step - 1) not in passed and body.step not in passed:
                raise HTTPException(409, "Pass the previous step first.")
            cur.execute(
                "INSERT INTO wiki.progress (uid, track, step) VALUES (%s, %s, %s) "
                "ON CONFLICT DO NOTHING",
                (claims["sub"], body.track, body.step),
            )
            passed = _passed(cur, claims["sub"], body.track)
        conn.commit()
    finally:
        conn.close()
    return {"track": body.track, "total": total, "passed": passed}


@router.post("/api/progress/import")
def import_progress(body: ImportBody, authorization: str | None = Header(default=None)):
    """One-time carry-over of progress earned on this device before accounts existed.

    Only the unbroken run of steps starting at 1 is accepted, because that is the
    only state the quiz flow can produce.
    """
    claims = _claims(authorization)
    total = _check_track(body.track)
    wanted = set(s for s in body.passed if 1 <= s <= total)
    run: list[int] = []
    n = 1
    while n in wanted:
        run.append(n)
        n += 1
    conn = _connect()
    try:
        with conn.cursor() as cur:
            _touch_account(cur, claims)
            for step in run:
                cur.execute(
                    "INSERT INTO wiki.progress (uid, track, step) VALUES (%s, %s, %s) "
                    "ON CONFLICT DO NOTHING",
                    (claims["sub"], body.track, step),
                )
            passed = _passed(cur, claims["sub"], body.track)
        conn.commit()
    finally:
        conn.close()
    return {"track": body.track, "total": total, "passed": passed}


@router.delete("/api/progress")
def reset_progress(track: str, authorization: str | None = Header(default=None)):
    claims = _claims(authorization)
    total = _check_track(track)
    conn = _connect()
    try:
        with conn.cursor() as cur:
            _touch_account(cur, claims)
            cur.execute(
                "DELETE FROM wiki.progress WHERE uid = %s AND track = %s",
                (claims["sub"], track),
            )
        conn.commit()
    finally:
        conn.close()
    return {"track": track, "total": total, "passed": []}
