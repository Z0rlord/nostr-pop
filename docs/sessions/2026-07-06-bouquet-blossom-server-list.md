# Session: Bouquet Blossom server list not saving
**Date:** 2026-07-06
**Project:** dojopop

## Summary
Bouquet at `bouquet.dojopop.live` appeared not to persist added Blossom servers.
Root cause: Bouquet stores servers as Nostr kind **10063** (BUD-03) on relays, not
in localStorage. `relay.dojopop.live` blocked kind 10063 (and 10096) in
`event_kind_allowlist`, so Save failed when publishing to the DojoPop relay.

## Decisions
- Add kinds **10063** and **10096** to `relay/config.toml` allowlist.
- Seed pipeline identity server list via `pipeline/publish_blossom_server_list.py`.
- `relay/deploy.sh` now `--force-recreate relay` so config.toml changes apply.

## Actions taken
- Updated `relay/config.toml` allowlist.
- Deployed + recreated relay on relay-2; verified kind 10063 accepted.
- Published `https://blossom.dojopop.live` on kind 10063 for pipeline pubkey.
- Documented Bouquet persistence model in `bouquet/README.md`.

## Open items
- User must sign in with a **signing** account (extension / Clave / bunker), not npub-only.
- Bouquet UI gives no toast on publish failure — check browser console if Save seems silent.

## References
- Pipeline pubkey: `npub1k0v9gnwatzt0whhkdsss7hqddhke77f9zclte0yfueutms0y334qg380wg`
- Bouquet upstream: https://github.com/flox1an/bouquet (`useUserServers.ts`)
- BUD-03 kind 10063: Blossom user server list
