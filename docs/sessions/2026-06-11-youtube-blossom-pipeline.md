# Session: YouTube → Blossom → Nostr pipeline + Blossom server scaffold
**Date:** 2026-06-11
**Project:** dojopop

## Summary

Built the proof-of-practice publishing pipeline: download one-minute sword
practice videos from YouTube with yt-dlp, upload video + thumbnail to a
Blossom server (BUD-02/06), and publish NIP-71 kind-22 video events to the
YakiHonne + public relays. Scaffolded a self-hosted `blossom-server/`
(hzrd149/blossom-server, Docker). Repaired the broken `.git` (it only
contained `description`/`info` — no HEAD/config/objects) and configured dual
remotes. Fixed the Doppler scope to `dojopop` / `prd_zorie`, which contains
`NOSTR_NSEC`.

## Decisions

- **Pipeline location:** new `pipeline/` uv project (root `pyproject.toml`
  stays dedicated to drive-backup tooling). Run with
  `uv run --project pipeline …` from the repo root.
- **Event kind:** 22 (NIP-71 short video) by default; `--kind 34236` for the
  addressable variant with a `d` tag. (The 34567 proof-of-practice kind from
  the 2026-06-02 session remains for the future Rust CLI; imported YouTube
  clips use the standard video kinds so YakiHonne renders them.)
- **Tags:** `title`, `published_at`, `duration`, `imeta`
  (url/x/m/dim/duration/image), `t` = swordpractice/dojopop/proofofpractice,
  `["origin","youtube","<id>","<url>"]` for imported content.
- **Crypto:** minimal NIP-01 in `pipeline/nostr_util.py` — `coincurve`
  (BIP-340 Schnorr) + vendored bech32; no heavyweight nostr SDK.
- **ffmpeg without Homebrew:** Homebrew is unusable (dirs owned by another
  user, `sudo chown` needed), so yt-dlp merging and thumbnails use the static
  binary from `imageio-ffmpeg`; system ffmpeg is preferred when present.
- **Remotes:** `origin` = GitHub `Z0rlord/nostr-pop`;
  `gitlab` = `https://gitlab.com/zbarber1/nostr-pop.git` (created via API,
  both remotes synced at `2587a8d`).
- **Blossom whitelist:** hex pubkey
  `b3d8544ddd5896f75ef66c210f5c0d6ded9f7925163ebcbc89e678bdc1e48c6a`
  (decoded from the dojopop npub) scoped in `blossom-server/config.yml` rules
  with `requirePubkeyInRule: true`.

## Actions taken

- `doppler setup --project dojopop --config prd_zorie` (scope was wrongly
  pinned to the removed `zorie-production`); confirmed `NOSTR_NSEC` exists and
  signs to the expected npub.
- Re-initialized `.git`, set identity (GitHub noreply), added `origin` +
  `gitlab` remotes.
- Created `pipeline/`: `download_youtube.py`, `blossom_upload.py`,
  `publish_video_event.py`, `pipeline.py` (orchestrator, idempotent via
  `data/published.json`), `nostr_util.py`, `common.py`, `README.md`.
- Created `blossom-server/`: `docker-compose.yml`, `config.yml`, `README.md`.
- Updated `.gitignore` (`data/`, `blossom-server/data/`, venvs, `.env*`).

## Verification results

- ✅ Dry-run end-to-end on a 52 s CC trailer (`ytsearch` → mp4 download +
  merge → sha256 → ffmpeg thumbnail → signed + locally verified kind-24242
  auth event and kind-22 video event). Nothing published.
- ✅ `NOSTR_NSEC` → pubkey matches the dojopop npub.
- ✅ `HEAD /upload` preflight against `https://blossom.yakihonne.com`
  returned 200 with the signed auth event.
- ✅ Relay websocket checks: `nostr-01.yakihonne.com`, `relay.damus.io`,
  `nos.lol` OK; `nostr-02.yakihonne.com` refused both attempts (kept in the
  default list; the publisher tolerates partial failure).
- ❌ Local blossom-server bring-up: Docker Desktop install is broken
  (`kLSNoExecutableErr` — executable missing) and no colima/podman present.

## Open items

- [ ] Fix Docker Desktop (reinstall, or `brew install colima docker` once brew
  is fixed) then verify: `cd blossom-server && docker compose up -d` and an
  authed test upload against `http://localhost:3000`.
- [ ] Homebrew unusable: dirs owned by another user — run the
  `sudo chown -R perseus-air /opt/homebrew …` command brew prints, then
  optionally `brew install yt-dlp ffmpeg deno` (deno silences yt-dlp's JS
  runtime warning).
- [x] GitLab: `gitlab.com/zbarber1/nostr-pop` created; `main` pushed.
- [x] GitHub: `origin` synced (`main` at `2587a8d`).
- [x] Test batch published (2026-06-11): 3 of the 156 staged shorts
  (HzPwWEm2y5s newest, TN5WBkrinEk mid-range, y7cVcxIsDrE oldest 2023) —
  video + thumb on blossom.yakihonne.com (HTTP 200, sizes match), kind-22
  events accepted by `ws://relay-2:7777` (primary), nostr-01.yakihonne.com,
  relay.damus.io, nos.lol; fetched back + sig-verified from relay-2 and
  YakiHonne. `nostr-02.yakihonne.com` rejected all (server-side: HTTP 502 /
  "mdb_txn_commit: No space left on device" — their disk, not us).
  State in `data/published.json` (now git-tracked).
- [x] Full batch published (2026-06-11): **177 total** (3 test + 174 batch).
  Per-relay: relay-2 174/174, nostr-01.yakihonne 174/174, nos.lol 174/174,
  damus 118/174 (rate-limit "noting too much" + CF 520s), nostr-02 0/174
  (disk full / 502 — server-side). Every event accepted by ≥3 relays.
  ~2.2 GB uploaded to blossom.yakihonne.com.
- **Shorts-only audit (after user concern):** all 177 published ids verified
  to be in the Shorts tab two independent ways — membership in
  `yt-dlp --flat-playlist` of `/@Z0rlord/shorts` (playlist "Z0r Lord -
  Shorts", 214 ids) and `https://www.youtube.com/shorts/<id>` returning
  HTTP 200 (regular videos 303-redirect). **Zero non-shorts published.**
  The 21 videos absent from the preview run were under-enumeration in that
  first pass, not channel expansion. The 37 unpublished tab entries are all
  >90 s (duration filter).
- **Retraction (2026-06-11):** 21 non-practice promo/product shorts retracted via
  `delete_published.py` (NIP-09 kind-5 to relay-2, relay.dojopop.live,
  nostr-01, damus, nos.lol). Events no longer returned by REQ on relay-2 and
  nostr-01. Blossom DELETE returned HTTP 200 per blob but YakiHonne CDN still
  serves some URLs (likely their caching policy). **156 practice shorts remain**
  in `data/published.json`.
- **Guard added:** `/shorts` URLs are pinned to the tab's flat-playlist id set
  before download; any out-of-tab id aborts the run. `delete_published.py`
  added for retractions (NIP-09 kind-5 + Blossom BUD-02 delete + state
  removal): `doppler run -- uv run --project pipeline
  pipeline/delete_published.py --yt-id <id> --reason "posted in error"`.
- Metadata is now configurable via `pipeline/metadata.yml`
  (hashtags, content/alt templates, content-warning, kind); `published_at` is
  the original YouTube publish time.

## Usage (the real run)

```bash
cd ~/Projects/dojopop
doppler run -- uv run --project pipeline pipeline/pipeline.py \
  --url <youtube-channel-or-playlist-url> --max-duration 90
```

Add `--dry-run` first to preview. `--server http://localhost:3000` targets the
local blossom-server instead of YakiHonne.

## References

- Doppler: project `dojopop`, config `prd_zorie`, secret `NOSTR_NSEC` (name only)
- GitHub: https://github.com/Z0rlord/nostr-pop (origin)
- GitLab: https://gitlab.com/zbarber1/nostr-pop (gitlab remote)
- Blossom: https://blossom.yakihonne.com, hzrd149/blossom-server
- Specs: NIP-01, NIP-71, NIP-92/94, BUD-02, BUD-06
