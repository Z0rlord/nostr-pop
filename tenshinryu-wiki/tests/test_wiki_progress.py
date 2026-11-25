"""Progress API: token verification + step rules, against a throwaway Postgres.

Skipped unless `pgserver` and `cryptography` are importable (dev-only deps).
"""
import sys
import time
from pathlib import Path

import pytest

pgserver = pytest.importorskip("pgserver")
pytest.importorskip("cryptography")
import jwt  # noqa: E402
from cryptography.hazmat.primitives import serialization  # noqa: E402
from cryptography.hazmat.primitives.asymmetric import rsa  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))

PROJECT = "dojopop"


@pytest.fixture(scope="module")
def env(tmp_path_factory):
    import os

    pg = pgserver.get_server(tmp_path_factory.mktemp("pg"))
    os.environ["WIKI_DATABASE_URL"] = pg.get_uri()
    import wiki_progress

    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    wiki_progress._certs.update(
        keys={"kid1": key.public_key()}, expires=time.time() + 3600
    )
    pem = key.private_bytes(
        serialization.Encoding.PEM,
        serialization.PrivateFormat.PKCS8,
        serialization.NoEncryption(),
    )
    from fastapi import FastAPI

    app = FastAPI()
    app.include_router(wiki_progress.router)
    yield TestClient(app), pem
    pg.cleanup()


def token(pem, uid="u1", aud=PROJECT, exp=3600, **extra):
    now = int(time.time())
    claims = {
        "sub": uid,
        "aud": aud,
        "iss": f"https://securetoken.google.com/{aud}",
        "iat": now,
        "exp": now + exp,
        "email": f"{uid}@example.com",
        "email_verified": True,
        "firebase": {"sign_in_provider": "google.com"},
    }
    claims.update(extra)
    return jwt.encode(claims, pem, algorithm="RS256", headers={"kid": "kid1"})


def auth(pem, **kw):
    return {"Authorization": f"Bearer {token(pem, **kw)}"}


def test_requires_token(env):
    client, pem = env
    assert client.get("/api/progress?track=foundations").status_code == 401
    bad = {"Authorization": "Bearer nonsense"}
    assert client.get("/api/progress?track=foundations", headers=bad).status_code == 401
    wrong_aud = auth(pem, aud="someone-else")
    assert client.get("/api/progress?track=foundations", headers=wrong_aud).status_code == 401
    expired = auth(pem, exp=-10)
    assert client.get("/api/progress?track=foundations", headers=expired).status_code == 401


def test_step_rules(env):
    client, pem = env
    h = auth(pem, uid="alice")
    r = client.get("/api/progress?track=foundations", headers=h)
    assert r.status_code == 200 and r.json()["passed"] == []
    assert client.post("/api/progress", json={"track": "foundations", "step": 2}, headers=h).status_code == 409
    r = client.post("/api/progress", json={"track": "foundations", "step": 1}, headers=h)
    assert r.json()["passed"] == [1]
    r = client.post("/api/progress", json={"track": "foundations", "step": 2}, headers=h)
    assert r.json()["passed"] == [1, 2]
    # idempotent
    r = client.post("/api/progress", json={"track": "foundations", "step": 2}, headers=h)
    assert r.json()["passed"] == [1, 2]
    assert client.post("/api/progress", json={"track": "foundations", "step": 22}, headers=h).status_code == 400
    assert client.get("/api/progress?track=nope", headers=h).status_code == 404


def test_isolated_per_account_and_track(env):
    client, pem = env
    bob = auth(pem, uid="bob")
    assert client.get("/api/progress?track=foundations", headers=bob).json()["passed"] == []
    client.post("/api/progress", json={"track": "den-no-ichi-i", "step": 1}, headers=bob)
    assert client.get("/api/progress?track=foundations", headers=bob).json()["passed"] == []
    assert client.get("/api/progress?track=den-no-ichi-i", headers=bob).json()["passed"] == [1]


def test_import_only_unbroken_run(env):
    client, pem = env
    h = auth(pem, uid="carol")
    r = client.post("/api/progress/import", json={"track": "foundations", "passed": [1, 2, 3, 5, 9, 99]}, headers=h)
    assert r.json()["passed"] == [1, 2, 3]


def test_reset_and_account_row(env):
    client, pem = env
    h = auth(pem, uid="dave")
    client.post("/api/progress", json={"track": "foundations", "step": 1}, headers=h)
    r = client.delete("/api/progress?track=foundations", headers=h)
    assert r.json()["passed"] == []
    import wiki_progress

    conn = wiki_progress._connect()
    with conn.cursor() as cur:
        cur.execute("select email, provider from wiki.accounts where uid='dave'")
        assert cur.fetchone() == ("dave@example.com", "google.com")
    conn.close()
