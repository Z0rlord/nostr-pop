"""Mirror DojoPop kind-22 practice videos as kind-1 notes for Primal media tab.

Primal profile → Media uses feed spec user_media_thumbnails (kind 1 + imeta),
not NIP-71 kind 22. For each practice event on relay.dojopop.live, publish a
signed kind-1 note referencing the video imeta unless a mirror already exists.

Usage:
    doppler run -- uv run --project pipeline pipeline/mirror_practice_for_primal.py
    doppler run -- uv run --project pipeline pipeline/mirror_practice_for_primal.py --dry-run
"""

from __future__ import annotations

import argparse
import asyncio
import json
import sys

import websockets

from common import PUBLIC_RELAY, relay_connect_url
from nostr_util import Signer, verify_event
from publish_video_event import publish, report

SOURCE_RELAY = PUBLIC_RELAY
APP_URL = "https://dojopop.live"
MIRROR_RELAYS = [
    "wss://relay.primal.net",
    "wss://relay.dojopop.live",
    "wss://nostr-01.yakihonne.com",
    "wss://relay.damus.io",
    "wss://nos.lol",
]


def tag_value(tags: list[list[str]], name: str) -> str | None:
    for tag in tags:
        if tag and tag[0] == name and len(tag) > 1:
            return tag[1]
    return None


def tag_values(tags: list[list[str]], name: str) -> list[str]:
    return [t[1] for t in tags if t and t[0] == name and len(t) > 1]


def imeta_parts(tags: list[list[str]]) -> dict[str, str]:
    for tag in tags:
        if not tag or tag[0] != "imeta":
            continue
        out: dict[str, str] = {}
        for part in tag[1:]:
            sp = part.find(" ")
            if sp <= 0:
                continue
            out[part[:sp]] = part[sp + 1 :]
        return out
    return {}


def is_dojopop_practice(event: dict) -> bool:
    if event.get("kind") != 22:
        return False
    tags = {t.lower() for t in tag_values(event.get("tags", []), "t")}
    return "dojopop" in tags and "proofofpractice" in tags


def share_url(event_id: str) -> str:
    return f"{APP_URL}/v/{event_id}"


def build_mirror_event(signer: Signer, source: dict) -> dict:
    src_tags = source["tags"]
    title = tag_value(src_tags, "title") or source.get("content", "").split("\n", 1)[0]
    meta = imeta_parts(src_tags)
    video_url = meta.get("url")
    if not video_url:
        raise ValueError(f"missing imeta url on {source['id'][:16]}")

    imeta: list[str] = ["imeta", f"url {video_url}"]
    for key in ("x", "m", "duration", "dim", "image"):
        if meta.get(key):
            imeta.append(f"{key} {meta[key]}")

    hashtags = tag_values(src_tags, "t")
    tags: list[list[str]] = [
        ["e", source["id"], "", "root"],
        ["k", "22"],
        imeta,
        ["alt", tag_value(src_tags, "alt") or f"Practice video: {title}"],
    ]
    for tag in hashtags:
        tags.append(["t", tag])
    tags.append(["t", "dojopop-mirror"])

    content = f"{title}\n{share_url(source['id'])}"
    event = signer.sign_event(kind=1, content=content, tags=tags)
    assert verify_event(event)
    return event


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
        await ws.send(json.dumps(["REQ", "mirror", filt]))
        while True:
            msg = json.loads(await ws.recv())
            if msg[0] == "EOSE":
                break
            if msg[0] == "EVENT":
                events.append(msg[2])
    events.sort(key=lambda e: e.get("created_at", 0))
    return events


async def fetch_existing_mirrors(relay: str, author: str) -> set[str]:
    """Return kind-22 event ids that already have a kind-1 mirror."""
    mirrored: set[str] = set()
    async with websockets.connect(relay_connect_url(relay)) as ws:
        await ws.send(
            json.dumps(
                [
                    "REQ",
                    "mir",
                    {"kinds": [1], "authors": [author.lower()], "#t": ["dojopop-mirror"], "limit": 500},
                ]
            )
        )
        while True:
            msg = json.loads(await ws.recv())
            if msg[0] == "EOSE":
                break
            if msg[0] != "EVENT":
                continue
            for tag in msg[2].get("tags", []):
                if tag and tag[0] == "e" and len(tag) > 1:
                    mirrored.add(tag[1])
    return mirrored


async def main_async(args: argparse.Namespace) -> int:
    signer = Signer.from_env()
    author = args.author or signer.pubkey_hex

    print(f"Fetching kind-22 practice events from {SOURCE_RELAY}…")
    practice = [
        e for e in await fetch_practice_events(SOURCE_RELAY, author=author, limit=args.limit)
        if is_dojopop_practice(e)
    ]
    print(f"Found {len(practice)} practice event(s) for {author[:16]}…")

    existing = await fetch_existing_mirrors(SOURCE_RELAY, author)
    print(f"Existing kind-1 mirrors: {len(existing)}")

    created = 0
    skipped = 0
    failures = 0

    for i, src in enumerate(practice, 1):
        title = tag_value(src["tags"], "title") or src["id"][:16]
        if src["id"] in existing:
            print(f"[{i}/{len(practice)}] SKIP mirror exists for {title!r}")
            skipped += 1
            continue

        print(f"\n[{i}/{len(practice)}] Mirror {src['id'][:16]}… {title!r}")
        try:
            mirror = build_mirror_event(signer, src)
        except ValueError as exc:
            print(f"  SKIP: {exc}")
            failures += 1
            continue

        if args.dry_run:
            print(f"  [dry-run] would publish kind-1 {mirror['id'][:16]}…")
            created += 1
            continue

        results = await publish(mirror, MIRROR_RELAYS)
        if report(results):
            created += 1
        else:
            print("  ERROR: mirror not accepted")
            failures += 1

    print(f"\nMirrors created: {created}, skipped: {skipped}, failures: {failures}")
    if failures:
        return 1
    print("Primal profile Media tab should populate after cache refresh (minutes).")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--author", help="Pubkey hex (default: NOSTR_NSEC author)")
    ap.add_argument("--limit", type=int, default=500)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    return asyncio.run(main_async(args))


if __name__ == "__main__":
    sys.exit(main())
