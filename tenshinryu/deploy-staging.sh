#!/usr/bin/env bash
# Deploy Tenshinryu STAGING to Hetzner vol1 (relay-2) on port 3013.
# Production (tenshinryu.xyz :3003) is untouched.
#
# Usage: ./deploy-staging.sh [ssh-host]
set -euo pipefail

HOST="${1:-relay-2}"
REMOTE_DIR="/opt/dojopop/tenshinryu-staging"
COMPOSE_FILE="docker-compose.staging.yml"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "==> Syncing staging .env from Doppler..."
"$SCRIPT_DIR/scripts/sync-env-staging.sh" /tmp/tenshinryu-staging.env
ssh -o BatchMode=yes "$HOST" "mkdir -p '$REMOTE_DIR'"
scp -o BatchMode=yes /tmp/tenshinryu-staging.env "$HOST:$REMOTE_DIR/.env"
ssh -o BatchMode=yes "$HOST" "chmod 600 '$REMOTE_DIR/.env'"

echo "==> Staging database migrate..."
if "$SCRIPT_DIR/scripts/db-setup-staging.sh"; then
  echo "==> Staging DB OK"
else
  echo "WARN: db-setup-staging failed — continue if Neon is reachable from this machine"
fi

echo "==> Deploying staging to ${HOST}:${REMOTE_DIR}"

rsync -az --delete \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='.env' \
  "$SCRIPT_DIR/" "$HOST:$REMOTE_DIR/"

ssh -o BatchMode=yes "$HOST" "
  set -euo pipefail
  cd '$REMOTE_DIR'
  if [[ ! -f .env ]]; then
    echo 'ERROR: missing .env on host'
    exit 1
  fi
  docker compose -f '$COMPOSE_FILE' build
  docker compose -f '$COMPOSE_FILE' up -d
  docker compose -f '$COMPOSE_FILE' ps
  wget -qO- http://127.0.0.1:3013/ >/dev/null && echo '==> Staging health OK on :3013' || echo 'WARN: staging health check failed'
"

echo ""
echo "==> Staging deployed on ${HOST}:3013"
echo "    Next: update Cloudflare tunnel (once per infra change):"
echo "      cd ../web && doppler run --project dojopop --config prd_zorie -- ./scripts/update-tunnel-ingress.sh"
echo "    URL: https://staging.tenshinryu.xyz"
echo "    Production deploy: ./deploy.sh (not this script)"
