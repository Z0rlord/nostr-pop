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
