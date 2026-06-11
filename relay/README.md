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

## TLS / wss:// via Cloudflare Tunnel (follow-up)

Clients on the public internet need `wss://`. Recommended: a Cloudflare Tunnel
on relay-2 so no inbound port is exposed:

```bash
ssh relay-2
cloudflared tunnel login                       # uses CLOUDFLARE_* creds (Doppler)
cloudflared tunnel create dojopop-relay
cloudflared tunnel route dns dojopop-relay relay.dojopop.xyz
cloudflared tunnel run --url http://localhost:7777 dojopop-relay
```

Cloudflare proxies websockets automatically, so `wss://relay.dojopop.xyz`
terminates TLS at the edge and forwards to `localhost:7777`. Once live:

1. Update `relay_url` in `config.toml` and redeploy.
2. Add the relay to the pipeline publisher's relay list (owned by the
   pipeline agent — do not edit from here).

Alternative: caddy/nginx with Let's Encrypt directly on relay-2 (requires
opening 443 on the Hetzner firewall).
