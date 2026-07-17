#!/usr/bin/env bash
# Deploy Cordn MLS coordinator to relay-2 (relay transport — no Cloudflare hostname).
#
# Prerequisites:
#   - Doppler secret CORDN_SERVER_PRIVATE_KEY (openssl rand -hex 32)
#   - docker network dojopop-internal (created by blossom/kosync deploys)
#
# Usage:
#   doppler run --project dojopop --config prd_zorie -- ./deploy.sh [ssh-host]
set -euo pipefail

HOST="${1:-relay-2}"
REMOTE_DIR="/opt/dojopop/cordn"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ -z "${CORDN_SERVER_PRIVATE_KEY:-}" ]]; then
  echo "ERROR: CORDN_SERVER_PRIVATE_KEY not set."
  echo "  Generate: openssl rand -hex 32"
  echo "  Add to Doppler dojopop/prd_zorie, then: doppler run -- ./deploy.sh"
  exit 1
fi

echo "==> Deploying Cordn to ${HOST}:${REMOTE_DIR}"

ssh -o BatchMode=yes "$HOST" "mkdir -p '$REMOTE_DIR' && docker network inspect dojopop-internal >/dev/null 2>&1 || docker network create dojopop-internal"

rsync -az \
  "$SCRIPT_DIR/docker-compose.yml" \
  "$SCRIPT_DIR/.env.example" \
  "$HOST:$REMOTE_DIR/"

# Write runtime .env on remote (never commit secrets).
ssh -o BatchMode=yes "$HOST" "cat > '$REMOTE_DIR/.env'" <<EOF
CORDN_SERVER_PRIVATE_KEY=${CORDN_SERVER_PRIVATE_KEY}
CORDN_STORAGE_BACKEND=sqlite
CORDN_SQLITE_PATH=/data/cordn.sqlite
CORDN_RELAY_URLS=${CORDN_RELAY_URLS:-wss://relay.dojopop.live,wss://relay.primal.net,wss://relay.damus.io,wss://nos.lol}
CORDN_ANNOUNCED=${CORDN_ANNOUNCED:-true}
CORDN_SERVER_NAME=${CORDN_SERVER_NAME:-dojopop-cordn}
CORDN_SERVER_WEBSITE=${CORDN_SERVER_WEBSITE:-https://dojopop.live}
CORDN_SERVER_ABOUT=${CORDN_SERVER_ABOUT:-DojoPop MLS group messaging coordinator}
CORDN_RATE_LIMIT_ENABLED=true
CORDN_MAX_KEY_PACKAGES_PER_IDENTITY=50
CORDN_MAX_LAST_RESORT_KEY_PACKAGES_PER_IDENTITY=1
EOF

ssh -o BatchMode=yes "$HOST" "
  set -euo pipefail
  cd '$REMOTE_DIR'
  docker compose pull
  docker compose up -d
  sleep 3
  docker compose logs --tail 30 cordn
"

echo "==> Done. Cordn coordinator on ${HOST} (announced on relays in CORDN_RELAY_URLS)."
echo "    Read logs for nprofile / cordn.net add URL."
