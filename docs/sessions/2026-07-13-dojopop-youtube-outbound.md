# Session: DojoPop outbound YouTube channel scaffold
**Date:** 2026-07-13
**Project:** dojopop

## Summary
Cannot create a YouTube channel via API — that requires browser/Google Brand
Account setup. Scaffolded outbound DojoPop→YouTube upload (OAuth refresh token,
resumable upload, populate CLI) opposite the existing YouTube→Nostr PubSub path.
OAuth client/refresh secrets are **not** in Doppler yet; only inbound
`YOUTUBE_CHANNEL_ID` (+ `STRIPE_PRICE_YOUTUBE`) exist.

## Decisions
- Dedicated **DojoPop Brand Account** channel, separate from personal/Z0rlord.
- Keep `YOUTUBE_CHANNEL_ID` for inbound PubSub; pin outbound as
  `YOUTUBE_UPLOAD_CHANNEL_ID` once the Brand Account UC… id is known.
- Idempotency in `data/youtube_uploads.json` (event_id → youtube video id), not
  overloading `published.json` (that maps inbound yt-id → nostr).
- Default upload privacy: **private** until backfill is reviewed; quota ~6/day.
- Once outbound works, demote YouTube→DojoPop PubSub to optional.

## Actions taken
- Confirmed Doppler names: `YOUTUBE_CHANNEL_ID`, `STRIPE_PRICE_YOUTUBE` — no
  `YOUTUBE_CLIENT_ID` / `YOUTUBE_CLIENT_SECRET` / `YOUTUBE_REFRESH_TOKEN`.
- Inventory: ~183 practice kind-22s (`#dojopop`+`#proofofpractice`, excl
  nostube) on `wss://relay.dojopop.live`, all with Blossom imeta URLs; ~174
  usable rows in `published.json` with `video_url`.
- Added `pipeline/youtube_upload.py`, `youtube_oauth_bootstrap.py`,
  `upload_practice_to_youtube.py`; wired `youtube` into `social_post.py`.
- Documented manual Brand Account + OAuth steps in `pipeline/README.md`.

## Open items
- User: create DojoPop Brand Account in YouTube Studio.
- User: Google Cloud Desktop OAuth client → Doppler `YOUTUBE_CLIENT_*`, then
  `youtube_oauth_bootstrap.py` → `YOUTUBE_REFRESH_TOKEN`.
- Populate with `--limit 3` (private), then raise privacy / request quota.
- Optional later: auto-hook after practice publish; demote inbound PubSub.

## References
- Doppler: `dojopop` / `prd_zorie`
- `pipeline/youtube_upload.py`, `pipeline/upload_practice_to_youtube.py`
- `pipeline/README.md` § Outbound YouTube upload
- Inbound: `pipeline/youtube_pubsub.py` (unchanged)
