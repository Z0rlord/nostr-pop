"""Orchestrator: YouTube URL -> download -> Blossom upload -> Nostr publish.

Idempotent: data/published.json tracks already-published YouTube ids and
re-runs skip them. --dry-run downloads + hashes + builds/signs events but
performs no Blossom upload and no relay publish.

Usage:
    doppler run -- uv run --project pipeline pipeline/pipeline.py \
        --url <youtube-url> --max-duration 90 \
        [--server https://blossom.yakihonne.com] [--relay wss://...] [--dry-run]
"""

from __future__ import annotations

import argparse
import asyncio
import json
import sys
from pathlib import Path

from common import (
    DEFAULT_BLOSSOM,
    DEFAULT_RELAYS,
    PREVIEW_DIR,
    THUMBS_DIR,
    VIDEOS_DIR,
    load_metadata_config,
    load_state,
    make_thumbnail,
    save_state,
    sha256_file,
)
from blossom_upload import build_upload_auth, upload
from download_youtube import download
from nostr_util import Signer
from publish_video_event import build_video_event, publish, report


def process_video(
    meta: dict,
    signer: Signer,
    server: str,
    relays: list[str],
    config: dict,
    dry_run: bool,
) -> dict | None:
    """Upload one video + thumbnail and publish its event. Returns state entry."""
    video = Path(meta["filepath"])
    print(f"\n=== {meta['id']}: {meta['title']!r} ({meta.get('duration')}s) ===")

    sha256 = sha256_file(video)
    print(f"  sha256: {sha256}")

    # thumbnail (best effort)
    thumb: Path | None = None
    try:
        thumb = make_thumbnail(video, THUMBS_DIR)
        print(f"  thumbnail: {thumb}")
    except Exception as exc:
        print(f"  thumbnail generation failed (continuing without): {exc}")

    if dry_run:
        auth = build_upload_auth(signer, sha256, f"Upload {video.name}")
        print(f"  [dry-run] signed+verified 24242 auth event {auth['id'][:16]}…")
        fake_desc = {"url": f"{server}/{sha256}.mp4", "sha256": sha256, "type": "video/mp4"}
        fake_thumb = (
            {"url": f"{server}/{sha256_file(thumb)}.jpg", "sha256": sha256_file(thumb), "type": "image/jpeg"}
            if thumb
            else None
        )
        event = build_video_event(signer, meta, fake_desc, fake_thumb, config=config)
        PREVIEW_DIR.mkdir(parents=True, exist_ok=True)
        preview_file = PREVIEW_DIR / f"{meta['id']}.event.json"
        preview_file.write_text(json.dumps(event, indent=2, ensure_ascii=False))
        print(
            f"  [dry-run] signed+verified kind-{event['kind']} event {event['id'][:16]}… "
            f"(not uploaded/published; preview: {preview_file})"
        )
        return None

    video_desc = upload(video, server, signer)
    print(f"  video uploaded: {video_desc['url']}")
    thumb_desc = None
    if thumb:
        try:
            thumb_desc = upload(thumb, server, signer)
            print(f"  thumb uploaded: {thumb_desc['url']}")
        except Exception as exc:
            print(f"  thumb upload failed (continuing without): {exc}")

    event = build_video_event(signer, meta, video_desc, thumb_desc, config=config)
    print(f"  publishing event {event['id']} (kind {event['kind']}) to {len(relays)} relays:")
    results = asyncio.run(publish(event, relays))
    accepted = report(results)
    if not accepted:
        raise RuntimeError("no relay accepted the event")

    return {
        "event_id": event["id"],
        "kind": event["kind"],
        "video_url": video_desc["url"],
        "video_sha256": video_desc["sha256"],
        "thumb_url": thumb_desc["url"] if thumb_desc else None,
        "relays_accepted": [r for r, (ok, _) in results.items() if ok],
        "title": meta["title"],
        "published_at": event["created_at"],
    }


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--url", required=True, help="YouTube channel/playlist/video URL")
    ap.add_argument("--max-duration", type=int, default=None, help="Skip videos longer than N seconds (e.g. 90)")
    ap.add_argument("--server", default=DEFAULT_BLOSSOM, help="Blossom server base URL")
    ap.add_argument("--relay", action="append", dest="relays", default=None)
    ap.add_argument("--kind", type=int, default=None)
    ap.add_argument("--hashtag", action="append", dest="hashtags", default=None, help="Override the default hashtag list (repeatable)")
    ap.add_argument("--config", type=Path, default=None, help="Metadata config YAML (default pipeline/metadata.yml)")
    ap.add_argument("--output-dir", type=Path, default=VIDEOS_DIR)
    ap.add_argument("--force", action="store_true", help="Re-publish even if already in state file")
    ap.add_argument("--dry-run", action="store_true", help="Download + sign only; no upload, no publish")
    args = ap.parse_args()

    signer = Signer.from_env()
    relays = args.relays or DEFAULT_RELAYS
    config = load_metadata_config(args.config)
    if args.kind is not None:
        config["kind"] = args.kind
    if args.hashtags is not None:
        config["hashtags"] = args.hashtags
        config["extra_hashtags"] = []
    state = load_state()

    print(f"Downloading from {args.url} …")
    videos = download(args.url, args.output_dir, args.max_duration)
    print(f"{len(videos)} video(s) downloaded/matched")

    failures = 0
    for meta in videos:
        yt_id = meta["id"]
        if not args.force and yt_id in state:
            print(f"\n=== {yt_id}: already published as {state[yt_id]['event_id'][:16]}… — skipping ===")
            continue
        try:
            entry = process_video(
                meta, signer, args.server.rstrip("/"), relays, config, args.dry_run
            )
        except Exception as exc:
            failures += 1
            print(f"  FAILED: {exc}")
            continue
        if entry is not None:
            state[yt_id] = entry
            save_state(state)

    if args.dry_run:
        print("\n[dry-run] complete — nothing uploaded or published")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
