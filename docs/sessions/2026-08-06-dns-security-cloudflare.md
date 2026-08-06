# Session: DNS security records (Cloudflare)
**Date:** 2026-08-06
**Project:** dojopop | nostr-pop

## Summary

Applied CAA, DNSSEC (zone-side), DMARC (`p=none`), and SPF for `dojopop.live` and `tenshinryu.xyz` via Cloudflare API (`CLOUDFLARE_DNS_TOKEN`). Verified via `dig @1.1.1.1`. Skipped MTA-STS / TLS-RPT (no apex MX). Resend domain API was 403 — no Tenshinryu DKIM invented.

## Decisions

- CAA at apex: Let’s Encrypt, Google Trust Services (`pki.goog; cansignhttpexchanges=yes`), SSL.com — matching `issue` + `issuewild` (per current CF CA docs). Dig also shows CF auto-injected `comodoca.com` / DigiCert CAA alongside ours (Universal SSL).
- DNSSEC: enabled in Cloudflare for both zones (`status=pending` until DS at registrar). CF is DNS host only (not registrar) — DS must be added at the domain registrar.
- DMARC: `p=none` monitor; `rua=mailto:dmarc@…` on each domain (no apex MX yet — reports may not land until Email Routing / mailbox exists).
- SPF dojopop: apex `v=spf1 include:amazonses.com ~all` (From uses `@dojopop.live` via Resend). Left `send.dojopop.live` at `~all` (Resend docs).
- SPF tenshinryu: apex `v=spf1 -all` (app still sends as `onboarding@resend.dev`; no invented DKIM). Resend domain verification still needed for custom From.

## Actions taken

- Idempotent create of CAA ×6, `_dmarc` TXT, apex SPF TXT per zone.
- `PATCH …/dnssec` → `active` (API reports `pending` + DS strings).
- Dig verification via 1.1.1.1 for CAA / TXT / DMARC / DNSKEY; parent DS empty (expected).
- No unrelated DNS deleted; existing Resend DKIM/MX on `send.dojopop.live` untouched.

## Open items

- **Manual:** Add DS at registrar for both zones (values from Cloudflare DNSSEC API — do not invent):
  - `dojopop.live. 3600 IN DS 2371 13 2 92E9413C4105044F8F7E4E0C71D7FDFCD76951EFC12387905FB89C78A4003FB7`
  - `tenshinryu.xyz. 3600 IN DS 2371 13 2 1E8F0C3A849AD7588586AFD4BA883D2DB569B0F54DFCB22496CA6ECBD292CE12`
- After DS propagates, confirm CF DNSSEC status → `active`.
- Optional: Cloudflare Email Routing (or similar) for `dmarc@` / `admin@` so RUA is receivable.
- Tenshinryu: add/verify domain in Resend (API key lacked domains scope), then publish exact DKIM/send records Resend returns; relax apex SPF accordingly.
- Later: tighten DMARC (`p=quarantine`/`reject`) once reports look clean; reconsider MTA-STS if apex MX is added.

## References

- Zones: `DOJOPOP_ZONE_ID` / `TENSHINRYU_ZONE_ID` in `web/scripts/update-tunnel-ingress.sh`
- Doppler: `dojopop` / `prd_zorie` — `CLOUDFLARE_DNS_TOKEN` (writes); `CLOUDFLARE_API_TOKEN` read-ish
- CF CAA docs: https://developers.cloudflare.com/ssl/edge-certificates/caa-records/
- Skipped: MTA-STS, TLS-RPT
