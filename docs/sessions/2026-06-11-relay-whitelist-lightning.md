# Session: Auto relay whitelist + Lightning BTCPay scaffold

**Date:** 2026-06-11
**Project:** dojopop / nostr-pop

## Summary

Wired automatic relay pubkey whitelist sync from paid members, and hardened
Lightning/BTCPay integration (still blocked on missing Doppler creds).

## Relay whitelist sync

- `web/src/lib/relay-sync.ts` — reads active members, decodes npub→hex, rewrites
  `pubkey_whitelist` in config.toml, restarts `dojopop-relay` via Docker socket API.
- Stripe + Lightning webhooks call sync after activate/cancel.
- `web/scripts/sync-relay-whitelist.sh` + `.mjs` for manual ops via SSH.
- Web container mounts `/opt/dojopop/relay/config.toml` and `docker.sock`
  (`DOCKER_GID` from host docker group).

**Verified on relay-2:** test member hex appeared in whitelist; relay restarted;
`https://relay.dojopop.live` still HTTP 200.

## Lightning

- No `BTCPAY_*` / OpenNode / Strike secrets in Doppler.
- `btcpay-server/` docker-compose scaffold + README for relay-2 or external BTCPay.
- Improved invoice flow: `memberInvoiceId` metadata, bolt11 fetch, webhook HMAC.

## Operator steps

1. Add `BTCPAY_URL`, `BTCPAY_API_KEY`, `BTCPAY_STORE_ID`, `BTCPAY_WEBHOOK_SECRET`
2. Deploy BTCPay or use external instance
3. Set `DOCKER_GID` in relay-2 web deploy (auto via `deploy.sh`)
