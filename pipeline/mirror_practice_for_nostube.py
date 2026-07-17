"""Mirror DojoPop member kind-22 practice videos to the nostu.be account.

nostu.be indexes NIP-71 kind 22 (shorts) from public relays. For each practice
event on relay.dojopop.live, publish a kind-22 repost signed by DOJOPOP_LOGIN_NSEC
(login-bot; same identity used for DM login) unless a #dojopop-nostube mirror
already references the source event under the canonical login-bot pubkey.

Usage:
    doppler run -- uv run --project pipeline pipeline/mirror_practice_for_nostube.py
    doppler run -- uv run --project pipeline pipeline/mirror_practice_for_nostube.py --dry-run
"""

from __future__ import annotations

import argparse
import asyncio
import json
import sys

import websockets

from common import PRIMARY_RELAY, PUBLIC_RELAY, relay_connect_url
from nostr_util import Signer, hex_to_npub, verify_event
from publish_video_event import publish, report

SOURCE_RELAY = PRIMARY_RELAY
APP_URL = "https://dojopop.live"
MIRROR_TAG = "dojopop-nostube"
# Canonical nostu.be account (DOJOPOP_LOGIN_NSEC / login-bot).
CANONICAL_LOGIN_PUBKEY = (
    "58d5fd86797cc2914e7be0e76583ab293af5dd35bc0da15b77d92d093bec417c"
)
NOSTU_RELAYS = [
    PRIMARY_RELAY,
    PUBLIC_RELAY,
    "wss://relay.primal.net",
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


def is_dojopop_practice(event: dict) -> bool:
    if event.get("kind") != 22:
        return False
    tags = {t.lower() for t in tag_values(event.get("tags", []), "t")}
    if MIRROR_TAG in tags:
        return False
    return "dojopop" in tags and "proofofpractice" in tags


def share_url(event_id: str) -> str:
    return f"{APP_URL}/v/{event_id}"


def build_nostube_mirror_event(signer: Signer, source: dict) -> dict:
    src_tags = source["tags"]
    imeta = [list(t) for t in src_tags if t and t[0] == "imeta"]
    if not imeta:
        raise ValueError(f"missing imeta on {source['id'][:16]}")

    title = tag_value(src_tags, "title") or source.get("content", "").split("\n", 1)[0]
    tags: list[list[str]] = [
        ["title", title or "Practice session"],
        *imeta,
        ["e", source["id"], "", "root"],
        ["p", source["pubkey"]],
        ["k", "22"],
    ]

    for name in ("duration", "published_at", "alt"):
        for tag in src_tags:
            if tag and tag[0] == name:
                tags.append(list(tag))
                break

    hashtags = {t.lower() for t in tag_values(src_tags, "t")}
    hashtags.add(MIRROR_TAG)
    for tag in sorted(hashtags):
        tags.append(["t", tag])

    author_npub = hex_to_npub(source["pubkey"])
    content = f"{title}\n{share_url(source['id'])}\nPractice by {author_npub}"

    event = signer.sign_event(kind=22, content=content, tags=tags)
    assert verify_event(event)
    return event


async def _req_events(relay: str, filt: dict) -> list[dict]:
    events: list[dict] = []
    async with websockets.connect(
        relay_connect_url(relay),
        open_timeout=20,
        ping_interval=20,
        ping_timeout=20,
        close_timeout=5,
    ) as ws:
        await ws.send(json.dumps(["REQ", "nostu", filt]))
        while True:
            msg = json.loads(await asyncio.wait_for(ws.recv(), timeout=120))
            if msg[0] == "EOSE":
                break
            if msg[0] == "EVENT":
                events.append(msg[2])
    return events


async def fetch_practice_events(relay: str, *, limit: int = 500) -> list[dict]:
    filt: dict = {"kinds": [22], "#t": ["proofofpractice"], "limit": limit}
    events = await _req_events(relay, filt)
    events.sort(key=lambda e: e.get("created_at", 0))
    return events


async def fetch_existing_mirrors(relay: str, author: str) -> set[str]:
    """Source event ids already mirrored by `author` (#dojopop-nostube + e)."""
    mirrored: set[str] = set()
    events = await _req_events(
        relay,
        {
            "kinds": [22],
            "authors": [author.lower()],
            "#t": [MIRROR_TAG],
            "limit": 500,
        },
    )
    for event in events:
        for tag in event.get("tags", []):
            if tag and tag[0] == "e" and len(tag) > 1:
                mirrored.add(tag[1])
    return mirrored


async def login_mirror_exists(relay: str, source_event_id: str) -> bool:
    """True if canonical login-bot already mirrored this source."""
    events = await _req_events(
        relay,
        {
            "kinds": [22],
            "authors": [CANONICAL_LOGIN_PUBKEY],
            "#e": [source_event_id],
            "#t": [MIRROR_TAG],
            "limit": 5,
        },
    )
    return any(e.get("pubkey") == CANONICAL_LOGIN_PUBKEY for e in events)


def nostube_signer() -> Signer:
    # Primary: login-bot. Admin keys are transition-only fallbacks.
    return Signer.from_env_preferred(
        "DOJOPOP_LOGIN_NSEC",
        "DOJOPOP_ADMIN_NSEC",
        "DOJO_ADMIN_PRIVATE_KEY",
    )


async def main_async(args: argparse.Namespace) -> int:
    signer = nostube_signer()
    author = signer.pubkey_hex

    print(f"Fetching kind-22 practice events from {SOURCE_RELAY}…", flush=True)
    practice = [
        e
        for e in await fetch_practice_events(SOURCE_RELAY, limit=args.limit)
        if is_dojopop_practice(e)
    ]
    print(f"Found {len(practice)} practice event(s)", flush=True)

    # Always dedupe against LOGIN (canonical nostu.be), not only the active signer.
    existing = await fetch_existing_mirrors(PUBLIC_RELAY, CANONICAL_LOGIN_PUBKEY)
    print(f"Existing LOGIN nostu.be mirrors: {len(existing)}", flush=True)
    print(f"Signing as {author[:16]}… (canonical LOGIN={CANONICAL_LOGIN_PUBKEY[:16]}…)", flush=True)

    created = skipped = failures = 0

    for i, src in enumerate(practice, 1):
        title = tag_value(src["tags"], "title") or src["id"][:16]
        if src["id"] in existing:
            print(f"[{i}/{len(practice)}] SKIP mirror exists for {title!r}", flush=True)
            skipped += 1
            continue

        print(f"\n[{i}/{len(practice)}] Mirror {src['id'][:16]}… {title!r}", flush=True)
        try:
            mirror = build_nostube_mirror_event(signer, src)
        except ValueError as exc:
            print(f"  SKIP: {exc}", flush=True)
            failures += 1
            continue

        if args.dry_run:
            print(f"  [dry-run] would publish kind-22 {mirror['id'][:16]}…", flush=True)
            existing.add(src["id"])
            created += 1
            continue

        results = await publish(mirror, NOSTU_RELAYS)
        if report(results):
            existing.add(src["id"])
            created += 1
        else:
            print("  ERROR: mirror not accepted", flush=True)
            failures += 1

        await asyncio.sleep(0.5)

    print(f"\nMirrors created: {created}, skipped: {skipped}, failures: {failures}", flush=True)
    return 1 if failures else 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--limit", type=int, default=500)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    return asyncio.run(main_async(args))


if __name__ == "__main__":
    sys.exit(main())
