#!/usr/bin/env bash
# Deploy self-hosted Bouquet (Blossom media manager) to relay-2.
# Public URL: https://bouquet.dojopop.live
#
# Usage: ./deploy.sh [ssh-host]   (default: relay-2)
set -euo pipefail

HOST="${1:-relay-2}"
REMOTE_DIR="/opt/dojopop/bouquet"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMMIT="$(tr -d '[:space:]' < "$SCRIPT_DIR/COMMIT")"

echo "==> Deploying Bouquet @ ${COMMIT:0:12} to ${HOST}:${REMOTE_DIR}"

ssh -o BatchMode=yes "$HOST" "mkdir -p '$REMOTE_DIR'"

rsync -az \
  "$SCRIPT_DIR/Dockerfile" \
  "$SCRIPT_DIR/docker-compose.yml" \
  "$SCRIPT_DIR/nginx.conf" \
  "$SCRIPT_DIR/COMMIT" \
  "$HOST:$REMOTE_DIR/"

rsync -az "$SCRIPT_DIR/patches/" "$HOST:$REMOTE_DIR/patches/"

ssh -o BatchMode=yes "$HOST" "
  set -euo pipefail
  if ! docker compose version >/dev/null 2>&1; then
    apt-get update -qq && apt-get install -y -qq docker-compose-v2
  fi
  cd '$REMOTE_DIR'
  export BOUQUET_COMMIT='${COMMIT}'
  docker compose build
  docker compose up -d
  docker compose ps
  echo ''
  echo '==> Health check (localhost:3015):'
  curl -sS -o /dev/null -w 'HTTP %{http_code}\n' http://127.0.0.1:3015/ || true
"

echo "==> Done. Bouquet on ${HOST}:3015 (tunnel: https://bouquet.dojopop.live)"
