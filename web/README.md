# DojoPop Landing Page

Next.js 14 App Router site for [dojopop.live](https://dojopop.live) — proof-of-practice
on Nostr with **$0.99/month** membership via Stripe or Lightning.

## Features

- Landing page: hero, how-it-works, relay + YakiHonne links
- `/join` — collect npub (+ optional email), pay via Stripe Checkout or Lightning
- Membership stored in JSON (`data/members.json`) on the host volume
- Stripe subscription lifecycle via `/api/stripe/webhook`
- Lightning via BTCPay Server (or scaffold mode when creds missing)

## Membership v1

After payment, the member's **npub** is stored as `active`. Operators manually add
active member pubkeys to `relay/config.toml` → `authorization.pubkey_whitelist`.
Future: automated whitelist sync, `#dojopop-member` tag feeds.

## Environment variables (names only)

Set via Doppler project `dojopop`, config `prd_zorie`:

| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_APP_URL` | yes | Public URL (`https://dojopop.live`) |
| `STRIPE_SECRET_KEY` | yes | Stripe API |
| `STRIPE_WEBHOOK_SECRET` | yes | Webhook signature verification |
| `STRIPE_PRICE_MEMBERSHIP` | recommended | $0.99/mo Price ID (auto-created if unset) |
| `LIGHTNING_MEMBERSHIP_SATS` | no | Default `1000` sats |
| `BTCPAY_URL` | Lightning | BTCPay base URL |
| `BTCPAY_API_KEY` | Lightning | BTCPay API token |
| `BTCPAY_STORE_ID` | Lightning | BTCPay store id |
| `MEMBERSHIP_DATA_DIR` | no | Default `./data` (Docker: `/app/data`) |

**Lightning:** No Lightning/BTCPay/OpenNode keys exist in Doppler today. Stripe is
fully wired; Lightning runs in **scaffold mode** until `BTCPAY_*` vars are added.

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
   - Copy signing secret → Doppler `STRIPE_WEBHOOK_SECRET`
3. Visit `/join`, enter a test npub, click **Pay with Stripe**.
4. Use test card `4242 4242 4242 4242`, any future expiry/CVC.

## Deploy to relay-2

```bash
# 1. Sync production .env to relay-2 (once)
doppler secrets download --project dojopop --config prd_zorie --no-file --format env \
  | grep -E '^(NEXT_PUBLIC_APP_URL|STRIPE_|BTCPAY_|LIGHTNING_|MEMBERSHIP_)' \
  > /tmp/dojopop-web.env
scp /tmp/dojopop-web.env relay-2:/opt/dojopop/web/.env
ssh relay-2 'chmod 600 /opt/dojopop/web/.env'

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
| `/api/lightning/webhook` | POST | BTCPay settlement callback |

## Blockers / operator checklist

- [ ] Register Stripe webhook URL in dashboard (see above)
- [ ] Run `stripe:ensure-price` and add `STRIPE_PRICE_MEMBERSHIP` to Doppler
- [ ] Add BTCPay creds to Doppler for live Lightning
- [ ] Run `update-tunnel-ingress.sh` after first deploy
- [ ] Add paid member npubs to `relay/config.toml` whitelist
