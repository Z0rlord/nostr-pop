"""Delete redundant #dojopop-nostube kind-22 mirrors (NIP-09 kind 5).

Keeps the earliest LOGIN (DOJOPOP_LOGIN_NSEC) mirror per source `e` tag.
Deletes FOUNDER / ADMIN / extra LOGIN mirrors of the same source.

Usage:
    doppler run -- uv run --project pipeline pipeline/cleanup_nostube_duplicates.py --dry-run
    doppler run -- uv run --project pipeline pipeline/cleanup_nostube_duplicates.py
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys
from collections import defaultdict

import websockets

from common import PRIMARY_RELAY, PUBLIC_RELAY, relay_connect_url
from mirror_practice_for_nostube import (
    MIRROR_TAG,
    NOSTU_RELAYS,
    build_nostube_mirror_event,
)
from nostr_util import Signer, verify_event
from publish_video_event import publish, report

# Known mirror-era pubkeys (not secrets).
LOGIN = "58d5fd86797cc2914e7be0e76583ab293af5dd35bc0da15b77d92d093bec417c"
ADMIN = "4b3ea588dc586d67db872e2176deced89665954290ecaf24f4ce06d81cae9d27"
FOUNDER = "b3d8544ddd5896f75ef66c210f5c0d6ded9f7925163ebcbc89e678bdc1e48c6a"
LABEL = {LOGIN: "LOGIN", ADMIN: "ADMIN", FOUNDER: "FOUNDER"}

QUERY_RELAYS = [PUBLIC_RELAY, PRIMARY_RELAY, "wss://nos.lol"]
# Prefer dojo + nos for deletions; damus rate-limits bulk kind-5.
DELETE_RELAYS = [PRIMARY_RELAY, PUBLIC_RELAY, "wss://nos.lol", "wss://relay.primal.net"]


def title_of(event: dict) -> str:
    for tag in event.get("tags", []):
        if tag and tag[0] == "title" and len(tag) > 1:
            return tag[1]
    return (event.get("content") or "").split("\n", 1)[0][:80]


def source_e(event: dict) -> str | None:
    for tag in event.get("tags", []):
        if tag and tag[0] == "e" and len(tag) > 1:
            return tag[1]
    return None


async def _req_events(relay: str, filt: dict) -> list[dict]:
    events: list[dict] = []
    try:
        async with websockets.connect(
            relay_connect_url(relay),
            open_timeout=25,
            ping_interval=20,
            ping_timeout=20,
            close_timeout=5,
        ) as ws:
            await ws.send(json.dumps(["REQ", "cnd", filt]))
            while True:
                try:
                    msg = json.loads(await asyncio.wait_for(ws.recv(), timeout=90))
                except asyncio.TimeoutError:
                    break
                if msg[0] == "EOSE":
                    break
                if msg[0] == "EVENT":
                    events.append(msg[2])
    except Exception as exc:
        print(f"  WARN {relay}: {type(exc).__name__}: {exc}", flush=True)
    return events


async def fetch_all_mirrors() -> dict[str, dict]:
    by_id: dict[str, dict] = {}
    for relay in QUERY_RELAYS:
        print(f"Querying {relay}…", flush=True)
        events = await _req_events(
            relay, {"kinds": [22], "#t": [MIRROR_TAG], "limit": 1000}
        )
        for event in events:
            by_id[event["id"]] = event
        print(f"  got {len(events)} (unique {len(by_id)})", flush=True)
    return by_id


def plan_deletions(mirrors: dict[str, dict]) -> tuple[list[dict], list[dict]]:
    """Return (keepers, extras). Prefer earliest LOGIN per source e-tag."""
    by_src: dict[str, list[dict]] = defaultdict(list)
    for event in mirrors.values():
        sid = source_e(event)
        if sid:
            by_src[sid].append(event)

    keepers: list[dict] = []
    extras: list[dict] = []
    for src, group in by_src.items():
        login_mirrors = [m for m in group if m["pubkey"] == LOGIN]
        candidates = login_mirrors if login_mirrors else group
        candidates = sorted(candidates, key=lambda m: m.get("created_at", 0))
        keeper = candidates[0]
        keepers.append(keeper)
        for mirror in group:
            if mirror["id"] != keeper["id"]:
                extras.append(
                    {
                        "event": mirror,
                        "source_e": src,
                        "keep_id": keeper["id"],
                        "keep_pubkey": keeper["pubkey"],
                        "title": title_of(mirror),
                    }
                )
    return keepers, extras


def load_signers() -> dict[str, Signer]:
    """Map pubkey hex -> Signer for keys present in the environment."""
    mapping: dict[str, Signer] = {}
    for env_names, expected in (
        (("DOJOPOP_LOGIN_NSEC",), LOGIN),
        (("DOJOPOP_ADMIN_NSEC", "DOJO_ADMIN_PRIVATE_KEY"), ADMIN),
        (("NOSTR_NSEC",), FOUNDER),
    ):
        for name in env_names:
            raw = os.environ.get(name)
            if raw and raw.strip():
                signer = Signer.from_env(name)
                if signer.pubkey_hex != expected:
                    print(
                        f"WARN: {name} pubkey {signer.pubkey_hex[:16]}… "
                        f"!= expected {LABEL.get(expected, expected[:16])}",
                        flush=True,
                    )
                mapping[signer.pubkey_hex] = signer
                break
    return mapping


async def delete_one(
    signer: Signer, event: dict, reason: str, relays: list[str], dry_run: bool
) -> bool:
    delete_event = signer.sign_event(
        kind=5,
        content=reason,
        tags=[["e", event["id"]], ["k", str(event.get("kind", 22))]],
    )
    assert verify_event(delete_event)
    label = LABEL.get(event["pubkey"], event["pubkey"][:16])
    title = title_of(event)
    if dry_run:
        print(
            f"  [dry-run] {label} delete {event['id'][:16]}… {title!r}",
            flush=True,
        )
        return True
    results = await publish(delete_event, relays)
    ok = report(results)
    if not ok:
        print(f"  ERROR: no relay accepted kind-5 for {event['id'][:16]}…", flush=True)
    return ok


async def fetch_event_by_id(event_id: str) -> dict | None:
    for relay in (PUBLIC_RELAY, PRIMARY_RELAY):
        events = await _req_events(relay, {"ids": [event_id], "limit": 1})
        for event in events:
            if event.get("id") == event_id:
                return event
    return None


async def promote_non_login_keepers(
    keepers: list[dict],
    signers: dict[str, Signer],
    *,
    dry_run: bool,
) -> tuple[int, int, int]:
    """For ADMIN/FOUNDER-only keepers: publish LOGIN mirror, then delete old.

    Prefer rebuilding from the original source event. If the source is gone
    (common after earlier FOUNDER mirror cleanup), resign the orphan's tags
    under LOGIN so the Blossom URL stays visible on the canonical account.
    """
    login_signer = signers.get(LOGIN)
    if not login_signer:
        print("SKIP promote: DOJOPOP_LOGIN_NSEC not available", flush=True)
        return 0, 0, 0

    promoted = deleted = failed = 0
    orphans = [k for k in keepers if k["pubkey"] != LOGIN]
    print(f"\n=== promote {len(orphans)} non-LOGIN keeper(s) → LOGIN ===", flush=True)

    for i, old in enumerate(orphans, 1):
        sid = source_e(old)
        title = title_of(old)
        label = LABEL.get(old["pubkey"], old["pubkey"][:16])
        print(f"[{i}/{len(orphans)}] {label} {old['id'][:16]}… {title!r}", flush=True)

        mirror: dict | None = None
        if sid:
            source = await fetch_event_by_id(sid)
            if source:
                try:
                    mirror = build_nostube_mirror_event(login_signer, source)
                except ValueError as exc:
                    print(f"  WARN rebuild from source failed: {exc}", flush=True)

        if mirror is None:
            # Source missing — clone orphan tags under LOGIN.
            tags = [list(t) for t in old.get("tags", [])]
            content = old.get("content") or title
            mirror = login_signer.sign_event(kind=22, content=content, tags=tags)
            assert verify_event(mirror)
            print(f"  clone orphan → LOGIN {mirror['id'][:16]}…", flush=True)

        if dry_run:
            print(
                f"  [dry-run] would publish LOGIN {mirror['id'][:16]}… then delete old",
                flush=True,
            )
            promoted += 1
            deleted += 1
            continue

        results = await publish(mirror, DELETE_RELAYS)
        if not report(results):
            print("  ERROR: LOGIN mirror not accepted", flush=True)
            failed += 1
            continue
        promoted += 1
        await asyncio.sleep(0.15)

        old_signer = signers.get(old["pubkey"])
        if not old_signer:
            print(f"  WARN: LOGIN published but no signer to delete {label}", flush=True)
            failed += 1
            continue
        if await delete_one(
            old_signer,
            old,
            "replaced by login-bot dojopop-nostube mirror",
            DELETE_RELAYS,
            False,
        ):
            deleted += 1
        else:
            failed += 1
        await asyncio.sleep(0.15)

    print(
        f"promote done: published={promoted} deleted_old={deleted} failed={failed}",
        flush=True,
    )
    return promoted, deleted, failed


async def main_async(args: argparse.Namespace) -> int:
    mirrors = await fetch_all_mirrors()
    by_author: dict[str, int] = defaultdict(int)
    for event in mirrors.values():
        by_author[LABEL.get(event["pubkey"], event["pubkey"][:16])] += 1

    print("\n=== inventory ===", flush=True)
    print(f"unique mirrors: {len(mirrors)}", flush=True)
    for label, count in sorted(by_author.items(), key=lambda x: -x[1]):
        print(f"  {label}: {count}", flush=True)

    keepers, extras = plan_deletions(mirrors)
    src_with_extras = len({e["source_e"] for e in extras})
    print(f"\nkeepers (one per source): {len(keepers)}", flush=True)
    print(f"sources with extras: {src_with_extras}", flush=True)
    print(f"extras to delete: {len(extras)}", flush=True)

    del_by: dict[str, int] = defaultdict(int)
    for item in extras:
        del_by[LABEL.get(item["event"]["pubkey"], "?")] += 1
    print("extras by author:", dict(del_by), flush=True)

    keeper_by: dict[str, int] = defaultdict(int)
    for k in keepers:
        keeper_by[LABEL.get(k["pubkey"], "?")] += 1
    print("keepers by author:", dict(keeper_by), flush=True)

    if args.limit is not None:
        extras = extras[: args.limit]
        print(f"limited to first {len(extras)} deletion(s)", flush=True)

    signers = load_signers()
    print(
        f"\nsigners available: {[LABEL.get(p, p[:16]) for p in signers]}",
        flush=True,
    )

    reason = args.reason
    deleted = skipped = failed = 0
    for i, item in enumerate(extras, 1):
        event = item["event"]
        pk = event["pubkey"]
        signer = signers.get(pk)
        label = LABEL.get(pk, pk[:16])
        if not signer:
            print(
                f"[{i}/{len(extras)}] SKIP no signer for {label} {event['id'][:16]}…",
                flush=True,
            )
            skipped += 1
            continue
        print(
            f"[{i}/{len(extras)}] {label} → kind-5 {event['id'][:16]}… "
            f"(keep {item['keep_id'][:16]}…) {item['title']!r}",
            flush=True,
        )
        ok = await delete_one(signer, event, reason, DELETE_RELAYS, args.dry_run)
        if ok:
            deleted += 1
        else:
            failed += 1
        if not args.dry_run:
            await asyncio.sleep(0.15)

    print(
        f"\nDone extras. deleted={deleted} skipped={skipped} failed={failed} "
        f"dry_run={args.dry_run}",
        flush=True,
    )

    promote_failed = 0
    if args.promote and args.limit is None:
        # Only full runs: promote ADMIN/FOUNDER keepers after extras cleared.
        non_login_keepers = [k for k in keepers if k["pubkey"] != LOGIN]
        _, _, promote_failed = await promote_non_login_keepers(
            non_login_keepers, signers, dry_run=args.dry_run
        )
    elif keeper_by.get("ADMIN") or keeper_by.get("FOUNDER"):
        print(
            "NOTE: non-LOGIN keepers remain; re-run with --promote (no --limit) "
            "to copy them under LOGIN then delete the old ones.",
            flush=True,
        )

    return 1 if (failed or promote_failed) else 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--limit", type=int, default=None)
    ap.add_argument(
        "--promote",
        action="store_true",
        help="After deleting extras, publish LOGIN mirrors for ADMIN/FOUNDER-only "
        "keepers and delete those old events",
    )
    ap.add_argument(
        "--reason",
        default="duplicate dojopop-nostube mirror; keep login-bot copy",
    )
    args = ap.parse_args()
    return asyncio.run(main_async(args))


if __name__ == "__main__":
    sys.exit(main())
