"""Mirror practice video + thumbnail blobs from blossom.yakihonne.com → blossom.dojopop.live.

Most entries in data/published.json still point at YakiHonne from early pipeline runs.
Bouquet only lists blobs per server; this script copies missing blobs to self-hosted
Blossom so browse shows the full catalog on blossom.dojopop.live.

Usage:
    doppler run --project dojopop --config prd_zorie -- \\
        uv run --project pipeline pipeline/mirror_yakihonne_to_dojopop.py --dry-run

    doppler run -- ... pipeline/mirror_yakihonne_to_dojopop.py --limit 5
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

import httpx

from blossom_upload import auth_header, build_upload_auth
from common import DEFAULT_BLOSSOM, load_state, save_state
from nostr_util import Signer

SOURCE = "https://blossom.yakihonne.com"
SHA_RE = re.compile(r"/([0-9a-f]{64})(?:\.[a-zA-Z0-9]+)?$")


def blob_exists(server: str, sha256: str) -> bool:
    try:
        resp = httpx.head(f"{server.rstrip('/')}/{sha256}", timeout=30, follow_redirects=True)
        return resp.status_code == 200
    except httpx.HTTPError:
        return False


def sha_from_url(url: str) -> str | None:
    m = SHA_RE.search(url or "")
    return m.group(1) if m else None


def mirror_blob(signer: Signer, source_url: str, target: str) -> tuple[bool, str]:
    sha = sha_from_url(source_url)
    if not sha:
        return False, "no sha256 in url"
    if blob_exists(target, sha):
        return True, "already on target"
    auth = build_upload_auth(signer, sha, "mirror from yakihonne")
    resp = httpx.put(
        f"{target.rstrip('/')}/mirror",
        json={"url": source_url},
        headers={"Authorization": auth_header(auth), "Content-Type": "application/json"},
        timeout=600,
    )
    ok = resp.status_code in (200, 201)
    return ok, f"HTTP {resp.status_code}" + (f" {resp.text[:120]}" if not ok else "")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--source", default=SOURCE)
    ap.add_argument("--target", default=DEFAULT_BLOSSOM)
    ap.add_argument("--limit", type=int, default=0, help="Max videos to process (0 = all)")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--update-published", action="store_true", help="Rewrite published.json URLs to target")
    args = ap.parse_args()

    signer = Signer.from_env()
    state = load_state()
    pending = [
        (yt_id, entry)
        for yt_id, entry in state.items()
        if args.source.rstrip("/") in (entry.get("video_url") or "")
    ]
    if args.limit:
        pending = pending[: args.limit]

    print(f"Videos still on {args.source}: {len(pending)}")
    if not pending:
        return 0

    failures = 0
    for i, (yt_id, entry) in enumerate(pending, 1):
        title = (entry.get("title") or yt_id)[:60]
        print(f"\n[{i}/{len(pending)}] {title}")
        urls = [entry.get("video_url"), entry.get("thumb_url")]
        mirrored_ok = True
        for url in urls:
            if not url or args.target.rstrip("/") in url:
                continue
            if args.dry_run:
                print(f"  [dry-run] mirror {url}")
                continue
            ok, msg = mirror_blob(signer, url, args.target)
            print(f"  {sha_from_url(url)[:12]}… {msg}")
            mirrored_ok = mirrored_ok and ok
        if not args.dry_run and mirrored_ok and args.update_published:
            if entry.get("video_url") and args.source.rstrip("/") in entry["video_url"]:
                entry["video_url"] = entry["video_url"].replace(
                    args.source.rstrip("/"), args.target.rstrip("/")
                )
            if entry.get("thumb_url") and args.source.rstrip("/") in entry["thumb_url"]:
                entry["thumb_url"] = entry["thumb_url"].replace(
                    args.source.rstrip("/"), args.target.rstrip("/")
                )
            state[yt_id] = entry
        if not mirrored_ok and not args.dry_run:
            failures += 1

    if args.update_published and not args.dry_run:
        save_state(state)
        print("\nupdated published.json URLs")

    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
