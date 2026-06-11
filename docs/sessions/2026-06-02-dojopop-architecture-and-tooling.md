# Session: DojoPop architecture and tooling setup
**Date:** 2026-06-02
**Project:** dojopop / nostr-pop

## Summary

Defined DojoPop as a NOSTR-native practice documentation protocol (event kind 34567, Blossom video upload, OpenClaw-style Rust CLI, self-hosted relay). Explored credential handling via Doppler and pass-cli. Installed minimal gstack skills (`/review`, `/ship`, `/investigate`) without full browser stack (Bun not installed).

## Decisions

- **Event kind:** 34567 with JSON content: date, technique, duration_sec, notes, video_sha256, lineage.
- **Tags:** `d`, `dojo-{id}`, `t`, `r`, `imeta` (NIP-94 Blossom metadata).
- **Relays:** Primary `wss://relay.dojopop.local` first (5s timeout), then public relays in parallel (10s). Fallback if primary fails.
- **Secrets:** Doppler for runtime injection (`doppler run --`); pass-cli for vault retrieval with `PROTON_PASS_AGENT_REASON`. Never hardcode nsec/PAT.
- **nostr-pop Doppler project:** Copy non-identity secrets from dojopop `zorie-production`; generate **new** nostr key pair for nostr-pop.
- **gstack:** Minimal install only — review, ship, investigate as Cursor skills; skip full browser/QA stack for CLI-first project.
- **Reference repos:** [Z0rlord/nostr-pop](https://github.com/Z0rlord/nostr-pop) (stub), [Z0rlord/gstack](https://github.com/Z0rlord/gstack) (fork of garrytan/gstack).

## Actions taken

- Created `.cursor/rules/secret-handling.mdc` (pass-cli + Doppler).
- Created `.cursor/skills/{review,ship,investigate}/SKILL.md` (gstack minimal).
- Created session log rule and this file.
- `~/Projects/dojopop` git repo initialized (Rust workspace not yet scaffolded).

## Open items

- [ ] Scaffold Rust workspace (`dojopop/` CLI + `relay/` nostr-rs-relay).
- [ ] Wire Doppler `nostr-pop` project; copy secrets from dojopop; generate new nsec/npub.
- [ ] Rotate Proton PAT exposed in chat; store via pass-cli only.
- [ ] Clone/push to nostr-pop GitHub repo.
- [ ] Install Bun only if browser QA skills needed later.

## References

- Doppler projects: `dojopop` (zorie-production), `nostr-pop`
- Config path (planned): `~/.config/dojopop/config.json`
- Agent transcripts: Cursor project `empty-window`
