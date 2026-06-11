---
name: review
description: Pre-landing PR review for DojoPop/nostr-pop. Use when asked to review a PR, diff, or branch before merge. Checks Rust safety, async correctness, secret handling, and NOSTR event integrity.
disable-model-invocation: true
---

# /review — Pre-landing review (gstack minimal)

Adapted from [gstack/review](https://github.com/Z0rlord/gstack). No browser or Bun required.

## Steps

1. Identify base branch: `main` or `master`.
2. Read diff: `git diff origin/main...HEAD` (or `git diff main...HEAD`).
3. Run Pass 1 (critical), then Pass 2 (informational) using `checklist.md` in this directory.
4. Add **Rust / DojoPop** checks below.
5. Output in gstack format:

```
Pre-Landing Review: N issues (X critical, Y informational)

**AUTO-FIXED:**
- [file:line] Problem → fix applied

**NEEDS INPUT:**
- [file:line] Problem description
  Recommended fix: suggested fix
```

If clean: `Pre-Landing Review: No issues found.`

## Rust / DojoPop checks (always run)

- **Secrets:** No `nsec`, PAT, or Doppler tokens in source, logs, or commits. Keys via env/Doppler/pass-cli only.
- **Async:** No blocking I/O inside async without `spawn_blocking` or equivalent. Relay publish timeouts respected (5s primary, 10s public).
- **NOSTR:** Event kind `34567` content matches schema. Tags include `d`, `dojo-*`, `t`, `r`, `imeta` (NIP-94). Video SHA-256 verified before publish.
- **Errors:** `anyhow` context on external failures (Blossom upload, relay). No silent `.unwrap()` on network paths.
- **Relay order:** Primary relay first, verify OK, then public relays in parallel.

## Reference

Full generic checklist: [checklist.md](./checklist.md) (from gstack; skip web/SQL sections if N/A).
