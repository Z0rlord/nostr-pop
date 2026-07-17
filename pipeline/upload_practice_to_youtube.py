"""Backfill / populate a DojoPop YouTube channel from Nostr kind-22 practice events.

Fetches `#dojopop` + `#proofofpractice` kind-22s from relay.dojopop.live (same
filter as nostube/primal mirrors), downloads the Blossom MP4 from `imeta`, and
uploads via YouTube Data API v3. Maps `event_id` → YouTube video id in
`data/youtube_uploads.json` for idempotency.

Does **not** create the YouTube channel — that is a browser/Google Account step.
Requires Doppler OAuth secrets (see `youtube_upload.py` / README).

Usage:
  # Inventory + dry-run (no download/upload)
  doppler run -- uv run --project pipeline pipeline/upload_practice_to_youtube.py --dry-run --limit 5

  # Upload a few (private by default; respect API quota ~6/day on default 10k)
  doppler run -- uv run --project pipeline pipeline/upload_practice_to_youtube.py --limit 3

  # From published.json Blossom URLs (founder YouTube→Nostr archive) instead of relay
  doppler run -- uv run --project pipeline pipeline/upload_practice_to_youtube.py \\
    --from-published --limit 3
"""

from __future__ import annotations

import argparse
import asyncio
import json
import sys
import tempfile
from pathlib import Path

import httpx

from common import DATA_DIR, PUBLIC_RELAY, STATE_FILE
from mirror_practice_for_nostube import (
    fetch_practice_events,
    is_dojopop_practice,
    tag_value,
)
from youtube_upload import (
    YouTubeConfigError,
    list_channels,
    secrets_present,
    upload_video,
)

UPLOAD_STATE = DATA_DIR / "youtube_uploads.json"
APP_URL = "https://dojopop.live"
DEFAULT_TAGS = ["dojopop", "proofofpractice", "swordpractice", "Shorts"]


def load_upload_state() -> dict:
    if not UPLOAD_STATE.exists():
        return {}
    return json.loads(UPLOAD_STATE.read_text())


def save_upload_state(state: dict) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    UPLOAD_STATE.write_text(json.dumps(state, indent=2, ensure_ascii=False, sort_keys=True) + "\n")


def imeta_field(tags: list[list[str]], key: str) -> str | None:
    prefix = f"{key} "
    for tag in tags:
        if not tag or tag[0] != "imeta":
            continue
        for part in tag[1:]:
            if isinstance(part, str) and part.startswith(prefix):
                return part[len(prefix) :].strip()
    return None


def build_description(event: dict) -> str:
    tags = event.get("tags") or []
    title = tag_value(tags, "title") or ""
    content = (event.get("content") or "").strip()
    eid = event["id"]
    lines = [
        content or title or "DojoPop proof of practice",
        "",
        f"Nostr: {APP_URL}/v/{eid}",
        f"event: {eid}",
        "",
        "#dojopop #proofofpractice #Shorts",
    ]
    return "\n".join(lines)[:5000]


def event_title(event: dict) -> str:
    tags = event.get("tags") or []
    title = tag_value(tags, "title") or (event.get("content") or "").split("\n", 1)[0]
    title = (title or f"Practice {event['id'][:8]}").strip()
    # Shorts cue for ≤60s vertical clips
    if "#Shorts" not in title and "Shorts" not in title:
        if len(title) <= 90:
            title = f"{title} #Shorts"
    return title[:100]


def download_blossom(url: str, dest: Path, *, timeout: float = 300.0) -> None:
    with httpx.Client(timeout=httpx.Timeout(60.0, read=timeout), follow_redirects=True) as client:
        with client.stream("GET", url) as resp:
            resp.raise_for_status()
            with dest.open("wb") as fh:
                for chunk in resp.iter_bytes(1024 * 256):
                    fh.write(chunk)


def candidates_from_published() -> list[dict]:
    """Synthesize pseudo-events from data/published.json for founder archive."""
    if not STATE_FILE.exists():
        raise SystemExit(f"missing {STATE_FILE}")
    published = json.loads(STATE_FILE.read_text())
    out: list[dict] = []
    for yt_id, meta in published.items():
        if not isinstance(meta, dict):
            continue
        video_url = meta.get("video_url")
        if not video_url:
            continue
        event_id = meta.get("event_id") or f"published:{yt_id}"
        title = meta.get("title") or yt_id
        tags = [
            ["title", title],
            ["imeta", f"url {video_url}"],
            ["t", "dojopop"],
            ["t", "proofofpractice"],
            ["origin", "youtube", yt_id, f"https://www.youtube.com/watch?v={yt_id}"],
        ]
        if meta.get("video_sha256"):
            tags[1].append(f"x {meta['video_sha256']}")
        out.append(
            {
                "id": event_id,
                "kind": 22,
                "created_at": meta.get("published_at") or 0,
                "content": title,
                "tags": tags,
                "_source_yt_id": yt_id,
            }
        )
    out.sort(key=lambda e: e.get("created_at", 0), reverse=True)
    return out


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--limit", type=int, default=5, help="Max new uploads this run (quota-safe)")
    ap.add_argument("--relay", default=PUBLIC_RELAY)
    ap.add_argument(
        "--from-published",
        action="store_true",
        help="Use data/published.json Blossom URLs instead of live relay query",
    )
    ap.add_argument(
        "--privacy",
        choices=("private", "unlisted", "public"),
        default="private",
        help="YouTube privacy (default: private)",
    )
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument(
        "--sleep",
        type=float,
        default=2.0,
        help="Seconds between uploads (default: 2)",
    )
    args = ap.parse_args()

    if not secrets_present():
        print(
            "Missing YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET / YOUTUBE_REFRESH_TOKEN.\n"
            "Create the DojoPop Brand Account channel, then run:\n"
            "  pipeline/youtube_oauth_bootstrap.py\n"
            "See pipeline/README.md § Outbound YouTube upload.",
            file=sys.stderr,
        )
        return 2

    try:
        channels = list_channels()
    except YouTubeConfigError as exc:
        print(exc, file=sys.stderr)
        return 2
    except Exception as exc:
        print(f"OAuth / channels.list failed: {exc}", file=sys.stderr)
        return 1

    print("Authorized channels:")
    for ch in channels:
        sn = ch.get("snippet") or {}
        print(f"  {ch.get('id')}\t{sn.get('title')}")
    if not channels:
        print(
            "No YouTube channel on this Google account. Create Brand Account "
            "'DojoPop' in YouTube Studio first — API cannot create channels.",
            file=sys.stderr,
        )
        return 1

    state = load_upload_state()
    if args.from_published:
        candidates = candidates_from_published()
        print(f"Candidates from published.json: {len(candidates)}")
    else:
        # asyncio loop: fetch_practice_events is async
        candidates = asyncio.run(
            _async_candidates(args.relay, args.limit)
        )
        print(f"Practice candidates from {args.relay}: {len(candidates)}")

    uploaded = skipped = failed = 0
    pending = [e for e in candidates if e["id"] not in state]
    print(f"Already uploaded (state): {len(state)}; pending: {len(pending)}; this run limit: {args.limit}")

    for i, event in enumerate(pending[: args.limit], 1):
        url = imeta_field(event.get("tags") or [], "url")
        title = event_title(event)
        print(f"\n[{i}/{min(args.limit, len(pending))}] {event['id'][:16]}… {title!r}")
        if not url:
            print("  SKIP: no imeta url")
            failed += 1
            continue

        if args.dry_run:
            print(f"  [dry-run] would download {url}")
            print(f"  [dry-run] would upload privacy={args.privacy}")
            uploaded += 1
            continue

        try:
            with tempfile.TemporaryDirectory(prefix="dojopop-yt-") as tmp:
                dest = Path(tmp) / f"{event['id'][:16]}.mp4"
                print(f"  downloading {url} …")
                download_blossom(url, dest)
                print(f"  uploading ({dest.stat().st_size} bytes) …")
                result = upload_video(
                    dest,
                    title=title,
                    description=build_description(event),
                    tags=DEFAULT_TAGS,
                    privacy=args.privacy,
                    notify_subscribers=False,
                )
            vid = result.get("id")
            if not vid:
                raise RuntimeError(f"upload returned no id: {result!r}")
            entry = {
                "youtube_video_id": vid,
                "youtube_url": f"https://www.youtube.com/watch?v={vid}",
                "title": title,
                "blossom_url": url,
                "privacy": args.privacy,
                "source_yt_id": event.get("_source_yt_id"),
            }
            state[event["id"]] = entry
            save_upload_state(state)
            print(f"  OK {entry['youtube_url']}")
            uploaded += 1
        except Exception as exc:
            print(f"  ERROR: {exc}", file=sys.stderr)
            failed += 1

        if args.sleep > 0 and not args.dry_run:
            import time

            time.sleep(args.sleep)

    print(f"\nDone. uploaded={uploaded} skipped={skipped} failed={failed} state={UPLOAD_STATE}")
    return 1 if failed else 0


async def _async_candidates(relay: str, limit: int) -> list[dict]:
    events = await fetch_practice_events(relay, limit=max(limit * 5, 200))
    practice = [e for e in events if is_dojopop_practice(e)]
    practice.sort(key=lambda e: e.get("created_at", 0), reverse=True)
    return practice


if __name__ == "__main__":
    sys.exit(main())
