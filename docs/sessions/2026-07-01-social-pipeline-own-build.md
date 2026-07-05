# Session: Own-build social posting pipeline
**Date:** 2026-07-01
**Project:** dojopop

## Summary
Rejected Zernio (cost). Built an in-repo unified social CLI (`pipeline/social_post.py`) with working Nostr fan-out and scaffolded Meta/TikTok direct-API stubs (`pipeline/meta_tiktok.py`). Nostr assessment confirmed existing relay publish path works; video posts follow kind-22 + kind-1 Primal mirror pattern.

## Decisions
- **No Zernio** — user rejected aggregator pricing; build direct Meta Graph + TikTok Content Posting API integrations when ready.
- **Nostr first** — reuse Blossom upload, `DEFAULT_RELAYS`, `build_video_event`, `build_mirror_event`.
- **Stubs over half-wiring** — Instagram/Facebook/TikTok raise `NotImplementedError` with Doppler secret names and setup docs until OAuth tokens exist.
- **Single CLI** — `social_post.py --text … [--media …] [--platforms …]` rather than separate per-platform scripts.

## Actions taken
- Added `pipeline/social_post.py` (kind 1 text/image, kind 22 video + Primal mirror).
- Added `pipeline/meta_tiktok.py` stubs (`META_*`, `TIKTOK_*` secret names only).
- Documented in `pipeline/README.md`.

## Open items
- Add `META_*` and `TIKTOK_*` secrets to Doppler after developer app registration.
- Implement Graph API publish in `meta_tiktok.py` (IG Reels container, FB Page feed).
- Implement TikTok Content Posting API (direct post flow).
- Optional: n8n webhook trigger from `social_post.py` on successful Nostr publish.

## Cost vs Zernio
- **Own build:** $0 recurring API fees (Meta/TikTok developer tiers are free for normal posting volumes); engineering time to wire OAuth + publish flows.
- **Zernio:** paid SaaS per connected account / post volume (user rejected as too expensive).
- **Nostr leg:** already self-hosted (Blossom on relay-2, relays) — marginal storage/bandwidth only.

## References
- `pipeline/social_post.py`, `pipeline/meta_tiktok.py`
- Prior eval (superseded): [zernio-social-automation](./2026-07-01-zernio-social-automation.md)
- Doppler: project `dojopop`, config `prd_zorie`, signing `NOSTR_NSEC`
- Primal mirror pattern: `pipeline/mirror_practice_for_primal.py`, `web/src/lib/practice-primal-mirror.ts`
