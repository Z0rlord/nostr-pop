---
name: investigate
description: Root-cause debugging for DojoPop/nostr-pop. Use when hitting a bug, relay failure, Blossom upload error, or flaky publish. No fixes before root cause.
disable-model-invocation: true
---

# /investigate — Root cause debug (gstack minimal)

Adapted from [gstack/investigate](https://github.com/Z0rlord/gstack).

## Iron law

**NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST.**

## Phase 1: Root cause investigation

1. Collect symptoms: errors, stack traces, relay responses, Blossom HTTP status.
2. Read code: trace path from symptom to cause (`Read`, `Grep`).
3. Recent changes: `git log --oneline -20 -- <affected-files>`
4. Reproduce: deterministic steps (CLI command, video path, relay URL).

Output: **Root cause hypothesis:** specific, testable claim.

## Phase 2: Pattern analysis

| Pattern | DojoPop signal |
|---------|----------------|
| Relay timeout | Primary 5s / public 10s exceeded; check `wss://relay.dojopop.local` first |
| Blossom reject | Wrong `Content-Length`, missing headers, hash mismatch |
| Auth failure | `nsec` missing; Doppler sandbox vs terminal; pass-cli session expired |
| Event rejected | Kind 34567 not whitelisted on relay; event > 2MB |
| Hash mismatch | Local SHA-256 ≠ `imeta` tag before publish |

Check `docs/sessions/` for prior related incidents.

## Phase 3: Hypothesis testing

Verify before any fix. **3-strike rule:** after 3 failed hypotheses, STOP and escalate with options (continue / human review / add logging).

## Phase 4: Implementation

- Fix root cause, minimal diff.
- Regression test when tests exist.
- `cargo test` / targeted repro command.

## Phase 5: Report

```
DEBUG REPORT
════════════════════════════════════════
Symptom:         ...
Root cause:      ...
Fix:             ... (file:line)
Evidence:        ...
Regression test: ...
Related:         docs/sessions/...
Status:          DONE | DONE_WITH_CONCERNS | BLOCKED
════════════════════════════════════════
```

Append summary to `docs/sessions/` (see session-log rule).
