#!/usr/bin/env bash
# Add DojoPop domains to the NextDNS allowlist (fixes 0.0.0.0 sinkhole via Tailscale DNS).
#
# Requires NEXTDNS_API_KEY from https://my.nextdns.io/account (Account → API).
# Profile ID: NEXTDNS_PROFILE_ID (DojoPop / Perseus profile: 2b4adf).
# Note: the Tailscale URL suffix (dns.nextdns.io/8f73b1) is NOT the API profile id.
#
# Usage:
#   doppler run --project dojopop --config prd_zorie -- ./scripts/nextdns-allow-dojopop.sh
#   NEXTDNS_API_KEY=... ./scripts/nextdns-allow-dojopop.sh
set -euo pipefail

API_KEY="${NEXTDNS_API_KEY:-}"
PROFILE_ID="${NEXTDNS_PROFILE_ID:-2b4adf}"
BASE="https://api.nextdns.io/profiles/${PROFILE_ID}"

DOMAINS=(
  dojopop.live
  relay.dojopop.live
  admin.dojopop.live
  bunker.dojopop.live
  blossom.dojopop.live
  hub.dojopop.live
  tenshinryu.xyz
  www.tenshinryu.xyz
  kiwami.tenshinryu.xyz
  staging.tenshinryu.xyz
  auth.tenshinryu.xyz
  wiki.tenshinryu.xyz
)

if [[ -z "$API_KEY" ]]; then
  echo "ERROR: NEXTDNS_API_KEY is not set."
  echo "  1. Open https://my.nextdns.io/account → API → create key"
  echo "  2. doppler secrets set NEXTDNS_API_KEY --project dojopop --config prd_zorie"
  echo "  3. Re-run: doppler run --project dojopop --config prd_zorie -- $0"
  exit 1
fi

if [[ -z "$PROFILE_ID" ]]; then
  echo "==> Resolving NextDNS profile id from API..."
  PROFILE_ID=$(curl -sS -H "X-Api-Key: ${API_KEY}" \
    "https://api.nextdns.io/profiles" \
    | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data'][0]['id'] if d.get('data') else '')")
  if [[ -z "$PROFILE_ID" ]]; then
    echo "ERROR: could not resolve profile id; set NEXTDNS_PROFILE_ID in Doppler"
    exit 1
  fi
fi


VSCODE_DOMAINS=(
  marketplace.visualstudio.com
  update.code.visualstudio.com
  vscode.blob.core.windows.net
  az764295.vo.msecnd.net
  main.vscode-cdn.net
  www.vscode-unpkg.net
  vscode-unpkg.net
  vscode-sync.trafficmanager.net
  visualstudio.com
)

echo "==> NextDNS profile ${PROFILE_ID}: allowlisting DojoPop + VS Code domains..."

for domain in "${DOMAINS[@]}" "${VSCODE_DOMAINS[@]}"; do
  HTTP=$(curl -sS -o /tmp/nextdns-allow.json -w "%{http_code}" \
    -X POST "${BASE}/allowlist" \
    -H "X-Api-Key: ${API_KEY}" \
    -H "Content-Type: application/json" \
    -d "{\"id\": \"${domain}\", \"active\": true}")

  if [[ "$HTTP" == "200" || "$HTTP" == "201" ]]; then
    echo "  + ${domain}"
  else
    MSG=$(python3 -c "import json; d=json.load(open('/tmp/nextdns-allow.json')); print(d.get('errors',[{}])[0].get('detail','failed'))" 2>/dev/null || echo "HTTP ${HTTP}")
    if [[ "$MSG" == *"already"* || "$MSG" == *"exist"* ]]; then
      echo "  = ${domain} (already listed)"
    else
      echo "  ! ${domain}: ${MSG}"
    fi
  fi
done

echo ""
echo "==> Verifying resolution (public DNS)..."
dig +short dojopop.live @1.1.1.1 | head -2

echo ""
echo "==> Flush local DNS cache (macOS):"
echo "    sudo dscacheutil -flushcache && sudo killall -HUP mDNSResponder"
echo ""
echo "If still blocked, confirm Tailscale uses this NextDNS profile (tailscale dns status)."
