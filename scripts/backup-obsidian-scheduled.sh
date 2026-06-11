#!/bin/bash
# Scheduled Obsidian backup (local log + Google Drive). Safe to run from launchd/cron.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOG_DIR="$HOME/Library/Logs/dojopop"
LOG_FILE="$LOG_DIR/obsidian-backup.log"
TOKEN="$HOME/.config/dojopop/drive-oauth-token.json"

mkdir -p "$LOG_DIR"

{
  echo "========== $(date '+%Y-%m-%d %H:%M:%S') =========="
  if [[ ! -f "$TOKEN" ]]; then
    echo "ERROR: missing $TOKEN — run authorize-drive.sh"
    exit 1
  fi
  cd "$ROOT"
  PYTHONUNBUFFERED=1 .venv-drive/bin/python3 scripts/backup-obsidian-to-drive.py --all
  echo "OK"
} >> "$LOG_FILE" 2>&1
