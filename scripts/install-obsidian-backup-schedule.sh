#!/bin/bash
# Install daily 5:00 AM Obsidian → Google Drive backup (Mac must be awake/on network)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PLIST_SRC="$ROOT/scripts/com.dojopop.obsidian-backup.plist"
PLIST_DST="$HOME/Library/LaunchAgents/com.dojopop.obsidian-backup.plist"

chmod +x "$ROOT/scripts/backup-obsidian-vaults.sh"
chmod +x "$ROOT/scripts/backup-obsidian-scheduled.sh"
mkdir -p "$HOME/Library/Logs/dojopop"
mkdir -p "$HOME/Library/LaunchAgents"

cp "$PLIST_SRC" "$PLIST_DST"
launchctl bootout "gui/$(id -u)/com.dojopop.obsidian-backup" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST_DST"
launchctl enable "gui/$(id -u)/com.dojopop.obsidian-backup"

echo "Installed: com.dojopop.obsidian-backup"
echo "Schedule: daily at 5:00 AM"
echo "Log: ~/Library/Logs/dojopop/obsidian-backup.log"
echo ""
echo "Test now:"
echo "  $ROOT/scripts/backup-obsidian-scheduled.sh"
echo "  tail ~/Library/Logs/dojopop/obsidian-backup.log"
