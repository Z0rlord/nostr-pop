#!/usr/bin/env bash
# Deploy YouTube PubSubHubbub callback to relay-2.
# Public URL: https://hooks.dojopop.live/youtube/pubsub/callback
#
# Usage: ./deploy.sh [ssh-host]   (default: relay-2)
set -euo pipefail

HOST="${1:-relay-2}"
REMOTE_DIR="/opt/dojopop/pipeline"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "==> Syncing Doppler env for pipeline pubsub..."
ENV_TMP="$(mktemp)"
doppler secrets download --project dojopop --config prd_zorie --no-file --format docker > "$ENV_TMP"
# Keep only what the callback + spawned pipeline.py need.
grep -E '^(NOSTR_NSEC|YOUTUBE_CHANNEL_ID|PUBSUB_CALLBACK_URL|BLOSSOM_URL)=' "$ENV_TMP" > "${ENV_TMP}.pipeline" || true
for key in NOSTR_NSEC YOUTUBE_CHANNEL_ID PUBSUB_CALLBACK_URL; do
  if ! grep -q "^${key}=" "${ENV_TMP}.pipeline"; then
    echo "WARN: ${key} not in Doppler download — check dojopop/prd_zorie"
  fi
done
rm -f "$ENV_TMP"

echo "==> Deploying YouTube pubsub to ${HOST}:${REMOTE_DIR}"

ssh -o BatchMode=yes "$HOST" "mkdir -p '$REMOTE_DIR/data/videos' '$REMOTE_DIR/data/thumbs' '$REMOTE_DIR/data/preview'"

rsync -az \
  --exclude='.venv' \
  --exclude='__pycache__' \
  --exclude='.env' \
  "$REPO_ROOT/pipeline/" "$HOST:$REMOTE_DIR/pipeline/"

rsync -az \
  "$REPO_ROOT/data/published.json" "$HOST:$REMOTE_DIR/data/published.json" 2>/dev/null || \
  ssh -o BatchMode=yes "$HOST" "echo '{}' > '$REMOTE_DIR/data/published.json'"

scp -o BatchMode=yes "${ENV_TMP}.pipeline" "$HOST:$REMOTE_DIR/.env"
ssh -o BatchMode=yes "$HOST" "chmod 600 '$REMOTE_DIR/.env'"
rm -f "${ENV_TMP}.pipeline"

rsync -az \
  "$SCRIPT_DIR/docker-compose.yml" "$HOST:$REMOTE_DIR/docker-compose.yml"

ssh -o BatchMode=yes "$HOST" "
  set -euo pipefail
  if ! docker compose version >/dev/null 2>&1; then
    echo '==> docker compose plugin missing; installing (apt)'
    apt-get update -qq && apt-get install -y -qq docker-compose-v2
  fi
  cd '$REMOTE_DIR'
  docker compose pull
  docker compose up -d
  docker compose ps
  echo ''
  echo '==> Health check (localhost:3009 callback path):'
  curl -sS -o /dev/null -w 'HTTP %{http_code}\n' \
    'http://127.0.0.1:3009/youtube/pubsub/callback' || true
"

echo "==> Done. PubSub callback on ${HOST}:3009 (tunnel: hooks.dojopop.live)"
