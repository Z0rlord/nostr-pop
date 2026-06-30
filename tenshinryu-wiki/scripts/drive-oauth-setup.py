#!/usr/bin/env python3
"""One-time OAuth setup for Tenshinryu wiki Drive sync (read-only)."""

from __future__ import annotations

import sys
from pathlib import Path

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials

try:
    from google_auth_oauthlib.flow import InstalledAppFlow
except ImportError:
    print("Install: uv run --project . pip install google-auth-oauthlib", file=sys.stderr)
    raise SystemExit(1)

SCOPES = ["https://www.googleapis.com/auth/drive.readonly"]
DEFAULT_CLIENT = Path.home() / ".config/dojopop/oauth-client.json"
DEFAULT_TOKEN = Path.home() / ".config/dojopop/tenshinryu-wiki-drive-token.json"


def main() -> int:
    client = DEFAULT_CLIENT
    token = DEFAULT_TOKEN

    if not client.exists():
        print(f"Missing OAuth client: {client}", file=sys.stderr)
        print("Create Desktop OAuth client in GCP, save as oauth-client.json", file=sys.stderr)
        return 1

    creds: Credentials | None = None
    if token.exists():
        creds = Credentials.from_authorized_user_file(str(token), SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(str(client), SCOPES)
            creds = flow.run_local_server(port=0)
        token.parent.mkdir(parents=True, exist_ok=True)
        token.write_text(creds.to_json(), encoding="utf-8")

    print(f"Token saved: {token}")
    print("Scopes: drive.readonly — can list/download your books folder")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
