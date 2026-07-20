# Session: Facebook OG via DNS-only og.dojopop.live
**Date:** 2026-07-20
**Project:** dojopop

## Summary
Facebook share previews still failed because Cloudflare **AI Crawl Control** returns HTTP 403 to `meta-externalagent/1.1` on all proxied `*.dojopop.live` hosts (pages, Blossom thumbs, and `/og/practice/*`). `facebookexternalhit/1.1` still gets 200 with correct OG tags, but Meta’s image crawler could not fetch `og:image` when it pointed at same-zone URLs. Recent practice videos (e.g. Day 1346) use `blossom.dojopop.live` thumbs, so the previous yakihonne-CDN mitigation did not apply.

## Decisions
- Ship a **DNS-only** origin `og.dojopop.live` (grey-cloud A → relay-2 public IP) with nginx + Let’s Encrypt; Meta reaches origin without Cloudflare bot blocking.
- Keep human share URLs on `https://dojopop.live/v/...`; only `og:image` (and default hero) use `https://og.dojopop.live/...`.
- Cloudflare dashboard / Bot Management Edit token remains the fix for **page** scrapes by `meta-externalagent` (optional if Debugger’s `facebookexternalhit` path is enough).

## Actions taken
- Confirmed Day 1346 (`539895c21a5adc1e…`): page 200 for facebookexternalhit with full OG tags; 403 for meta-externalagent on page, blossom, and old og proxy; yakihonne external thumb still 200.
- `CLOUDFLARE_API_TOKEN` still cannot read/write `bot_management` (no Bot Management Edit). WAF rulesets create unauthorized. Global API key auth failed for known emails.
- Created DNS A `og.dojopop.live` → `178.105.250.69`, `proxied=false` (via `CLOUDFLARE_DNS_TOKEN`).
- Issued cert (`certbot --dns-cloudflare`); nginx `og-dojopop.conf` on relay-2 proxies `/og/practice/`, `/hero-dojo.jpg`, `/v/` to web `:3001`.
- Code: `ogImageOrigin()` / `NEXT_PUBLIC_OG_IMAGE_ORIGIN` in `web/src/lib/media-url.ts`; README + probe script updated; nginx template at `web/deploy/nginx-og-dojopop.conf`.
- Deployed web to relay-2 (`CHAT_UI_BUILD=0 ./deploy.sh relay-2`).

## Open items
- [ ] Operator: optional — disable AI Crawl Control on `dojopop.live` so `meta-externalagent` can fetch HTML on the main hostname (Sharing Debugger often works via `facebookexternalhit` without this).
- [ ] Upgrade `CLOUDFLARE_API_TOKEN` with **Bot Management → Edit** if unattended API disable is desired.
- [ ] Re-scrape Day 1346 (and other shares) in Facebook Sharing Debugger after deploy.

## References
- Prior: `docs/sessions/2026-07-05-facebook-og-cloudflare.md`
- `web/src/lib/media-url.ts` — `ogImageOrigin()`, `ogImageForPracticeVideo()`
- `web/deploy/nginx-og-dojopop.conf`
- `web/scripts/cloudflare-allow-social-crawlers.sh --check-only`
- Doppler: `CLOUDFLARE_DNS_TOKEN`, `CLOUDFLARE_API_TOKEN`; zone `cf2b671698354bbaafb5c606945dbb2c`
- Sample: https://dojopop.live/v/539895c21a5adc1e70971fd5d315d11445071e04b89dfca005b85a1e31c64149
