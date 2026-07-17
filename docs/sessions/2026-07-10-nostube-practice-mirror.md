# Session: nostu.be practice auto-mirror
**Date:** 2026-07-10
**Project:** dojopop

## Summary
Wired dojopop.live member practice publishes to automatically cross-post as kind-22
events on the **login-bot** Nostr identity (`DOJOPOP_LOGIN_NSEC` — same key as DM
login). nostu.be indexes NIP-71 shorts from public relays; mirrors reuse member
Blossom `imeta` and attribute the author. Earlier work incorrectly used
`DOJOPOP_ADMIN_NSEC`; corrected 2026-07-11 to LOGIN as primary.

## Decisions
- Use `DOJOPOP_LOGIN_NSEC` for nostu.be practice mirrors (same identity as DM login bot).
- Do **not** use founder `NOSTR_NSEC` as the mirror publisher.
- `DOJOPOP_ADMIN_NSEC` / `DOJO_ADMIN_PRIVATE_KEY` are transition-only fallbacks if LOGIN unset.
- Mirror format: kind 22 with `e`/`p` refs, `#dojopop-nostube`, same video imeta, link to `/v/<id>`.
- Publish hook runs async after relay accept; failure does not block member upload.
- Fan-out relays: dojopop (Tailscale + public), damus, primal, nos.lol.
- Relay whitelist includes login-bot pubkey via `sync-relay-whitelist.mjs`.
- Mirrors under LOGIN are a different pubkey than prior ADMIN mirrors — re-backfill expected.

## Actions taken
- `web/src/lib/publisher-account.ts` — prefers `DOJOPOP_LOGIN_NSEC` (admin fallback only).
- `web/src/lib/nostube-mirror.ts` — sign + publish via publisher-account.
- `web/src/app/api/practice/publish/route.ts` — fire-and-forget mirror after publish.
- `pipeline/mirror_practice_for_nostube.py` — `Signer.from_env_preferred("DOJOPOP_LOGIN_NSEC", …)`.
- `web/scripts/sync-production-env.sh` — requires LOGIN for DM + nostu.be; ADMIN not required.
- `web/scripts/sync-relay-whitelist.mjs` — whitelists login-bot from `DOJOPOP_LOGIN_NSEC`.
- 2026-07-11: switched primary signing from ADMIN → LOGIN; redeployed + backfilled
  (177 practice events; 110 created, 66 skipped, 1 failure — Damus rate-limits;
  dojopop/primal/nos.lol accepted).

## Open items
- None for identity choice (settled: LOGIN_NSEC).

## References
- nostu.be source: kinds 21/22/34235/34236 (`flox1an/nostube`)
- Doppler: `dojopop` / `prd_zorie`
- Publisher pattern: `web/src/lib/publisher-account.ts`
- Login-bot pubkey hex: `58d5fd86797cc2914e7be0e76583ab293af5dd35bc0da15b77d92d093bec417c`
