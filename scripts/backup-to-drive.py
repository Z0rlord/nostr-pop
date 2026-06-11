#!/usr/bin/env python3
"""Back up DojoPop session notes and Cursor transcripts to Google Drive."""

from __future__ import annotations

import argparse
import json
import mimetypes
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

from google.auth.transport.requests import Request
from google.oauth2 import service_account
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

try:
    from google_auth_oauthlib.flow import InstalledAppFlow
except ImportError:
    InstalledAppFlow = None  # type: ignore

SCOPES = ["https://www.googleapis.com/auth/drive.file"]
SCOPES_IMPERSONATE = ["https://www.googleapis.com/auth/drive"]

DEFAULT_CONFIG = Path.home() / ".config/dojopop/drive-backup.json"
DEFAULT_SA_KEY = Path.home() / "Desktop/AAA DojoPop.xyz/Keys/dojopop-firebase-adminsdk-k70ab-cb86e13617.json"
DEFAULT_OAUTH_CLIENT = Path.home() / ".config/dojopop/oauth-client.json"
DEFAULT_OAUTH_TOKEN = Path.home() / ".config/dojopop/drive-oauth-token.json"
DEFAULT_FOLDER_ID = "1nEC-WUSO-t1wLMyFZhBqthYqS0vCQck0"  # cursor backup (zbarber@gmail.com)

REDACT_PATTERNS = [
    (re.compile(r"nsec1[a-z0-9]+", re.I), "[REDACTED_NSEC]"),
    (re.compile(r"npub1[a-z0-9]+", re.I), "[REDACTED_NPUB]"),
    (re.compile(r"pst_[A-Za-z0-9:_-]+", re.I), "[REDACTED_PAT]"),
    (re.compile(r"-----BEGIN (?:RSA )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA )?PRIVATE KEY-----"), "[REDACTED_PRIVATE_KEY]"),
    (re.compile(r'"private_key"\s*:\s*"[^"]*"'), '"private_key": "[REDACTED]"'),
]


def load_config(path: Path) -> dict:
    if path.exists():
        with path.open() as f:
            return json.load(f)
    return {}


def redact_text(text: str) -> str:
    for pattern, repl in REDACT_PATTERNS:
        text = pattern.sub(repl, text)
    return text


def get_oauth_credentials(client_secrets: Path, token_path: Path) -> Credentials:
    if InstalledAppFlow is None:
        raise RuntimeError("google-auth-oauthlib not installed")

    creds = None
    if token_path.exists():
        creds = Credentials.from_authorized_user_file(str(token_path), SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not client_secrets.exists():
                raise FileNotFoundError(
                    f"OAuth client missing: {client_secrets}\n"
                    "Run: scripts/drive-oauth-setup.py (after creating Desktop OAuth client in GCP)"
                )
            flow = InstalledAppFlow.from_client_secrets_file(str(client_secrets), SCOPES)
            creds = flow.run_local_server(port=0)
        token_path.parent.mkdir(parents=True, exist_ok=True)
        token_path.write_text(creds.to_json(), encoding="utf-8")

    return creds


def get_drive_service(cfg: dict):
    auth_mode = cfg.get("auth_mode", "oauth")
    if auth_mode == "oauth":
        client = Path(cfg.get("oauth_client_secrets", DEFAULT_OAUTH_CLIENT)).expanduser()
        token = Path(cfg.get("oauth_token", DEFAULT_OAUTH_TOKEN)).expanduser()
        creds = get_oauth_credentials(client, token)
        return build("drive", "v3", credentials=creds, cache_discovery=False)

    sa_key = Path(cfg.get("service_account_key", os.environ.get("DOJOPOP_GSA_KEY", DEFAULT_SA_KEY))).expanduser()
    if not sa_key.exists():
        raise FileNotFoundError(f"service account key not found: {sa_key}")
    impersonate = cfg.get("impersonate_user") or os.environ.get("DOJOPOP_DRIVE_IMPERSONATE")
    scopes = SCOPES_IMPERSONATE if impersonate else SCOPES
    creds = service_account.Credentials.from_service_account_file(str(sa_key), scopes=scopes)
    if impersonate:
        creds = creds.with_subject(impersonate)
    return build("drive", "v3", credentials=creds, cache_discovery=False)


def find_child_folder(service, parent_id: str, name: str) -> str | None:
    q = (
        f"'{parent_id}' in parents and name='{name}' and "
        "mimeType='application/vnd.google-apps.folder' and trashed=false"
    )
    res = service.files().list(q=q, fields="files(id,name)", pageSize=1, supportsAllDrives=True).execute()
    files = res.get("files", [])
    return files[0]["id"] if files else None


def ensure_folder(service, parent_id: str, name: str) -> str:
    existing = find_child_folder(service, parent_id, name)
    if existing:
        return existing
    meta = {"name": name, "mimeType": "application/vnd.google-apps.folder", "parents": [parent_id]}
    created = service.files().create(body=meta, fields="id", supportsAllDrives=True).execute()
    return created["id"]


def find_file_by_name(service, parent_id: str, name: str) -> str | None:
    q = f"'{parent_id}' in parents and name='{name}' and trashed=false"
    res = service.files().list(q=q, fields="files(id,name)", pageSize=1, supportsAllDrives=True).execute()
    files = res.get("files", [])
    return files[0]["id"] if files else None


def upload_file(service, parent_id: str, local_path: Path, remote_name: str | None = None, redact: bool = False) -> str:
    name = remote_name or local_path.name
    media_path = local_path
    temp_path: Path | None = None

    if redact:
        content = redact_text(local_path.read_text(encoding="utf-8", errors="replace"))
        temp_path = local_path.with_suffix(local_path.suffix + ".redacted")
        temp_path.write_text(content, encoding="utf-8")
        media_path = temp_path

    mime, _ = mimetypes.guess_type(name)
    media = MediaFileUpload(str(media_path), mimetype=mime or "application/octet-stream", resumable=True)

    existing_id = find_file_by_name(service, parent_id, name)
    if existing_id:
        updated = (
            service.files()
            .update(
                fileId=existing_id,
                media_body=media,
                fields="id,name,modifiedTime",
                supportsAllDrives=True,
            )
            .execute()
        )
        file_id = updated["id"]
        action = "updated"
    else:
        meta = {"name": name, "parents": [parent_id]}
        created = (
            service.files()
            .create(body=meta, media_body=media, fields="id,name", supportsAllDrives=True)
            .execute()
        )
        file_id = created["id"]
        action = "created"

    if temp_path and temp_path.exists():
        temp_path.unlink()

    return f"{action}:{file_id}"


def collect_transcripts(root: Path) -> list[Path]:
    if not root.exists():
        return []
    return sorted(root.glob("**/*.jsonl"))


def main() -> int:
    parser = argparse.ArgumentParser(description="Back up DojoPop chats to Google Drive")
    parser.add_argument("--config", type=Path, default=DEFAULT_CONFIG)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    cfg = load_config(args.config)
    folder_id = cfg.get("drive_folder_id", os.environ.get("DOJOPOP_DRIVE_FOLDER_ID", DEFAULT_FOLDER_ID))
    sessions_dir = Path(cfg.get("sessions_dir", "/Users/perseus-air/Projects/dojopop/docs/sessions")).expanduser()
    transcripts_dir = Path(
        cfg.get(
            "transcripts_dir",
            "/Users/perseus-air/.cursor/projects/empty-window/agent-transcripts",
        )
    ).expanduser()

    session_files = sorted(sessions_dir.glob("*.md"))
    transcript_files = collect_transcripts(transcripts_dir)

    print(f"auth mode: {cfg.get('auth_mode', 'oauth')}")
    print(f"drive folder: {folder_id}")
    print(f"sessions: {len(session_files)} file(s)")
    print(f"transcripts: {len(transcript_files)} file(s)")

    if args.dry_run:
        for p in session_files:
            print(f"  would upload session: {p.name}")
        for p in transcript_files:
            print(f"  would upload transcript (redacted): {p}")
        return 0

    try:
        service = get_drive_service(cfg)
    except FileNotFoundError as e:
        print(f"error: {e}", file=sys.stderr)
        return 1

    sessions_folder = ensure_folder(service, folder_id, "cursor-sessions")
    transcripts_folder = ensure_folder(service, folder_id, "cursor-transcripts")

    results = []
    for path in session_files:
        result = upload_file(service, sessions_folder, path)
        results.append(f"sessions/{path.name} -> {result}")
        print(f"uploaded sessions/{path.name} ({result})")

    for path in transcript_files:
        remote_name = path.name
        result = upload_file(service, transcripts_folder, path, remote_name=remote_name, redact=True)
        results.append(f"transcripts/{remote_name} -> {result}")
        print(f"uploaded transcripts/{remote_name} ({result})")

    manifest = {
        "backed_up_at": datetime.now(timezone.utc).isoformat(),
        "auth_mode": cfg.get("auth_mode", "oauth"),
        "drive_folder_id": folder_id,
        "sessions_folder_id": sessions_folder,
        "transcripts_folder_id": transcripts_folder,
        "results": results,
    }
    manifest_path = sessions_dir / ".last-drive-backup.json"
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    upload_file(service, sessions_folder, manifest_path, remote_name="last-backup-manifest.json")
    print("done")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
