"""Publish kind 10063 Blossom user server list (BUD-03) for the pipeline identity.

Bouquet and other Blossom clients read this replaceable event to discover which
media servers to use for a pubkey.

Usage:
    doppler run --project dojopop --config prd_zorie -- \\
        uv run --project pipeline pipeline/publish_blossom_server_list.py

    doppler run -- ... pipeline/publish_blossom_server_list.py \\
        --server https://blossom.dojopop.live --server https://blossom.yakihonne.com
"""

from __future__ import annotations

import argparse
import asyncio
import sys

from common import DEFAULT_RELAYS
from nostr_util import Signer, verify_event
from publish_video_event import publish, report

BLOSSOM_SERVER_LIST_KIND = 10063
DEFAULT_SERVERS = [
    "https://blossom.dojopop.live",
    "https://blossom.yakihonne.com",
]


def build_server_list_event(signer: Signer, servers: list[str]) -> dict:
    tags = [["server", url.rstrip("/")] for url in servers]
    event = signer.sign_event(kind=BLOSSOM_SERVER_LIST_KIND, content="", tags=tags)
    if not verify_event(event):
        raise RuntimeError("kind 10063 event failed local signature verification")
    return event


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument(
        "--server",
        action="append",
        dest="servers",
        default=None,
        help="Blossom server URL (repeatable; default: blossom.dojopop.live)",
    )
    ap.add_argument("--relay", action="append", dest="relays", default=None)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    servers = args.servers or DEFAULT_SERVERS
    signer = Signer.from_env()
    event = build_server_list_event(signer, servers)
    print(f"kind 10063 for {signer.pubkey_hex[:16]}… with {len(servers)} server(s)")

    if args.dry_run:
        print("[dry-run] not published")
        return 0

    relays = args.relays or DEFAULT_RELAYS
    print(f"Publishing {event['id']} to {len(relays)} relay(s):")
    results = asyncio.run(publish(event, relays))
    return 0 if report(results) else 1


if __name__ == "__main__":
    sys.exit(main())
