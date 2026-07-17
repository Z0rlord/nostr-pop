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

## Member practice → nostu.be (auto mirror)

When a member publishes a practice video on [dojopop.live](https://dojopop.live),
the web API cross-posts a **kind 22** repost signed by the **login-bot** identity
(`DOJOPOP_LOGIN_NSEC` in Doppler — same key as DM login). Optional transition
fallbacks: `DOJOPOP_ADMIN_NSEC` / `DOJO_ADMIN_PRIVATE_KEY`. nostu.be indexes
kind 21/22 from public relays (damus, primal, nos.lol).

**Setup:** sync login keys to web + whitelist the login-bot pubkey:

```bash
doppler run -- ./web/scripts/sync-production-env.sh relay-2
doppler run -- ./web/scripts/sync-relay-whitelist.sh relay-2
./web/deploy.sh relay-2
```

`sync-production-env.sh` requires `DOJOPOP_LOGIN_NSEC` for DM login and nostu.be
mirrors. `sync-relay-whitelist.mjs` whitelists the login-bot pubkey derived from
that nsec (and admin if still present).

**Backfill** existing practice events:

```bash
doppler run -- uv run --project pipeline pipeline/mirror_practice_for_nostube.py --dry-run
doppler run -- uv run --project pipeline pipeline/mirror_practice_for_nostube.py
```

Mirror events carry `#dojopop-nostube`, reference the source via `e` + `p` tags,
reuse the member’s `imeta` (Blossom URLs), and link to `https://dojopop.live/v/<id>`.
Sign in at [nostu.be](https://nostu.be) with the login-bot npub to view the DojoPop profile feed.

Dedupe is against the **canonical login-bot pubkey** (`DOJOPOP_LOGIN_NSEC`), not
whatever key the current process happens to use — so ADMIN/FOUNDER-era mirrors
do not cause re-posts when backfill runs again.

**Cleanup** duplicate `#dojopop-nostube` mirrors (NIP-09 kind 5; keep one LOGIN
per source `e`):

```bash
doppler run -- uv run --project pipeline pipeline/cleanup_nostube_duplicates.py --dry-run
doppler run -- uv run --project pipeline pipeline/cleanup_nostube_duplicates.py --promote
```

YouTube shorts published by `pipeline.py` (PubSub / catch-up) also emit a nostu.be
mirror via the same `build_nostube_mirror_event` helper, signed with
`DOJOPOP_LOGIN_NSEC` (deployed into the pubsub container `.env`).

## Film trailers (kind 34236) + nostu.be

Publish an official trailer as a NIP-71 **addressable** video (kind `34236`)
with a paywall link — **not** the full film blossom URL.

```bash
# Yoga Sutra trailer (preset: blossom URL, d tag, paywall, hashtags)
doppler run -- uv run --project pipeline pipeline/publish_film_trailer.py \
  --film yoga-sutra --announce

# Custom trailer (descriptor JSON or --video-url + --video-sha256 + --file)
doppler run -- uv run --project pipeline pipeline/publish_film_trailer.py \
  --d-tag my-film-trailer \
  --title "My Film — Official Trailer" \
  --paywall https://dojopop.live/films/my-film \
  --video-url https://blossom.dojopop.live/<sha256>.mp4 \
  --video-sha256 <sha256> \
  --file /path/to/trailer.mp4 \
  --dry-run
```

The script prints `event id`, `nevent`, and `naddr` after publish. Tags:
`d`, `title`, `imeta` (url/x/m/dim/duration), `r` (paywall), `t` hashtags.
`--announce` also publishes a kind-1 note with the same hook + paywall link.

### Manual cross-post on [nostu.be](https://nostu.be)

Use this when you want the trailer on nostu.be’s feed/index in addition to relay
events (or instead of the CLI).

1. Open [https://nostu.be](https://nostu.be) and sign in with a Nostr browser
   extension (Alby, nos2x, Amber, etc.).
2. Start a new post and choose **upload video** (local MP4).
   - File: `The Yoga Sutra -A Zorie Barber Film Official Trailer 2.mp4` (or
     re-export the same trailer).
   - **Do not** upload the full feature master.
3. **Title:** `The Yoga Sutra — Official Trailer`
4. **Description / content:** short hook + paywall link:
   `https://dojopop.live/films/yoga-sutra` (rent $3.99 / own $14.99).
5. If prompted for format, pick **long-form / addressable video** (kind `34236`),
   not a short vertical clip.
6. Publish. Optionally add hashtags `yogasutra` `film` in the client UI.

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
| `youtube` | **Scaffolded** | YouTube Data API v3 OAuth — needs Brand Account + `YOUTUBE_*` secrets |
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

### Doppler secret names (Meta/TikTok/YouTube upload)

| Secret | Used by |
|---|---|
| `NOSTR_NSEC` | Nostr (existing) |
| `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_REFRESH_TOKEN` | Outbound YouTube upload |
| `YOUTUBE_UPLOAD_CHANNEL_ID` | Optional — Brand Account UC… (ops pin; not inbound PubSub) |
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
| **YouTube upload** | [console.cloud.google.com](https://console.cloud.google.com/) | See [Outbound YouTube upload](#outbound-youtube-upload-dojopop--youtube) below |

See `pipeline/meta_tiktok.py` / `pipeline/youtube_upload.py` for setup links. Pubkey must be on the relay
whitelist (`relay/config.toml`).

## Outbound YouTube upload (DojoPop → YouTube)

**Honest limit:** the API cannot create a YouTube channel. You create a **Brand
Account** named "DojoPop" in the browser (separate from the personal/Z0rlord
upload history). `YOUTUBE_CHANNEL_ID` in Doppler is the **inbound** PubSub
source channel — do not overwrite it with the new Brand Account id; use
`YOUTUBE_UPLOAD_CHANNEL_ID` for the outbound channel once known.

### Manual steps (you do this once)

1. **Create Brand Account channel**
   - Open [YouTube Studio](https://studio.youtube.com/) signed into your Google account.
   - Account menu → **Switch account** → **Create a channel** (or manage Brand Accounts
     at [myaccount.google.com/brandaccounts](https://myaccount.google.com/brandaccounts)).
   - Name it **DojoPop**. Complete channel basics (icon, description, links to
     `https://dojopop.live`).
2. **Google Cloud OAuth client**
   - [Google Cloud Console](https://console.cloud.google.com/) → new or existing project.
   - Enable **YouTube Data API v3**.
   - APIs & Services → Credentials → **Create OAuth client ID** → type **Desktop app**.
   - Add authorized redirect URI: `http://127.0.0.1:8765/` (for the bootstrap script).
   - Copy client id + secret into Doppler (names only in chat/commits):

```bash
doppler secrets set YOUTUBE_CLIENT_ID --project dojopop --config prd_zorie
doppler secrets set YOUTUBE_CLIENT_SECRET --project dojopop --config prd_zorie
```

3. **Refresh token (Brand Account)**

```bash
doppler run -- uv run --project pipeline pipeline/youtube_oauth_bootstrap.py
# Authorize as the DojoPop Brand Account when Google asks (not personal).
doppler secrets set YOUTUBE_REFRESH_TOKEN --project dojopop --config prd_zorie
```

4. **Verify + pin channel id**

```bash
doppler run -- uv run --project pipeline pipeline/youtube_upload.py --list-channels
doppler secrets set YOUTUBE_UPLOAD_CHANNEL_ID=UC… --project dojopop --config prd_zorie
```

### Populate from existing practice videos

Inventory (approx, 2026-07-13): ~183 founder kind-22 `#dojopop` + `#proofofpractice`
on `wss://relay.dojopop.live` with Blossom `imeta` URLs (~156 yakihonne / ~27
dojopop blossom); `data/published.json` has ~178 inbound YouTube→Nostr rows with
video URLs. Default API quota ≈ 6 uploads/day — use `--limit`.

```bash
# Dry-run against relay inventory
doppler run -- uv run --project pipeline pipeline/upload_practice_to_youtube.py \
  --dry-run --limit 5

# Upload a few as private (safe for first backfill)
doppler run -- uv run --project pipeline pipeline/upload_practice_to_youtube.py --limit 3

# Or from published.json Blossom URLs
doppler run -- uv run --project pipeline pipeline/upload_practice_to_youtube.py \
  --from-published --limit 3
```

Idempotency: `data/youtube_uploads.json` maps Nostr `event_id` → YouTube video id.

Single-file / social CLI:

```bash
doppler run -- uv run --project pipeline pipeline/youtube_upload.py \
  --file clip.mp4 --title "Day 42" --privacy private

doppler run -- uv run --project pipeline pipeline/social_post.py \
  --text "Day 42" --media clip.mp4 --platforms youtube
```

### Hook sketch (after Nostr publish)

Outbound YouTube is **opt-in**, not automatic yet (quota + Brand Account must
exist). After practice fan-out works, call from cron or a future pipeline flag:

```bash
# After new kind-22s land, upload newest N not yet in youtube_uploads.json
doppler run -- uv run --project pipeline pipeline/upload_practice_to_youtube.py --limit 1
```

Once DojoPop→YouTube is primary for discovery, demote **YouTube→DojoPop PubSub**
(`youtube_pubsub.py`) to optional catch-up for the personal/Z0rlord channel only.

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

### YouTube cookies (required on relay-2)

YouTube blocks datacenter IPs (Hetzner) without browser cookies. The pubsub
image includes **deno + ffmpeg**; downloads also need a Netscape cookies file at
`data/youtube-cookies.txt` on relay-2.

Export from a logged-in browser (refresh every few weeks):

```bash
uv run --project pipeline yt-dlp --cookies-from-browser chrome \
  --cookies /tmp/youtube-cookies.txt --skip-download \
  "https://www.youtube.com/watch?v=ANY_VIDEO_ID"
scp /tmp/youtube-cookies.txt relay-2:/opt/dojopop/pipeline/data/youtube-cookies.txt
ssh relay-2 'chmod 600 /opt/dojopop/pipeline/data/youtube-cookies.txt'
```

Optional: store the file in Doppler as `YT_DLP_COOKIES` (full Netscape text);
`deploy.sh` syncs it on deploy. Optional `YT_DLP_PROXY` for a residential proxy
if cookies alone stop working.

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
