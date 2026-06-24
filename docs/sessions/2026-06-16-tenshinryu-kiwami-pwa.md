# Session: Tenshinryu KIWAMI PWA on Hetzner vol1
**Date:** 2026-06-16
**Project:** dojopop | tenshinryu

## Summary
Built a lean Tenshinryu ONLINE KIWAMI PWA in `tenshinryu/` (monorepo), mirroring international.tenshinryu.net content with Firebase auth, service worker, and Docker deploy to Hetzner Nuremberg vol1 (`relay-2` / `Dojopophetznervol1`).

## Decisions
- **Rebuild vs fork:** New focused app in `dojopop/tenshinryu/` rather than deploying full `Z0rlord/tenshinryu-app` (Prisma/Stripe/Nostr scope deferred).
- **Host:** `/opt/dojopop/tenshinryu` on relay-2, port **3003** (3002 is nsecbunker-admin).
- **Domain:** `https://kiwami.tenshinryu.xyz` via existing Cloudflare tunnel `dojopop-relay`.
- **Auth:** Firebase Google/Apple redirect + `FIREBASE_SERVICE_ACCOUNT_JSON` session cookies; maps `NEXT_PUBLIC_FIREBASE_APP_ID_` → `NEXT_PUBLIC_FIREBASE_APP_ID`.
- **Doppler:** `dojopop` / `prd_zorie` (not a separate tenshinryu project).

## Actions taken
- Created Next.js 14 PWA: landing (full KIWAMI copy), `/login`, `/signup`, `/member` stub, `sw.js`, `manifest.json`.
- `tenshinryu/deploy.sh`, `scripts/sync-env.sh`, Docker standalone build.
- Deployed container `tenshinryu-kiwami` on relay-2:3003 (health 200).
- Updated `web/scripts/update-tunnel-ingress.sh` with `TENSHINRYU_PORT` / `kiwami.tenshinryu.xyz`.
- CNAME `kiwami.tenshinryu.xyz` → tunnel in tenshinryu.xyz zone.

## Open items
- Add `kiwami.tenshinryu.xyz` (and dev host) to Firebase Console **Authorized domains**.
- Migrate video curriculum / stage progress into `/member` (v2).
- Wire PayPal/Stripe tier webhooks when payment flow moves off international site.
- Optional: retire `/opt/tenshinryu` legacy tree on server once KIWAMI is validated.

## References
- Source content: https://international.tenshinryu.net/tenshinryu-online
- Prior repo: https://github.com/Z0rlord/tenshinryu-app
- `tenshinryu/README.md`, `tenshinryu/deploy.sh`
