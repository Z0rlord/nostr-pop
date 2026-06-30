# DojoPop Bunker46

Primary NIP-46 bunker manager for DojoPop, based on [dsbaars/bunker46](https://github.com/dsbaars/bunker46)
(Vue + NestJS) with JWT/WebAuthn auth.

**Upstream pin:** see [`COMMIT`](./COMMIT) (cloned into `upstream/` on deploy).

## Stack

| Service | Port (relay-2) | Public URL |
|---------|----------------|------------|
| Bunker46 web (Caddy + Vue) | **3005** | `https://bunker.dojopop.live` |
| Bunker46 API (NestJS) | internal :3000 | proxied via web `/api*` |
| PostgreSQL / Redis | internal only | not exposed |

**Admin hub:** `https://admin.dojopop.live` (:3002) is reserved for a future DojoPop ops dashboard — see [`../admin/`](../admin/).

**Deprecated:** nsecbunker stack stopped 2026-06-24; config volume retained for rollback.

## Relays

Bunker46 uses **Primal-friendly public relays**, not `relay.dojopop.live`:

`wss://relay.primal.net`, `wss://purplepag.es`, `wss://nos.lol`, `wss://relay.damus.io`

Configured via `BUNKER46_NOSTR_DEFAULT_RELAYS` in Doppler.

## Deploy

```bash
# 1. Ensure Doppler secrets (see scripts/sync-env.sh)
doppler secrets --only-names --project dojopop --config prd_zorie | grep BUNKER46

# 2. Tunnel + DNS (bunker.dojopop.live → :3005, admin.dojopop.live → :3002)
doppler run --project dojopop --config prd_zorie -- ./web/scripts/update-tunnel-ingress.sh

# 3. NextDNS allowlist (optional, fixes Tailscale DNS sinkhole)
doppler run --project dojopop --config prd_zorie -- ./scripts/nextdns-allow-dojopop.sh

# 4. Deploy
chmod +x deploy.sh scripts/sync-env.sh
doppler run --project dojopop --config prd_zorie -- ./deploy.sh relay-2
```

## Domain retask (2026-06-24)

Phase 5 briefly moved Bunker46 to `admin.dojopop.live` (:3002). Reverted same day:

- `bunker.dojopop.live` → Bunker46 on port **3005**
- `admin.dojopop.live` → placeholder ops hub on port **3002** (future dashboard)
- nsecbunker stopped; `dojopop_nsecbunker_bunker-config` volume kept 7–14 days for rollback.

### WebAuthn re-enrollment required

RP ID is `bunker.dojopop.live`. Passkeys registered during the brief
`admin.dojopop.live` cutover are **invalid** and must be re-registered:

1. Open **https://bunker.dojopop.live** in desktop Chrome, Firefox, or Safari.
2. Log in with **password + TOTP** (TOTP still works).
3. Go to **Settings → Security → Register Passkey**.
4. Choose **Security Key** (not Touch ID / "This device").
5. Insert YubiKey and touch when prompted.

DojoPop patches (`patches/`) relax upstream `residentKey: required` to `preferred` and set
`authenticatorAttachment: cross-platform` so YubiKey registration works reliably.

## Environment (Doppler: dojopop / prd_zorie)

| Secret | Purpose |
|--------|---------|
| `BUNKER46_POSTGRES_PASSWORD` | PostgreSQL password |
| `BUNKER46_JWT_SECRET` | Access token signing |
| `BUNKER46_JWT_REFRESH_SECRET` | Refresh token signing |
| `BUNKER46_ENCRYPTION_KEY` | AES-256-GCM for stored nsec material |
| `BUNKER46_NOSTR_DEFAULT_RELAYS` | Default relay list (comma-separated `wss://`) |
| `BUNKER46_WEBAUTHN_RP_ID` | `bunker.dojopop.live` |
| `BUNKER46_WEBAUTHN_ORIGIN` | `https://bunker.dojopop.live` |
| `BUNKER46_CORS_ORIGINS` | `https://bunker.dojopop.live` |
| `BUNKER46_ALLOW_REGISTRATION` | `false` (locked after founder onboarding) |

`scripts/sync-env.sh` maps these into a compose `.env` on relay-2 (chmod 600).

## Rollback to nsecbunker

If Bunker46 cutover must be reversed within the retention window:

```bash
# On relay-2 — stop Bunker46, restart nsecbunker
ssh relay-2 'cd /opt/dojopop/bunker46 && docker compose stop'
ssh relay-2 'cd /opt/dojopop/nsecbunker && docker compose up -d'

# Re-point admin.dojopop.live ingress to :3002 nsecbunker admin UI
doppler run --project dojopop --config prd_zorie -- ./web/scripts/update-tunnel-ingress.sh
```

## Local upstream checkout

```bash
git clone https://github.com/dsbaars/bunker46.git upstream
cd upstream && git checkout "$(cat ../COMMIT)"
```

## Notes

- DB schema is applied via `prisma db push` on server start (upstream entrypoint).
- Redis enables live dashboard/SSE updates.
- `TRUST_PROXY=true` so sessions work behind Cloudflare Tunnel.
- Access tokens expire in 15 minutes; web app auto-refreshes on 401.
