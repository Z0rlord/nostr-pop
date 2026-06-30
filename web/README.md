# DojoPop Landing Page

Next.js 14 App Router site for [dojopop.live](https://dojopop.live) — proof-of-practice
on Nostr with **$9.99/month** membership via Stripe or Lightning.

## Features

- Landing page: hero, how-it-works, relay + YakiHonne links
- `/join` — collect npub (+ optional email), pay via Stripe Checkout or Lightning
- `/films/yoga-sutra` — one-time film purchase (Lightning or Stripe), trailer + gated stream
- Membership stored in JSON (`data/members.json`) on the host volume
- Stripe subscription lifecycle via `/api/stripe/webhook`
- Lightning via BTCPay Server (or scaffold mode when creds missing)

## Membership v1

After payment, the member's **npub** is stored as `active`. Webhooks automatically
sync active member pubkeys (decoded to hex) into `relay/config.toml`
`pubkey_whitelist` and restart `dojopop-relay`. Admin pubkey is always included.

Manual sync:

```bash
doppler run --project dojopop --config prd_zorie -- ./web/scripts/sync-relay-whitelist.sh
```

On subscription cancel/expiry, the member is removed from the whitelist on the
next webhook or manual sync. nostr-rs-relay requires a container restart (no SIGHUP).

## Environment variables (names only)

Set via Doppler project `dojopop`, config `prd_zorie`:

| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_APP_URL` | yes | Public URL (`https://dojopop.live`) |
| `STRIPE_SECRET_KEY` | yes | Stripe API |
| `STRIPE_WEBHOOK_SECRET` | yes | Webhook signature verification |
| `STRIPE_PRICE_MEMBERSHIP` | recommended | $9.99/mo Price ID (auto-created if unset) |
| `LIGHTNING_MEMBERSHIP_SATS` | no | Default `10000` sats |
| `NWC_CONNECTION_SECRET` | Lightning | `nostr+walletconnect://…` from Alby Hub or Account |
| `MEMBERSHIP_DATA_DIR` | no | Default `./data` (Docker: `/app/data`) |
| `RELAY_CONFIG_PATH` | prod | `/relay/config.toml` (mounted from relay-2) |
| `RELAY_CONTAINER_NAME` | prod | `dojopop-relay` |
| `DOCKER_GID` | prod | Host docker group id for container restart |
| `DOJOPOP_LOGIN_NSEC` | DM login | Dedicated login-bot key (not founder `NOSTR_NSEC`) |
| `DOJOPOP_LOGIN_NPUB` | DM login | Login bot npub (optional; derived from nsec) |
| `DM_LOGIN_SECRET` | DM login | HMAC secret for login session tokens |
| `NEXT_PUBLIC_CDN_URL` | no | CDN origin for media URLs (defaults to Blossom URL) |
| `FILM_YOGA_SUTRA_SATS` | film | Default `100000` sats for Yoga Sutra one-time unlock |
| `FILM_YOGA_SUTRA_STRIPE_PRICE_ID` | film | Stripe Price ID (auto-created if unset) |
| `FILM_YOGA_SUTRA_STRIPE_PRICE_CENTS` | film | Default `1499` ($14.99) when auto-creating price |
| `FILM_YOGA_SUTRA_BLOSSOM_URL` | film | **Server-only** full film Blossom/CDN URL (never public) |
| `FILM_YOGA_SUTRA_TRAILER_URL` | film | Public trailer embed URL |

**Lightning:** NWC (NIP-47) via `NWC_CONNECTION_SECRET`. See [docs/lightning-nwc.md](../docs/lightning-nwc.md).

## Local development

```bash
export PATH="/opt/homebrew/bin:$PATH"
cd web
npm install

# Create/find Stripe Price ID (prints id to add as STRIPE_PRICE_MEMBERSHIP)
doppler run --project dojopop --config prd_zorie -- npm run stripe:ensure-price

doppler run --project dojopop --config prd_zorie -- npm run dev
# → http://localhost:3001
```

### Stripe test checkout

1. Ensure Doppler `STRIPE_SECRET_KEY` is test mode (`sk_test_…`).
2. Register webhook endpoint in [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/test/webhooks):
   - URL: `https://dojopop.live/api/stripe/webhook` (or ngrok for local)
   - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
   - Film one-time payments also use `checkout.session.completed` (mode `payment`, metadata `filmId`)
   - Copy signing secret → Doppler `STRIPE_WEBHOOK_SECRET`
3. Visit `/join`, enter a test npub, click **Pay with Stripe**.
4. Use test card `4242 4242 4242 4242`, any future expiry/CVC.

## Deploy to relay-2

```bash
# 1. Sync production .env to relay-2 (requires NWC_CONNECTION_SECRET in Doppler for Lightning)
chmod +x scripts/sync-production-env.sh
doppler run --project dojopop --config prd_zorie -- ./scripts/sync-production-env.sh relay-2

# 2. Update Cloudflare Tunnel ingress (adds dojopop.live → :3001)
chmod +x scripts/update-tunnel-ingress.sh deploy.sh
doppler run --project dojopop --config prd_zorie -- ./scripts/update-tunnel-ingress.sh

# 3. Deploy
./deploy.sh relay-2
```

Verify: `curl -sI https://dojopop.live | head -5`

## API routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/stripe/checkout` | POST | Create Checkout Session (`{ npub, email? }`) |
| `/api/stripe/webhook` | POST | Stripe subscription lifecycle |
| `/api/lightning/invoice` | POST | Create Lightning invoice |
| `/api/lightning/status/[id]` | GET | Poll invoice + QR |
| `/api/lightning/webhook` | POST | No-op (NWC uses polling) |
| `/api/films/yoga-sutra/stripe/checkout` | POST | One-time film Checkout (`{ npub?, email? }`) |
| `/api/films/yoga-sutra/stripe/confirm-session` | POST | Backup film unlock after Stripe redirect |
| `/api/films/yoga-sutra/lightning/invoice` | POST | Film Lightning invoice (`{ npub, email? }`) |
| `/api/films/yoga-sutra/lightning/status/[id]` | GET | Poll film invoice + QR |
| `/api/films/yoga-sutra/access` | GET | Check unlock (`?npub=` or `?token=`) |
| `/api/films/yoga-sutra/stream` | GET | Gated stream URL (`?npub=` or `?token=`) |

## DNS / NextDNS (Tailscale)

If `dojopop.live` resolves to `0.0.0.0` on your Mac, NextDNS (via Tailscale) is
sinkholing the domain. Permanent fix:

```bash
# Doppler: NEXTDNS_API_KEY + NEXTDNS_PROFILE_ID (2b4adf)
doppler run --project dojopop --config prd_zorie -- ./scripts/nextdns-allow-dojopop.sh
sudo dscacheutil -flushcache && sudo killall -HUP mDNSResponder
```

Emergency local override: `sudo ./scripts/fix-local-dns-dojopop.sh`

## Blockers / operator checklist

- [ ] Register Stripe webhook URL in dashboard (see above)
- [ ] Run `stripe:ensure-price` and add `STRIPE_PRICE_MEMBERSHIP` to Doppler
- [ ] Add BTCPay creds to Doppler for live Lightning
- [ ] Run `update-tunnel-ingress.sh` after first deploy
- [ ] Add paid member npubs to `relay/config.toml` whitelist
