# Session: Cordn deploy + Bouquet browse / blossom mirror
**Date:** 2026-07-09
**Project:** dojopop

## Summary
User expected all DojoPop videos in Bouquet browse. Root cause: 156/168 practice
videos still on `blossom.yakihonne.com`; only 12 pointed at self-hosted Blossom.
Bouquet also needed DojoPop patches (default servers, list-auth fallback) and
pipeline identity sign-in (`npub1k0v9gn…`).

Deployed **Cordn** MLS coordinator on relay-2; generated `CORDN_SERVER_PRIVATE_KEY`
in Doppler.

## Decisions
- Mirror yakihonne → dojopop via `pipeline/mirror_yakihonne_to_dojopop.py` (BUD-04
  `/mirror` with upload auth).
- Patch Bouquet image: default blossom servers + unauthenticated list fallback.
- Cordn: relay transport only (no HTTP tunnel); announced on `relay.dojopop.live`
  + public relays.

## Actions taken
- `cordn/` docker-compose + deploy.sh; coordinator live (`dojopop-cordn`).
- Bouquet patches redeployed to relay-2.
- Background mirror of 156 yakihonne videos started (`--update-published`).
- `CORDN_SERVER_PRIVATE_KEY` added to Doppler `prd_zorie`.

## Open items
- Mirror job may run ~30–60 min; verify blob count on blossom.dojopop.live after.
- Cordn web UI not in dojopop.live yet — use cordn.net with coordinator nprofile.
- Confirm Bouquet browse after hard-refresh + pipeline npub login.

## References
- Cordn repo: https://github.com/Z0rlord/cordn
- Coordinator pubkey (hex): `d969813a5c0e3e65dad03fc9e1d2db5933dda8b307ddce474e8da60b4e288259`
- Pipeline npub: `npub1k0v9gnwatzt0whhkdsss7hqddhke77f9zclte0yfueutms0y334qg380wg`
