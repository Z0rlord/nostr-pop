# Session: nostube duplicate mirrors cleanup
**Date:** 2026-07-14
**Project:** dojopop

## Summary
Cross-author (and some same-author) `#dojopop-nostube` kind-22 mirrors had piled
up from early FOUNDER / ADMIN backfills plus LOGIN remirrors and concurrent
runs. Queried relays, deleted extras via NIP-09 kind 5 signed by the owning
keys, promoted leftover ADMIN orphans under LOGIN, and deduped same Blossom URL
doubles on the login-bot. Hardened dedupe so future publishes skip when a LOGIN
mirror already exists for the source `e` id.

## Decisions
- Canonical nostu.be account remains login-bot (`DOJOPOP_LOGIN_NSEC`).
- Keep one LOGIN mirror per source `e`; delete FOUNDER / ADMIN / extra LOGIN.
- Dedupe check is LOGIN-pubkey-scoped (not “current signer only”).
- Same Day title with **different** sources is allowed; same Blossom URL is not.

## Actions taken
- Inventory (pre-clean): ~734 unique `#dojopop-nostube` events — LOGIN 280,
  ADMIN 277, FOUNDER 177; 227 sources with ≥2 mirrors; 498 extras planned
  (LOGIN 78 / ADMIN 243 / FOUNDER 177).
- Published kind-5 deletions via `pipeline/cleanup_nostube_duplicates.py`
  (`--promote`); relays accepted (dojopop / nos.lol / primal; damus rate-limits
  on bulk).
- Cloned remaining ADMIN orphans under LOGIN when source `e` was missing, then
  deleted ADMIN; removed ~30 LOGIN same-URL doubles.
- Post-clean on `wss://relay.dojopop.live`: **183 LOGIN-only** mirrors; **0**
  same-source dups; **0** doubled Day titles on LOGIN.
- Code: `cleanup_nostube_duplicates.py`; LOGIN-aware dedupe in
  `mirror_practice_for_nostube.py`, `web/src/lib/nostube-mirror.ts`, and
  `pipeline.py` nostube path.

## Open items
- nostu.be UI may lag while indexers catch NIP-09; hard-refresh / wait if old
  doubles still appear briefly.
- Redeploy web + pipeline/pubsub so production runs the new dedupe checks.
- Optional: fan-out another kind-5 pass to damus later if ghosts remain there.

## References
- Login-bot hex: `58d5fd86797cc2914e7be0e76583ab293af5dd35bc0da15b77d92d093bec417c`
- Doppler: `dojopop` / `prd_zorie` (`DOJOPOP_LOGIN_NSEC`, `DOJOPOP_ADMIN_NSEC`, `NOSTR_NSEC`)
- Related: `docs/sessions/2026-07-10-nostube-practice-mirror.md`
