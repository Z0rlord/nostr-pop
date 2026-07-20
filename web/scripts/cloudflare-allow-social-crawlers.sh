#!/usr/bin/env bash
# Probe / optionally disable Cloudflare AI Crawl Control blocking Meta crawlers.
#
# Images: og:image uses DNS-only https://og.dojopop.live (Meta-reachable).
# Pages: proxied dojopop.live still 403s meta-externalagent until AI Crawl Control is off.
#
# Requires CLOUDFLARE_API_TOKEN with Bot Management Edit to change settings (not for --check-only).
#
# Usage:
#   ./scripts/cloudflare-allow-social-crawlers.sh --check-only
#   doppler run -- ./scripts/cloudflare-allow-social-crawlers.sh
set -euo pipefail

TOKEN="${CLOUDFLARE_API_TOKEN:-}"
ZONE="${DOJOPOP_ZONE_ID:-cf2b671698354bbaafb5c606945dbb2c}"
CHECK_ONLY="${1:-}"

EVENT="${OG_PROBE_EVENT_ID:-539895c21a5adc1e70971fd5d315d11445071e04b89dfca005b85a1e31c64149}"

echo "==> Probing crawlers…"
for ua in "meta-externalagent/1.1" "facebookexternalhit/1.1"; do
  page=$(curl -sS -A "$ua" -o /dev/null -w "%{http_code}" \
    "https://dojopop.live/v/$EVENT")
  og=$(curl -sS -A "$ua" -o /dev/null -w "%{http_code}" \
    "https://og.dojopop.live/og/practice/${EVENT}.jpg")
  echo "  $ua → page $page, og.dojopop.live image $og"
done

if [[ "$CHECK_ONLY" == "--check-only" ]]; then
  exit 0
fi

if [[ -z "$TOKEN" ]]; then
  echo "ERROR: set CLOUDFLARE_API_TOKEN"
  exit 1
fi

echo "==> Reading bot_management config…"
CURRENT=$(curl -sS -H "Authorization: Bearer $TOKEN" \
  "https://api.cloudflare.com/client/v4/zones/$ZONE/bot_management")
SUCCESS=$(echo "$CURRENT" | python3 -c "import json,sys; print(json.load(sys.stdin).get('success'))")

if [[ "$SUCCESS" != "True" ]]; then
  echo "WARN: API cannot read bot_management (token needs Bot Management Write)."
  echo ""
  echo "Fix manually in Cloudflare dashboard for zone dojopop.live:"
  echo "  1. Security → Settings → Bots"
  echo "  2. AI Crawl Control / Block AI bots → Off (or allow meta-externalagent)"
  echo "  3. Re-run: $0 --check-only  (meta-externalagent should return HTTP 200)"
  echo "  4. Re-scrape URLs in https://developers.facebook.com/tools/debug/"
  echo ""
  echo "Upgrade token: Cloudflare → My Profile → API Tokens → edit token →"
  echo "  Zone → dojopop.live → Bot Management → Edit"
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
  "https://dojopop.live/v/$EVENT")
og=$(curl -sS -A "meta-externalagent/1.1" -o /dev/null -w "%{http_code}" \
  "https://og.dojopop.live/og/practice/${EVENT}.jpg")
echo "  dojopop.live page → HTTP $code (200 if AI Crawl Control off)"
echo "  og.dojopop.live image → HTTP $og (want 200)"
echo "Done. Scrape once: https://developers.facebook.com/tools/debug/"
