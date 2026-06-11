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
PREVIEW_DIR = DATA_DIR / "preview"
STATE_FILE = DATA_DIR / "published.json"
DEFAULT_METADATA_CONFIG = Path(__file__).resolve().parent / "metadata.yml"

DEFAULT_BLOSSOM = "https://blossom.yakihonne.com"

# Self-hosted DojoPop relays (nostr-rs-relay on relay-2).
# Published to FIRST (sequentially); failures are tolerated like any other relay.
PRIMARY_RELAY = "ws://relay-2:7777"  # tailnet; kept for backward compat
PUBLIC_RELAY = "wss://relay.dojopop.live"  # Cloudflare Tunnel (public wss)
PRIMARY_RELAYS = [PRIMARY_RELAY, PUBLIC_RELAY]
# "relay-2" is an SSH alias, not DNS — map to the Tailscale IP at connect time.
RELAY_HOST_ALIASES = {"relay-2": "100.125.184.46"}

DEFAULT_RELAYS = [
    *PRIMARY_RELAYS,
    "wss://nostr-01.yakihonne.com",
    "wss://relay.damus.io",
    "wss://nos.lol",
]


def relay_connect_url(relay: str) -> str:
    """Rewrite tailnet alias hostnames to their IPs for the actual connection."""
    from urllib.parse import urlparse

    host = urlparse(relay).hostname
    if host in RELAY_HOST_ALIASES:
        return relay.replace(host, RELAY_HOST_ALIASES[host], 1)
    return relay
DEFAULT_HASHTAGS = ["swordpractice", "dojopop", "proofofpractice"]

# Defaults for event metadata; pipeline/metadata.yml (or --config) overrides.
METADATA_DEFAULTS: dict = {
    "kind": 22,
    "hashtags": DEFAULT_HASHTAGS,
    "extra_hashtags": [],
    "content_template": "{title}\n\n{description}",
    "alt_template": "Short practice video: {title}",
    "content_warning": None,
}


def load_metadata_config(path: Path | None = None) -> dict:
    """Merge metadata.yml (if present) over METADATA_DEFAULTS."""
    import yaml

    config = dict(METADATA_DEFAULTS)
    path = path or DEFAULT_METADATA_CONFIG
    if path.exists():
        loaded = yaml.safe_load(path.read_text()) or {}
        for key, value in loaded.items():
            if key not in METADATA_DEFAULTS:
                raise SystemExit(f"unknown metadata config key: {key!r} in {path}")
            config[key] = value
    return config


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
