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
| `STREAK_NWC_CONNECTION_SECRET` | Streak sats (optional) | Dedicated NWC with `pay_invoice` (falls back to `NWC_CONNECTION_SECRET`) |
| `STREAK_PAYOUT_CRON_SECRET` | Streak sats cron | Shared secret for `POST /api/ops/streak-payouts` |
| `STREAK_PAYOUT_DRY_RUN` | Streak sats | Default `1` (no real pays); set `0` to enable |
| `STREAK_SATS_AMOUNT` | Streak sats | Default `21` |
| `STREAK_SATS_MIN_STREAK` | Streak sats | Default `1` |
| `STREAK_SATS_DAILY_BUDGET` | Streak sats | Default `10000` |
| `MEMBERSHIP_DATA_DIR` | no | Default `./data` (Docker: `/app/data`) |
| `RELAY_CONFIG_PATH` | prod | `/relay/config.toml` (mounted from relay-2) |
| `RELAY_CONTAINER_NAME` | prod | `dojopop-relay` |
| `DOCKER_GID` | prod | Host docker group id for container restart |
| `DOJOPOP_LOGIN_NSEC` | DM login + nostu.be | Dedicated login-bot key (not founder `NOSTR_NSEC`); also signs practice nostu.be mirrors |
| `DOJOPOP_LOGIN_NPUB` | DM login | Login bot npub (optional; derived from nsec) |
| `DOJOPOP_ADMIN_NSEC` | optional legacy | Transition fallback for nostu.be mirrors only if LOGIN unset (`DOJO_ADMIN_PRIVATE_KEY` also) |
| `DM_LOGIN_SECRET` | DM login | HMAC secret for login session tokens |
| `NEXT_PUBLIC_CDN_URL` | no | CDN origin for media URLs (defaults to Blossom URL) |
| `FILM_YOGA_SUTRA_TRAILER_VIMEO_ID` | film | Vimeo numeric ID for trailer embed (preferred) |
| `FILM_YOGA_SUTRA_TRAILER_URL` | film | Trailer MP4 URL, or Vimeo URL (player/vimeo.com or vimeo.com/video/…) parsed as embed |
| `FILM_YOGA_SUTRA_BLOSSOM_URL` | film | **Server-only** full film Blossom/CDN URL (never public) |
| `FILM_YOGA_SUTRA_BUY_SATS` | film | Default `100000` sats — own + download |
| `FILM_YOGA_SUTRA_RENT_SATS` | film | Default `27000` sats — 48-hour stream |
| `FILM_YOGA_SUTRA_BUY_STRIPE_PRICE_ID` | film | Stripe Price ID for buy tier (auto-created if unset) |
| `FILM_YOGA_SUTRA_RENT_STRIPE_PRICE_ID` | film | Stripe Price ID for rent tier (auto-created if unset) |
| `FILM_YOGA_SUTRA_BUY_STRIPE_PRICE_CENTS` | film | Default `1499` ($14.99) when auto-creating buy price |
| `FILM_YOGA_SUTRA_RENT_STRIPE_PRICE_CENTS` | film | Default `399` ($3.99) when auto-creating rent price |

Legacy (buy tier only): `FILM_YOGA_SUTRA_SATS`, `FILM_YOGA_SUTRA_STRIPE_PRICE_ID`, `FILM_YOGA_SUTRA_STRIPE_PRICE_CENTS`.

**Lightning:** NWC (NIP-47) via `NWC_CONNECTION_SECRET`. See [docs/lightning-nwc.md](../docs/lightning-nwc.md).

**Streak sats:** daily micro-rewards for active members with a practice streak. See [docs/sessions/2026-07-17-streak-sats.md](../docs/sessions/2026-07-17-streak-sats.md). Cron:

```bash
curl -sS -X POST https://dojopop.live/api/ops/streak-payouts \
  -H "x-streak-payout-secret: $STREAK_PAYOUT_CRON_SECRET" \
  -H 'Content-Type: application/json' \
  -d '{"dryRun":true}'
```

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

## Sign in with Clave (iPhone)

[Clave](https://clave.casa) is a NIP-46 remote signer for iPhone — keys stay in the
Keychain; DojoPop never sees your nsec.

**Desktop browser → iPhone signer:**

1. On dojopop.live, open **Sign in** → **Show QR code**.
2. On iPhone, install Clave from the App Store and open **Connect**.
3. Scan the QR → tap **Approve** when DojoPop requests access.

Same flow works for publishing practice videos after DM or extension sign-in.
Primal Remote Login is an alternative; Clave is recommended on iPhone when you want
a dedicated signer without the full Primal client.

NIP-46 relay set includes `wss://relay.powr.build` for reliable Clave background wake-up.

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

## Facebook / Meta link previews

`/v/[eventId]` pages use `generateMetadata` with dynamic `og:title`, `og:description`,
`og:url`, and `og:image` (external CDN thumb or `https://og.dojopop.live/og/practice/[id].jpg`).

**Root cause:** Cloudflare **AI Crawl Control** on proxied `*.dojopop.live` returns HTTP
**403** to `meta-externalagent/1.1` (while `facebookexternalhit/1.1` often still gets 200).
Meta uses both; blocked image fetches mean missing thumbnails.

**Mitigation (shipped):** `og:image` URLs use DNS-only `og.dojopop.live` (grey-cloud A record →
relay-2 nginx → web `:3001`), which Meta can fetch without going through Cloudflare bot
blocking. Share page URLs stay on `https://dojopop.live/v/...`.

**If previews still fail (title/description missing):** allow Meta on the main zone:

1. Cloudflare dashboard → **Security → Settings → Bots** → disable **Block AI bots**
   / AI Crawl Control for `dojopop.live` (or allow `meta-externalagent`).
2. Or run (needs `CLOUDFLARE_API_TOKEN` with **Bot Management Edit**):

   ```bash
   doppler run --project dojopop --config prd_zorie -- ./scripts/cloudflare-allow-social-crawlers.sh
   ```

3. Re-scrape each URL in [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
   (Facebook caches OG tags aggressively). Click **Scrape Again**.

Ops: nginx `conf.d/og-dojopop.conf` on relay-2; cert via `certbot --dns-cloudflare` for
`og.dojopop.live`. Probe: `./scripts/cloudflare-allow-social-crawlers.sh --check-only`.

## Blockers / operator checklist

- [ ] Allow Meta crawlers in Cloudflare (see Facebook link previews above)
- [ ] Register Stripe webhook URL in dashboard (see above)
- [ ] Run `stripe:ensure-price` and add `STRIPE_PRICE_MEMBERSHIP` to Doppler
- [ ] Add BTCPay creds to Doppler for live Lightning
- [ ] Run `update-tunnel-ingress.sh` after first deploy
- [ ] Add paid member npubs to `relay/config.toml` whitelist
