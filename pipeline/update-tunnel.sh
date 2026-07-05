#!/usr/bin/env bash
# Add hooks.dojopop.live to the dojopop-relay Cloudflare Tunnel and create DNS.
#
# Usage: doppler run -- ./update-tunnel.sh
set -euo pipefail

TOKEN="${CLOUDFLARE_DNS_TOKEN:-${CLOUDFLARE_API_TOKEN:-}}"
ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-dfc6e38d5b254f0f8ffac8a0e554112a}"
TUNNEL_ID="${DOJOPOP_TUNNEL_ID:-543b3cee-e3dd-422f-a619-7a34236a0ba0}"
DOJOPOP_ZONE_ID="${DOJOPOP_ZONE_ID:-cf2b671698354bbaafb5c606945dbb2c}"
HOOKS_HOST="${HOOKS_HOST:-hooks.dojopop.live}"
PUBSUB_PORT="${PUBSUB_PORT:-3009}"

WEB_PORT="${DOJOPOP_WEB_PORT:-3001}"
BUNKER_PORT="${DOJOPOP_BUNKER_PORT:-3005}"
ADMIN_PORT="${DOJOPOP_ADMIN_PORT:-3002}"
BLOSSOM_PORT="${DOJOPOP_BLOSSOM_PORT:-3004}"
ALBY_HUB_PORT="${DOJOPOP_ALBY_HUB_PORT:-8080}"
TENSHINRYU_PORT="${TENSHINRYU_PORT:-3003}"
TENSHINRYU_STAGING_PORT="${TENSHINRYU_STAGING_PORT:-3013}"
TENSHINRYU_WIKI_PORT="${TENSHINRYU_WIKI_PORT:-3014}"
TENSHINRYU_STAGING_HOST="${TENSHINRYU_STAGING_HOST:-staging.tenshinryu.xyz}"
TENSHINRYU_WIKI_HOST="${TENSHINRYU_WIKI_HOST:-wiki.tenshinryu.xyz}"
TENSHINRYU_APEX="${TENSHINRYU_APEX:-tenshinryu.xyz}"
TENSHINRYU_WWW="${TENSHINRYU_WWW:-www.tenshinryu.xyz}"
TENSHINRYU_HOST="${TENSHINRYU_HOST:-kiwami.tenshinryu.xyz}"
TENSHINRYU_ZONE_ID="${TENSHINRYU_ZONE_ID:-8773d460b9cf42569a9c895481c17785}"
KOSYNC_HOST="${KOSYNC_HOST:-sync.krtrmesh.xyz}"
KOSYNC_PORT="${KOSYNC_PORT:-3007}"

if [[ -z "$TOKEN" ]]; then
  echo "ERROR: CLOUDFLARE_DNS_TOKEN or CLOUDFLARE_API_TOKEN required"
  exit 1
fi

PAYLOAD=$(cat <<EOF
{
  "config": {
    "ingress": [
      { "hostname": "${HOOKS_HOST}", "service": "http://localhost:${PUBSUB_PORT}" },
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
      { "hostname": "${TENSHINRYU_WIKI_HOST}", "service": "http://localhost:${TENSHINRYU_WIKI_PORT}" },
      { "service": "http_status:404" }
    ]
  }
}
EOF
)

echo "==> Updating tunnel ${TUNNEL_ID} ingress (+ ${HOOKS_HOST})..."
HTTP=$(curl -sS -o /tmp/cf-pubsub-tunnel.json -w "%{http_code}" \
  -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  "https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/cfd_tunnel/${TUNNEL_ID}/configurations" \
  -d "$PAYLOAD")

if [[ "$HTTP" != "200" ]]; then
  echo "ERROR: Cloudflare API returned HTTP $HTTP"
  python3 -m json.tool /tmp/cf-pubsub-tunnel.json || cat /tmp/cf-pubsub-tunnel.json
  exit 1
fi

echo "==> Tunnel ingress updated."

TARGET="${TUNNEL_ID}.cfargotunnel.com"
echo "==> DNS: hooks → ${TARGET} (zone ${DOJOPOP_ZONE_ID})"
curl -sS -X POST "https://api.cloudflare.com/client/v4/zones/${DOJOPOP_ZONE_ID}/dns_records" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"type\":\"CNAME\",\"name\":\"hooks\",\"content\":\"${TARGET}\",\"proxied\":true}" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); errs=d.get('errors') or []; e=errs[0] if errs else {}; print('  hooks:', 'ok' if d.get('success') else e.get('message','failed'))"

echo "==> Public callback: https://${HOOKS_HOST}/youtube/pubsub/callback"
