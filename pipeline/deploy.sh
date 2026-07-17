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
grep -E '^(NOSTR_NSEC|DOJOPOP_LOGIN_NSEC|DOJOPOP_ADMIN_NSEC|YOUTUBE_CHANNEL_ID|PUBSUB_CALLBACK_URL|BLOSSOM_URL|YT_DLP_PROXY)=' "$ENV_TMP" > "${ENV_TMP}.pipeline" || true
for key in NOSTR_NSEC DOJOPOP_LOGIN_NSEC YOUTUBE_CHANNEL_ID PUBSUB_CALLBACK_URL; do
  if ! grep -q "^${key}=" "${ENV_TMP}.pipeline"; then
    echo "WARN: ${key} not in Doppler download — check dojopop/prd_zorie"
  fi
done

# Optional: Netscape-format YouTube cookies for datacenter IP (relay-2).
# Default: preserve relay-2 cookies unless --sync-cookies (Doppler may be stale).
COOKIES_TMP=""
SYNC_COOKIES=false
[[ "${1:-}" == "--sync-cookies" || "${2:-}" == "--sync-cookies" ]] && SYNC_COOKIES=true
if $SYNC_COOKIES && doppler secrets get YT_DLP_COOKIES --project dojopop --config prd_zorie --plain 2>/dev/null | head -1 | grep -q '^#'; then
  COOKIES_TMP="$(mktemp)"
  doppler secrets get YT_DLP_COOKIES --project dojopop --config prd_zorie --plain > "$COOKIES_TMP"
  echo "==> YT_DLP_COOKIES found in Doppler — will sync to relay-2 (--sync-cookies)"
else
  echo "==> preserving existing youtube-cookies.txt on relay-2 (pass --sync-cookies to overwrite from Doppler)"
fi
rm -f "$ENV_TMP"

echo "==> Deploying YouTube pubsub to ${HOST}:${REMOTE_DIR}"

ssh -o BatchMode=yes "$HOST" "mkdir -p '$REMOTE_DIR/data/videos' '$REMOTE_DIR/data/thumbs' '$REMOTE_DIR/data/preview'"

rsync -az \
  --exclude='.venv' \
  --exclude='__pycache__' \
  --exclude='.env' \
  "$REPO_ROOT/pipeline/" "$HOST:$REMOTE_DIR/pipeline/"

# published.json is owned by relay-2 (runtime state). Never overwrite with laptop copy.
ssh -o BatchMode=yes "$HOST" "test -f '$REMOTE_DIR/data/published.json' || echo '{}' > '$REMOTE_DIR/data/published.json'"

scp -o BatchMode=yes "${ENV_TMP}.pipeline" "$HOST:$REMOTE_DIR/.env"
ssh -o BatchMode=yes "$HOST" "chmod 600 '$REMOTE_DIR/.env'"
rm -f "${ENV_TMP}.pipeline"

rsync -az \
  "$SCRIPT_DIR/docker-compose.yml" "$HOST:$REMOTE_DIR/docker-compose.yml"

rsync -az \
  "$SCRIPT_DIR/Dockerfile.pubsub" "$HOST:$REMOTE_DIR/Dockerfile.pubsub"

if [[ -n "$COOKIES_TMP" && -s "$COOKIES_TMP" ]]; then
  scp -o BatchMode=yes "$COOKIES_TMP" "$HOST:$REMOTE_DIR/data/youtube-cookies.txt"
  ssh -o BatchMode=yes "$HOST" "chmod 600 '$REMOTE_DIR/data/youtube-cookies.txt'"
fi
[[ -n "$COOKIES_TMP" ]] && rm -f "$COOKIES_TMP"

ssh -o BatchMode=yes "$HOST" "
  set -euo pipefail
  if ! docker compose version >/dev/null 2>&1; then
    echo '==> docker compose plugin missing; installing (apt)'
    apt-get update -qq && apt-get install -y -qq docker-compose-v2
  fi
  cd '$REMOTE_DIR'
  docker compose build
  docker compose up -d
  docker compose ps
  echo ''
  echo '==> Health check (localhost:3009 callback path):'
  curl -sS -o /dev/null -w 'HTTP %{http_code}\n' \
    'http://127.0.0.1:3009/youtube/pubsub/callback?hub.mode=subscribe&hub.challenge=healthcheck&hub.topic=test' || true
  echo ''
  echo '==> Renew PubSubHubbub subscription:'
  docker compose exec -T youtube-pubsub uv run --project pipeline pipeline/youtube_pubsub.py subscribe
"

echo "==> Done. PubSub callback on ${HOST}:3009 (tunnel: hooks.dojopop.live)"
