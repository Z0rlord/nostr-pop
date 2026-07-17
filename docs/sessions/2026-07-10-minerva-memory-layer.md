# Session: Minerva modular AI memory layer
**Date:** 2026-07-10
**Project:** dojopop | Minerva vault

## Summary

Wired Minerva-13 as a portable AI memory layer using v3-style atomic facts and append-only events. Canonical protocol in vault `AGENTS.md`; thin adapters for Cursor, Claude Code, and OpenClaw. Cursor in dojopop loads vault via `.cursor/rules/obsidian-memory.mdc`.

## Decisions

- Follow [obsidian-memory-for-ai](https://github.com/Jrcruciani/obsidian-memory-for-ai) v3 patterns (facts/events split); Python lint tooling optional later.
- One canonical `AGENTS.md` at vault root; tool files (`CLAUDE.md`, `OPENCLAW.md`, `memory/adapters/*`) are adapters only.
- Agent inbox IDs: `cursor`, `claude-code`, `openclaw`.
- Repo `docs/sessions/` kept for dojopop-specific logs; cross-project memory in vault `memory/events/`.

## Actions taken

- Git backup of Minerva-13 (295 notes) to GitLab/GitHub `minerva-vault`.
- Created `memory/` tree: facts, events, projects, schema, `_views/index.md`, decisions.
- Pushed commit `bacc902` to minerva-vault remotes.
- Added `dojopop/.cursor/rules/obsidian-memory.mdc` (local, not yet committed).

## Open items

- Commit dojopop cursor rule when landing repo changes.
- Optional: submodule obsidian-memory-for-ai for `lint.py` / `compact.sh`.
- Optional: My-Brain-Is-Full-Crew orchestration on top of vault (separate from memory protocol).
- Enable LiveSync sync-on-start on phone + Mac.

## References

- Vault: `~/Library/Mobile Documents/iCloud~md~obsidian/Documents/Minerva-13`
- GitLab: https://gitlab.com/zbarber1/minerva-vault
- Vault event: `memory/events/2026-07-10/memory-layer-setup.md`
