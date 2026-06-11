# DojoPop video pipeline

YouTube → Blossom → Nostr (NIP-71) proof-of-practice publisher. Separate uv
project from the root drive-backup tooling (`uv run --project pipeline …`).

## One-command usage

```bash
cd ~/Projects/dojopop
doppler run -- uv run --project pipeline pipeline/pipeline.py \
  --url <youtube-channel-or-playlist-or-video-url> --max-duration 90
```

- `NOSTR_NSEC` comes from Doppler (`dojopop` / `prd_zorie`) — never pass it on
  the command line.
- Default Blossom server: `https://blossom.yakihonne.com` (`--server` to
  override, e.g. `--server http://localhost:3000` for the local
  `blossom-server/`).
- Default relays: YakiHonne (`nostr-01/02.yakihonne.com`) + `relay.damus.io` +
  `nos.lol` (`--relay wss://…` to override, repeatable).
- Idempotent: `data/published.json` records published YouTube ids; re-runs
  skip them (`--force` to re-publish).
- `--dry-run`: downloads, hashes, generates the thumbnail, builds + signs +
  locally verifies the 24242 auth and kind-22 video events, but uploads and
  publishes nothing.

## Individual stages

```bash
# 1. download only (writes data/videos/<id>.mp4 + .info.json)
uv run --project pipeline pipeline/download_youtube.py --url <URL> --max-duration 90

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
- **ffmpeg**: uses system ffmpeg if present, otherwise the static binary
  bundled by `imageio-ffmpeg` (no Homebrew needed).
