# DojoPop video pipeline

YouTube → Blossom → Nostr (NIP-71) proof-of-practice publisher. Separate uv
project from the root drive-backup tooling (`uv run --project pipeline …`).

## One-command usage

```bash
cd ~/Projects/dojopop
doppler run -- uv run --project pipeline pipeline/pipeline.py \
  --url <youtube-channel-or-playlist-or-video-url>
```

- `NOSTR_NSEC` comes from Doppler (`dojopop` / `prd_zorie`) — never pass it on
  the command line.
- Default Blossom server: `https://blossom.dojopop.live` (self-hosted on
  relay-2; `--server` to override, e.g. `http://localhost:3000` for local dev).
- Default relays, published primary-then-public: **`ws://relay-2:7777`**
  (tailnet) and **`wss://relay.dojopop.live`** (public Cloudflare Tunnel),
  first sequentially, then YakiHonne (`nostr-01.yakihonne.com`) +
  `relay.damus.io` + `nos.lol` in parallel (`--relay wss://…` to override,
  repeatable). Per-relay failure is tolerated.
- Idempotent: `data/published.json` records published YouTube ids; re-runs
  skip them (`--force` to re-publish).
- `--dry-run`: downloads, hashes, generates the thumbnail, builds + signs +
  locally verifies the 24242 auth and kind-22 video events, but uploads and
  publishes nothing. Each built event is written to `data/preview/<id>.event.json`
  for review (the `url`/`x` imeta values are placeholders until the real
  Blossom upload).

## Metadata configuration

Event metadata defaults live in [`metadata.yml`](./metadata.yml)
(`--config <path>` to use a different file):

| Key | Default | Meaning |
|---|---|---|
| `kind` | `22` | NIP-71 short video; `34236` for the addressable variant |
| `hashtags` | swordpractice, dojopop, proofofpractice | `t` tags |
| `extra_hashtags` | `[]` | appended to `hashtags` |
| `content_template` | `{title}\n\n{description}` | event content; `{title}` `{description}` `{url}` available |
| `alt_template` | `Short practice video: {title}` | NIP-31 `alt` tag; empty disables |
| `content_warning` | `null` | adds a `content-warning` tag when set |

CLI overrides: `--kind`, `--hashtag` (repeatable; replaces the list).
`published_at` is always the **original YouTube publish time** (exact
timestamp when yt-dlp provides one, otherwise the upload date at midnight
UTC); `duration`/`dim` come from the yt-dlp info of the actual downloaded
file.

## Retract a published video

```bash
doppler run -- uv run --project pipeline pipeline/delete_published.py \
  --yt-id <youtube-id> --reason "posted in error"
```

Sends NIP-09 kind-5 deletion, Blossom BUD-02 delete, and removes the entry from
`data/published.json`.

## Large masters (feature films)

Practice policy (480p / 60 s) is enforced in `common.prepare_video_for_upload`
and used by `pipeline.py`. Large masters bypass that path entirely:

```bash
doppler run -- uv run --project pipeline pipeline/blossom_upload.py \
  --file /path/to/master.mp4 --server https://blossom.dojopop.live
```

Default endpoint is `PUT /upload` (no server transcode). Do not use
`--endpoint media` for films — that hits BUD-05 and downscales to 480p on the
DojoPop blossom server.

## Individual stages

```bash
# 1. download only (writes data/videos/<id>.mp4 + .info.json)
uv run --project pipeline pipeline/download_youtube.py --url <URL> --max-duration 60

# 2. upload one file to Blossom (prints BlobDescriptor JSON)
doppler run -- uv run --project pipeline pipeline/blossom_upload.py --file data/videos/<id>.mp4

# 3. build + publish the NIP-71 event from saved metadata + descriptor
doppler run -- uv run --project pipeline pipeline/publish_video_event.py \
  --meta data/videos/<id>.info.json --video-descriptor desc.json --dry-run
```

## Social cross-post (`social_post.py`)

Unified CLI for cross-platform posts. **Nostr is fully working** (DojoPop +
Primal + YakiHonne via relay fan-out); Instagram, Facebook, and TikTok are
scaffolded stubs in `meta_tiktok.py` until Meta/TikTok app review and Doppler
tokens are wired.

```bash
# Text note → kind 1 on all default relays
doppler run -- uv run --project pipeline pipeline/social_post.py \
  --text "Announcement from the dojo"

# Video → Blossom, kind 22, kind-1 Primal mirror (Media tab)
doppler run -- uv run --project pipeline pipeline/social_post.py \
  --text "Day 42 — morning practice" --media clip.mp4

# Multi-platform (Nostr works; Meta/TikTok blocked until implemented)
doppler run -- uv run --project pipeline pipeline/social_post.py \
  --text "Cross-post teaser" --media clip.mp4 \
  --platforms nostr,instagram,facebook,tiktok

# Inspect signed events without uploading
doppler run -- uv run --project pipeline pipeline/social_post.py \
  --text "dry run" --media clip.mp4 --dry-run
```

| Platform | Status | Mechanism |
|---|---|---|
| `nostr` | **Working** | kind 1 (text/image), kind 22 + Primal mirror (video) → `DEFAULT_RELAYS` |
| `instagram` | Blocked | Meta Graph API — `META_*` secrets in Doppler |
| `facebook` | Blocked | Meta Graph API — `META_*` secrets in Doppler |
| `tiktok` | Blocked | TikTok Content Posting API — `TIKTOK_*` secrets |

**Nostr is not three APIs.** One signed event published to relays in
`common.py` (`ws://relay-2:7777`, `wss://relay.dojopop.live`,
`wss://nostr-01.yakihonne.com`, `wss://relay.primal.net`, …) gives DojoPop,
Primal, and YakiHonne visibility — clients index from relays.

Reuses `blossom_upload.py`, `publish_video_event.build_video_event`, and
`mirror_practice_for_primal.build_mirror_event`. Signing: `NOSTR_NSEC` via
Doppler (`dojopop` / `prd_zorie`). Dry-run previews → `data/preview/`.

### Doppler secret names (Meta/TikTok — Phase 2)

| Secret | Used by |
|---|---|
| `NOSTR_NSEC` | Nostr (existing) |
| `META_APP_ID`, `META_APP_SECRET`, `META_ACCESS_TOKEN` | Meta OAuth |
| `META_IG_USER_ID`, `META_FB_PAGE_ID` | IG + Facebook Page |
| `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET` | TikTok OAuth |
| `TIKTOK_ACCESS_TOKEN`, `TIKTOK_OPEN_ID` | TikTok publish |

**Where to get them** (store values in Doppler `dojopop` / `prd_zorie` only):

| Platform | Console | Notes |
|---|---|---|
| **Meta** (IG + FB) | [developers.facebook.com/apps](https://developers.facebook.com/apps/) | Business app → Instagram Graph API + Facebook Login; IG must be Business/Creator linked to a Page; `instagram_content_publish` needs [App Review](https://developers.facebook.com/docs/app-review/) |
| **TikTok** | [developers.tiktok.com](https://developers.tiktok.com/) | Content Posting API + Direct Post; scopes `video.publish` / `video.upload`; [audit](https://developers.tiktok.com/doc/content-posting-api-get-started) for public posts |
| **YouTube download** | — | `pipeline.py` uses **yt-dlp only** — no API keys |
| **YouTube upload** | [console.cloud.google.com](https://console.cloud.google.com/) | Not implemented; would need YouTube Data API v3 OAuth (`YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_REFRESH_TOKEN`) |

See `pipeline/meta_tiktok.py` for setup links. Pubkey must be on the relay
whitelist (`relay/config.toml`).

## YouTube PubSubHubbub auto-mirroring

Run an HTTP callback service that subscribes to your YouTube channel Atom feed and
auto-triggers `pipeline.py` when YouTube publishes a new upload.

### Why this works

- No YouTube Data API keys are required.
- Topic feed format: `https://www.youtube.com/feeds/videos.xml?channel_id=CHANNEL_ID`.
- Hub verifies callback via `GET` (`hub.challenge`) and sends upload notifications
  via `POST` Atom XML.
- YouTube hub subscriptions expire (roughly 10 days), so renewal is required.

### Service + subscribe commands

```bash
# 1) Run callback server (default: 0.0.0.0:3009)
doppler run -- uv run --project pipeline pipeline/youtube_pubsub.py serve

# 2) Subscribe (or renew) the channel feed
doppler run -- uv run --project pipeline pipeline/youtube_pubsub.py subscribe \
  --channel-id UCxxxxxxxxxxxxxxxxxxxxxx \
  --callback-url https://hooks.dojopop.live/youtube/pubsub/callback
```

You can also set these in Doppler (`dojopop` / `prd_zorie`) and omit CLI flags:

- `YOUTUBE_CHANNEL_ID` — channel id (`UC...`)
- `PUBSUB_CALLBACK_URL` — public callback URL that reaches relay-2

On notification, `youtube_pubsub.py` extracts `videoId` from Atom entries and
spawns:

```bash
python pipeline/pipeline.py --url https://www.youtube.com/watch?v=<videoId>
```

Idempotency stays in `data/published.json` (already used by `pipeline.py`), and
the webhook process also guards against duplicate concurrent runs for the same id.

### relay-2 deployment

Public callback: **`https://hooks.dojopop.live/youtube/pubsub/callback`**
→ Cloudflare Tunnel `dojopop-relay` → `http://127.0.0.1:3009`.

```bash
# 1) Doppler (once)
doppler secrets set PUBSUB_CALLBACK_URL="https://hooks.dojopop.live/youtube/pubsub/callback" \
  --project dojopop --config prd_zorie

# 2) Tunnel ingress + DNS (from repo root, needs CLOUDFLARE_DNS_TOKEN)
cd pipeline && doppler run --project dojopop --config prd_zorie -- ./update-tunnel.sh

# 3) Deploy compose service to relay-2
./deploy.sh relay-2

# 4) Subscribe (from laptop or relay-2)
doppler run --project dojopop --config prd_zorie -- \
  uv run --project pipeline pipeline/youtube_pubsub.py subscribe

# 5) Renewal cron on relay-2 (every 5 days)
./setup-renew-cron.sh relay-2
```

Remote path: `/opt/dojopop/pipeline` (`docker-compose.yml`, `.env` from Doppler,
`pipeline/` code, `data/published.json`).

### Renewal cron (every 5 days)

Installed via `setup-renew-cron.sh` — runs `youtube_pubsub.py renew` inside the
`dojopop-youtube-pubsub` container on relay-2.

## Design notes

- **Event kinds**: kind `22` (NIP-71 short video — right for one-minute clips).
  `--kind 34236` publishes the addressable variant with a `d` tag instead.
- **Tags**: `title`, `published_at`, `duration`, `imeta` (url/x/m/dim/duration/
  image per NIP-92/94), `t` hashtags (`swordpractice`, `dojopop`,
  `proofofpractice`), and `["origin","youtube","<id>","<url>"]` marking
  imported content.
- **Signing**: minimal NIP-01 implementation in `nostr_util.py` — coincurve
  (BIP-340 Schnorr) + vendored bech32. No heavyweight nostr SDK.
- **Blossom auth**: BUD-02 kind-24242 event (`t=upload`, `x=<sha256>`,
  `expiration`), base64 in `Authorization: Nostr …`; BUD-06 HEAD preflight
  before the PUT.
- **ffmpeg**: transcodes every upload to **480p max height**, **60 s max** (CRF 28,
  AAC 96k) before Blossom upload; thumbnails capped at 480px wide. Uses system
  ffmpeg if present, otherwise the static binary bundled by `imageio-ffmpeg`.
