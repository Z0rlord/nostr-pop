#!/usr/bin/env python3
"""One-time Google OAuth setup for Drive backup (personal Gmail)."""

from __future__ import annotations

import json
import sys
from pathlib import Path

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow

SCOPES = ["https://www.googleapis.com/auth/drive.file"]
CONFIG_DIR = Path.home() / ".config/dojopop"
CLIENT_SECRETS = CONFIG_DIR / "oauth-client.json"
TOKEN_PATH = CONFIG_DIR / "drive-oauth-token.json"


def main() -> int:
    if not CLIENT_SECRETS.exists():
        print(f"error: missing OAuth client file: {CLIENT_SECRETS}", file=sys.stderr)
        print("", file=sys.stderr)
        print("Create a Desktop OAuth client in GCP (project: dojopop):", file=sys.stderr)
        print("  1. https://console.cloud.google.com/apis/credentials?project=dojopop", file=sys.stderr)
        print("  2. Create credentials → OAuth client ID → Desktop app", file=sys.stderr)
        print("  3. Download JSON → save as:", file=sys.stderr)
        print(f"     {CLIENT_SECRETS}", file=sys.stderr)
        print("  4. Enable Google Drive API for the project", file=sys.stderr)
        return 1

    creds = None
    if TOKEN_PATH.exists():
        creds = Credentials.from_authorized_user_file(str(TOKEN_PATH), SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(str(CLIENT_SECRETS), SCOPES)
            try:
                creds = flow.run_local_server(port=0, open_browser=True)
            except Exception:
                print("Browser open failed — paste the URL below into your browser, then paste the auth code here.")
                creds = flow.run_console()
        TOKEN_PATH.write_text(creds.to_json(), encoding="utf-8")

    print(f"token saved: {TOKEN_PATH}")
    print("run backup:")
    print("  .venv-drive/bin/python3 scripts/backup-to-drive.py")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
