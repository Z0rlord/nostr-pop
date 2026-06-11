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
- **Remotes:** `origin` = GitHub `Z0rlord/nostr-pop` (exists, verified 200);
  `gitlab` = `git@gitlab.com:Z0rlord/nostr-pop.git` **placeholder** —
  `GITLAB_TOKEN` in Doppler is expired, so the real GitLab path could not be
  verified. Fix with:
  `git remote set-url gitlab <real-url>` once known.
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
- [x] GitLab: token rotated; created `gitlab.com/zbarber1/nostr-pop` (public)
  via API and pushed `main` (token passed via env-based credential helper at
  push time — nothing stored in `.git/config`).
- [ ] GitHub push auth: no SSH key for github.com and no `gh` CLI — commits
  are local only. `brew install gh && gh auth login`, then `git push -u origin main`.
- [x] Test batch published (2026-06-11): 3 of the 156 staged shorts
  (HzPwWEm2y5s newest, TN5WBkrinEk mid-range, y7cVcxIsDrE oldest 2023) —
  video + thumb on blossom.yakihonne.com (HTTP 200, sizes match), kind-22
  events accepted by `ws://relay-2:7777` (primary), nostr-01.yakihonne.com,
  relay.damus.io, nos.lol; fetched back + sig-verified from relay-2 and
  YakiHonne. `nostr-02.yakihonne.com` rejected all (server-side: HTTP 502 /
  "mdb_txn_commit: No space left on device" — their disk, not us).
  State in `data/published.json` (now git-tracked).
- [ ] Remaining 153 shorts: same path, pending user go-ahead
  (`doppler run -- uv run --project pipeline pipeline/pipeline.py --url
  https://www.youtube.com/@Z0rlord/shorts --max-duration 90` — published ids
  are skipped automatically).
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
- Blossom: https://blossom.yakihonne.com, hzrd149/blossom-server
- Specs: NIP-01, NIP-71, NIP-92/94, BUD-02, BUD-06
