#!/usr/bin/env bash
# Deploy the DojoPop relay to a docker-compose-capable host. Idempotent.
#
# Usage: ./deploy.sh [ssh-host]   (default: relay-2)
set -euo pipefail

HOST="${1:-relay-2}"
REMOTE_DIR="/opt/dojopop/relay"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "==> Deploying relay to ${HOST}:${REMOTE_DIR}"

ssh -o BatchMode=yes "$HOST" "mkdir -p '$REMOTE_DIR'"

rsync -az --delete \
  --include='docker-compose.yml' \
  --include='config.toml' \
  --exclude='*' \
  "$SCRIPT_DIR/" "$HOST:$REMOTE_DIR/"

# docker compose v2 plugin is required (Ubuntu: apt-get install docker-compose-v2)
ssh -o BatchMode=yes "$HOST" "
  set -euo pipefail
  if ! docker compose version >/dev/null 2>&1; then
    echo '==> docker compose plugin missing; installing (apt)'
    apt-get update -qq && apt-get install -y -qq docker-compose-v2
  fi
  cd '$REMOTE_DIR'
  docker compose up -d --pull always
  docker compose ps
"

echo "==> Done. Relay should be listening on ${HOST}:7777"
