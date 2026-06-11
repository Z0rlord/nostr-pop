#!/bin/bash
# Back up all Obsidian CouchDB vaults from vol1 to Google Drive
set -euo pipefail

cd "$(dirname "$0")/.."
PY=".venv-drive/bin/python3"
TOKEN="$HOME/.config/dojopop/drive-oauth-token.json"

if [[ ! -f "$TOKEN" ]]; then
  echo "No Google Drive token. Run first:"
  echo "  ~/Projects/dojopop/scripts/authorize-drive.sh"
  exit 1
fi

"$PY" scripts/backup-obsidian-to-drive.py --all "$@"
