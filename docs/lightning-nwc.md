# Lightning membership (NWC)

DojoPop accepts **~10,000 sats/mo** Lightning membership via **Nostr Wallet Connect**
(NIP-47). BTCPay is not used.

## Flow

1. User enters npub on `/join` → **Pay with Lightning**
2. `POST /api/lightning/invoice` → NWC `make_invoice` on your wallet service
3. `/join/lightning?id=…` shows QR (BOLT11), polls every 5s
4. NWC `lookup_invoice` → paid → member activated + relay whitelist sync

## Wallet service (pick one)

| Option | Setup |
|--------|--------|
| **Alby Account** (fastest pilot) | [getalby.com/nwc/server](https://getalby.com/nwc/server) → create app connection → `make_invoice` permission |
| **Alby Hub** (self-hosted) | Hub on relay-2 → Connections → DojoPop → copy NWC URL |

LNbits is not required for NWC.

## Doppler secrets (`dojopop` / `prd_zorie`)

| Secret | Purpose |
|--------|---------|
| `NWC_CONNECTION_SECRET` | Full `nostr+walletconnect://…` string (never commit) |
| `LIGHTNING_MEMBERSHIP_SATS` | Default `10000` (~$9.99) |

Remove any legacy `BTCPAY_*` vars — they are ignored.

## Verify

```bash
# After adding NWC_CONNECTION_SECRET on relay-2 web container:
curl -sS -X POST https://dojopop.live/api/lightning/invoice \
  -H 'Content-Type: application/json' \
  -d '{"npub":"npub1…"}' | jq .
```

Then open `/join/lightning?id=<invoiceId>` and pay the invoice from a wallet.

## Ops notes

- Invoice expiry: **30 minutes** (`INVOICE_EXPIRY_SEC` in `nwc-client.ts`)
- Requires outbound WebSocket from the web container to the NWC relay (usually `wss://relay.getalby.com/v1`)
- No webhook — settlement is **poll-only** (`/api/lightning/status/[id]`)
