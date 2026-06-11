# DojoPop Relay

Self-hosted [nostr-rs-relay](https://github.com/scsibug/nostr-rs-relay) (pinned
`scsibug/nostr-rs-relay:0.10.0`) — the primary relay for DojoPop
proof-of-practice events (kind **34567**) and NIP-71 video events.

- **Host:** `relay-2` (Hetzner, Ubuntu 24.04, reachable over Tailscale at
  `100.125.184.46`; SSH alias `relay-2` in `~/.ssh/config`)
- **Port:** `7777` on the host → `8080` in the container
- **Writes:** restricted to whitelisted pubkeys (`authorization.pubkey_whitelist`)
- **Kinds:** restricted by `limits.event_kind_allowlist` (see comments in
  `config.toml` for the rationale per kind)
- **Data:** SQLite in the `relay-data` docker volume

## Deploy to relay-2

```bash
./deploy.sh            # default host: relay-2
./deploy.sh other-host # any SSH alias/host with docker
```

The script rsyncs `docker-compose.yml` + `config.toml` to
`/opt/dojopop/relay`, installs the docker compose v2 plugin if missing, and
runs `docker compose up -d --pull always`. It is idempotent — rerun after any
config change.

Manual equivalent:

```bash
rsync -az docker-compose.yml config.toml relay-2:/opt/dojopop/relay/
ssh relay-2 'cd /opt/dojopop/relay && docker compose up -d --pull always'
```

## Test (websocket round-trip)

NIP-11 info document:

```bash
curl -s -H 'Accept: application/nostr+json' http://relay-2:7777 | python3 -m json.tool
```

REQ → EOSE and event publish (any websocket client works; with
[`nak`](https://github.com/fiatjaf/nak)):

```bash
nak req -k 34567 ws://relay-2:7777                       # expect EOSE
doppler run -- sh -c 'nak event -k 1 -c "relay test" --sec "$NOSTR_NSEC" ws://relay-2:7777'
```

Note: writes from non-whitelisted keys are rejected with
`blocked: pubkey is not allowed to publish to this relay` — that means the
whitelist is working.

## TLS / wss:// via Cloudflare Tunnel — LIVE

**`wss://relay.dojopop.live`** is live (2026-06-11) via the remote-managed
Cloudflare Tunnel **`dojopop-relay`** (id `543b3cee-e3dd-422f-a619-7a34236a0ba0`,
zone `cf2b671698354bbaafb5c606945dbb2c`, account `dfc6e38d…112a`):

- Ingress: `relay.dojopop.live` → `http://localhost:7777` (websockets proxied
  natively); catch-all `http_status:404`.
- DNS: proxied CNAME `relay` → `543b3cee….cfargotunnel.com`.
- Connector: `cloudflared` compose service (host networking) on relay-2;
  its `TUNNEL_TOKEN` lives only in `/opt/dojopop/relay/.env` (chmod 600,
  never in git — `deploy.sh`'s rsync excludes protect it). To rotate, fetch
  a fresh token from `GET /accounts/{acct}/cfd_tunnel/{id}/token` and rewrite
  the remote `.env`.
- Tunnel config is remote-managed (`config_src: cloudflare`) — change
  ingress via `PUT /accounts/{acct}/cfd_tunnel/{id}/configurations`, no
  redeploy needed.

Verify any time:

```bash
curl -s -H 'Accept: application/nostr+json' https://relay.dojopop.live | python3 -m json.tool
nak req -k 34567 wss://relay.dojopop.live    # expect EOSE
```

The pipeline publisher's relay list should add/swap `wss://relay.dojopop.live`
alongside `ws://relay-2:7777` (owned by the pipeline agent — do not edit here).
