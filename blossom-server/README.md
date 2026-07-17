# DojoPop Blossom server

Self-hosted [hzrd149/blossom-server](https://github.com/hzrd149/blossom-server)
for proof-of-practice video blobs (BUD-01/02/05/06).

## Run locally

```bash
cd blossom-server
docker compose up -d
curl -s http://localhost:3000/   # landing page
```

Blobs + SQLite live in `blossom-server/data/` (gitignored).

## Test an authed upload

```bash
cd ~/Projects/dojopop
doppler run -- uv run --project pipeline pipeline/blossom_upload.py \
  --file <some-file.mp4> --server http://localhost:3000
```

Uploads are **closed**: `upload.requireAuth: true` + `requirePubkeyInRule: true`
with the storage rules scoped to the DojoPop pubkey plus active members synced
via `web/scripts/sync-blossom-whitelist.mjs` (`video/*` and `image/*` only).
Any other key or MIME gets rejected.

**List endpoint** (`GET /list/:pubkey`) is **disabled** to reduce blob
enumeration. **Reports:** `PUT /report` (BUD-09) is enabled; enable the
optional admin dashboard on the host (Doppler password, never in git) to
review reports and force-delete blobs.

## Deploy to relay-2

```bash
cd blossom-server
./deploy.sh relay-2
```

Blobs live in `/opt/dojopop/blossom/data` on the host (~125 GB free on relay-2
today). Public URL: `https://blossom.dojopop.live` via the dojopop-relay
Cloudflare Tunnel → `localhost:3004` (host port 3000 is already taken).

After first deploy, update tunnel ingress + DNS:

```bash
doppler run --project dojopop --config prd_zorie -- ./web/scripts/update-tunnel-ingress.sh
```

Point the video pipeline at the new server:

```bash
doppler run -- uv run --project pipeline pipeline/pipeline.py \
  --url <youtube-url> --server https://blossom.dojopop.live
```

Or change `DEFAULT_BLOSSOM` in `pipeline/common.py` once verified.

## Practice clips vs feature films

Two upload paths share the same Blossom server and DojoPop pubkey; only the
client path differs.

| Content | Tool | Blossom endpoint | Transcode |
|---|---|---|---|
| DojoPop practice (YouTube → Nostr) | `pipeline/pipeline.py` | `PUT /upload` | **Client** ffmpeg → 480p / 60 s (`pipeline/common.py`) |
| Large master (e.g. *The Yoga Sutra*) | `pipeline/blossom_upload.py` | `PUT /upload` | **None** — file stored as-is |
| Optional server transcode | `blossom_upload.py --endpoint media` | `PUT /media` | **Server** capped at 480p (`media.video` in `config.yml`) |

`pipeline/` always transcodes before upload and never calls `/media`. The 480p
rule in `config.yml` applies only to `PUT /media`, not to `PUT /upload`.

**Feature film upload** (after deploy with raised `upload.maxSize`):

```bash
doppler run -- uv run --project pipeline pipeline/blossom_upload.py \
  --file /path/to/yoga-sutra-master.mp4 \
  --server https://blossom.dojopop.live
```

Do **not** pass `--endpoint media` for masters — that would downscale via BUD-05.

### Move to Raspberry Pi later

1. `rsync -az relay-2:/opt/dojopop/blossom/data/ pi5:/opt/dojopop/blossom/data/`
2. `./deploy.sh pi5`
3. Update tunnel ingress to `http://100.75.188.125:3004` (or run cloudflared on the Pi).

## Production checklist

1. **Domain**: `publicDomain: blossom.dojopop.live` in `config.yml`.
2. **TLS / exposure**: `127.0.0.1:3004:3000` + Cloudflare Tunnel on relay-2.
3. **Limits**: `upload.maxSize` is 5 GB (passthrough masters on `PUT /upload`).
   `media.video.maxHeight` is 480p for `PUT /media` only; practice clips are
   capped at 480p / 60 s in `pipeline/` before upload.
4. **Uploaders**: append hex pubkeys to `storage.rules` in `config.yml`, then
   `docker compose restart` on the host.
5. **Pin the image**: `ghcr.io/hzrd149/blossom-server:master` tracks master —
   pin a release tag for production.
