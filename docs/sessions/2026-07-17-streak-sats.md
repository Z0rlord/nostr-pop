# Session: Streak sats v1
**Date:** 2026-07-17
**Project:** dojopop

## Summary

Shipped a minimal **streak sats** payout worker for active members: cron-callable Next.js API that computes practice streaks, resolves kind-0 `lud16`, creates LNURL-pay invoices, and pays via NWC `pay_invoice` when configured. Default mode is **dry-run** with a file ledger and daily budget caps. Membership NWC remains receive-only; outgoing pays prefer a dedicated Hub connection.

## Decisions

- Implement in **web** (not pipeline): reuse `practice-events`, `membership`, Alby SDK already in the Next app.
- Qualifying rule v1: **active member** + practiced **today (UTC)** + `currentStreak >= STREAK_SATS_MIN_STREAK` (default **1**).
- Reward: `STREAK_SATS_AMOUNT` default **21** sats; at most **one payout per pubkey per UTC day**.
- Hard cap: `STREAK_SATS_DAILY_BUDGET` default **10000** sats.
- `STREAK_PAYOUT_DRY_RUN` defaults to **on** (`1`) until ops sets `0`.
- Destination: kind-0 `lud16`, optional `Member.lud16` override in `members.json`.
- NWC: prefer `STREAK_NWC_CONNECTION_SECRET` with `pay_invoice`; fall back to `NWC_CONNECTION_SECRET` (likely receive-only).
- Ledger: `MEMBERSHIP_DATA_DIR/streak-payouts.json` (gitignored).
- Auth: `STREAK_PAYOUT_CRON_SECRET` via `x-streak-payout-secret` (or Bearer).

## Actions taken

- Added `web/src/lib/lnurl-pay.ts`, `streak-nwc-client.ts`, `streak-payout-ledger.ts`, `streak-payouts.ts`.
- Added `POST/GET /api/ops/streak-payouts`.
- Extended kind-0 profile parsing with `lud16`; optional `Member.lud16`.
- Practice dashboard note when current streak &gt; 0.
- Synced env defaults in `web/scripts/sync-production-env.sh`; docs in `web/README.md`, `docs/lightning-nwc.md`, `alby-hub/README.md`.

## How to run

```bash
# Doppler secrets (names only) — set these before live pays:
# STREAK_PAYOUT_CRON_SECRET
# STREAK_NWC_CONNECTION_SECRET   # Hub app: pay_invoice,get_balance,get_info
# STREAK_PAYOUT_DRY_RUN=1        # keep until ready
# STREAK_SATS_AMOUNT=21
# STREAK_SATS_MIN_STREAK=1
# STREAK_SATS_DAILY_BUDGET=10000

# Dry-run (local or prod after deploy + sync-production-env)
curl -sS -X POST http://localhost:3001/api/ops/streak-payouts \
  -H "x-streak-payout-secret: $STREAK_PAYOUT_CRON_SECRET" \
  -H 'Content-Type: application/json' \
  -d '{"dryRun":true}' | jq .

# Live pays (only after Hub pay_invoice connection + dry-run verified)
# STREAK_PAYOUT_DRY_RUN=0
curl -sS -X POST https://dojopop.live/api/ops/streak-payouts \
  -H "x-streak-payout-secret: $STREAK_PAYOUT_CRON_SECRET" \
  -H 'Content-Type: application/json' \
  -d '{"dryRun":false}' | jq .
```

Suggested cron (UTC evening or hourly): same `curl` against production.

Hub setup (secret names only):

```bash
npx @getalby/hub-cli create-app --name "DojoPop Streak Sats" \
  --scopes "pay_invoice,get_balance,get_info"
# → Doppler STREAK_NWC_CONNECTION_SECRET
```

## Open items

- Create Hub NWC with `pay_invoice` and set `STREAK_NWC_CONNECTION_SECRET` + `STREAK_PAYOUT_CRON_SECRET` in Doppler.
- Fund Hub outbound liquidity before setting `STREAK_PAYOUT_DRY_RUN=0`.
- Deploy web + `sync-production-env.sh` so ledger writes to `/app/data/streak-payouts.json`.
- Optional: raise `STREAK_SATS_MIN_STREAK` to 3 once ops is trusted.
- Next RUNSTR-inspired step: school Challenge Week (see `2026-07-17-runstr-ideas.md`).

## References

- `docs/sessions/2026-07-17-runstr-ideas.md`
- `web/src/app/api/ops/streak-payouts/route.ts`
- `web/src/lib/streak-payouts.ts`
- `docs/lightning-nwc.md`, `alby-hub/README.md`
