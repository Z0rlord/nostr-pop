# Session: Self-hosted Bouquet (Blossom media UI)
**Date:** 2026-07-06
**Project:** dojopop

## Summary
Deployed [flox1an/bouquet](https://github.com/flox1an/bouquet) on relay-2 as an ops-only
Blossom blob manager at `https://bouquet.dojopop.live`. Static Vite build served by
nginx on `127.0.0.1:3015` via Cloudflare Tunnel.

## Decisions
- Host at **`bouquet.dojopop.live`** (port **3015** on relay-2).
- Pin upstream commit in `bouquet/COMMIT` (build clones from GitHub in Docker).
- Use `npm install` not `npm ci` — upstream lockfile drift at pinned commit.
- Ops-only: not linked from public DojoPop landing; sign in with pipeline pubkey.
- Default Blossom server to add in UI: `https://blossom.dojopop.live`.

## Actions taken
- Added `bouquet/` (Dockerfile, nginx SPA config, docker-compose, deploy.sh, update-tunnel.sh).
- Tunnel ingress + DNS CNAME `bouquet` on dojopop-relay tunnel.
- Deployed `dojopop-bouquet` container; public health check HTTP 200.
- Updated `pipeline/update-tunnel.sh`, `AGENTS.md`, `scripts/nextdns-allow-dojopop.sh`.

## Usage
1. Open https://bouquet.dojopop.live
2. Sign in (extension / Nostr Connect / bunker)
3. Settings → Servers → add `https://blossom.dojopop.live`

## Open items
- None required; optional: bookmark from admin.dojopop.live when ops dashboard exists.

## References
- `bouquet/README.md`, `bouquet/deploy.sh`
- Upstream: https://github.com/flox1an/bouquet @ `86e792be…`
- Blossom: `blossom-server/` → `https://blossom.dojopop.live`
