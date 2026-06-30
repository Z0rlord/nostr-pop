# DojoPop Alby Hub

Self-hosted [Alby Hub](https://github.com/getAlby/hub) on relay-2 for **NWC**
Lightning membership invoices.

- **Public URL:** https://hub.dojopop.live (Cloudflare Tunnel → `localhost:8080`)
- **Data:** `/opt/dojopop/alby-hub/albyhub-data` on relay-2 (back this up)

## Deploy

```bash
cd alby-hub
./deploy.sh relay-2
```

Update tunnel ingress (includes `hub.dojopop.live`):

```bash
doppler run --project dojopop --config prd_zorie -- ./web/scripts/update-tunnel-ingress.sh
```

## First-time setup (headless, preferred)

On relay-2 (password stored in Doppler as `ALBY_HUB_UNLOCK_PASSWORD`):

```bash
HUB_URL=http://127.0.0.1:8080
HUB_PASS="$(doppler secrets get ALBY_HUB_UNLOCK_PASSWORD --plain --project dojopop --config prd_zorie)"

npx @getalby/hub-cli setup --url "$HUB_URL" --password "$HUB_PASS" --backend LDK
npx @getalby/hub-cli start --url "$HUB_URL" --password "$HUB_PASS" --save
npx @getalby/hub-cli create-app --name "DojoPop" --scopes "make_invoice,lookup_invoice"
# → copy pairingUri to Doppler NWC_CONNECTION_SECRET
```

`./deploy.sh` syncs `ALBY_HUB_UNLOCK_PASSWORD` into `alby-hub/.env` and sets `AUTO_UNLOCK_PASSWORD` so the node restarts unlocked.

**Funding (when ready):** open https://hub.dojopop.live or use `get-onchain-address` / LSP in hub-cli. Invoices fail with `LiquidityRequestFailed` until the wallet has inbound liquidity.

## NWC → web (Doppler)

```bash
doppler run --project dojopop --config prd_zorie -- ./web/scripts/sync-production-env.sh relay-2
ssh relay-2 'cd /opt/dojopop/web && docker compose up -d --force-recreate'
```

## Verify

```bash
npx @getalby/cli -c "$(doppler secrets get NWC_CONNECTION_SECRET --plain --project dojopop --config prd_zorie)" get-balance
```

Then test `/join` → Pay with Lightning on dojopop.live.
