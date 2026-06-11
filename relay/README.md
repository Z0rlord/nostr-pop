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

Target hostname: **`relay.dojopop.live`** (zone added to Cloudflare
2026-06-11, zone id `cf2b671698354bbaafb5c606945dbb2c`; status was *pending*
NS propagation at the time of writing).

**Blocked on token scope:** none of the Doppler `CLOUDFLARE_*` tokens carry
*Account → Cloudflare Tunnel → Edit* (tunnel API returns code 10000
Authentication error). Mint a token with:

- **Account → Cloudflare Tunnel → Edit** (account `dfc6e38d…112a`)
- **Zone → DNS → Edit** on `dojopop.live`
  (`CLOUDFLARE_DNS_TOKEN` already has DNS read/likely edit on the zone;
  only the tunnel scope is missing)

Once a workable token exists, the remote-managed-tunnel plan:

1. `POST /accounts/{acct}/cfd_tunnel` — create tunnel `dojopop-relay`
   (`config_src: "cloudflare"`).
2. `PUT  /accounts/{acct}/cfd_tunnel/{id}/configurations` — ingress:
   `relay.dojopop.live` → `http://localhost:7777` (websockets are proxied
   natively), catch-all `http_status:404`.
3. `GET  /accounts/{acct}/cfd_tunnel/{id}/token` — fetch the run token; store
   it only in `/opt/dojopop/relay/.env` on relay-2 (chmod 600, never in git).
4. Add a `cloudflared` compose service
   (`cloudflare/cloudflared`, `tunnel --no-autoupdate run`,
   `TUNNEL_TOKEN=${TUNNEL_TOKEN}`, `network_mode: host`) and redeploy —
   `deploy.sh` rsync excludes protect the remote `.env`.
5. `POST /zones/cf2b…/dns_records` — proxied CNAME `relay` →
   `{tunnel-id}.cfargotunnel.com`.
6. Update `relay_url` in `config.toml` to `wss://relay.dojopop.live`,
   redeploy, and verify:

```bash
curl -s -H 'Accept: application/nostr+json' https://relay.dojopop.live | python3 -m json.tool
nak req -k 34567 wss://relay.dojopop.live    # expect EOSE
```

(While the zone is still `pending`, public DNS won't resolve — the tunnel can
be created and will show HEALTHY, but the curl/wss check needs propagation.)

After cutover, the pipeline publisher's relay list should add/swap
`wss://relay.dojopop.live` (owned by the pipeline agent — do not edit here).

Alternative: caddy/nginx with Let's Encrypt directly on relay-2 (requires
opening 443 on the Hetzner firewall).
