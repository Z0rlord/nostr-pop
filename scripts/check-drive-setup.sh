#!/usr/bin/env bash
# Quick status check for Drive backup setup
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CONFIG="$HOME/.config/dojopop/drive-backup.json"
OAUTH_CLIENT="$HOME/.config/dojopop/oauth-client.json"
OAUTH_TOKEN="$HOME/.config/dojopop/drive-oauth-token.json"
VENV="$ROOT/.venv-drive/bin/python3"

echo "DojoPop Drive backup — status"
echo "=============================="

check() { printf "  %-6s %s\n" "$1" "$2"; }

[[ -f "$CONFIG" ]] && check "OK" "config: $CONFIG" || check "MISS" "config: $CONFIG"
[[ -f "$ROOT/scripts/backup-to-drive.py" ]] && check "OK" "backup script" || check "MISS" "backup script"
command -v uv >/dev/null 2>&1 && check "OK" "uv ($(uv --version 2>/dev/null | head -1))" || check "MISS" "uv (install: astral.sh/uv)"
[[ -x "$VENV" ]] && check "OK" "python venv ($("$VENV" --version 2>/dev/null))" || check "MISS" "python venv — run scripts/setup-drive-venv.sh"
[[ -f "$OAUTH_CLIENT" ]] && check "OK" "oauth-client.json" || check "MISS" "oauth-client.json (GCP Desktop OAuth — required)"
[[ -f "$OAUTH_TOKEN" ]] && check "OK" "drive-oauth-token.json (authorized)" || check "MISS" "drive-oauth-token.json (run drive-oauth-setup.py)"

FOLDER=$(python3 -c "import json; print(json.load(open('$CONFIG')).get('drive_folder_id','?'))" 2>/dev/null || echo "?")
check "OK" "target folder: $FOLDER"

echo ""
echo "Dry run:"
"$VENV" "$ROOT/scripts/backup-to-drive.py" --dry-run 2>/dev/null | grep -E "sessions:|transcripts:|would upload" | head -5

echo ""
if [[ ! -f "$OAUTH_CLIENT" ]]; then
  echo "Next: create Desktop OAuth client → save as $OAUTH_CLIENT"
  echo "      https://console.cloud.google.com/apis/credentials?project=dojopop"
elif [[ ! -f "$OAUTH_TOKEN" ]]; then
  echo "Next: $VENV $ROOT/scripts/drive-oauth-setup.py"
else
  echo "Next: $VENV $ROOT/scripts/backup-to-drive.py"
fi
