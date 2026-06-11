# Session: DojoPop landing page + $0.99/mo membership

**Date:** 2026-06-11
**Project:** dojopop / nostr-pop

## Summary

Built `web/` — Next.js 14 landing page for **dojopop.live** with Stripe recurring
checkout ($0.99/mo) and Lightning scaffold (BTCPay integration point). Deployed
to relay-2 via Docker on port **3001**; tunnel ingress and DNS updated on the
live **dojopop-relay** tunnel (`543b3cee…`).

## Decisions

- **Stack:** Next.js 14 App Router + Tailwind, `output: standalone` for Docker.
- **Membership store:** JSON files (`members.json`, `lightning-invoices.json`)
  on Docker volume — simple v1, no SQLite native deps.
- **Stripe Price:** Created product "DojoPop Membership" + $0.99/mo price via API.
  Store as `STRIPE_PRICE_MEMBERSHIP` in Doppler (auto-created at checkout if unset).
- **Lightning:** No BTCPay/OpenNode keys in Doppler — scaffold mode with polling
  UI and README gap. Add `BTCPAY_URL`, `BTCPAY_API_KEY`, `BTCPAY_STORE_ID` to enable.
- **Tunnel:** Use **dojopop-relay** tunnel `543b3cee-e3dd-422f-a619-7a34236a0ba0`
  (relay-2 cloudflared), NOT `CLOUDFLARE_TUNNEL_ID` from Doppler (`4b000692…`, different tunnel).
- **DNS zone:** `cf2b671698354bbaafb5c606945dbb2c` (dojopop.live), not `CLOUDFLARE_ZONE_ID`
  (the47.xyz).

## Membership v1 flow

1. User enters npub (+ optional email) on `/join`.
2. **Stripe:** Checkout Session → webhook activates member in JSON store.
3. **Lightning:** Invoice record + polling; BTCPay webhook when configured.
4. **Benefit:** npub queued for manual relay whitelist in `relay/config.toml`.

## Verified

- `npm run build` on relay-2 — success.
- Docker `dojopop-web` on relay-2:3001 — HTTP 200.
- `POST /api/stripe/checkout` — returns Stripe Checkout URL.
- `POST /api/lightning/invoice` — scaffold mode (`configured: false`).
- `https://dojopop.live` — HTTP 200 via Cloudflare tunnel (forced resolve test).

## Doppler secrets used (names only)

- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_APP_URL` (set to `https://dojopop.live` on relay-2)
- `CLOUDFLARE_DNS_TOKEN` (tunnel + DNS API)
- **Add:** `STRIPE_PRICE_MEMBERSHIP` (from `npm run stripe:ensure-price`)
- **Future Lightning:** `BTCPAY_URL`, `BTCPAY_API_KEY`, `BTCPAY_STORE_ID`

## Operator checklist

- [ ] Register Stripe webhook: `https://dojopop.live/api/stripe/webhook`
- [ ] Add `STRIPE_PRICE_MEMBERSHIP` to Doppler
- [ ] Add BTCPay creds for live Lightning
- [ ] Whitelist paid member npubs in `relay/config.toml`
