"""Repair practice kind-22 events that are missing imeta image (thumbnail).

For each event:
  1. Download the video blob from Blossom
  2. Generate a JPEG thumbnail (ffmpeg)
  3. Upload thumbnail to Blossom
  4. Publish kind-5 deletion for the old event
  5. Publish a replacement kind-22 with the same metadata + imeta image URL

Usage:
    doppler run -- uv run --project pipeline pipeline/repair_practice_thumbnails.py \\
        --event-id <hex> [--event-id <hex> ...] [--dry-run]
"""

from __future__ import annotations

import argparse
import asyncio
import json
import re
import sys
import tempfile
import time
from pathlib import Path

import httpx
import websockets

from blossom_upload import upload
from common import DEFAULT_BLOSSOM, DEFAULT_RELAYS, make_thumbnail, relay_connect_url
from nostr_util import Signer, verify_event
from publish_video_event import publish, report


def imeta_map(tags: list[list[str]]) -> dict[str, str]:
    out: dict[str, str] = {}
    for tag in tags:
        if tag[0] != "imeta":
            continue
        for part in tag[1:]:
            if " " not in part:
                continue
            key, value = part.split(" ", 1)
            out[key] = value
    return out


def tag_value(tags: list[list[str]], name: str) -> str | None:
    for tag in tags:
        if tag[0] == name and tag[1]:
            return tag[1]
    return None


def tag_values(tags: list[list[str]], name: str) -> list[str]:
    return [tag[1] for tag in tags if tag[0] == name and tag[1]]


async def fetch_event(relay: str, event_id: str) -> dict | None:
    req = json.dumps(["REQ", "repair", {"ids": [event_id]}])
    try:
        async with websockets.connect(
            relay_connect_url(relay), open_timeout=15, close_timeout=5
        ) as ws:
            await ws.send(req)
            deadline = asyncio.get_event_loop().time() + 15
            while asyncio.get_event_loop().time() < deadline:
                raw = await asyncio.wait_for(
                    ws.recv(), timeout=deadline - asyncio.get_event_loop().time()
                )
                msg = json.loads(raw)
                if msg[0] == "EVENT" and msg[2].get("id") == event_id:
                    return msg[2]
                if msg[0] == "EOSE":
                    break
    except Exception as exc:
        print(f"  fetch failed: {exc}")
    return None


def normalize_https(url: str) -> str:
    return re.sub(r"^http://", "https://", url, count=1)


def build_replacement_event(
    signer: Signer,
    old: dict,
    thumb_descriptor: dict,
) -> dict:
    imeta = imeta_map(old["tags"])
    video_url = normalize_https(imeta.get("url", ""))
    video_sha = imeta.get("x", "")
    mime = imeta.get("m", "video/mp4")

    imeta_tag = [
        "imeta",
        f"url {video_url}",
        f"x {video_sha}",
        f"m {mime}",
    ]
    if imeta.get("dim"):
        imeta_tag.append(f"dim {imeta['dim']}")
    if imeta.get("duration"):
        imeta_tag.append(f"duration {imeta['duration']}")
    imeta_tag.append(f"image {normalize_https(thumb_descriptor['url'])}")

    tags = [t for t in old["tags"] if t[0] != "imeta"]
    imeta_idx = 1
    for i, tag in enumerate(tags):
        if tag[0] == "title":
            imeta_idx = i + 1
            break
    tags.insert(imeta_idx, imeta_tag)

    event = signer.sign_event(
        kind=old["kind"],
        content=old.get("content") or tag_value(old["tags"], "title") or "",
        tags=tags,
    )
    assert verify_event(event)
    return event


def download_video(url: str, dest: Path) -> None:
    url = normalize_https(url)
    with httpx.Client(timeout=httpx.Timeout(60.0, read=600.0)) as client:
        with client.stream("GET", url) as resp:
            resp.raise_for_status()
            with dest.open("wb") as f:
                for chunk in resp.iter_bytes():
                    f.write(chunk)


def repair_one(
    signer: Signer,
    event_id: str,
    relay: str,
    server: str,
    dry_run: bool,
) -> bool:
    print(f"\n=== {event_id} ===")
    old = asyncio.run(fetch_event(relay, event_id))
    if not old:
        print("  not found on relay")
        return False

    title = tag_value(old["tags"], "title") or old.get("content", "")[:60]
    print(f"  title: {title!r}")

    imeta = imeta_map(old["tags"])
    if imeta.get("image"):
        print(f"  already has image: {imeta['image']}")
        return True

    video_url = imeta.get("url")
    if not video_url:
        print("  missing imeta url")
        return False

    if dry_run:
        print(f"  [dry-run] would thumbnail {video_url} and republish")
        return True

    with tempfile.TemporaryDirectory() as tmp:
        video_path = Path(tmp) / "video.bin"
        print("  downloading video…")
        download_video(video_url, video_path)
        print("  generating thumbnail…")
        thumb_path = make_thumbnail(video_path, Path(tmp))
        print(f"  uploading thumbnail ({thumb_path.stat().st_size} bytes)…")
        thumb_desc = upload(thumb_path, server=server, signer=signer, content_type="image/jpeg")

    new_event = build_replacement_event(signer, old, thumb_desc)
    delete_event = signer.sign_event(
        kind=5,
        content="repair: add practice video thumbnail",
        tags=[["e", old["id"]], ["k", str(old["kind"])]],
    )
    assert verify_event(delete_event)

    print(f"  deleting old event {old['id'][:16]}…")
    del_results = asyncio.run(publish(delete_event, DEFAULT_RELAYS))
    if not report(del_results):
        print("  WARNING: deletion not accepted on any relay")

    print(f"  publishing replacement {new_event['id'][:16]}…")
    pub_results = asyncio.run(publish(new_event, DEFAULT_RELAYS))
    if not report(pub_results):
        print("  ERROR: replacement not accepted")
        return False

    print(f"  done → {normalize_https(thumb_desc['url'])}")
    return True


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--event-id", action="append", dest="event_ids", required=True)
    ap.add_argument("--relay", default=DEFAULT_RELAYS[0])
    ap.add_argument("--server", default=DEFAULT_BLOSSOM)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    signer = Signer.from_env()
    ok = True
    for event_id in args.event_ids:
        if not repair_one(signer, event_id, args.relay, args.server, args.dry_run):
            ok = False
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
