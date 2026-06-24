# Session: NextDNS fix + nsecBunker admin UI

**Date:** 2026-06-11
**Project:** dojopop / nostr-pop

## Summary

Diagnosed `dojopop.live` not loading on the founder Mac: **NextDNS** (via Tailscale
`100.100.100.100`, profile `8f73b1`) sinkholes the domain to `0.0.0.0`. Public DNS
and Cloudflare tunnel are healthy.

Added `scripts/nextdns-allow-dojopop.sh` + emergency `fix-local-dns-dojopop.sh`.
Deployed **nsecBunker admin UI** from `Z0rlord/nsecbunker-admin-ui` submodule at
`https://admin.dojopop.live`. Fixed amd64 platform for `pablof7z/nsecbunkerd` on relay-2.

## Decisions

- **DNS root cause:** Tailscale → NextDNS profile `8f73b1`, not server/tunnel failure.
- **Admin UI:** git submodule `nsecbunker-admin-ui/`, docker stack in `nsecbunker/`.
- **Public URLs:** landing `dojopop.live`, bunker admin `admin.dojopop.live`.
- **Default relays in admin UI:** `wss://relay.dojopop.live` + `relay.nsecbunker.com`.
- **nsecbunkerd image:** `platform: linux/amd64` (relay-2 is Hetzner x86; image is arm64).

## Actions

- Tunnel ingress v3: added `admin.dojopop.live` → `:3002`.
- DNS CNAME `admin` → tunnel.
- Built admin UI with pnpm lockfile in Docker.
- Added `NEXTDNS_API_KEY` + `NEXTDNS_PROFILE_ID` (`2b4adf`, profile "Perseus") to Doppler.
- Allowlisted `dojopop.live`, `relay`, `admin`, `btcpay` subdomains — Tailscale DNS now resolves correctly.

## Operator steps

```bash
# Permanent NextDNS fix
doppler secrets set NEXTDNS_API_KEY --project dojopop --config prd_zorie
doppler run --project dojopop --config prd_zorie -- ./scripts/nextdns-allow-dojopop.sh
sudo dscacheutil -flushcache && sudo killall -HUP mDNSResponder

# Or emergency local override
sudo ./scripts/fix-local-dns-dojopop.sh

# nsecBunker connection string
ssh relay-2 'docker exec dojopop-nsecbunkerd cat /app/config/connection.txt'
```
