"""YouTube Data API v3 upload via OAuth refresh token (outbound DojoPop → YouTube).

This is the **opposite** of `pipeline.py` / `youtube_pubsub.py` (YouTube → Nostr).
Channel creation cannot be done via API alone — create a Brand Account named
"DojoPop" in YouTube Studio first, then store OAuth secrets in Doppler.

Required Doppler secrets (`dojopop` / `prd_zorie`):
  YOUTUBE_CLIENT_ID
  YOUTUBE_CLIENT_SECRET
  YOUTUBE_REFRESH_TOKEN

Optional:
  YOUTUBE_UPLOAD_CHANNEL_ID  — Brand Account UC… id (preferred once known).
    Do **not** reuse `YOUTUBE_CHANNEL_ID` (that is the inbound PubSub source,
    typically the personal/Z0rlord feed).

Bootstrap refresh token (browser, once):
  doppler run -- uv run --project pipeline pipeline/youtube_oauth_bootstrap.py

Upload one file:
  doppler run -- uv run --project pipeline pipeline/youtube_upload.py \\
    --file clip.mp4 --title "Day 42" --description "…" [--privacy private]

List channels the token can manage:
  doppler run -- uv run --project pipeline pipeline/youtube_upload.py --list-channels

Quota: ~1600 units per video insert. Default daily quota is 10_000 → ~6 uploads/day
unless you request a quota increase. Prefer `--limit` on the populate CLI.
"""

from __future__ import annotations

import argparse
import json
import mimetypes
import os
import sys
import time
from pathlib import Path

import httpx

TOKEN_URL = "https://oauth2.googleapis.com/token"
API_BASE = "https://www.googleapis.com/youtube/v3"
UPLOAD_BASE = "https://www.googleapis.com/upload/youtube/v3"

# youtube.upload for inserts; youtube.readonly for channels.list / sanity checks
OAUTH_SCOPES = (
    "https://www.googleapis.com/auth/youtube.upload",
    "https://www.googleapis.com/auth/youtube.readonly",
)

REQUIRED_SECRETS = (
    "YOUTUBE_CLIENT_ID",
    "YOUTUBE_CLIENT_SECRET",
    "YOUTUBE_REFRESH_TOKEN",
)

_SETUP = (
    "YouTube upload not configured. Create a DojoPop Brand Account channel in "
    "YouTube Studio, enable YouTube Data API v3 OAuth, then set "
    "YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN in Doppler "
    "(dojopop / prd_zorie). Run pipeline/youtube_oauth_bootstrap.py once to "
    "obtain the refresh token. See pipeline/README.md § Outbound YouTube."
)


class YouTubeConfigError(RuntimeError):
    """Missing or incomplete OAuth configuration."""


def secrets_present() -> bool:
    return all(os.environ.get(name) for name in REQUIRED_SECRETS)


def require_secrets() -> dict[str, str]:
    missing = [n for n in REQUIRED_SECRETS if not os.environ.get(n)]
    if missing:
        raise YouTubeConfigError(f"{_SETUP} Missing: {', '.join(missing)}")
    return {n: os.environ[n] for n in REQUIRED_SECRETS}


def access_token(*, timeout: float = 30.0) -> str:
    """Exchange YOUTUBE_REFRESH_TOKEN for a short-lived access token."""
    cfg = require_secrets()
    with httpx.Client(timeout=timeout) as client:
        resp = client.post(
            TOKEN_URL,
            data={
                "client_id": cfg["YOUTUBE_CLIENT_ID"],
                "client_secret": cfg["YOUTUBE_CLIENT_SECRET"],
                "refresh_token": cfg["YOUTUBE_REFRESH_TOKEN"],
                "grant_type": "refresh_token",
            },
        )
    if resp.status_code >= 400:
        raise RuntimeError(
            f"OAuth token refresh failed ({resp.status_code}): {resp.text[:400]}"
        )
    data = resp.json()
    token = data.get("access_token")
    if not token:
        raise RuntimeError("OAuth token refresh returned no access_token")
    return token


def list_channels(*, timeout: float = 30.0) -> list[dict]:
    """Return channels the authorized account can manage (Brand + personal)."""
    token = access_token(timeout=timeout)
    with httpx.Client(timeout=timeout) as client:
        resp = client.get(
            f"{API_BASE}/channels",
            params={"part": "id,snippet,contentDetails", "mine": "true"},
            headers={"Authorization": f"Bearer {token}"},
        )
    if resp.status_code >= 400:
        raise RuntimeError(f"channels.list failed ({resp.status_code}): {resp.text[:400]}")
    return list(resp.json().get("items") or [])


def _auth_headers(token: str, extra: dict[str, str] | None = None) -> dict[str, str]:
    headers = {"Authorization": f"Bearer {token}"}
    if extra:
        headers.update(extra)
    return headers


def build_snippet(
    *,
    title: str,
    description: str = "",
    tags: list[str] | None = None,
    category_id: str = "17",  # Sports
) -> dict:
    # Shorts: keep title ≤100 chars; #Shorts helps discovery for ≤60s vertical.
    clean_title = (title or "DojoPop practice").strip()[:100]
    tag_list = list(dict.fromkeys(t.strip() for t in (tags or []) if t and t.strip()))
    return {
        "title": clean_title,
        "description": description.strip()[:5000],
        "tags": tag_list[:500],
        "categoryId": category_id,
    }


def upload_video(
    path: Path,
    *,
    title: str,
    description: str = "",
    tags: list[str] | None = None,
    privacy: str = "private",
    category_id: str = "17",
    notify_subscribers: bool = False,
    timeout: float = 600.0,
) -> dict:
    """Resumable upload of an MP4 (or other video) to the authorized channel.

    Returns the YouTube API video resource (at least id + snippet).
    """
    if not path.is_file():
        raise FileNotFoundError(path)
    if privacy not in ("private", "unlisted", "public"):
        raise ValueError(f"privacy must be private|unlisted|public, got {privacy!r}")

    token = access_token()
    mime = mimetypes.guess_type(path.name)[0] or "video/mp4"
    size = path.stat().st_size
    body = {
        "snippet": build_snippet(
            title=title, description=description, tags=tags, category_id=category_id
        ),
        "status": {
            "privacyStatus": privacy,
            "selfDeclaredMadeForKids": False,
        },
    }

    # Uploads go to the channel selected during OAuth (Brand Account).
    # Set YOUTUBE_UPLOAD_CHANNEL_ID in Doppler for ops clarity; the Data API
    # uses the refresh token's authorized channel as the upload target.
    params = {
        "uploadType": "resumable",
        "part": "snippet,status",
        "notifySubscribers": "true" if notify_subscribers else "false",
    }

    init_headers = _auth_headers(
        token,
        {
            "Content-Type": "application/json; charset=UTF-8",
            "X-Upload-Content-Length": str(size),
            "X-Upload-Content-Type": mime,
        },
    )

    with httpx.Client(timeout=httpx.Timeout(60.0, write=timeout, read=timeout)) as client:
        init = client.post(
            f"{UPLOAD_BASE}/videos",
            params=params,
            headers=init_headers,
            content=json.dumps(body),
        )
        if init.status_code not in (200, 201):
            raise RuntimeError(
                f"resumable upload init failed ({init.status_code}): {init.text[:500]}"
            )
        location = init.headers.get("Location")
        if not location:
            raise RuntimeError("resumable upload init missing Location header")

        # Single-request PUT for files under typical practice sizes (<50MB).
        # For larger masters, chunked upload can be added later.
        with path.open("rb") as fh:
            put = client.put(
                location,
                headers=_auth_headers(
                    token,
                    {
                        "Content-Type": mime,
                        "Content-Length": str(size),
                    },
                ),
                content=fh,
            )
        if put.status_code not in (200, 201):
            raise RuntimeError(
                f"resumable upload PUT failed ({put.status_code}): {put.text[:500]}"
            )
        return put.json()


def post_youtube(text: str, media: Path | None = None) -> dict:
    """social_post.py adapter. Requires video media + OAuth secrets."""
    if not secrets_present():
        raise NotImplementedError(_SETUP)
    if media is None:
        raise NotImplementedError("YouTube upload requires --media (video file).")
    result = upload_video(
        media,
        title=(text.strip().split("\n", 1)[0] or media.stem)[:100],
        description=text,
        tags=["dojopop", "proofofpractice", "Shorts"],
        privacy=os.environ.get("YOUTUBE_DEFAULT_PRIVACY", "private"),
    )
    return {
        "video_id": result.get("id"),
        "title": (result.get("snippet") or {}).get("title"),
        "url": f"https://www.youtube.com/watch?v={result.get('id')}" if result.get("id") else None,
    }


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--file", type=Path, help="Local video file to upload")
    ap.add_argument("--title", default="", help="Video title (default: file stem)")
    ap.add_argument("--description", default="", help="Video description")
    ap.add_argument(
        "--tag",
        action="append",
        dest="tags",
        default=None,
        help="Tag (repeatable). Default: dojopop, proofofpractice, Shorts",
    )
    ap.add_argument(
        "--privacy",
        choices=("private", "unlisted", "public"),
        default="private",
        help="Privacy status (default: private — safe for first backfill)",
    )
    ap.add_argument(
        "--list-channels",
        action="store_true",
        help="List channels for this OAuth token (no upload)",
    )
    ap.add_argument("--dry-run", action="store_true", help="Validate secrets/file only")
    args = ap.parse_args()

    if args.list_channels:
        try:
            channels = list_channels()
        except YouTubeConfigError as exc:
            print(exc, file=sys.stderr)
            return 2
        if not channels:
            print("No channels returned. Create a YouTube channel / Brand Account first.")
            return 1
        for ch in channels:
            sn = ch.get("snippet") or {}
            print(f"{ch.get('id')}\t{sn.get('title')}\t{sn.get('customUrl') or ''}")
        return 0

    if not args.file:
        ap.error("--file is required unless --list-channels")

    if not secrets_present():
        print(_SETUP, file=sys.stderr)
        return 2

    title = args.title or args.file.stem
    tags = args.tags or ["dojopop", "proofofpractice", "Shorts"]
    print(f"file: {args.file} ({args.file.stat().st_size} bytes)")
    print(f"title: {title!r}")
    print(f"privacy: {args.privacy}")
    print(f"tags: {tags}")

    if args.dry_run:
        # Prove token works without burning upload quota.
        try:
            channels = list_channels()
            print(f"[dry-run] OAuth OK — {len(channels)} channel(s) visible")
            for ch in channels:
                sn = ch.get("snippet") or {}
                print(f"  {ch.get('id')}\t{sn.get('title')}")
        except Exception as exc:
            print(f"[dry-run] OAuth check failed: {exc}", file=sys.stderr)
            return 1
        print("[dry-run] would upload (not sent)")
        return 0

    try:
        result = upload_video(
            args.file,
            title=title,
            description=args.description,
            tags=tags,
            privacy=args.privacy,
        )
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1

    vid = result.get("id")
    print(json.dumps({"video_id": vid, "url": f"https://www.youtube.com/watch?v={vid}"}, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
