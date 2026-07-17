"""Unified social post CLI: Nostr (working) + YouTube (OAuth) + Meta/TikTok stubs.

Nostr:
  - Text only → kind 1 note
  - Video (--media) → Blossom upload, kind 22 (NIP-71), then kind-1 Primal mirror

YouTube: requires YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET / YOUTUBE_REFRESH_TOKEN
  and --media (see pipeline/youtube_upload.py). Meta/TikTok remain stubs.

Usage:
    doppler run -- uv run --project pipeline pipeline/social_post.py \\
        --text "Practice clip" \\
        [--media path/to/clip.mp4] \\
        [--platforms nostr,youtube,instagram,facebook,tiktok] \\
        [--server https://blossom.dojopop.live] \\
        [--relay wss://...] \\
        [--dry-run]
"""

from __future__ import annotations

import argparse
import asyncio
import json
import mimetypes
import sys
from pathlib import Path

from blossom_upload import upload
from common import (
    DEFAULT_BLOSSOM,
    DEFAULT_HASHTAGS,
    DEFAULT_RELAYS,
    PREVIEW_DIR,
    THUMBS_DIR,
    load_metadata_config,
    make_thumbnail,
    prepare_video_for_upload,
    sha256_file,
)
from meta_tiktok import post_facebook, post_instagram, post_tiktok
from mirror_practice_for_primal import MIRROR_RELAYS, build_mirror_event
from nostr_util import Signer, verify_event
from publish_video_event import build_video_event, publish, report
from youtube_upload import post_youtube

SUPPORTED_PLATFORMS = ("nostr", "instagram", "facebook", "tiktok", "youtube")
VIDEO_SUFFIXES = {".mp4", ".mov", ".webm", ".mkv", ".m4v"}
IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".gif", ".webp"}


def parse_platforms(raw: str) -> list[str]:
    platforms = [p.strip().lower() for p in raw.split(",") if p.strip()]
    unknown = [p for p in platforms if p not in SUPPORTED_PLATFORMS]
    if unknown:
        raise SystemExit(f"unknown platform(s): {', '.join(unknown)}; supported: {', '.join(SUPPORTED_PLATFORMS)}")
    return platforms


def media_kind(path: Path) -> str:
    suffix = path.suffix.lower()
    if suffix in VIDEO_SUFFIXES:
        return "video"
    if suffix in IMAGE_SUFFIXES:
        return "image"
    guessed, _ = mimetypes.guess_type(path.name)
    if guessed and guessed.startswith("video/"):
        return "video"
    if guessed and guessed.startswith("image/"):
        return "image"
    raise SystemExit(f"unsupported media type for {path} (need video or image)")


def build_text_note(signer: Signer, text: str, hashtags: list[str]) -> dict:
    tags: list[list[str]] = []
    for tag in dict.fromkeys(h.lower() for h in hashtags if h.strip()):
        tags.append(["t", tag])
    event = signer.sign_event(kind=1, content=text, tags=tags)
    assert verify_event(event)
    return event


def build_image_note(signer: Signer, text: str, image_desc: dict, hashtags: list[str]) -> dict:
    imeta = [
        "imeta",
        f"url {image_desc['url']}",
        f"x {image_desc['sha256']}",
        f"m {image_desc.get('type', 'image/jpeg')}",
    ]
    tags: list[list[str]] = [imeta]
    for tag in dict.fromkeys(h.lower() for h in hashtags if h.strip()):
        tags.append(["t", tag])
    event = signer.sign_event(kind=1, content=text, tags=tags)
    assert verify_event(event)
    return event


def post_to_nostr(
    signer: Signer,
    text: str,
    media: Path | None,
    server: str,
    relays: list[str],
    config: dict,
    dry_run: bool,
) -> dict:
    """Publish to Nostr; return summary dict."""
    hashtags = list(config.get("hashtags") or DEFAULT_HASHTAGS) + list(config.get("extra_hashtags") or [])

    if media is None:
        event = build_text_note(signer, text, hashtags)
        print(f"kind-1 text note {event['id'][:16]}…")
        if dry_run:
            _write_preview("text", event)
            print("[dry-run] signed + verified; not published")
            return {"kind": 1, "event_id": event["id"], "dry_run": True}

        print(f"Publishing to {len(relays)} relay(s):")
        results = asyncio.run(publish(event, relays))
        if not report(results):
            raise RuntimeError("no relay accepted the text note")
        return {"kind": 1, "event_id": event["id"], "relays_accepted": [r for r, (ok, _) in results.items() if ok]}

    kind = media_kind(media)
    if kind == "image":
        if dry_run:
            sha = sha256_file(media)
            print(f"[dry-run] would upload image sha256={sha[:16]}…")
            fake_desc = {"url": f"{server}/{sha}.jpg", "sha256": sha, "type": "image/jpeg"}
            event = build_image_note(signer, text, fake_desc, hashtags)
            _write_preview("image", event)
            print(f"[dry-run] kind-1 image note {event['id'][:16]}… (not published)")
            return {"kind": 1, "event_id": event["id"], "dry_run": True}

        image_desc = upload(media, server, signer)
        print(f"image uploaded: {image_desc['url']}")
        event = build_image_note(signer, text, image_desc, hashtags)
        print(f"kind-1 image note {event['id'][:16]}…")
        print(f"Publishing to {len(relays)} relay(s):")
        results = asyncio.run(publish(event, relays))
        if not report(results):
            raise RuntimeError("no relay accepted the image note")
        return {
            "kind": 1,
            "event_id": event["id"],
            "image_url": image_desc["url"],
            "relays_accepted": [r for r, (ok, _) in results.items() if ok],
        }

    # video → kind 22 + Primal kind-1 mirror
    upload_path = media
    prepared = None
    probe: dict = {}
    if not dry_run:
        prepared = prepare_video_for_upload(media)
        upload_path = prepared[0]
        probe = prepared[1]
        print(
            f"prepared: {probe['width']}x{probe['height']}, {int(probe['duration'])}s"
        )

    title = text.strip().split("\n", 1)[0] if text.strip() else media.stem
    meta = {
        "id": media.stem,
        "title": title,
        "description": text,
        "duration": probe.get("duration"),
        "width": probe.get("width"),
        "height": probe.get("height"),
    }

    thumb: Path | None = None
    try:
        thumb = make_thumbnail(upload_path, THUMBS_DIR)
    except Exception as exc:
        print(f"thumbnail skipped: {exc}")

    if dry_run:
        sha = sha256_file(upload_path)
        fake_video = {"url": f"{server}/{sha}.mp4", "sha256": sha, "type": "video/mp4"}
        fake_thumb = (
            {"url": f"{server}/{sha256_file(thumb)}.jpg", "sha256": sha256_file(thumb), "type": "image/jpeg"}
            if thumb
            else None
        )
        event = build_video_event(signer, meta, fake_video, fake_thumb, config=config)
        _write_preview("video-k22", event)
        mirror = build_mirror_event(signer, event)
        _write_preview("video-mirror-k1", mirror)
        print(f"[dry-run] kind-22 {event['id'][:16]}… + mirror {mirror['id'][:16]}… (not published)")
        return {"kind": 22, "event_id": event["id"], "mirror_id": mirror["id"], "dry_run": True}

    video_desc = upload(upload_path, server, signer)
    print(f"video uploaded: {video_desc['url']}")
    thumb_desc = None
    if thumb:
        try:
            thumb_desc = upload(thumb, server, signer)
            print(f"thumb uploaded: {thumb_desc['url']}")
        except Exception as exc:
            print(f"thumb upload failed: {exc}")

    event = build_video_event(signer, meta, video_desc, thumb_desc, config=config)
    print(f"kind-22 {event['id'][:16]}…")
    print(f"Publishing kind-22 to {len(relays)} relay(s):")
    results = asyncio.run(publish(event, relays))
    if not report(results):
        raise RuntimeError("no relay accepted the kind-22 event")

    mirror = build_mirror_event(signer, event)
    print(f"kind-1 Primal mirror {mirror['id'][:16]}…")
    print(f"Publishing mirror to {len(MIRROR_RELAYS)} relay(s):")
    mirror_results = asyncio.run(publish(mirror, MIRROR_RELAYS))
    if not report(mirror_results):
        raise RuntimeError("no relay accepted the Primal mirror")

    return {
        "kind": 22,
        "event_id": event["id"],
        "mirror_id": mirror["id"],
        "video_url": video_desc["url"],
        "relays_accepted": [r for r, (ok, _) in results.items() if ok],
        "mirror_relays_accepted": [r for r, (ok, _) in mirror_results.items() if ok],
    }


def _write_preview(label: str, event: dict) -> None:
    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)
    path = PREVIEW_DIR / f"social-{label}-{event['id'][:16]}.event.json"
    path.write_text(json.dumps(event, indent=2, ensure_ascii=False))
    print(f"  preview: {path}")


PLATFORM_HANDLERS = {
    "nostr": None,  # handled separately
    "instagram": post_instagram,
    "facebook": post_facebook,
    "tiktok": post_tiktok,
    "youtube": post_youtube,
}


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--text", required=True, help="Post body / caption")
    ap.add_argument("--media", type=Path, default=None, help="Optional image or video file")
    ap.add_argument(
        "--platforms",
        default="nostr",
        help=f"Comma-separated platforms (default: nostr). Supported: {', '.join(SUPPORTED_PLATFORMS)}",
    )
    ap.add_argument("--server", default=DEFAULT_BLOSSOM, help="Blossom server base URL")
    ap.add_argument("--relay", action="append", dest="relays", default=None)
    ap.add_argument("--config", type=Path, default=None, help="Metadata config YAML")
    ap.add_argument("--dry-run", action="store_true", help="Sign/build only; no upload or publish")
    args = ap.parse_args()

    if args.media and not args.media.is_file():
        raise SystemExit(f"media file not found: {args.media}")

    platforms = parse_platforms(args.platforms)
    signer = Signer.from_env()
    relays = args.relays or DEFAULT_RELAYS
    config = load_metadata_config(args.config)
    server = args.server.rstrip("/")

    print(f"Platforms: {', '.join(platforms)}")
    print(f"Author: {signer.pubkey_hex[:16]}…")

    results: dict[str, dict | str] = {}
    failures = 0

    if "nostr" in platforms:
        try:
            results["nostr"] = post_to_nostr(
                signer, args.text, args.media, server, relays, config, args.dry_run
            )
        except Exception as exc:
            failures += 1
            results["nostr"] = f"FAILED: {exc}"
            print(f"nostr: FAILED — {exc}")

    for platform in platforms:
        if platform == "nostr":
            continue
        handler = PLATFORM_HANDLERS[platform]
        assert handler is not None
        try:
            results[platform] = handler(args.text, args.media)
        except NotImplementedError as exc:
            failures += 1
            results[platform] = f"BLOCKED: {exc}"
            print(f"{platform}: BLOCKED — {exc}")
        except Exception as exc:
            failures += 1
            results[platform] = f"FAILED: {exc}"
            print(f"{platform}: FAILED — {exc}")

    print("\n--- summary ---")
    print(json.dumps(results, indent=2, default=str))

    if args.dry_run:
        print("\n[dry-run] complete")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
