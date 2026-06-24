"""Download YouTube videos (channel / playlist / single URL) with yt-dlp.

Prefers mp4, writes the yt-dlp info JSON next to each video, and can filter
to short practice clips via --max-duration (default 60 s in pipeline.py).

Usage:
    uv run --project pipeline pipeline/download_youtube.py --url <URL> [--max-duration 60]
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import yt_dlp

from common import VIDEOS_DIR, find_ffmpeg

MP4_FORMAT = "bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]/bv*+ba/b"


def get_tab_video_ids(url: str) -> set[str]:
    """Authoritative id set for a channel-tab URL via a flat-playlist pass."""
    with yt_dlp.YoutubeDL({"extract_flat": True, "quiet": True, "noprogress": True}) as ydl:
        info = ydl.extract_info(url, download=False)
    entries = info.get("entries") or []
    return {e["id"] for e in entries if e and e.get("id")}


def download(url: str, out_dir: Path, max_duration: int | None = None) -> list[dict]:
    """Download videos; return a list of normalized metadata dicts.

    Each dict: {id, title, duration, width, height, upload_date, webpage_url,
                filepath, info_json}
    """
    out_dir.mkdir(parents=True, exist_ok=True)

    # GUARD: for a /shorts tab URL, pin the exact id set of that tab up front.
    # yt-dlp can normalize handle/tab URLs in surprising ways; anything it
    # downloads that is not in the tab's own flat listing is rejected, so a
    # full-channel expansion can never leak into publishing.
    allowed_ids: set[str] | None = None
    if "/shorts" in url:
        allowed_ids = get_tab_video_ids(url)
        if not allowed_ids:
            raise RuntimeError(f"shorts guard: flat-playlist returned no ids for {url}")
        print(f"[guard] shorts tab pinned to {len(allowed_ids)} video ids")

    ydl_opts: dict = {
        "format": MP4_FORMAT,
        "merge_output_format": "mp4",
        "outtmpl": str(out_dir / "%(id)s.%(ext)s"),
        "writeinfojson": True,
        "ignoreerrors": "only_download",
        "ffmpeg_location": find_ffmpeg(),
        "noprogress": True,
    }
    if max_duration is not None:
        ydl_opts["match_filter"] = yt_dlp.utils.match_filter_func(
            f"duration <= {max_duration}"
        )

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=True)

    entries = info.get("entries") or [info]
    results: list[dict] = []
    for entry in entries:
        if not entry:
            continue
        reqs = entry.get("requested_downloads") or []
        filepath = reqs[0].get("filepath") if reqs else None
        if not filepath:
            # filtered out (duration) or download failed
            continue
        results.append(normalize_entry(entry, Path(filepath)))

    if allowed_ids is not None:
        violations = [r["id"] for r in results if r["id"] not in allowed_ids]
        assert not violations, (
            f"shorts guard: yt-dlp returned {len(violations)} video(s) outside "
            f"the {url} tab listing: {violations} — refusing to continue"
        )
    return results


def normalize_entry(entry: dict, filepath: Path) -> dict:
    info_json = filepath.with_suffix(".info.json")
    return {
        "id": entry.get("id"),
        "title": entry.get("title"),
        "duration": entry.get("duration"),
        "width": entry.get("width"),
        "height": entry.get("height"),
        "upload_date": entry.get("upload_date"),
        "timestamp": entry.get("timestamp"),
        "webpage_url": entry.get("webpage_url"),
        "description": entry.get("description") or "",
        "filepath": str(filepath),
        "info_json": str(info_json) if info_json.exists() else None,
    }


def load_downloaded(out_dir: Path) -> list[dict]:
    """Rebuild metadata from previously downloaded *.info.json files."""
    results = []
    for ij in sorted(out_dir.glob("*.info.json")):
        entry = json.loads(ij.read_text())
        video = out_dir / f"{entry['id']}.mp4"
        if video.exists():
            results.append(normalize_entry(entry, video))
    return results


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--url", required=True, help="YouTube channel/playlist/video URL")
    ap.add_argument("--output-dir", type=Path, default=VIDEOS_DIR)
    ap.add_argument(
        "--max-duration",
        type=int,
        default=None,
        help="Skip videos longer than this many seconds (default: no filter; pipeline defaults to 60)",
    )
    args = ap.parse_args()

    results = download(args.url, args.output_dir, args.max_duration)
    print(json.dumps(results, indent=2))
    return 0 if results else 1


if __name__ == "__main__":
    sys.exit(main())
