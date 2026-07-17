# DojoPop Bouquet (self-hosted)

[Bouquet](https://github.com/flox1an/bouquet) — web UI to browse, upload, delete, and
sync media blobs across Blossom servers.

| Item | Value |
|---|---|
| Public URL | `https://bouquet.dojopop.live` |
| Host | relay-2 `127.0.0.1:3015` |
| Upstream pin | `COMMIT` → [flox1an/bouquet](https://github.com/flox1an/bouquet) |

Ops-only tool — not linked from the public DojoPop landing page. Sign in with the
DojoPop pipeline pubkey (extension, bunker, or Clave) to manage blobs on
`https://blossom.dojopop.live`.

## First-time setup

```bash
# 1) Tunnel + DNS
cd bouquet
doppler run --project dojopop --config prd_zorie -- ./update-tunnel.sh

# 2) Deploy
chmod +x deploy.sh
./deploy.sh relay-2
```

## Usage

1. Open https://bouquet.dojopop.live
2. Sign in with a **signing** method (browser extension, Nostr Connect / Clave QR,
   or bunker) — npub-only / read-only login cannot save servers
3. **Manage servers** (gear icon) → add `https://blossom.dojopop.live` → Save
4. Browse / sync / delete blobs as needed

### How server lists are stored

Bouquet does **not** keep servers in browser localStorage. It publishes a
replaceable Nostr event (kind **10063**, BUD-03) to relays. The DojoPop image
also **defaults** to `blossom.dojopop.live` + `blossom.yakihonne.com` when no
kind 10063 is loaded yet.

**Sign in as the pipeline identity** (`npub1k0v9gn…`) — not your personal npub.
Browse lists blobs for the signed-in key only.

Most practice videos were uploaded to YakiHonne before self-hosted Blossom.
Mirror them locally:

```bash
doppler run --project dojopop --config prd_zorie -- \
  uv run --project pipeline pipeline/mirror_yakihonne_to_dojopop.py --update-published
```

```bash
doppler run --project dojopop --config prd_zorie -- \
  uv run --project pipeline pipeline/publish_blossom_server_list.py
```

## Redeploy after upstream updates

```bash
# Pin new commit in COMMIT, then:
./deploy.sh relay-2
```
