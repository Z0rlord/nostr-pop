#!/usr/bin/env bash
# Sync active DojoPop members → relay pubkey_whitelist on relay-2.
#
# Usage (from Mac):
#   doppler run --project dojopop --config prd_zorie -- ./web/scripts/sync-relay-whitelist.sh
#
# On relay-2 directly:
#   MEMBERSHIP_DATA_PATH=/var/lib/docker/volumes/web_web-data/_data/members.json \
#     node /opt/dojopop/web/scripts/sync-relay-whitelist.mjs
set -euo pipefail

HOST="${RELAY_SSH_HOST:-relay-2}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WEB_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "==> Syncing relay whitelist via ${HOST}"

ssh -o BatchMode=yes "$HOST" "mkdir -p /opt/dojopop/web/scripts"

rsync -az "$SCRIPT_DIR/sync-relay-whitelist.mjs" "$HOST:/opt/dojopop/web/scripts/"

ssh -o BatchMode=yes "$HOST" bash -s <<'REMOTE'
set -euo pipefail

MEMBERS_PATH=""
for candidate in \
  "/var/lib/docker/volumes/web_web-data/_data/members.json" \
  "/opt/dojopop/web/data/members.json"; do
  if [[ -f "$candidate" ]]; then
    MEMBERS_PATH="$candidate"
    break
  fi
done

if [[ -z "$MEMBERS_PATH" ]]; then
  MEMBERS_PATH=$(docker volume inspect web_web-data --format '{{ .Mountpoint }}/members.json' 2>/dev/null || true)
fi

if [[ ! -f "$MEMBERS_PATH" ]]; then
  echo "ERROR: members.json not found on host"
  exit 1
fi

export MEMBERSHIP_DATA_PATH="$MEMBERS_PATH"
export RELAY_CONFIG_PATH="/opt/dojopop/relay/config.toml"
export RELAY_CONTAINER_NAME="dojopop-relay"
export DOCKER_SOCKET="/var/run/docker.sock"

if ! command -v node >/dev/null; then
  echo "ERROR: node required on relay-2"
  exit 1
fi

# nip19 decode — use web container node_modules if host lacks nostr-tools
if node -e "require('nostr-tools')" >/dev/null 2>&1; then
  NODE_PATH=""
else
  NODE_PATH="/opt/dojopop/web/node_modules"
fi

NODE_PATH="$NODE_PATH" node /opt/dojopop/web/scripts/sync-relay-whitelist.mjs
REMOTE

echo "==> Done. Verify: curl -s -H 'Accept: application/nostr+json' https://relay.dojopop.live | head -5"
