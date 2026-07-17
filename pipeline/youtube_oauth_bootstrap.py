"""One-time browser OAuth to obtain YOUTUBE_REFRESH_TOKEN for Doppler.

Creates a local loopback server, opens the Google consent screen, exchanges
the auth code for tokens, and prints Doppler `secrets set` commands (secret
**names** only in prompts; the refresh token value is printed once for you to
pipe into Doppler — do not commit it).

Prereqs:
  1. Google Cloud project with YouTube Data API v3 enabled.
  2. OAuth client type "Desktop app" (or "Web" with http://127.0.0.1:8765/).
  3. YOUTUBE_CLIENT_ID + YOUTUBE_CLIENT_SECRET already in env (Doppler).
  4. DojoPop Brand Account channel already created in YouTube Studio
     (authorize as that Brand Account on the consent screen when prompted).

Usage:
  doppler run -- uv run --project pipeline pipeline/youtube_oauth_bootstrap.py
  # then:
  doppler secrets set YOUTUBE_REFRESH_TOKEN='…' --project dojopop --config prd_zorie
"""

from __future__ import annotations

import argparse
import hashlib
import http.server
import json
import os
import secrets
import sys
import threading
import time
import urllib.parse
import webbrowser
from pathlib import Path

import httpx

from youtube_upload import OAUTH_SCOPES, TOKEN_URL

AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
DEFAULT_PORT = 8765
REDIRECT_PATH = "/"


class _CodeHandler(http.server.BaseHTTPRequestHandler):
    code: str | None = None
    error: str | None = None

    def do_GET(self) -> None:  # noqa: N802
        parsed = urllib.parse.urlparse(self.path)
        qs = urllib.parse.parse_qs(parsed.query)
        if "error" in qs:
            _CodeHandler.error = qs["error"][0]
            body = b"<html><body><h1>OAuth error</h1><p>You can close this tab.</p></body></html>"
            self.send_response(400)
        elif "code" in qs:
            _CodeHandler.code = qs["code"][0]
            body = (
                b"<html><body><h1>DojoPop YouTube OAuth OK</h1>"
                b"<p>You can close this tab and return to the terminal.</p></body></html>"
            )
            self.send_response(200)
        else:
            body = b"<html><body><h1>Missing code</h1></body></html>"
            self.send_response(400)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format: str, *args) -> None:  # noqa: A003
        return


def exchange_code(
    *,
    client_id: str,
    client_secret: str,
    code: str,
    redirect_uri: str,
) -> dict:
    with httpx.Client(timeout=30.0) as client:
        resp = client.post(
            TOKEN_URL,
            data={
                "code": code,
                "client_id": client_id,
                "client_secret": client_secret,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
            },
        )
    if resp.status_code >= 400:
        raise SystemExit(f"token exchange failed ({resp.status_code}): {resp.text[:500]}")
    return resp.json()


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--port", type=int, default=DEFAULT_PORT)
    ap.add_argument(
        "--no-browser",
        action="store_true",
        help="Print the auth URL only; open it yourself",
    )
    args = ap.parse_args()

    client_id = os.environ.get("YOUTUBE_CLIENT_ID", "").strip()
    client_secret = os.environ.get("YOUTUBE_CLIENT_SECRET", "").strip()
    if not client_id or not client_secret:
        print(
            "Set YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET in Doppler first "
            "(Desktop OAuth client from Google Cloud Console), then re-run:\n"
            "  doppler run -- uv run --project pipeline pipeline/youtube_oauth_bootstrap.py",
            file=sys.stderr,
        )
        return 2

    redirect_uri = f"http://127.0.0.1:{args.port}{REDIRECT_PATH}"
    state = secrets.token_urlsafe(16)
    params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": " ".join(OAUTH_SCOPES),
        "access_type": "offline",
        "prompt": "consent",  # force refresh_token even if previously authorized
        "include_granted_scopes": "true",
        "state": state,
    }
    url = f"{AUTH_URL}?{urllib.parse.urlencode(params)}"

    server = http.server.HTTPServer(("127.0.0.1", args.port), _CodeHandler)
    thread = threading.Thread(target=server.handle_request, daemon=True)
    thread.start()

    print("Authorize the **DojoPop Brand Account** (not your personal channel) when Google asks.")
    print(f"Redirect URI registered on the OAuth client must include:\n  {redirect_uri}\n")
    print(url)
    if not args.no_browser:
        webbrowser.open(url)

    deadline = time.time() + 300
    while time.time() < deadline and _CodeHandler.code is None and _CodeHandler.error is None:
        time.sleep(0.2)
    server.server_close()

    if _CodeHandler.error:
        print(f"OAuth error: {_CodeHandler.error}", file=sys.stderr)
        return 1
    if not _CodeHandler.code:
        print("Timed out waiting for browser consent.", file=sys.stderr)
        return 1

    tokens = exchange_code(
        client_id=client_id,
        client_secret=client_secret,
        code=_CodeHandler.code,
        redirect_uri=redirect_uri,
    )
    refresh = tokens.get("refresh_token")
    if not refresh:
        print(
            "No refresh_token in response. Revoke prior grants at "
            "https://myaccount.google.com/permissions and re-run with prompt=consent.",
            file=sys.stderr,
        )
        print(json.dumps({k: ("…" if k.endswith("token") else v) for k, v in tokens.items()}, indent=2))
        return 1

    # Fingerprint only — never write the token to a tracked file.
    fp = hashlib.sha256(refresh.encode()).hexdigest()[:12]
    print("\n--- success ---")
    print(f"refresh_token fingerprint (sha256 prefix): {fp}")
    print("Store in Doppler (paste the token value yourself; do not commit it):\n")
    print("  doppler secrets set YOUTUBE_REFRESH_TOKEN --project dojopop --config prd_zorie")
    print("  # (doppler will prompt for the value interactively)\n")
    print("Or non-interactive (shell history risk — prefer interactive):\n")
    print(f"  doppler secrets set YOUTUBE_REFRESH_TOKEN={refresh!r} --project dojopop --config prd_zorie")
    print("\nOptional — after --list-channels, pin the Brand Account UC… id:")
    print("  doppler secrets set YOUTUBE_UPLOAD_CHANNEL_ID=UC… --project dojopop --config prd_zorie")
    print("\nVerify:")
    print("  doppler run -- uv run --project pipeline pipeline/youtube_upload.py --list-channels")

    # Offer a local untracked scratch file under /tmp only.
    scratch = Path(f"/tmp/dojopop-youtube-refresh-{fp}.txt")
    scratch.write_text(refresh + "\n", encoding="utf-8")
    scratch.chmod(0o600)
    print(f"\nAlso wrote refresh token once to {scratch} (chmod 600). Delete after Doppler set.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
