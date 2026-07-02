# Session: YouTube PubSub auto-mirroring pipeline
**Date:** 2026-07-02
**Project:** dojopop

## Summary
Implemented and deployed a YouTube PubSubHubbub subscriber + callback service that
auto-runs `pipeline.py` when @Z0rlord uploads a new video. Callback is live at
`https://hooks.dojopop.live/youtube/pubsub/callback` on relay-2 via Cloudflare
Tunnel; hub subscription accepted (HTTP 202).

## Decisions
- Use YouTube PubSubHubbub Atom feed subscriptions (no YouTube API key required).
- Keep MVP as a standalone Python stdlib HTTP service in `pipeline/youtube_pubsub.py`.
- Trigger existing pipeline by spawning `pipeline.py --url <watch-url>` for each
  new `videoId`.
- Use Doppler env names `YOUTUBE_CHANNEL_ID` and `PUBSUB_CALLBACK_URL`.
- Public hostname: `hooks.dojopop.live` → tunnel `dojopop-relay` → `localhost:3009`.
- Renewal cadence: cron on relay-2 every 5 days (lease is ~10 days).

## Actions taken
- Added `pipeline/youtube_pubsub.py` (serve / subscribe / renew).
- Added relay-2 deploy artifacts:
  - `pipeline/docker-compose.yml` — `dojopop-youtube-pubsub` on `127.0.0.1:3009`
  - `pipeline/deploy.sh` — rsync code + Doppler `.env` to `/opt/dojopop/pipeline`
  - `pipeline/update-tunnel.sh` — Cloudflare tunnel ingress + `hooks` DNS CNAME
  - `pipeline/setup-renew-cron.sh` — root crontab renewal via `docker compose exec`
- Doppler `dojopop/prd_zorie`: `YOUTUBE_CHANNEL_ID`, `PUBSUB_CALLBACK_URL` set.
- Deployed to relay-2 (`/opt/dojopop/pipeline`); container healthy.
- Subscribed channel `UCPQtStJdU8MM7duVXeCRgUw` — hub returned **202 Accepted**.
- Verified callback: GET without challenge → 400; with `hub.challenge` → 200
  (public via Cloudflare and localhost on relay-2).

## Deployment status (2026-07-02)
| Item | Status |
|---|---|
| Callback URL | `https://hooks.dojopop.live/youtube/pubsub/callback` |
| relay-2 service | `dojopop-youtube-pubsub` @ `127.0.0.1:3009` |
| Tunnel | `dojopop-relay` (`543b3cee-…`) remote-managed ingress |
| Hub subscribe | 202 Accepted (async verify) |
| Renewal cron | `0 4 */5 * *` on relay-2 root crontab |

## Open items
- Confirm hub async verification completes (check container logs on first notification).
- Add monitoring/alerts for callback uptime and renew failures (`/var/log/dojopop-pubsub-renew.log`).
- First live upload will exercise full `pipeline.py` → Blossom → Nostr path on relay-2.

## References
- `pipeline/youtube_pubsub.py`
- `pipeline/deploy.sh`, `pipeline/update-tunnel.sh`, `pipeline/setup-renew-cron.sh`
- `pipeline/README.md`
- Channel: https://www.youtube.com/@Z0rlord (`UCPQtStJdU8MM7duVXeCRgUw`)
- Hub endpoint: https://pubsubhubbub.appspot.com/subscribe
- relay-2: Tailscale `100.125.184.46`, SSH alias `relay-2`
