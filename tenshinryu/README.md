# Tenshinryu KIWAMI PWA

Progressive web app for [TENSHINRYU ONLINE KIWAMI -極-](https://international.tenshinryu.net/tenshinryu-online) — KIWAMI landing, Firebase auth, and role-based dashboards ported from [Z0rlord/tenshinryu-app](https://github.com/Z0rlord/tenshinryu-app).

## Dashboards

| Route | Role | Purpose |
|-------|------|---------|
| `/login` | — | Google / Apple sign-in → Prisma session |
| `/home` | all | Hub with quick links after sign-in |
| `/instructor` | instructor, admin | Check-in, classes, attendance, analytics, invites |
| `/student` | student | Practice log, journal, heatmap, badges, AI insights |
| `/admin` | admin (`isAdmin`) | Owner business metrics |
| `/invite/owner` | — | School leader onboarding (email invite → set password) |
| `/invite/instructor` | — | Instructor onboarding |

Auth flow: Firebase ID token → `POST /api/auth/firebase` → cookies `session` (Prisma UUID) + `role`.

| `/superadmin` | platform | Multi-dojo console (`SUPERADMIN_KEY`) |

## Owner onboarding (school leader)

1. **Superadmin** (`/superadmin`) → enter `SUPERADMIN_KEY` → **Invite owner** on a dojo row, or **Create Dojo** with leader name + email.
2. Leader receives email with link to `/invite/owner?token=…`
3. They set **name + password** → land on **Owner dashboard** (`/admin`) with full admin rights.
4. They can also sign in later with **Google** using the same email (Firebase links automatically).

CLI (from `tenshinryu/`):

```bash
doppler run --project dojopop --config prd_zorie -- node scripts/invite-owner.mjs \
  --email sensei@example.com --name "Tenshin Sensei"
```

Requires `RESEND_API_KEY` in Doppler for email delivery. Without it, the script prints the invite URL to copy manually.

## Foreign-country schools

Schools from [Foreign Country DOJO](https://international.tenshinryu.net/foreign-country-dojo) are seeded as their own dojos (codes like `ES`, `IT`, `CL`, …). UI groups them as **Foreign schools (海外)** — separate from Japan branches and Global Keikokai.

```bash
# Staging first
doppler run --project dojopop --config prd_zorie -- bash -c '
  export DATABASE_URL="$(doppler secrets get TENSHINRYU_STAGING_DATABASE_URL --plain)"
  export NEXT_PUBLIC_APP_URL=https://staging.tenshinryu.xyz
  node scripts/seed-foreign-dojos.mjs
'

# Production (after staging looks good)
doppler run --project dojopop --config prd_zorie -- bash -c '
  export DATABASE_URL="$(doppler secrets get TENSHINRYU_DATABASE_URL --plain)"
  export NEXT_PUBLIC_APP_URL=https://tenshinryu.xyz
  node scripts/seed-foreign-dojos.mjs --prod
'
```

Leaders with emails on the international page get pending **owner** invites for their school only. Schools without emails stay invite-ready via `invite-owner.mjs --dojo-id …`. Kuwami Sensei remains admin across all schools.

## Staging vs production

| | Production | Staging |
|---|------------|---------|
| URL | https://tenshinryu.xyz | https://staging.tenshinryu.xyz |
| Host path | `/opt/dojopop/tenshinryu` | `/opt/dojopop/tenshinryu-staging` |
| Port | 3003 | 3013 |
| Deploy | `./deploy.sh` | `./deploy-staging.sh` |
| DB | `TENSHINRYU_DATABASE_URL` | `TENSHINRYU_STAGING_DATABASE_URL` (add in Doppler; falls back to prod URL with warning) |

**Workflow:** develop → `./deploy-staging.sh` → verify on staging → `./deploy.sh` for production.

### One-time staging setup

1. **Doppler** (optional but recommended): add `TENSHINRYU_STAGING_DATABASE_URL` — Neon branch URL, separate from production.
2. **Tunnel + DNS:**
   ```bash
   cd web && doppler run --project dojopop --config prd_zorie -- ./scripts/update-tunnel-ingress.sh
   ```
3. **Firebase Console** → Authentication → Authorized domains → add `staging.tenshinryu.xyz`.
4. **First staging deploy:**
   ```bash
   cd tenshinryu && ./deploy-staging.sh relay-2
   ```

Staging shows a blue **STAGING** banner at the top of every page.

## Database

```bash
cd tenshinryu
doppler run --project dojopop --config prd_zorie -- npx prisma db push
SEED_OWNER_EMAIL=you@example.com doppler run --project dojopop --config prd_zorie -- npm run db:seed
```

Hosted on **Hetzner Nuremberg vol1** (`relay-2`, Tailscale `100.125.184.46`) at port **3003**.

## Stack

- Next.js 14 (standalone Docker)
- Firebase Auth (Google + Apple)
- Service worker + `manifest.json` for PWA install

## Hyoho Wiki

Study material lives in the sibling **[`tenshinryu-wiki/`](../tenshinryu-wiki/)** directory (same `dojopop` monorepo, deployed separately to `wiki.tenshinryu.xyz`).

| In-app | Wiki |
|--------|------|
| `/wiki` | Locale-aware redirect → `https://wiki.tenshinryu.xyz/{en\|ja\|es\|el}/` |
| Home quick link + nav **Study** | ~2860 markdown pages (EN/JA full; ES/EL stubbed) |
| Site footer **Hyoho Wiki** | Static nginx on relay-2 `:3014` |

Wiki content is version-controlled at repo root (`tenshinryu-wiki/`); book PDFs and kata photos stay local (`raw/books/`, `raw/assets/` gitignored). Deploy wiki with `cd tenshinryu-wiki && ./deploy.sh`. Deploy this app with `./deploy.sh` below.

## Local dev

```bash
cd tenshinryu
doppler run --project dojopop --config prd_zorie -- npm install
doppler run --project dojopop --config prd_zorie -- npm run dev
```

Open http://localhost:3003

## Deploy

1. Sync env to server (once):

```bash
doppler secrets download --no-file --format env --project dojopop --config prd_zorie > /tmp/tenshinryu.env
# Ensure NEXT_PUBLIC_FIREBASE_APP_ID is set (copy from NEXT_PUBLIC_FIREBASE_APP_ID_ if needed)
scp /tmp/tenshinryu.env relay-2:/opt/dojopop/tenshinryu/.env
ssh relay-2 'chmod 600 /opt/dojopop/tenshinryu/.env'
```

2. Deploy:

```bash
./tenshinryu/deploy.sh relay-2
```

3. Cloudflare tunnel — `tenshinryu.xyz`, `www`, and `kiwami` → `localhost:3003` via `web/scripts/update-tunnel-ingress.sh`.

4. Firebase Console — authorize `tenshinryu.xyz`, `www.tenshinryu.xyz`, and `kiwami.tenshinryu.xyz` under Authentication → Settings → Authorized domains (required for sign-in return to your site).

   Google sign-in uses `auth.tenshinryu.xyz` as `authDomain` (custom Firebase Hosting domain). DNS: CNAME `auth` → `dojopop.web.app` (DNS only, not proxied). Set `TENSHINRYU_FIREBASE_AUTH_DOMAIN` in Doppler. Run `./scripts/setup-auth-tenshinryu-dns.py` after Firebase provides records.

   OAuth redirect URI (Google Cloud Console → Credentials → Web client): `https://auth.tenshinryu.xyz/__/auth/handler`

## Ports on relay-2

| Port | Service |
|------|---------|
| 3001 | dojopop-web |
| 3002 | nsecbunker-admin |
| **3003** | **tenshinryu-kiwami** |
| 3004 | blossom |

## Source repo

Forked from [Z0rlord/tenshinryu-app](https://github.com/Z0rlord/tenshinryu-app); this tree keeps the KIWAMI landing plus instructor/student/owner dashboards from that repo.

## Hyoho Wiki

The multilingual reference wiki lives in the sibling directory [`../tenshinryu-wiki/`](../tenshinryu-wiki/) (same `dojopop` monorepo). Public site: [wiki.tenshinryu.xyz](https://wiki.tenshinryu.xyz).

| In-app entry | Behavior |
|--------------|----------|
| `/wiki` | Redirects to `wiki.tenshinryu.xyz/{locale}/` using the `locale` cookie (en/ja/es/el; others → en) |
| App nav + `/home` quick link | Same `/wiki` redirect |
| Footer + landing header | Links to `/wiki` |

Wiki content and deploy are independent of the PWA — run `tenshinryu-wiki/deploy.sh` after wiki edits; run `tenshinryu/deploy.sh` after app changes.

## PayPal subscriptions

Payments use **PayPal** (not Stripe). Webhook endpoint:

`https://tenshinryu.xyz/api/paypal/webhook`

Register this URL in [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/applications) → your app → Webhooks. Subscribe to:

- `BILLING.SUBSCRIPTION.ACTIVATED`
- `BILLING.SUBSCRIPTION.UPDATED`
- `BILLING.SUBSCRIPTION.CANCELLED`
- `BILLING.SUBSCRIPTION.EXPIRED`
- `BILLING.SUBSCRIPTION.SUSPENDED`
- `BILLING.SUBSCRIPTION.PAYMENT.FAILED`

**Doppler secrets** (replace `PLACEHOLDER_*` when Tenshinryu admin provides creds):

| Secret | Purpose |
|--------|---------|
| `PAYPAL_CLIENT_ID` | REST app Client ID |
| `PAYPAL_CLIENT_SECRET` | REST app secret (server only) |
| `NEXT_PUBLIC_PAYPAL_CLIENT_ID` | Same Client ID for browser SDK (future) |
| `PAYPAL_WEBHOOK_ID` | Webhook ID after registering URL |
| `PAYPAL_PLAN_GOLD` | PayPal plan ID for $35/mo GOLD |
| `PAYPAL_PLAN_ROYAL` | PayPal plan ID for $85/mo ROYAL |
| `PAYPAL_MODE` | `sandbox` or `live` |

Until real credentials are set, the webhook **accepts and logs** events but does **not** update membership (stub mode). Set `PAYPAL_SKIP_WEBHOOK_VERIFY=true` only for local testing.

See `.env.example` for the full list.
