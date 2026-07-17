# Session: YouTube PubSub auto-upload fix
**Date:** 2026-07-05
**Project:** dojopop

## Summary
YouTube auto-mirror to Nostr was broken on relay-2 due to an expired PubSubHubbub
subscription and yt-dlp bot-blocking on the datacenter IP. Fixed with cookies +
deno EJS runtime, auto-subscribe on deploy, and Primal kind-1 mirror in pipeline.

## Root causes
- PubSubHubbub lease expired (~10 days); no notifications since Jul 2 deploy.
- yt-dlp on relay-2 Hetzner IP hit "Sign in to confirm you're not a bot" without cookies.
- Container lacked deno/ffmpeg for YouTube signature challenges even with cookies.
- `deploy.sh` did not re-subscribe after deploy; renew cron had not run yet.
- Primal Media tab needs kind-1 mirror; `pipeline.py` only published kind-22.

## Actions taken
- Added `Dockerfile.pubsub` (ffmpeg + deno), updated `docker-compose.yml`.
- `download_youtube.py`: cookies file, deno/js EJS, proxy env, clearer errors.
- `youtube_pubsub.py`: spawn pipeline via `uv run`; `PYTHONUNBUFFERED=1`.
- `pipeline.py`: auto-publish kind-1 Primal mirror after kind-22.
- `deploy.sh`: build image, auto-subscribe, optional `YT_DLP_COOKIES` sync.
- Uploaded browser cookies to relay-2; re-subscribed hub (202 + verify OK).
- Backfilled missed videos: BddRSznv3uk, R9OaJbAjhos, W2uEIspDziM.
- Mac backfill (11 Jun 24–30 gap videos): published locally with deno + cookies;
  synced `published.json` (167 entries) to relay-2.
- Relay-2 catchup still fails on Hetzner IP despite cookies — needs `YT_DLP_PROXY`
  or publish from residential IP (Mac works).

## Decisions
- Cookies live at `data/youtube-cookies.txt` on relay-2; refresh every few weeks.
- Doppler `YT_DLP_COOKIES` blocked (>50 KiB); keep cookies as file on relay-2.
- **relay-2 downloads need residential `YT_DLP_PROXY`** — cookies alone insufficient on Hetzner.
- YakiHonne receives kind-22 directly; Primal needs kind-1 mirror (now automatic).

## Open items
- Configure `YT_DLP_PROXY` in Doppler for relay-2 auto-downloads.
- Refresh browser cookies every few weeks.
- Mac: `deno` 2.9.1 verified (local backfill unblocked).

## References
- `pipeline/youtube_pubsub.py`, `pipeline/deploy.sh`, `pipeline/Dockerfile.pubsub`
- Callback: https://hooks.dojopop.live/youtube/pubsub/callback
- Channel: `UCPQtStJdU8MM7duVXeCRgUw` (@Z0rlord)

## Deno verification (2026-07-05 evening)

| Location | Deno | Notes |
|----------|------|-------|
| Mac (`/opt/homebrew/bin/deno`) | 2.9.1 | `uv run yt-dlp --js-runtimes deno` + `data/youtube-cookies.txt` — metadata OK (test id `dQw4w9WgXcQ`) |
| relay-2 host | not installed | Expected; downloads run in `dojopop-youtube-pubsub` container |
| relay-2 `youtube-pubsub` container (`/usr/local/bin/deno`) | 2.9.1 | Image from `Dockerfile.pubsub`; no redeploy needed |

**Code path:** `download_youtube.py` `base_ydl_opts()` sets `js_runtimes: {deno: {}}` and `remote_components: [ejs:github]` for YouTube signature/n challenges.

**Container yt-dlp:** use `uv run --project pipeline` (Python `yt_dlp`); standalone `yt-dlp` binary not on PATH inside container.

**Auto-mirror status:** Deno/EJS is satisfied on relay-2. PubSub + cookies are wired (`YT_DLP_COOKIES_FILE=/app/data/youtube-cookies.txt`). Recent logs still show bot block on Hetzner IP for real uploads (`1MH_-dI8Eqw`, `prZUgwZELeg`) despite cookies — **`YT_DLP_PROXY` (residential) still required**; deno does not fix datacenter IP reputation.

- Mac local backfill: unblocked for yt-dlp when cookies fresh.
- relay-2 auto-download: still blocked until proxy configured (or cookies + IP luck on benign test URLs only).
