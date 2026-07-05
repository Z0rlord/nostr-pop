#!/usr/bin/env bash
# Deploy KOReader sync server (koreader/kosync) to relay-2.
# Public URL: https://sync.krtrmesh.xyz (Cloudflare Tunnel → localhost:3007)
#
# Usage: ./deploy.sh [ssh-host]   (default: relay-2)
set -euo pipefail

HOST="${1:-relay-2}"
REMOTE_DIR="/opt/dojopop/kosync"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "==> Deploying KOReader sync to ${HOST}:${REMOTE_DIR}"

ssh -o BatchMode=yes "$HOST" "mkdir -p '$REMOTE_DIR/data/redis' '$REMOTE_DIR/logs/app' '$REMOTE_DIR/logs/redis'"

rsync -az \
  --include='docker-compose.yml' \
  --include='nginx.conf' \
  --exclude='*' \
  "$SCRIPT_DIR/" "$HOST:$REMOTE_DIR/"

ssh -o BatchMode=yes "$HOST" "
  set -euo pipefail
  if ! docker compose version >/dev/null 2>&1; then
    echo '==> docker compose plugin missing; installing (apt)'
    apt-get update -qq && apt-get install -y -qq docker-compose-v2
  fi
  docker network create dojopop-internal 2>/dev/null || true
  cd '$REMOTE_DIR'
  docker compose pull
  docker compose up -d
  docker compose ps
  echo ''
  echo '==> Health check (localhost:3007):'
  curl -sS -H 'Accept: application/vnd.koreader.v1+json' http://127.0.0.1:3007/healthcheck || true
  echo ''
"

echo "==> Done. KOReader sync on ${HOST}:3007 (tunnel: sync.krtrmesh.xyz)"
