# Session: Social cross-post pipeline (own stack, no Zernio)
**Date:** 2026-07-01
**Project:** dojopop

## Summary
User rejected Zernio pricing ($6/account/mo beyond 2 accounts) and chose a self-hosted
pipeline on relay-2. Shipped Phase 1 MVP: `pipeline/social_post.py` publishes text or
media to Nostr relays (DojoPop + Primal + YakiHonne fan-out). Meta (IG/FB) and TikTok
adapters are scaffolds pending developer app review and OAuth tokens in Doppler.

## Decisions
- **Nostr first**: DojoPop, Primal, and YakiHonne are relay visibility targets, not
  separate APIs — one signed event to `DEFAULT_RELAYS` (or subset flags).
- **Video on Nostr**: Blossom upload → kind-22 + kind-1 Primal mirror (same as web
  `practice-primal-mirror.ts` and `mirror_practice_for_primal.py`).
- **Meta/TikTok**: build in `pipeline/social/` with Doppler secret names only; no
  Zernio dependency.
- Relay-2 remains the publish host (`doppler run` on relay-2 or tailnet).

## Actions taken
- `pipeline/social_post.py` — Nostr cross-post CLI (kind 1 / kind 22 + Primal mirror).
- `pipeline/meta_tiktok.py` — Meta/TikTok stubs with Doppler secret names + setup docs.
- Documented in `pipeline/README.md`; dry-run verified.

## Open items
- Meta Developer app + App Review (`instagram_content_publish`, `pages_manage_posts`).
- TikTok developer app + Content Posting audit (`video.upload`, `video.publish`).
- Wire IG video resumable upload (`rupload.facebook.com`) and TikTok FILE_UPLOAD chunks.
- Optional: n8n webhook on relay-2 triggering `social_post.py` after `pipeline.py` publish.
- OAuth token refresh cron (Meta 60-day tokens, TikTok 24h access tokens).

## References
- `pipeline/social_post.py`, `pipeline/common.py` (`DEFAULT_RELAYS`)
- Prior session: `docs/sessions/2026-07-01-zernio-social-automation.md`
- Meta: https://developers.facebook.com/docs/instagram-platform/content-publishing
- TikTok: https://developers.tiktok.com/doc/content-posting-api-get-started
