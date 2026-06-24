#!/usr/bin/env bash
# Install dojopop_agent_key into root authorized_keys via Hetzner rescue. Idempotent.
set -euo pipefail

export PATH="/opt/homebrew/bin:$PATH"
AGENT_PUB_FILE="${HOME}/.ssh/dojopop_agent_key.pub"
[[ -f "$AGENT_PUB_FILE" ]] || { echo "Missing $AGENT_PUB_FILE"; exit 1; }
AGENT_PUB="$(cat "$AGENT_PUB_FILE")"

fix_server() {
  local id=$1 ip=$2 name=$3
  echo "==> Rescue $name ($id @ $ip)"

  local resp rootpw
  resp=$(doppler run --project dojopop --config prd_zorie -- bash -c \
    "curl -sS -X POST -H \"Authorization: Bearer \$HETZNER_API\" \
      -H \"Content-Type: application/json\" \
      -d '{\"type\":\"linux64\"}' \
      \"https://api.hetzner.cloud/v1/servers/${id}/actions/enable_rescue\"")
  rootpw=$(python3 -c "import json,sys; print(json.loads(sys.argv[1])['root_password'])" "$resp")

  doppler run --project dojopop --config prd_zorie -- bash -c \
    "curl -sS -X POST -H \"Authorization: Bearer \$HETZNER_API\" \
      \"https://api.hetzner.cloud/v1/servers/${id}/actions/reset\" >/dev/null"

  local i
  for i in $(seq 1 40); do
    if sshpass -p "$rootpw" ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
      -o ConnectTimeout=8 "root@${ip}" "echo rescue-ready" 2>/dev/null; then
      break
    fi
    echo "   waiting for rescue ($i)..."
    sleep 6
  done

  # Pass key base64-encoded — plain "$AGENT_PUB" gets truncated through sshpass.
  local agent_b64
  agent_b64=$(printf '%s' "$AGENT_PUB" | base64 | tr -d '\n')
  sshpass -p "$rootpw" ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
    "root@${ip}" bash -s -- "$agent_b64" <<'REMOTE'
set -euo pipefail
agent_pub=$(printf '%s' "$1" | base64 -d)
mount /dev/sda1 /mnt
mkdir -p /mnt/root/.ssh
chmod 700 /mnt/root/.ssh
{
  printf '%s\n' \
    'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAII/hU4bkDr5v7TRy+TwYMogCINXQTs+uePWo+SToCIOC' \
    'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIKShzKfJ+PLKsjETe6s+2gZy5nJTj67My/eJGkXjVXOf zorie' \
    "$agent_pub"
} > /mnt/root/.ssh/authorized_keys
chmod 600 /mnt/root/.ssh/authorized_keys
echo "keys:"; wc -l /mnt/root/.ssh/authorized_keys; tail -1 /mnt/root/.ssh/authorized_keys
sync
REMOTE

  doppler run --project dojopop --config prd_zorie -- bash -c \
    "curl -sS -X POST -H \"Authorization: Bearer \$HETZNER_API\" \
      \"https://api.hetzner.cloud/v1/servers/${id}/actions/disable_rescue\" >/dev/null"
  doppler run --project dojopop --config prd_zorie -- bash -c \
    "curl -sS -X POST -H \"Authorization: Bearer \$HETZNER_API\" \
      \"https://api.hetzner.cloud/v1/servers/${id}/actions/reset\" >/dev/null"
  echo "==> $name rebooting to normal OS"
}

fix_server 135785267 178.105.250.69 dojopop-relay-2
fix_server 123013936 178.104.17.18 Dojopophetznervol1

echo "Done. Wait ~60s then: ssh -i ~/.ssh/dojopop_agent_key root@100.125.184.46 hostname"
