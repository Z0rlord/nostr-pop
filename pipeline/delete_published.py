"""Retract published videos: NIP-09 deletion events + Blossom blob deletes.

For each given YouTube id (must exist in data/published.json):
  1. publishes a signed kind-5 deletion event (["e", <event id>], ["k", <kind>],
     content = reason) to all relays,
  2. deletes the video + thumbnail blobs from the Blossom server via
     BUD-02 DELETE /<sha256> with a kind-24242 auth event (t=delete),
  3. removes the entry from data/published.json.

Usage:
    doppler run -- uv run --project pipeline pipeline/delete_published.py \
        --yt-id <id> [--yt-id <id> ...] [--reason "posted in error"] [--dry-run]
"""

from __future__ import annotations

import argparse
import asyncio
import re
import sys
import time

import httpx

from blossom_upload import auth_header
from common import DEFAULT_BLOSSOM, DEFAULT_RELAYS, load_state, save_state
from nostr_util import Signer, verify_event
from publish_video_event import publish, report


def build_delete_auth(signer: Signer, sha256: str, reason: str) -> dict:
    tags = [
        ["t", "delete"],
        ["x", sha256],
        ["expiration", str(int(time.time()) + 600)],
    ]
    event = signer.sign_event(kind=24242, content=reason, tags=tags)
    assert verify_event(event)
    return event


def delete_blob(signer: Signer, server: str, sha256: str, reason: str) -> tuple[bool, str]:
    auth = build_delete_auth(signer, sha256, reason)
    resp = httpx.delete(
        f"{server.rstrip('/')}/{sha256}",
        headers={"Authorization": auth_header(auth)},
        timeout=60,
    )
    ok = resp.status_code in (200, 204, 404)  # 404 = already gone
    return ok, f"HTTP {resp.status_code}"


def sha_from_url(url: str) -> str | None:
    m = re.search(r"/([0-9a-f]{64})(?:\.\w+)?$", url or "")
    return m.group(1) if m else None


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--yt-id", action="append", dest="yt_ids", required=True)
    ap.add_argument("--reason", default="posted in error")
    ap.add_argument("--server", default=DEFAULT_BLOSSOM)
    ap.add_argument("--relay", action="append", dest="relays", default=None)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    signer = Signer.from_env()
    relays = args.relays or DEFAULT_RELAYS
    state = load_state()

    failures = 0
    for yt_id in args.yt_ids:
        entry = state.get(yt_id)
        if not entry:
            print(f"{yt_id}: not in published.json — skipping")
            continue
        print(f"\n=== retracting {yt_id}: {entry['title']!r} ===")

        delete_event = signer.sign_event(
            kind=5,
            content=args.reason,
            tags=[["e", entry["event_id"]], ["k", str(entry.get("kind", 22))]],
        )
        assert verify_event(delete_event)

        if args.dry_run:
            print(f"  [dry-run] would publish kind-5 {delete_event['id'][:16]}… and delete blobs")
            continue

        print(f"  publishing kind-5 {delete_event['id']} to {len(relays)} relays:")
        results = asyncio.run(publish(delete_event, relays))
        if not report(results):
            failures += 1
            print("  WARNING: no relay accepted the deletion event")

        for label, url in (("video", entry.get("video_url")), ("thumb", entry.get("thumb_url"))):
            sha = sha_from_url(url)
            if not sha:
                continue
            ok, msg = delete_blob(signer, args.server, sha, args.reason)
            print(f"  blossom delete {label} {sha[:16]}…: {msg}{'' if ok else ' FAILED'}")
            if not ok:
                failures += 1

        del state[yt_id]
        save_state(state)
        print(f"  removed from published.json")

    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
