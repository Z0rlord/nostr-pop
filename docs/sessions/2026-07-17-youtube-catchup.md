# Session: YouTube catch-up (Days 1342–1344)
**Date:** 2026-07-17
**Project:** dojopop

## Summary
Channel shorts were ahead of DojoPop: `published.json` topped out at Day 1341
while YouTube already had Days 1342–1344. Published all three from the laptop
(cookies + residential IP), with Blossom upload, kind-22, Primal kind-1, and
login-bot nostu.be mirrors. Merged the new yt ids into relay-2 `published.json`
so PubSub catch-up will not re-download.

## Decisions
- Prefer `https://www.youtube.com/watch?v=<id>` over `/shorts/<id>` for single
  video publishes: the `/shorts` path triggers the channel-tab guard, and
  flat-playlist on a single short returns no `entries` (empty allowed set).
- Laptop publish remains the reliable path when datacenter yt-dlp is bot-blocked.

## Actions taken
- Listed channel shorts via yt-dlp; missing: Day 1342 `d0PF0lGSBtY`, Day 1343
  `cbgzEDo8oCg`, Day 1344 `5Tech1XZ_yk`.
- Installed Homebrew `ffmpeg` (was missing) for transcode/thumbnails.
- Published all three with
  `doppler run --project dojopop --config prd_zorie -- uv run --project pipeline pipeline/pipeline.py --url <watch-url>`.
- Kind-22 accepted on relay-2 + public relays; Primal kind-1 mirrors OK
  (occasional damus 503).
- Nostube mirrors accepted on primal/damus/nos.lol; initially blocked on dojopop
  relay (login-bot missing from whitelist at publish time).
- Merged three entries into `/opt/dojopop/pipeline/data/published.json` on
  relay-2 (178 → 181).
- Ran `sync-relay-whitelist.sh` — login-bot pubkey is now on relay + Blossom
  whitelist; relay/blossom restarted.

### Event ids

| Day | yt id | kind-22 | Primal kind-1 | nostube mirror |
|-----|-------|---------|---------------|----------------|
| 1342 | d0PF0lGSBtY | `8bc1bbaba07b65cd30e29137357e2d40d0b7503c72fbb537ce0545dd86941d12` | `0e005383858d82adf46aaba381f01de7abc85d2e88719355db9bd111154e3c85` | `fbcfea5d6dacf267f76220fd5c0ff9f20d3fed205f68c10e6a8ea8b4dd05bbc0` |
| 1343 | cbgzEDo8oCg | `d0924f170fb4f76b01d68d8dc2280dcbbaddf80d87c8bbcac8e111e05f3011a0` | `a631a6ce308ebdce44a5ad540acaf61f8942668b5d92e2b1a22c80479e654b83` | `39c86affe49967d5dfe404302f7bd1493a4fb084d2323b7b18841273db85a949` |
| 1344 | 5Tech1XZ_yk | `6f4eac19c7b47ff615b950b08303217a9cfac430b354fd8138b99585973a6784` | `0cfcdf87a4a145e838de46d5694e00563e6a9abf2d3860ef59ca07b0bc626fec` | `79b71309a16767a764639a77a6b4f6c0e86b0679a5ad48bea89297193857f186` |

## Open items
- Keep `data/youtube-cookies.txt` fresh on relay-2 (or set `YT_DLP_PROXY`) so
  automated catch-up does not stall.
- Google Drive session backup token expired (`invalid_grant`); re-run
  `scripts/drive-oauth-setup.py` when convenient.

## References
- Related: `docs/sessions/2026-07-13-nostube-youtube-gap.md`
- Doppler: `dojopop` / `prd_zorie` (`NOSTR_NSEC`, `DOJOPOP_LOGIN_NSEC`, `YOUTUBE_CHANNEL_ID`)
- Login-bot npub: `npub1tr2lmpne0npfznnmurnktqat9ya0thf4hsx6zkmhmyksjwlvg97qkctgqa`
