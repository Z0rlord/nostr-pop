# Session: DojoPop Global Cordn group + chat UI
**Date:** 2026-07-09
**Project:** dojopop

## Summary

Bootstrapped the first DojoPop global MLS group (`dojopop-global`, gid `cee986f1-2afe-417f-985d-c4fadfc23980`) on the self-hosted Cordn coordinator. Built and embedded the Cordn web client at **dojopop.live/chat-app/** with `/chat` redirecting to the global group join page.

## Decisions

- Chat UI = upstream **cordn-web** built by `chat-ui/build.sh` (not a from-scratch Next.js MLS client).
- Patches: default coordinator → DojoPop; SvelteKit `paths.base` → `/chat-app`.
- Bootstrap must use `encryptOutbound: true` (coordinator opaque `gid` path; legacy MLS decode fails on sealed payloads).
- Join flow: users request via Cordn web UI; admin approves with `DOJOPOP_CORDN_ADMIN_PRIVATE_KEY` identity in chat (no server-side auto-add until admin MLS state can be persisted).
- `web/deploy.sh` runs `chat-ui/build.sh` by default (`CHAT_UI_BUILD=1`).

## Actions taken

- Deployed relay with ContextVM kinds 11316–11320, 25910; Cordn coordinator + admin on pubkey whitelist.
- Fixed bootstrap (`encryptOutbound: true`); welcome message posted; gid `efe026b2-5eae-4859-b6ca-0c96307465a9`.
- `chat-ui/build.sh`, `/chat` redirect, header nav; `web/deploy.sh` builds chat UI before rsync.

## Open items

- Admin: sign into `/chat` with `DOJOPOP_CORDN_ADMIN_PRIVATE_KEY` to approve join requests.
- Cordn members use public relays for ephemeral transport unless their pubkey is whitelisted on relay.dojopop.live.

## References

- Group config: `cordn/dojopop-global.json`
- Coordinator: relay-2 `dojopop-cordn`, pubkey `d969813a…`
- Admin pubkey: `9b8534d1…` / `npub1nwznf50…`
- Doppler: `DOJOPOP_CORDN_ADMIN_PRIVATE_KEY`, `CORDN_SERVER_PRIVATE_KEY`
