# Session: Zernio social automation exploration
**Date:** 2026-07-01
**Project:** dojopop

## Summary
Explored Zernio.io as a unified social posting API for upcoming social media automation (possibly via n8n). Stored `ZERNIO_API_KEY` in Doppler; live API calls succeed but no social accounts are connected yet another 修改 yet. Full self-host replication on relay-2 is not practical; recommended Zernio + n8n orchestration on relay-2 alongside existing Nostr/Blossom pipeline.

## Decisions
- Use **Zernio** for multi-platform OAuth posting (X, LinkedIn, IG, TikTok, etc.) rather than rebuilding 15 platform integrations on relay-2.
- Deploy **n8n on relay-2** as workflow orchestration (RSS, webhooks, pipeline cross-post triggers).
- Keep **Nostr pipeline** (`pipeline/` → Blossom → relay) for Nostr-native content; Zernio does not cover Nostr.
- Secret name: `ZERNIO_API_KEY` in Doppler `dojopop` / `prd_zorie`.

## Actions taken
- Added `ZERNIO_API_KEY` to Doppler (`dojopop` / `prd_zorie`).
- Verified API: profiles exist (default), accounts/posts empty — OAuth connect needed in Zernio dashboard.

## Open items
- Connect 1–2 social accounts in Zernio dashboard (free tier).
- Deploy n8n on relay-2 (Docker, Doppler-injected secrets).
- Install `n8n-nodes-zernio`; smoke-test Create Post workflow.
- Wire pipeline publish events → n8n → Zernio cross-post teasers.
- Register Zernio `post.failed` webhook for alerts.
- Set X API spend cap in Zernio before heavy X automation.

## References
- Zernio API: `https://zernio.com/api/v1`
- n8n node: `n8n-nodes-zernio`
- Doppler: project `dojopop`, config `prd_zorie`, secret `ZERNIO_API_KEY`
- relay-2 stack: AGENTS.md (ports 3001–8080, blossom, relay, bunker46)
