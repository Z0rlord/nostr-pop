#!/usr/bin/env bash
# Allow Facebook / Meta link-preview crawlers on dojopop.live (+ blossom.dojopop.live).
#
# Cloudflare "AI Crawl Control" blocks meta-externalagent with HTTP 403, which breaks
# Facebook share previews (no title, no thumbnail). facebookexternalhit may still work
# for pages but Meta increasingly uses meta-externalagent for images too.
#
# Requires CLOUDFLARE_API_TOKEN with Zone Settings Write + Bot Management Write.
#
# Usage:
#   doppler run -- ./scripts/cloudflare-allow-social-crawlers.sh
#   doppler run -- ./scripts/cloudflare-allow-social-crawlers.sh --check-only
set -euo pipefail

TOKEN="${CLOUDFLARE_API_TOKEN:-}"
ZONE="${DOJOPOP_ZONE_ID:-cf2b671698354bbaafb5c606945dbb2c}"
CHECK_ONLY="${1:-}"

if [[ -z "$TOKEN" ]]; then
  echo "ERROR: set CLOUDFLARE_API_TOKEN"
  exit 1
fi

echo "==> Probing crawlers (expect meta-externalagent 403 before fix)…"
for ua in "meta-externalagent/1.1" "facebookexternalhit/1.1"; do
  code=$(curl -sS -A "$ua" -o /dev/null -w "%{http_code}" \
    "https://dojopop.live/v/0deab537524b581936caec82f64e6a38cefd6d53330f11e64f841a83030604e3")
  echo "  $ua → HTTP $code"
done

if [[ "$CHECK_ONLY" == "--check-only" ]]; then
  exit 0
fi

echo "==> Reading bot_management config…"
CURRENT=$(curl -sS -H "Authorization: Bearer $TOKEN" \
  "https://api.cloudflare.com/client/v4/zones/$ZONE/bot_management")
SUCCESS=$(echo "$CURRENT" | python3 -c "import json,sys; print(json.load(sys.stdin).get('success'))")

if [[ "$SUCCESS" != "True" ]]; then
  echo "WARN: API cannot read bot_management (token may lack Bot Management Write)."
  echo ""
  echo "Fix manually in Cloudflare dashboard for zone dojopop.live:"
  echo "  1. Security → Settings → Bots"
  echo "  2. Under AI Crawl Control / Block AI bots → set to Off or add exception"
  echo "  3. Ensure meta-externalagent is NOT blocked (403)"
  echo "  4. Security → Bots → Configure robots.txt → allow social crawlers if offered"
  echo "  5. Re-scrape a video URL in Facebook Sharing Debugger"
  exit 1
fi

echo "==> Disabling AI bot blocking (ai_bots_protection=disabled)…"
curl -sS -X PUT -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  "https://api.cloudflare.com/client/v4/zones/$ZONE/bot_management" \
  -d '{"ai_bots_protection":"disabled","crawler_protection":"disabled"}' \
  | python3 -c "import json,sys; d=json.load(sys.stdin); print('success:', d.get('success')); print('errors:', d.get('errors'))"

echo "==> Re-probe meta-externalagent…"
sleep 2
code=$(curl -sS -A "meta-externalagent/1.1" -o /dev/null -w "%{http_code}" \
  "https://dojopop.live/og/practice/0deab537524b581936caec82f64e6a38cefd6d53330f11e64f841a83030604e3.jpg")
echo "  og image → HTTP $code (want 200)"
echo "Done. Scrape once: https://developers.facebook.com/tools/debug/"
