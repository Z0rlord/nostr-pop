#!/usr/bin/env bash
# Deploy DojoPop landing page to relay-2. Idempotent.
#
# Usage: ./deploy.sh [ssh-host]   (default: relay-2)
set -euo pipefail

HOST="${1:-relay-2}"
REMOTE_DIR="/opt/dojopop/web"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "==> Deploying web app to ${HOST}:${REMOTE_DIR}"

ssh -o BatchMode=yes "$HOST" "mkdir -p '$REMOTE_DIR'"

rsync -az --delete \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='data' \
  --exclude='.env' \
  "$SCRIPT_DIR/" "$HOST:$REMOTE_DIR/"

ssh -o BatchMode=yes "$HOST" "
  set -euo pipefail
  if ! docker compose version >/dev/null 2>&1; then
    echo '==> docker compose plugin missing; installing (apt)'
    apt-get update -qq && apt-get install -y -qq docker-compose-v2
  fi
  cd '$REMOTE_DIR'
  export DOCKER_GID=\$(getent group docker | cut -d: -f3)
  if [[ ! -f .env ]]; then
    echo 'ERROR: $REMOTE_DIR/.env missing on host (chmod 600, from Doppler).'
    echo 'Run: doppler secrets download --no-file --format env > /tmp/dojopop-web.env'
    echo 'Then scp to relay-2:$REMOTE_DIR/.env'
    exit 1
  fi
  DOCKER_GID=\$DOCKER_GID docker compose build --pull
  DOCKER_GID=\$DOCKER_GID docker compose up -d
  docker compose ps
"

echo "==> Done. Landing page should be on ${HOST}:3001 (tunnel: dojopop.live)"
