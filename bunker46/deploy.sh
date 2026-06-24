#!/usr/bin/env bash
# Deploy Bunker46 (dsbaars/bunker46) to relay-2 — primary at admin.dojopop.live :3002.
#
# Usage: ./deploy.sh [ssh-host]   (default: relay-2)
set -euo pipefail

HOST="${1:-relay-2}"
REMOTE_DIR="/opt/dojopop/bunker46"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
UPSTREAM_DIR="$SCRIPT_DIR/upstream"
COMMIT="$(tr -d '[:space:]' < "$SCRIPT_DIR/COMMIT")"
REPO_URL="https://github.com/dsbaars/bunker46.git"

echo "==> Ensuring upstream bunker46 @ ${COMMIT:0:12}..."
if [[ ! -d "$UPSTREAM_DIR/.git" ]]; then
  git clone "$REPO_URL" "$UPSTREAM_DIR"
fi
git -C "$UPSTREAM_DIR" fetch --depth 1 origin "$COMMIT" 2>/dev/null || git -C "$UPSTREAM_DIR" fetch origin
git -C "$UPSTREAM_DIR" checkout -q "$COMMIT"

echo "==> Applying DojoPop patches..."
chmod +x "$SCRIPT_DIR/scripts/apply-patches.sh"
"$SCRIPT_DIR/scripts/apply-patches.sh"

echo "==> Syncing .env from Doppler..."
chmod +x "$SCRIPT_DIR/scripts/sync-env.sh"
"$SCRIPT_DIR/scripts/sync-env.sh" /tmp/bunker46.env

echo "==> Deploying Bunker46 to ${HOST}:${REMOTE_DIR}"

ssh -o BatchMode=yes "$HOST" "mkdir -p '$REMOTE_DIR'"

rsync -az --delete \
  --exclude='node_modules' \
  --exclude='.env' \
  "$SCRIPT_DIR/" "$HOST:$REMOTE_DIR/"

scp -o BatchMode=yes /tmp/bunker46.env "$HOST:$REMOTE_DIR/.env"
ssh -o BatchMode=yes "$HOST" "chmod 600 '$REMOTE_DIR/.env'"

ssh -o BatchMode=yes "$HOST" "
  set -euo pipefail
  if ! docker compose version >/dev/null 2>&1; then
    apt-get update -qq && apt-get install -y -qq docker-compose-v2
  fi
  cd '$REMOTE_DIR'
  docker compose build
  docker compose up -d
  docker compose ps
  echo ''
  echo '==> Health check (localhost:3002):'
  curl -sS -o /dev/null -w 'HTTP %{http_code}\n' http://127.0.0.1:3002/ || true
"

echo "==> Done. Bunker46 on ${HOST}:3002 (tunnel: https://admin.dojopop.live)"
