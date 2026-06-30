#!/usr/bin/env bash
# Deploy nsecBunker daemon + admin UI to relay-2. Idempotent.
#
# Usage: ./deploy.sh [ssh-host]   (default: relay-2)
set -euo pipefail

HOST="${1:-relay-2}"
REMOTE_DIR="/opt/dojopop/nsecbunker"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "==> Deploying nsecBunker stack to ${HOST}:${REMOTE_DIR}"

ssh -o BatchMode=yes "$HOST" "mkdir -p '$REMOTE_DIR'"

rsync -az --delete \
  --exclude='node_modules' \
  --exclude='.env' \
  "$SCRIPT_DIR/" "$HOST:$REMOTE_DIR/"

rsync -az --delete \
  --exclude='node_modules' \
  --exclude='.git' \
  "$REPO_ROOT/nsecbunker-admin-ui/" "$HOST:$REMOTE_DIR/nsecbunker-admin-ui/"

ssh -o BatchMode=yes "$HOST" "
  set -euo pipefail
  if ! docker compose version >/dev/null 2>&1; then
    apt-get update -qq && apt-get install -y -qq docker-compose-v2
  fi
  cd '$REMOTE_DIR'
  export DOCKER_GID=\$(getent group docker | cut -d: -f3)
  DOCKER_GID=\$DOCKER_GID docker compose build --pull
  DOCKER_GID=\$DOCKER_GID docker compose up -d
  docker compose ps
  echo ''
  echo 'Connection string (paste into admin UI login):'
  docker compose exec -T nsecbunkerd cat /app/config/connection.txt 2>/dev/null || echo '(run after first unlock — see README)'
"

echo "==> Done. Admin UI on ${HOST}:3002 (tunnel: admin.dojopop.live)"
