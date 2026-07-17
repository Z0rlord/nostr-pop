# Session: nostube YouTube gap (days 1331–1341)
**Date:** 2026-07-13
**Project:** dojopop

## Summary
YouTube shorts for days 1336–1341 never reached Nostr because relay-2 yt-dlp was
bot-blocked (stale cookies). Days 1331–1335 already had founder kind-22 events
plus login-bot `#dojopop-nostube` mirrors from an earlier backfill. Pipeline only
did Primal kind-1 mirrors — nostube was wired for web practice publish + CLI
backfill, not YouTube `pipeline.py`. Republished 1336–1341 locally, wired
nostube into the pipeline, deployed with `DOJOPOP_LOGIN_NSEC`, refreshed cookies
on relay-2, and merged missing yt ids into remote `published.json`.

## Decisions
- YouTube path should emit nostube mirrors the same way as web practice (login-bot
  `DOJOPOP_LOGIN_NSEC`, `#dojopop-nostube`).
- Deploy pubsub `.env` must include `DOJOPOP_LOGIN_NSEC` (and optional admin fallback).
- Catch-up/state: when events exist on relay but yt ids are missing from
  `published.json`, merge stubs so PubSub stops retrying failed downloads.

## Actions taken
- Queried `wss://relay.dojopop.live`: 1331–1335 present + mirrored; 1336–1341 absent.
- Root cause on relay-2: `Sign in to confirm you're not a bot` from yt-dlp.
- Published 1336–1341 from laptop via `pipeline.py` (cookies work on residential IP).
- Wired `build_nostube_mirror_event` / `nostube_signer` into `pipeline/pipeline.py`.
- Updated `pipeline/deploy.sh` to ship `DOJOPOP_LOGIN_NSEC`.
- Merged yt ids 1331–1341 into relay-2 `published.json`; synced local cookies;
  redeployed youtube-pubsub.
- Verified login-bot mirrors for all days 1331–1341 on public relay.

## Open items
- Keep `data/youtube-cookies.txt` fresh on relay-2 (or set `YT_DLP_PROXY`) so
  PubSub catch-up does not stall again on datacenter bot checks.
- Optional: refresh Doppler `YT_DLP_COOKIES` and deploy with `--sync-cookies`.

## References
- Login-bot pubkey hex: `58d5fd86797cc2914e7be0e76583ab293af5dd35bc0da15b77d92d093bec417c`
- Login-bot npub: `npub1tr2lmpne0npfznnmurnktqat9ya0thf4hsx6zkmhmyksjwlvg97qkctgqa`
- Doppler: `dojopop` / `prd_zorie` (`NOSTR_NSEC`, `DOJOPOP_LOGIN_NSEC`)
- Related: `docs/sessions/2026-07-10-nostube-practice-mirror.md`
