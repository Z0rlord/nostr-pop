#!/usr/bin/env bash
# Deploy Tenshinryu KIWAMI PWA to Hetzner vol1 (relay-2). Idempotent.
#
# Usage: ./deploy.sh [ssh-host]   (default: relay-2)
set -euo pipefail

HOST="${1:-relay-2}"
REMOTE_DIR="/opt/dojopop/tenshinryu"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "==> Syncing .env from Doppler..."
"$SCRIPT_DIR/scripts/sync-env.sh" /tmp/tenshinryu.env
scp -o BatchMode=yes /tmp/tenshinryu.env "$HOST:$REMOTE_DIR/.env"
ssh -o BatchMode=yes "$HOST" "chmod 600 '$REMOTE_DIR/.env'"

echo "==> Database migrate + seed (Neon)..."
if "$SCRIPT_DIR/scripts/db-setup.sh"; then
  echo "==> DB OK"
else
  echo "WARN: db-setup failed locally — run ./scripts/db-setup.sh when Neon is reachable"
fi

echo "==> Deploying Tenshinryu to ${HOST}:${REMOTE_DIR}"

ssh -o BatchMode=yes "$HOST" "mkdir -p '$REMOTE_DIR'"

rsync -az --delete \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='.env' \
  "$SCRIPT_DIR/" "$HOST:$REMOTE_DIR/"

ssh -o BatchMode=yes "$HOST" "
  set -euo pipefail
  cd '$REMOTE_DIR'
  if [[ ! -f .env ]]; then
    echo 'ERROR: $REMOTE_DIR/.env missing on host.'
    echo 'From your machine:'
    echo '  doppler secrets download --no-file --format env --project dojopop --config prd_zorie > /tmp/tenshinryu.env'
    echo '  # Map NEXT_PUBLIC_FIREBASE_APP_ID from NEXT_PUBLIC_FIREBASE_APP_ID_ if needed'
    echo '  scp /tmp/tenshinryu.env $HOST:$REMOTE_DIR/.env'
    exit 1
  fi
  docker compose build
  docker compose up -d
  docker compose ps
  wget -qO- http://127.0.0.1:3003/ >/dev/null && echo '==> Health OK on :3003' || echo 'WARN: health check failed'
"

echo "==> Done. Production on ${HOST}:3003 (https://tenshinryu.xyz)"
echo "    Staging: ./deploy-staging.sh → https://staging.tenshinryu.xyz"
