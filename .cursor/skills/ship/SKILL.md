---
name: ship
description: Ship a DojoPop/nostr-pop change — merge base, run Rust checks, open PR. Use when asked to ship, land, or prepare a release.
disable-model-invocation: true
---

# /ship — Land and ship (gstack minimal)

Adapted from [gstack/ship](https://github.com/Z0rlord/gstack). Rust CLI workflow; no browser QA.

## Step 0: Context

- Branch: `git branch --show-current`
- Base: `main` or `master`
- Scope: what this change ships (CLI subcommand, relay config, docs, etc.)

## Step 1: Pre-flight

```bash
git status
git fetch origin
git log --oneline origin/main..HEAD
```

Confirm no secrets in staged files. Confirm Doppler/pass-cli not committed.

## Step 2: Merge base (before tests)

```bash
git merge origin/main   # or rebase if project convention
```

Resolve conflicts. Do not ship with conflict markers.

## Step 3: Rust verification

From workspace root:

```bash
cargo fmt --check
cargo clippy -- -D warnings
cargo build --workspace
cargo test --workspace    # if tests exist
```

For relay only: `cd relay && cargo check` (or project-specific check).

## Step 4: DojoPop smoke (when CLI exists)

```bash
doppler run -- cargo run -- config    # or verify/post dry paths
```

Skip if binary not scaffolded yet; note in report.

## Step 5: PR / land

- Commit message: complete sentences, focus on **why**.
- Push: `git push -u origin HEAD`
- Open PR with `gh pr create` if user asked for PR.
- **Never** push secrets or force-push `main` without explicit user request.

## Completion report

```
SHIP REPORT
════════════════════════════════════════
Branch:          ...
Base merged:     yes/no
fmt/clippy:      pass/fail
build:           pass/fail
tests:           pass/fail/skipped
PR:              URL or N/A
Status:          DONE | DONE_WITH_CONCERNS | BLOCKED
Concerns:        ...
════════════════════════════════════════
```
