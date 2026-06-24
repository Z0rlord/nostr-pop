#!/usr/bin/env bash
# Emergency local DNS override when NextDNS sinkholes dojopop.live to 0.0.0.0.
# Prefer ./nextdns-allow-dojopop.sh for a permanent fix.
#
# Usage: sudo ./scripts/fix-local-dns-dojopop.sh
set -euo pipefail

MARKER="# dojopop.live — NextDNS override"
HOSTS="/etc/hosts"

if [[ "${EUID:-}" -ne 0 ]]; then
  echo "Run with sudo: sudo $0"
  exit 1
fi

# Resolve current Cloudflare anycast IPs (not hardcoded long-term).
IPS=$(dig +short dojopop.live @1.1.1.1 A | head -2)
if [[ -z "$IPS" ]]; then
  echo "ERROR: could not resolve dojopop.live via 1.1.1.1"
  exit 1
fi

if grep -q "$MARKER" "$HOSTS" 2>/dev/null; then
  sed -i '' "/${MARKER}/d" "$HOSTS"
  sed -i '' "/dojopop\.live/d" "$HOSTS" 2>/dev/null || true
fi

PRIMARY=$(echo "$IPS" | head -1)
{
  echo ""
  echo "$MARKER"
  echo "${PRIMARY} dojopop.live www.dojopop.live relay.dojopop.live admin.dojopop.live"
} >> "$HOSTS"

dscacheutil -flushcache 2>/dev/null || true
killall -HUP mDNSResponder 2>/dev/null || true

echo "==> Added ${PRIMARY} for dojopop.live hostnames in ${HOSTS}"
echo "==> DNS cache flushed. Open https://dojopop.live"
echo "Remove the block later after NextDNS allowlist is set."
