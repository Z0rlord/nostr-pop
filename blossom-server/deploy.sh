#!/usr/bin/env bash
# Deploy DojoPop Blossom server to a docker-compose host. Idempotent.
#
# Usage: ./deploy.sh [ssh-host]   (default: relay-2)
set -euo pipefail

HOST="${1:-relay-2}"
REMOTE_DIR="/opt/dojopop/blossom"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "==> Deploying Blossom to ${HOST}:${REMOTE_DIR}"

ssh -o BatchMode=yes "$HOST" "mkdir -p '$REMOTE_DIR/data/blobs'"

rsync -az \
  --include='docker-compose.yml' \
  --include='config.yml' \
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
  echo '==> Health check (localhost:3004):'
  curl -sS -o /dev/null -w 'HTTP %{http_code}\n' http://127.0.0.1:3004/ || true
"

echo "==> Done. Blossom on ${HOST}:3004 (tunnel: blossom.dojopop.live)"
