#!/usr/bin/env bash
# Deploy admin placeholder to relay-2 — admin.dojopop.live :3002
#
# Usage: ./deploy.sh [ssh-host]   (default: relay-2)
set -euo pipefail

HOST="${1:-relay-2}"
REMOTE_DIR="/opt/dojopop/admin"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "==> Deploying admin placeholder to ${HOST}:${REMOTE_DIR}"

ssh -o BatchMode=yes "$HOST" "mkdir -p '$REMOTE_DIR'"

rsync -az --delete \
  "$SCRIPT_DIR/" "$HOST:$REMOTE_DIR/"

ssh -o BatchMode=yes "$HOST" "
  set -euo pipefail
  if ! docker compose version >/dev/null 2>&1; then
    apt-get update -qq && apt-get install -y -qq docker-compose-v2
  fi
  cd '$REMOTE_DIR'
  docker compose up -d --force-recreate
  docker compose ps
  echo ''
  echo '==> Health check (localhost:3002):'
  curl -sS -o /dev/null -w 'HTTP %{http_code}\n' http://127.0.0.1:3002/ || true
"

echo "==> Done. Admin placeholder on ${HOST}:3002 (tunnel: https://admin.dojopop.live)"
