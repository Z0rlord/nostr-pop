"""Upload a blob to a Blossom server (BUD-02/BUD-06).

Signs a kind-24242 authorization event with NOSTR_NSEC (from the environment,
injected via `doppler run --`), preflights with HEAD /upload, then PUT /upload.
Prints/returns the BlobDescriptor JSON.

Usage:
    doppler run -- uv run --project pipeline pipeline/blossom_upload.py \
        --file data/videos/<id>.mp4 [--server https://blossom.yakihonne.com]
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
) -> dict:
    """Upload `file`; return the server's BlobDescriptor dict."""
    signer = signer or Signer.from_env()
    server = server.rstrip("/")
    sha256 = sha256_file(file)
    size = file.stat().st_size
    content_type = content_type or mimetypes.guess_type(file.name)[0] or "application/octet-stream"

    event = build_upload_auth(signer, sha256, f"Upload {file.name}")
    headers = {"Authorization": auth_header(event)}

    with httpx.Client(timeout=httpx.Timeout(30.0, write=600.0, read=600.0)) as client:
        # BUD-06 preflight: lets the server reject before we send the body.
        head = client.head(
            f"{server}/upload",
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

        with open(file, "rb") as f:
            resp = client.put(
                f"{server}/upload",
                content=f.read(),
                headers={
                    **headers,
                    "Content-Type": content_type,
                    "Content-Length": str(size),
                },
            )
    if resp.status_code not in (200, 201):
        reason = resp.headers.get("x-reason", resp.text[:300])
        raise RuntimeError(f"upload failed ({resp.status_code}): {reason}")

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
    args = ap.parse_args()

    descriptor = upload(args.file, args.server, content_type=args.content_type)
    print(json.dumps(descriptor, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
