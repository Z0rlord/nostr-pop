"""Delete a mistaken DojoPop practice video (kind 22) via NIP-09 kind 5.

Usage:
    doppler run -- uv run --project pipeline pipeline/delete_practice_event.py \\
        --event-id 43e6942f27931201c109a33bc445de06103e4e13f108c3d948fb3c246f2ec5b3 \\
        --reason "wrong video — Day 1314 clip posted as Day 1315"
"""

from __future__ import annotations

import argparse
import asyncio
import json
import sys

import websockets

from common import DEFAULT_RELAYS, relay_connect_url
from nostr_util import Signer, verify_event
from publish_video_event import publish, report


async def fetch_event(relay: str, event_id: str) -> dict | None:
    async with websockets.connect(relay_connect_url(relay)) as ws:
        await ws.send(json.dumps(["REQ", "x", {"ids": [event_id]}]))
        while True:
            msg = json.loads(await ws.recv())
            if msg[0] == "EOSE":
                return None
            if msg[0] == "EVENT" and msg[2]["id"] == event_id:
                return msg[2]


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--event-id", required=True)
    ap.add_argument("--reason", default="posted in error")
    ap.add_argument("--relay", default=DEFAULT_RELAYS[0])
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    signer = Signer.from_env()
    event_id = args.event_id.lower()

    print(f"Fetching {event_id[:16]}…")
    old = asyncio.run(fetch_event(args.relay, event_id))
    if not old:
        print("Event not found on relay.")
        return 1

    title = next((t[1] for t in old["tags"] if t[0] == "title"), old.get("content", ""))
    print(f"  title: {title!r}")
    print(f"  kind: {old['kind']}")

    delete_event = signer.sign_event(
        kind=5,
        content=args.reason,
        tags=[["e", event_id], ["k", str(old["kind"])]],
    )
    assert verify_event(delete_event)

    if args.dry_run:
        print(f"[dry-run] would publish kind-5 {delete_event['id'][:16]}…")
        return 0

    print(f"Publishing kind-5 deletion {delete_event['id'][:16]}…")
    results = asyncio.run(publish(delete_event, DEFAULT_RELAYS))
    if not report(results):
        print("ERROR: deletion not accepted on any relay")
        return 1

    print("Done. The video should drop from the feed within a minute.")
    print("Re-upload the correct Day 1315 clip at My practice when ready.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
