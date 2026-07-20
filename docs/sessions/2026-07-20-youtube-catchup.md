# Session: YouTube catch-up (Days 1345–1346)
**Date:** 2026-07-20
**Project:** dojopop

## Summary
Channel shorts were ahead of DojoPop again: local/relay `published.json`
topped out at Day 1344 while YouTube already had Days 1345–1346. Published
both from the laptop (cookies + residential IP), with Blossom upload, kind-22,
Primal kind-1, and login-bot nostu.be mirrors. Merged the new yt ids into
relay-2 `published.json` so PubSub catch-up will not re-download.

## Decisions
- Same path as 2026-07-17: prefer `watch?v=` URLs; laptop publish when
  datacenter yt-dlp is bot-blocked.
- Merge-only update of relay-2 `published.json` (never full overwrite from laptop).

## Actions taken
- Listed channel shorts via yt-dlp; missing: Day 1345 `tPDQf6X-eWU`, Day 1346
  `RsxrnQkiRHk`.
- Published both with
  `doppler run --project dojopop --config prd_zorie -- uv run --project pipeline pipeline/pipeline.py --url <watch-url>`.
- Kind-22 accepted on relay-2 + public relays (occasional damus 503).
- Nostube mirrors accepted on relay-2 / dojopop / primal / nos.lol (login-bot
  whitelist still good from prior catch-up).
- Merged two entries into `/opt/dojopop/pipeline/data/published.json` on
  relay-2 (181 → 183). Local count: 183.

### Event ids

| Day | yt id | kind-22 | Primal kind-1 | nostube mirror |
|-----|-------|---------|---------------|----------------|
| 1345 | tPDQf6X-eWU | `8cd0ca58c937995d62d10ff57dc54311dcd06e8d4c98419648b7b3208f3e1947` | `78d4ae5259d14e33c5b066ccdacfff2387945a70b6a99a59a30c595c29941a3c` | `f87839b50125eb2a515db0340966773c27a97470ffcbc0da2bec1d2526dd1655` |
| 1346 | RsxrnQkiRHk | `539895c21a5adc1e70971fd5d315d11445071e04b89dfca005b85a1e31c64149` | `ce576eb1c8aaeddc2078195f2604ffcdc08b71cf2efe6b537d3ba5ebd361e5a9` | `37aaf29c9a604a168b66ecb4c21c4be3fad7dfd02505ced0451fd1a14aff891e` |

## Open items
- Keep `data/youtube-cookies.txt` fresh on relay-2 (or set `YT_DLP_PROXY`) so
  automated catch-up does not stall.

## References
- Prior: `docs/sessions/2026-07-17-youtube-catchup.md` (Days 1342–1344)
- Doppler: `dojopop` / `prd_zorie` (`NOSTR_NSEC`, `DOJOPOP_LOGIN_NSEC`, `YOUTUBE_CHANNEL_ID`)
- Login-bot npub: `npub1tr2lmpne0npfznnmurnktqat9ya0thf4hsx6zkmhmyksjwlvg97qkctgqa`
