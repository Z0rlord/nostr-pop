"""Shared helpers for the DojoPop video pipeline."""

from __future__ import annotations

import hashlib
import json
import shutil
import subprocess
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = REPO_ROOT / "data"
VIDEOS_DIR = DATA_DIR / "videos"
THUMBS_DIR = DATA_DIR / "thumbs"
STATE_FILE = DATA_DIR / "published.json"

DEFAULT_BLOSSOM = "https://blossom.yakihonne.com"
DEFAULT_RELAYS = [
    "wss://nostr-01.yakihonne.com",
    "wss://nostr-02.yakihonne.com",
    "wss://relay.damus.io",
    "wss://nos.lol",
]
DEFAULT_HASHTAGS = ["swordpractice", "dojopop", "proofofpractice"]


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def find_ffmpeg() -> str:
    """Prefer system ffmpeg; fall back to the static binary from imageio-ffmpeg."""
    found = shutil.which("ffmpeg") or shutil.which("ffmpeg", path="/opt/homebrew/bin:/usr/local/bin")
    if found:
        return found
    import imageio_ffmpeg

    return imageio_ffmpeg.get_ffmpeg_exe()


def make_thumbnail(video: Path, out_dir: Path, seek_sec: float = 1.0) -> Path:
    """Grab a single frame as a JPEG thumbnail."""
    out_dir.mkdir(parents=True, exist_ok=True)
    out = out_dir / f"{video.stem}.jpg"
    cmd = [
        find_ffmpeg(),
        "-y",
        "-ss",
        str(seek_sec),
        "-i",
        str(video),
        "-frames:v",
        "1",
        "-vf",
        "scale='min(1280,iw)':-2",
        "-q:v",
        "3",
        str(out),
    ]
    subprocess.run(cmd, check=True, capture_output=True)
    return out


def load_state(path: Path = STATE_FILE) -> dict:
    if path.exists():
        return json.loads(path.read_text())
    return {}


def save_state(state: dict, path: Path = STATE_FILE) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(state, indent=2, sort_keys=True))
    tmp.replace(path)
