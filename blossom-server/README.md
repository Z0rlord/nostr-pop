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
with the storage rules scoped to the DojoPop pubkey
(`npub1k0v9gnwatzt0whhkdsss7hqddhke77f9zclte0yfueutms0y334qg380wg`, hex
`b3d8544d…c48c6a`). Any other key gets rejected. To add an uploader, append
their hex pubkey to the `pubkeys` lists in `config.yml` and
`docker compose restart`.

## Production checklist

1. **Domain**: uncomment `publicDomain` in `config.yml` and set the bare
   hostname (no `https://`), e.g. `blossom.dojopop.example`. This is the
   hostname baked into the blob descriptor URLs returned to clients.
2. **TLS / exposure**: keep the container bound to localhost and put a reverse
   proxy in front (Caddy/nginx with certs) **or** a Cloudflare Tunnel:
   `cloudflared tunnel create blossom && cloudflared tunnel route dns blossom blossom.dojopop.example`,
   ingress → `http://localhost:3000`. Then change the compose port mapping to
   `127.0.0.1:3000:3000`.
3. **Limits**: `upload.maxSize` is 1 GB; raise if longer practice videos appear.
   Retention is 10 years for the whitelisted pubkey (rules in `config.yml`).
4. **Storage**: move `./data` to a real volume / S3 (`storage.backend: s3`)
   when blobs outgrow the host disk.
5. **Pin the image**: `ghcr.io/hzrd149/blossom-server:master` tracks master —
   pin a release tag for production.
6. Point the pipeline at it: `--server https://blossom.dojopop.example`.
