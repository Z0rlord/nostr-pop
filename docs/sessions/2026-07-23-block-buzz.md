# Session: Block Buzz evaluation for DojoPop
**Date:** 2026-07-23
**Project:** dojopop

## Summary

Evaluated [block/buzz](https://github.com/block/buzz) (Apache 2.0, ~4.5k★, v0.4.x) as a possible addition for dojo owners/students. Buzz is a **self-hosted human+agent workspace** on a Nostr/NIP-29 relay — not a general social client, not Lightning-first, not a drop-in student app. Recommendation: **skip as a product dependency**; optionally borrow NIP-29 ideas later; keep Cordn for private school chat and DojoPop-native surfaces for proof/attendance/rewards.

## Decisions

- Do **not** embed Buzz or replace Cordn / `relay.dojopop.live` with `buzz-relay`.
- Do **not** treat Buzz as the path for school community feed, attendance, streaks, or membership.
- Optional later: adopt **NIP-29 patterns** (not Buzz the app) if open/public school channels are wanted alongside Cordn MLS.
- Buzz only becomes interesting if a dojo needs an **ops room with AI agents** (curriculum, triage, workflows) — niche, not core.

## Actions taken

- Read Buzz README, ARCHITECTURE, NOSTR.md; repo metadata (license, stack, release v0.4.23).
- Mapped against DojoPop: hikari-warsaw attendance (kind 34567), Cordn `/chat`, kind-22 practice + streak sats, Bunker46, RUNSTR Challenge Weeks (proposal-only).

## Open items

- None required. If revisiting: spike NIP-29 open channels on existing relay vs continuing Cordn-only for school groups.

## References

- https://github.com/block/buzz
- `docs/sessions/2026-07-09-dojopop-global-cordn-chat.md`
- `docs/sessions/2026-07-17-runstr-ideas.md`
- `docs/protocol/class-attendance.md`
