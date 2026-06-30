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
BUNKER_PORT="${DOJOPOP_BUNKER_PORT:-3005}"
ADMIN_PORT="${DOJOPOP_ADMIN_PORT:-3002}"
BLOSSOM_PORT="${DOJOPOP_BLOSSOM_PORT:-3004}"
ALBY_HUB_PORT="${DOJOPOP_ALBY_HUB_PORT:-8080}"
TENSHINRYU_PORT="${TENSHINRYU_PORT:-3003}"
TENSHINRYU_STAGING_PORT="${TENSHINRYU_STAGING_PORT:-3013}"
TENSHINRYU_STAGING_HOST="${TENSHINRYU_STAGING_HOST:-staging.tenshinryu.xyz}"
# bunker.dojopop.live → Bunker46 (:3005); admin.dojopop.live → ops placeholder (:3002).
TENSHINRYU_APEX="${TENSHINRYU_APEX:-tenshinryu.xyz}"
TENSHINRYU_WWW="${TENSHINRYU_WWW:-www.tenshinryu.xyz}"
TENSHINRYU_HOST="${TENSHINRYU_HOST:-kiwami.tenshinryu.xyz}"
TENSHINRYU_ZONE_ID="${TENSHINRYU_ZONE_ID:-8773d460b9cf42569a9c895481c17785}"

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
for NAME in dojopop.live www admin bunker blossom hub; do
  TARGET="${TUNNEL_ID}.cfargotunnel.com"
  curl -sS -X POST "https://api.cloudflare.com/client/v4/zones/${DOJOPOP_ZONE_ID}/dns_records" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"type\":\"CNAME\",\"name\":\"${NAME}\",\"content\":\"${TARGET}\",\"proxied\":true}" \
    | python3 -c "import sys,json; d=json.load(sys.stdin); e=d.get('errors',[{}])[0]; print(f'  {NAME}:', 'ok' if d.get('success') else e.get('message','failed'))" 2>/dev/null || true
done

if [[ -n "$TENSHINRYU_ZONE_ID" ]]; then
  echo ""
  echo "DNS (zone ${TENSHINRYU_ZONE_ID}, tenshinryu.xyz):"
  TARGET="${TUNNEL_ID}.cfargotunnel.com"

  # Remove legacy apex A records (old AWS hosting)
  LEGACY_IDS=$(curl -sS -H "Authorization: Bearer $TOKEN" \
    "https://api.cloudflare.com/client/v4/zones/${TENSHINRYU_ZONE_ID}/dns_records?type=A&name=${TENSHINRYU_APEX}" \
    | python3 -c "import sys,json; d=json.load(sys.stdin); print(' '.join(r['id'] for r in d.get('result',[])))")
  for rid in $LEGACY_IDS; do
    curl -sS -X DELETE "https://api.cloudflare.com/client/v4/zones/${TENSHINRYU_ZONE_ID}/dns_records/${rid}" \
      -H "Authorization: Bearer $TOKEN" >/dev/null
    echo "  deleted legacy A ${rid}"
  done

  for NAME in "@" www kiwami staging; do
    curl -sS -X POST "https://api.cloudflare.com/client/v4/zones/${TENSHINRYU_ZONE_ID}/dns_records" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d "{\"type\":\"CNAME\",\"name\":\"${NAME}\",\"content\":\"${TARGET}\",\"proxied\":true}" \
      | python3 -c "import sys,json; d=json.load(sys.stdin); e=d.get('errors',[{}])[0]; print(f'  {NAME}:', 'ok' if d.get('success') else e.get('message','failed'))" 2>/dev/null || true
  done
fi
