# BTCPay Server (Lightning scaffold)

Self-hosted BTCPay for DojoPop **$0.99/mo Lightning** membership on relay-2.

## Status

**Not deployed yet** — no `BTCPAY_*` secrets in Doppler (`dojopop` / `prd_zorie`).
The web app Lightning path is production-ready once these are set.

## Doppler secrets to add

| Secret | Purpose |
|--------|---------|
| `BTCPAY_URL` | Public base URL (e.g. `https://btcpay.dojopop.live` or `http://relay-2:49392`) |
| `BTCPAY_API_KEY` | Greenfield API token (Store → Access Tokens) |
| `BTCPAY_STORE_ID` | Store UUID from BTCPay settings |
| `BTCPAY_WEBHOOK_SECRET` | Webhook signing secret (optional but recommended) |
| `LIGHTNING_MEMBERSHIP_SATS` | Default `1000` (~$0.99) |
| `BITCOIN_RPC_URL` | External bitcoind RPC (if not running local node) |
| `BITCOIN_RPC_USER` | bitcoind RPC user |
| `BITCOIN_RPC_PASSWORD` | bitcoind RPC password |
| `BTCPAY_DB_PASSWORD` | Postgres password for compose stack |

`BITCOIN_RPC_*` already exist in Doppler — point them at your node or leave
unset until a bitcoind is available.

## Webhook (after BTCPay is live)

In BTCPay → Store → Webhooks:

- **URL:** `https://dojopop.live/api/lightning/webhook`
- **Events:** `InvoiceSettled`
- Copy secret → `BTCPAY_WEBHOOK_SECRET` in Doppler

## Deploy options

### A) External BTCPay (fastest)

If you already run BTCPay elsewhere, only add the four `BTCPAY_*` secrets above.

### B) Self-host on relay-2 (this compose)

```bash
# Generate local .env (never commit)
export BTCPAY_DB_PASSWORD="$(openssl rand -hex 16)"
# Set BITCOIN_RPC_* to a synced node or pruned external RPC

./deploy.sh relay-2
```

Then:

1. Open BTCPay UI, create account + **DojoPop** store
2. Connect Lightning (CLN or LND) in store settings
3. Create API token → `BTCPAY_API_KEY`
4. Copy store id → `BTCPAY_STORE_ID`
5. Add tunnel ingress for `btcpay.dojopop.live` if exposing publicly

**Note:** Full Bitcoin sync is not required for invoice creation if using
an external pruned node via `BITCOIN_RPC_URL`. Do not block membership launch
on local full-node sync — use external RPC or hosted BTCPay.

## Verify Lightning

```bash
curl -s -X POST https://dojopop.live/api/lightning/invoice \
  -H 'Content-Type: application/json' \
  -d '{"npub":"npub1k0v9gnwatzt0whhkdsss7hqddhke77f9zclte0yfueutms0y334qg380wg"}'
```

Visit `/join/lightning?id=<invoiceId>` — QR should render when `configured: true`.
