"""Build and publish a NIP-71 video event (kind 22 short video) to Nostr relays.

Takes yt-dlp metadata + Blossom BlobDescriptors (video + thumbnail), builds the
event with imeta / title / published_at / t / origin tags, signs it with
NOSTR_NSEC, and publishes over websockets, reporting OK/rejected per relay.

Usage (normally driven by pipeline.py):
    doppler run -- uv run --project pipeline pipeline/publish_video_event.py \
        --meta data/videos/<id>.info.json --video-descriptor desc.json \
        [--thumb-descriptor thumb.json] [--relay wss://... ...] [--dry-run]
"""

from __future__ import annotations

import argparse
import asyncio
import json
import sys
from pathlib import Path

import websockets

from common import DEFAULT_HASHTAGS, DEFAULT_RELAYS
from nostr_util import Signer, verify_event

KIND_SHORT_VIDEO = 22  # NIP-71 short/vertical video
KIND_ADDRESSABLE_VIDEO = 34236  # NIP-71 addressable (deprecated but supported)


def build_video_event(
    signer: Signer,
    meta: dict,
    video_descriptor: dict,
    thumb_descriptor: dict | None = None,
    kind: int = KIND_SHORT_VIDEO,
    hashtags: list[str] | None = None,
) -> dict:
    title = meta.get("title") or meta.get("id") or "practice video"
    duration = meta.get("duration")
    width, height = meta.get("width"), meta.get("height")
    published_at = meta.get("timestamp")

    imeta = [
        "imeta",
        f"url {video_descriptor['url']}",
        f"x {video_descriptor['sha256']}",
        f"m {video_descriptor.get('type', 'video/mp4')}",
    ]
    if width and height:
        imeta.append(f"dim {width}x{height}")
    if duration:
        imeta.append(f"duration {int(duration)}")
    if thumb_descriptor:
        imeta.append(f"image {thumb_descriptor['url']}")

    tags: list[list[str]] = [
        ["title", title],
        imeta,
    ]
    if published_at:
        tags.append(["published_at", str(int(published_at))])
    if duration:
        tags.append(["duration", str(int(duration))])
    for tag in hashtags if hashtags is not None else DEFAULT_HASHTAGS:
        tags.append(["t", tag])
    if meta.get("id"):
        tags.append(["origin", "youtube", meta["id"], meta.get("webpage_url") or ""])
    if kind == KIND_ADDRESSABLE_VIDEO:
        tags.insert(0, ["d", f"youtube-{meta.get('id', 'unknown')}"])

    content = title
    if meta.get("description"):
        content = f"{title}\n\n{meta['description']}".strip()

    event = signer.sign_event(kind=kind, content=content, tags=tags)
    assert verify_event(event), "video event failed local signature verification"
    return event


async def publish_to_relay(relay: str, event: dict, timeout: float = 15.0) -> tuple[bool, str]:
    try:
        async with websockets.connect(relay, open_timeout=timeout, close_timeout=5) as ws:
            await ws.send(json.dumps(["EVENT", event], ensure_ascii=False))
            deadline = asyncio.get_event_loop().time() + timeout
            while True:
                remaining = deadline - asyncio.get_event_loop().time()
                if remaining <= 0:
                    return False, "timeout waiting for OK"
                raw = await asyncio.wait_for(ws.recv(), timeout=remaining)
                msg = json.loads(raw)
                if msg[0] == "OK" and msg[1] == event["id"]:
                    return bool(msg[2]), msg[3] if len(msg) > 3 else ""
    except Exception as exc:  # connection refused, TLS, etc.
        return False, f"{type(exc).__name__}: {exc}"


async def publish(event: dict, relays: list[str]) -> dict[str, tuple[bool, str]]:
    results = await asyncio.gather(*(publish_to_relay(r, event) for r in relays))
    return dict(zip(relays, results))


def report(results: dict[str, tuple[bool, str]]) -> bool:
    any_ok = False
    for relay, (ok, msg) in results.items():
        status = "accepted" if ok else "REJECTED"
        print(f"  {relay}: {status}" + (f" ({msg})" if msg else ""))
        any_ok = any_ok or ok
    return any_ok


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--meta", required=True, type=Path, help="yt-dlp info JSON or normalized metadata JSON")
    ap.add_argument("--video-descriptor", required=True, type=Path, help="Blossom BlobDescriptor JSON for the video")
    ap.add_argument("--thumb-descriptor", type=Path, default=None)
    ap.add_argument("--relay", action="append", dest="relays", default=None)
    ap.add_argument("--kind", type=int, default=KIND_SHORT_VIDEO, choices=[KIND_SHORT_VIDEO, KIND_ADDRESSABLE_VIDEO])
    ap.add_argument("--hashtag", action="append", dest="hashtags", default=None)
    ap.add_argument("--dry-run", action="store_true", help="Build/sign/verify the event and print it; do not publish")
    args = ap.parse_args()

    signer = Signer.from_env()
    meta = json.loads(args.meta.read_text())
    video_desc = json.loads(args.video_descriptor.read_text())
    thumb_desc = json.loads(args.thumb_descriptor.read_text()) if args.thumb_descriptor else None

    event = build_video_event(signer, meta, video_desc, thumb_desc, kind=args.kind, hashtags=args.hashtags)
    print(json.dumps(event, indent=2, ensure_ascii=False))

    if args.dry_run:
        print("\n[dry-run] event signed + verified locally; not published")
        return 0

    relays = args.relays or DEFAULT_RELAYS
    print(f"\nPublishing {event['id']} to {len(relays)} relays:")
    results = asyncio.run(publish(event, relays))
    return 0 if report(results) else 1


if __name__ == "__main__":
    sys.exit(main())
