# DojoPop / nostr-pop

NOSTR-native proof-of-practice protocol and Rust CLI.

## Agent skills (gstack minimal)

Installed from [Z0rlord/gstack](https://github.com/Z0rlord/gstack) — **review**, **ship**, **investigate** only (no browser/Bun).

| Skill | Invoke | Purpose |
|-------|--------|---------|
| review | Ask for PR/diff review | Pre-landing checklist + Rust/NOSTR checks |
| ship | Ask to ship or land | fmt, clippy, build, merge base, PR |
| investigate | Ask to debug a bug | Root-cause protocol before fixes |

Skills live in `.cursor/skills/*/SKILL.md`. Full gstack install optional later: `git clone ... && ./setup` (requires Bun).

## Rules

- `.cursor/rules/secret-handling.mdc` — Doppler + pass-cli
- `.cursor/rules/session-log.mdc` — save decisions to `docs/sessions/`

## Session history

See [docs/sessions/README.md](./docs/sessions/README.md).

## Layout

```
pipeline/         # YouTube → Blossom → Nostr (NIP-71 kind 22) publisher (uv project)
blossom-server/   # self-hosted hzrd149/blossom-server (docker compose)
scripts/          # Google Drive backup tooling (root pyproject.toml)
data/             # downloaded videos + publish state (gitignored)
```

Publish videos: `doppler run -- uv run --project pipeline pipeline/pipeline.py --url <youtube-url> --max-duration 90` (see `pipeline/README.md`).

Planned: `dojopop/` Rust CLI (post, verify, config, relay-start) + `relay/`
nostr-rs-relay, kind **34567** whitelist, port 7777. Blossom upload, relay
publish primary-then-public.

Git remotes: `origin` = GitHub `Z0rlord/nostr-pop`; `gitlab` = placeholder
(token expired — confirm URL, then `git remote set-url gitlab <url>`).
