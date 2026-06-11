#!/usr/bin/env bash
# Deploy BTCPay scaffold to relay-2. Requires .env with BTCPAY_DB_PASSWORD + RPC creds.
set -euo pipefail

HOST="${1:-relay-2}"
REMOTE_DIR="/opt/dojopop/btcpay"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "==> Deploying BTCPay to ${HOST}:${REMOTE_DIR}"

ssh -o BatchMode=yes "$HOST" "mkdir -p '$REMOTE_DIR'"

rsync -az --exclude='.env' "$SCRIPT_DIR/" "$HOST:$REMOTE_DIR/"

ssh -o BatchMode=yes "$HOST" "
  set -euo pipefail
  cd '$REMOTE_DIR'
  if [[ ! -f .env ]]; then
    echo 'ERROR: create $REMOTE_DIR/.env with BTCPAY_DB_PASSWORD and BITCOIN_RPC_* first'
    exit 1
  fi
  docker compose up -d
  docker compose ps
"

echo "==> BTCPay UI on ${HOST}:49392 (tunnel btcpay.dojopop.live when ready)"
