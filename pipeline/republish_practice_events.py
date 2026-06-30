"""Re-publish existing DojoPop practice kind-22 events to public relays.

Member uploads from dojopop.live previously only reached relay.dojopop.live.
This script fetches signed events from the DojoPop relay and fan-outs copies
to Yakihonne, Primal, Damus, and nos.lol (no re-signing).

Usage:
    doppler run -- uv run --project pipeline pipeline/republish_practice_events.py
    doppler run -- uv run --project pipeline pipeline/republish_practice_events.py --author <hex-pubkey>
    doppler run -- uv run --project pipeline pipeline/republish_practice_events.py --dry-run
"""

from __future__ import annotations

import argparse
import asyncio
import json
import sys

import websockets

from common import PUBLIC_RELAY, relay_connect_url
from nostr_util import verify_event
from publish_video_event import publish, report

# Match web/src/lib/constants.ts PUBLISH_RELAYS minus DojoPop (source relay).
PUBLIC_FANOUT_RELAYS = [
    "wss://nostr-01.yakihonne.com",
    "wss://relay.primal.net",
    "wss://relay.damus.io",
    "wss://nos.lol",
]

SOURCE_RELAY = PUBLIC_RELAY


async def fetch_practice_events(
    relay: str,
    *,
    author: str | None = None,
    limit: int = 500,
) -> list[dict]:
    filt: dict = {"kinds": [22], "#t": ["proofofpractice"], "limit": limit}
    if author:
        filt["authors"] = [author.lower()]

    events: list[dict] = []
    async with websockets.connect(relay_connect_url(relay)) as ws:
        await ws.send(json.dumps(["REQ", "repub", filt]))
        while True:
            msg = json.loads(await ws.recv())
            if msg[0] == "EOSE":
                break
            if msg[0] == "EVENT":
                events.append(msg[2])

    events.sort(key=lambda e: e.get("created_at", 0))
    return events


def event_title(event: dict) -> str:
    for tag in event.get("tags", []):
        if tag and tag[0] == "title" and len(tag) > 1:
            return tag[1]
    return (event.get("content") or "").split("\n", 1)[0][:60]


def is_dojopop_practice(event: dict) -> bool:
    if event.get("kind") != 22:
        return False
    tags = {t[1].lower() for t in event.get("tags", []) if t and t[0] == "t" and len(t) > 1}
    return "dojopop" in tags and "proofofpractice" in tags


async def fetch_event_by_id(relay: str, event_id: str) -> dict | None:
    async with websockets.connect(relay_connect_url(relay)) as ws:
        await ws.send(json.dumps(["REQ", "probe", {"ids": [event_id]}]))
        while True:
            msg = json.loads(await ws.recv())
            if msg[0] == "EOSE":
                return None
            if msg[0] == "EVENT" and msg[2]["id"] == event_id:
                return msg[2]


async def missing_on_relay(relay: str, event_id: str) -> bool:
    return await fetch_event_by_id(relay, event_id) is None


async def republish_all(
    events: list[dict],
    *,
    dry_run: bool = False,
    relays: list[str] | None = None,
    skip_if_on: str | None = "wss://relay.primal.net",
) -> int:
    targets = relays or PUBLIC_FANOUT_RELAYS
    failures = 0
    skipped = 0
    published = 0
    for i, event in enumerate(events, 1):
        event_id = event["id"]
        title = event_title(event)
        print(f"\n[{i}/{len(events)}] {event_id[:16]}… {title!r}")

        if not verify_event(event):
            print("  SKIP: invalid signature")
            failures += 1
            continue
        if not is_dojopop_practice(event):
            print("  SKIP: not a DojoPop practice event")
            continue

        if skip_if_on and not dry_run:
            if not await missing_on_relay(skip_if_on, event_id):
                print(f"  SKIP: already on {skip_if_on}")
                skipped += 1
                continue

        if dry_run:
            print(f"  [dry-run] would fan out to {len(targets)} relay(s)")
            continue

        results = await publish(event, targets)
        if not report(results):
            print("  ERROR: not accepted on any target relay")
            failures += 1
        else:
            published += 1

    if skipped:
        print(f"\nSkipped {skipped} event(s) already on {skip_if_on}.")
    print(f"Published {published} event(s) to {', '.join(targets)}.")
    return failures


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument(
        "--author",
        help="Only republish events from this pubkey (hex). Default: all DojoPop practice events on the relay.",
    )
    ap.add_argument("--limit", type=int, default=500)
    ap.add_argument(
        "--skip-if-on",
        default="wss://relay.primal.net",
        help="Skip events already present on this relay (default: relay.primal.net).",
    )
    ap.add_argument(
        "--no-skip-existing",
        action="store_true",
        help="Republish even if the event is already on --skip-if-on relay.",
    )
    ap.add_argument(
        "--relay",
        action="append",
        dest="relays",
        help="Target relay(s) for fan-out (repeatable). Default: public fan-out list.",
    )
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    print(f"Fetching kind-22 #proofofpractice from {SOURCE_RELAY}…")
    events = asyncio.run(
        fetch_practice_events(
            SOURCE_RELAY,
            author=args.author,
            limit=args.limit,
        )
    )
    events = [e for e in events if is_dojopop_practice(e)]
    print(f"Found {len(events)} DojoPop practice event(s).")

    if not events:
        print("Nothing to republish.")
        return 0

    failures = asyncio.run(
        republish_all(
            events,
            dry_run=args.dry_run,
            relays=args.relays or PUBLIC_FANOUT_RELAYS,
            skip_if_on=None if args.no_skip_existing else args.skip_if_on,
        )
    )
    if failures:
        print(f"\nFinished with {failures} failure(s).")
        return 1

    print("\nDone. Events should appear on Yakihonne / Primal within a few minutes.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
