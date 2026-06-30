#!/usr/bin/env bash
# Deploy Alby Hub to relay-2. Idempotent.
#
# Usage: ./deploy.sh [ssh-host]   (default: relay-2)
set -euo pipefail

HOST="${1:-relay-2}"
REMOTE_DIR="/opt/dojopop/alby-hub"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "==> Deploying Alby Hub to ${HOST}:${REMOTE_DIR}"

ENV_TMP="$(mktemp)"
doppler secrets download --project dojopop --config prd_zorie --no-file --format docker > "$ENV_TMP"
grep -E '^ALBY_HUB_UNLOCK_PASSWORD=' "$ENV_TMP" > "${ENV_TMP}.hub" || true
if ! grep -q '^ALBY_HUB_UNLOCK_PASSWORD=' "${ENV_TMP}.hub"; then
  echo "WARN: ALBY_HUB_UNLOCK_PASSWORD not in Doppler — hub will not auto-unlock on restart."
fi
rm -f "$ENV_TMP"

ssh -o BatchMode=yes "$HOST" "mkdir -p '${REMOTE_DIR}/albyhub-data'"
scp "${ENV_TMP}.hub" "${HOST}:${REMOTE_DIR}/.env"
ssh -o BatchMode=yes "$HOST" "chmod 600 '${REMOTE_DIR}/.env'"
rm -f "${ENV_TMP}.hub"

rsync -az \
  --include='docker-compose.yml' \
  --exclude='*' \
  "$SCRIPT_DIR/" "$HOST:$REMOTE_DIR/"

ssh -o BatchMode=yes "$HOST" "
  set -euo pipefail
  docker rm -f albyhub-test 2>/dev/null || true
  if ! docker compose version >/dev/null 2>&1; then
    apt-get update -qq && apt-get install -y -qq docker-compose-v2
  fi
  cd '${REMOTE_DIR}'
  docker compose pull
  docker compose up -d
  docker compose ps
  sleep 3
  curl -sS -o /dev/null -w 'Hub localhost:8080 HTTP %{http_code}\n' http://127.0.0.1:8080/ || true
"

echo "==> Done. Hub on ${HOST}:8080 (tunnel: hub.dojopop.live)"
