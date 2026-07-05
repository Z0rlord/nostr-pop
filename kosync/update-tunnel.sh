#!/usr/bin/env bash
# Add sync.krtrmesh.xyz to the dojopop-relay Cloudflare Tunnel and create DNS.
#
# Usage: doppler run -- ./update-tunnel.sh
set -euo pipefail

TOKEN="${CLOUDFLARE_DNS_TOKEN:-${CLOUDFLARE_API_TOKEN:-}}"
ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-dfc6e38d5b254f0f8ffac8a0e554112a}"
TUNNEL_ID="${DOJOPOP_TUNNEL_ID:-543b3cee-e3dd-422f-a619-7a34236a0ba0}"
KRTRMESH_ZONE_ID="${KRTRMESH_ZONE_ID:-4bd3e776bcf6e55aba431b389f0409d0}"
KOSYNC_HOST="${KOSYNC_HOST:-sync.krtrmesh.xyz}"
KOSYNC_PORT="${KOSYNC_PORT:-3007}"

WEB_PORT="${DOJOPOP_WEB_PORT:-3001}"
BUNKER_PORT="${DOJOPOP_BUNKER_PORT:-3005}"
ADMIN_PORT="${DOJOPOP_ADMIN_PORT:-3002}"
BLOSSOM_PORT="${DOJOPOP_BLOSSOM_PORT:-3004}"
ALBY_HUB_PORT="${DOJOPOP_ALBY_HUB_PORT:-8080}"
TENSHINRYU_PORT="${TENSHINRYU_PORT:-3003}"
TENSHINRYU_STAGING_PORT="${TENSHINRYU_STAGING_PORT:-3013}"
TENSHINRYU_STAGING_HOST="${TENSHINRYU_STAGING_HOST:-staging.tenshinryu.xyz}"
TENSHINRYU_APEX="${TENSHINRYU_APEX:-tenshinryu.xyz}"
TENSHINRYU_WWW="${TENSHINRYU_WWW:-www.tenshinryu.xyz}"
TENSHINRYU_HOST="${TENSHINRYU_HOST:-kiwami.tenshinryu.xyz}"
TENSHINRYU_ZONE_ID="${TENSHINRYU_ZONE_ID:-8773d460b9cf42569a9c895481c17785}"

if [[ -z "$TOKEN" ]]; then
  echo "ERROR: CLOUDFLARE_DNS_TOKEN or CLOUDFLARE_API_TOKEN required"
  exit 1
fi

PAYLOAD=$(cat <<EOF
{
  "config": {
    "ingress": [
      { "hostname": "${KOSYNC_HOST}", "service": "http://localhost:${KOSYNC_PORT}" },
      { "hostname": "relay.dojopop.live", "service": "http://localhost:7777" },
      { "hostname": "dojopop.live", "service": "http://localhost:${WEB_PORT}" },
      { "hostname": "www.dojopop.live", "service": "http://localhost:${WEB_PORT}" },
      { "hostname": "bunker.dojopop.live", "service": "http://localhost:${BUNKER_PORT}" },
      { "hostname": "admin.dojopop.live", "service": "http://localhost:${ADMIN_PORT}" },
      { "hostname": "blossom.dojopop.live", "service": "http://localhost:${BLOSSOM_PORT}" },
      { "hostname": "hub.dojopop.live", "service": "http://localhost:${ALBY_HUB_PORT}" },
      { "hostname": "${TENSHINRYU_APEX}", "service": "http://localhost:${TENSHINRYU_PORT}" },
      { "hostname": "${TENSHINRYU_WWW}", "service": "http://localhost:${TENSHINRYU_PORT}" },
      { "hostname": "${TENSHINRYU_HOST}", "service": "http://localhost:${TENSHINRYU_PORT}" },
      { "hostname": "${TENSHINRYU_STAGING_HOST}", "service": "http://localhost:${TENSHINRYU_STAGING_PORT}" },
      { "service": "http_status:404" }
    ]
  }
}
EOF
)

echo "==> Updating tunnel ${TUNNEL_ID} ingress (+ ${KOSYNC_HOST})..."
HTTP=$(curl -sS -o /tmp/cf-kosync-tunnel.json -w "%{http_code}" \
  -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  "https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/cfd_tunnel/${TUNNEL_ID}/configurations" \
  -d "$PAYLOAD")

if [[ "$HTTP" != "200" ]]; then
  echo "ERROR: Cloudflare API returned HTTP $HTTP"
  python3 -m json.tool /tmp/cf-kosync-tunnel.json || cat /tmp/cf-kosync-tunnel.json
  exit 1
fi

echo "==> Tunnel ingress updated."

TARGET="${TUNNEL_ID}.cfargotunnel.com"
echo "==> DNS: ${KOSYNC_HOST} → ${TARGET} (zone ${KRTRMESH_ZONE_ID})"
curl -sS -X POST "https://api.cloudflare.com/client/v4/zones/${KRTRMESH_ZONE_ID}/dns_records" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"type\":\"CNAME\",\"name\":\"sync\",\"content\":\"${TARGET}\",\"proxied\":true}" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); errs=d.get('errors') or []; e=errs[0] if errs else {}; print('  sync:', 'ok' if d.get('success') else e.get('message','failed'))"

echo "==> Public URL: https://${KOSYNC_HOST}"
