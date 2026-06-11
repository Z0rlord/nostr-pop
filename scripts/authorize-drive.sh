#!/bin/bash
# Fresh Google Drive OAuth + Obsidian backup (kills stale listeners first)
set -euo pipefail

cd "$(dirname "$0")/.."
PY=".venv-drive/bin/python3"
CONFIG_DIR="$HOME/.config/dojopop"
LOG="/tmp/dojopop-oauth-fresh.log"

echo "=== Stopping stale OAuth on port 8765 ==="
if lsof -ti :8765 >/dev/null 2>&1; then
  lsof -ti :8765 | xargs kill -9 2>/dev/null || true
  sleep 1
fi
if lsof -ti :8765 >/dev/null 2>&1; then
  echo "ERROR: port 8765 still in use. Run: lsof -ti :8765 | xargs kill -9"
  exit 1
fi
echo "Port 8765 free."

rm -f "$CONFIG_DIR/drive-oauth-token.json"

echo ""
echo "=== Google OAuth (sign in as zbarber@gmail.com) ==="
"$PY" -u <<'PY'
from pathlib import Path
from google_auth_oauthlib.flow import InstalledAppFlow

SCOPES = ["https://www.googleapis.com/auth/drive.file"]
CLIENT = Path.home() / ".config/dojopop/oauth-client.json"
TOKEN = Path.home() / ".config/dojopop/drive-oauth-token.json"

flow = InstalledAppFlow.from_client_secrets_file(str(CLIENT), SCOPES)
creds = flow.run_local_server(
    port=8765,
    open_browser=True,
    authorization_prompt_message="Open this URL in your browser:\n{url}",
    success_message="OAuth complete! You can close this tab.",
)
TOKEN.write_text(creds.to_json())
print("TOKEN_SAVED")
PY

echo ""
echo "=== Backup all Obsidian vaults to Google Drive ==="
"$PY" scripts/backup-obsidian-to-drive.py --all

echo ""
echo "Done → Google Drive: cursor backup / obsidian-backups/<vault-name>/"
