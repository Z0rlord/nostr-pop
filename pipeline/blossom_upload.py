"""Upload a blob to a Blossom server (BUD-02/BUD-06 or BUD-05 /media).

Signs a kind-24242 authorization event with NOSTR_NSEC (from the environment,
injected via `doppler run --`), preflights with HEAD, then PUT.

Endpoints:
  upload (default) — raw blob, no server transcode. Use for large masters
      (e.g. feature films) and for practice clips already transcoded by pipeline/.
  media — server ffmpeg per blossom-server config (480p for DojoPop). Do not use
      for feature films; pipeline/ never calls this (client-side 480p/60s instead).

Usage:
    # Large master (passthrough PUT /upload)
    doppler run -- uv run --project pipeline pipeline/blossom_upload.py \
        --file /path/to/yoga-sutra-master.mp4

    # Practice clip after pipeline transcode (also PUT /upload — same default)
    doppler run -- uv run --project pipeline pipeline/blossom_upload.py \
        --file data/videos/<id>.upload.mp4
"""

from __future__ import annotations

import argparse
import base64
import json
import mimetypes
import sys
import time
from pathlib import Path

import httpx

UPLOAD_RETRIES = 3
RETRY_BACKOFF_SEC = 3.0  # 3s, 6s, 12s

from common import DEFAULT_BLOSSOM, sha256_file
from nostr_util import Signer, verify_event

AUTH_KIND = 24242
AUTH_TTL_SEC = 600


def build_upload_auth(signer: Signer, sha256: str, description: str) -> dict:
    tags = [
        ["t", "upload"],
        ["x", sha256],
        ["expiration", str(int(time.time()) + AUTH_TTL_SEC)],
    ]
    event = signer.sign_event(kind=AUTH_KIND, content=description, tags=tags)
    assert verify_event(event), "auth event failed local signature verification"
    return event


def auth_header(event: dict) -> str:
    return "Nostr " + base64.b64encode(
        json.dumps(event, separators=(",", ":"), ensure_ascii=False).encode()
    ).decode()


def upload(
    file: Path,
    server: str = DEFAULT_BLOSSOM,
    signer: Signer | None = None,
    content_type: str | None = None,
    endpoint: str = "upload",
) -> dict:
    """Upload `file`; return the server's BlobDescriptor dict.

    endpoint: ``upload`` (BUD-02, passthrough) or ``media`` (BUD-05, server transcode).
    """
    if endpoint not in ("upload", "media"):
        raise ValueError(f"endpoint must be 'upload' or 'media', got {endpoint!r}")
    signer = signer or Signer.from_env()
    server = server.rstrip("/")
    sha256 = sha256_file(file)
    size = file.stat().st_size
    content_type = content_type or mimetypes.guess_type(file.name)[0] or "application/octet-stream"

    event = build_upload_auth(signer, sha256, f"Upload {file.name}")
    headers = {"Authorization": auth_header(event)}
    path = f"/{endpoint}"
    # ~1 MB/s floor for large masters (e.g. 4 GB ≈ 70 min write budget).
    write_timeout = max(600.0, size / (1024 * 1024))

    with httpx.Client(timeout=httpx.Timeout(30.0, write=write_timeout, read=write_timeout)) as client:
        # BUD-06 preflight: lets the server reject before we send the body.
        head = client.head(
            f"{server}{path}",
            headers={
                **headers,
                "X-SHA-256": sha256,
                "X-Content-Length": str(size),
                "X-Content-Type": content_type,
            },
        )
        if head.status_code not in (200, 404, 405):
            reason = head.headers.get("x-reason", head.reason_phrase)
            raise RuntimeError(f"preflight rejected ({head.status_code}): {reason}")

        resp = None
        for attempt in range(1, UPLOAD_RETRIES + 1):
            try:
                with open(file, "rb") as f:
                    resp = client.put(
                        f"{server}{path}",
                        content=f,
                        headers={
                            **headers,
                            "Content-Type": content_type,
                            "Content-Length": str(size),
                        },
                    )
            except httpx.TransportError as exc:
                if attempt == UPLOAD_RETRIES:
                    raise RuntimeError(f"upload failed after {attempt} attempts: {exc}") from exc
                resp = None
            # retry only transient server errors; 4xx are permanent
            if resp is not None and resp.status_code < 500:
                break
            if attempt < UPLOAD_RETRIES:
                time.sleep(RETRY_BACKOFF_SEC * (2 ** (attempt - 1)))
    if resp is None or resp.status_code not in (200, 201):
        reason = resp.headers.get("x-reason", resp.text[:300]) if resp is not None else "no response"
        status = resp.status_code if resp is not None else "n/a"
        raise RuntimeError(f"upload failed ({status}): {reason}")

    descriptor = resp.json()
    if descriptor.get("sha256") != sha256:
        raise RuntimeError(
            f"server returned mismatched sha256: {descriptor.get('sha256')} != {sha256}"
        )
    return descriptor


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--file", required=True, type=Path)
    ap.add_argument("--server", default=DEFAULT_BLOSSOM)
    ap.add_argument("--content-type", default=None)
    ap.add_argument(
        "--endpoint",
        choices=("upload", "media"),
        default="upload",
        help="upload = raw blob (default; feature films + pipeline). "
        "media = server transcode (480p on DojoPop blossom).",
    )
    args = ap.parse_args()

    descriptor = upload(
        args.file,
        args.server,
        content_type=args.content_type,
        endpoint=args.endpoint,
    )
    print(json.dumps(descriptor, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
