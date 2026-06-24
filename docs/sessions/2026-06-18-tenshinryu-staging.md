# Session: Tenshinryu staging environment
**Date:** 2026-06-18
**Project:** dojopop

## Summary
Added a parallel staging stack for Tenshinryu KIWAMI at `https://staging.tenshinryu.xyz` on relay-2 port 3013, separate from production (`tenshinryu.xyz` :3003). Tunnel ingress, DNS, first deploy, staging banner, and Firebase authorized domain are in place.

## Decisions
- Staging path: `/opt/dojopop/tenshinryu-staging`, container `tenshinryu-staging`, port **3013**
- Workflow: `./deploy-staging.sh` → verify on staging → `./deploy.sh` for production
- Staging DB: prefer `TENSHINRYU_STAGING_DATABASE_URL` in Doppler (Neon branch); until set, staging shares prod DB with a warning
- `APP_ENV=staging` + blue STAGING banner on all pages

## Actions taken
- `tenshinryu/deploy-staging.sh`, `docker-compose.staging.yml`, `scripts/sync-env-staging.sh`, `scripts/db-setup-staging.sh`
- Tunnel ingress: `staging.tenshinryu.xyz` → `localhost:3013` in `web/scripts/update-tunnel-ingress.sh`
- DNS CNAME `staging` on tenshinryu.xyz zone
- First staging deploy to relay-2; health check OK on :3013
- Firebase: `staging.tenshinryu.xyz` added to authorized domains via `fix-firebase-auth-domains.py`
- `StagingBanner` component, README/AGENTS.md staging section

## Open items
- Create Neon branch + `TENSHINRYU_STAGING_DATABASE_URL` in Doppler before destructive staging tests
- Optional: `TENSHINRYU_STAGING_SUPERADMIN_KEY` separate from prod
- Run `scripts/nextdns-allow-dojopop.sh` on devices that block new subdomain

## References
- Staging URL: https://staging.tenshinryu.xyz
- Deploy: `cd tenshinryu && ./deploy-staging.sh relay-2`
- Doppler: `dojopop` / `prd_zorie`
