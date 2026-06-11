#!/usr/bin/env bash
# Add dojopop.live + www.dojopop.live to the dojopop-relay Cloudflare Tunnel.
# Requires CLOUDFLARE_DNS_TOKEN (or CLOUDFLARE_API_TOKEN) and CLOUDFLARE_TUNNEL_ID in env.
#
# Usage: doppler run -- ./scripts/update-tunnel-ingress.sh
set -euo pipefail

TOKEN="${CLOUDFLARE_DNS_TOKEN:-${CLOUDFLARE_API_TOKEN:-}}"
# Live relay-2 connector uses dojopop-relay tunnel (not Doppler CLOUDFLARE_TUNNEL_ID).
TUNNEL_ID="${DOJOPOP_TUNNEL_ID:-543b3cee-e3dd-422f-a619-7a34236a0ba0}"
ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-dfc6e38d5b254f0f8ffac8a0e554112a}"
DOJOPOP_ZONE_ID="${DOJOPOP_ZONE_ID:-cf2b671698354bbaafb5c606945dbb2c}"
WEB_PORT="${DOJOPOP_WEB_PORT:-3001}"

if [[ -z "$TOKEN" ]]; then
  echo "ERROR: CLOUDFLARE_DNS_TOKEN or CLOUDFLARE_API_TOKEN required"
  exit 1
fi

if [[ -z "$ACCOUNT_ID" ]]; then
  echo "==> Resolving Cloudflare account id..."
  ACCOUNT_ID=$(curl -sS -H "Authorization: Bearer $TOKEN" \
    "https://api.cloudflare.com/client/v4/accounts?per_page=1" \
    | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['result'][0]['id'] if d.get('success') else '')")
  if [[ -z "$ACCOUNT_ID" ]]; then
    echo "ERROR: could not resolve account id; set CLOUDFLARE_ACCOUNT_ID"
    exit 1
  fi
fi

PAYLOAD=$(cat <<EOF
{
  "config": {
    "ingress": [
      { "hostname": "relay.dojopop.live", "service": "http://localhost:7777" },
      { "hostname": "dojopop.live", "service": "http://localhost:${WEB_PORT}" },
      { "hostname": "www.dojopop.live", "service": "http://localhost:${WEB_PORT}" },
      { "service": "http_status:404" }
    ]
  }
}
EOF
)

echo "==> Updating tunnel ${TUNNEL_ID} ingress (account ${ACCOUNT_ID})..."
HTTP=$(curl -sS -o /tmp/cf-tunnel-resp.json -w "%{http_code}" \
  -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  "https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/cfd_tunnel/${TUNNEL_ID}/configurations" \
  -d "$PAYLOAD")

if [[ "$HTTP" != "200" ]]; then
  echo "ERROR: Cloudflare API returned HTTP $HTTP"
  python3 -m json.tool /tmp/cf-tunnel-resp.json || cat /tmp/cf-tunnel-resp.json
  exit 1
fi

echo "==> Tunnel ingress updated."
python3 -m json.tool /tmp/cf-tunnel-resp.json | head -30

echo ""
echo "DNS (zone ${DOJOPOP_ZONE_ID}, not CLOUDFLARE_ZONE_ID which may be another domain):"
for NAME in dojopop.live www; do
  TARGET="${TUNNEL_ID}.cfargotunnel.com"
  curl -sS -X POST "https://api.cloudflare.com/client/v4/zones/${DOJOPOP_ZONE_ID}/dns_records" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"type\":\"CNAME\",\"name\":\"${NAME}\",\"content\":\"${TARGET}\",\"proxied\":true}" \
    | python3 -c "import sys,json; d=json.load(sys.stdin); e=d.get('errors',[{}])[0]; print(f'  {NAME}:', 'ok' if d.get('success') else e.get('message','failed'))" 2>/dev/null || true
done
