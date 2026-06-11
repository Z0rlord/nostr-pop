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
web/              # Next.js landing + $0.99/mo membership (Stripe + Lightning scaffold)
pipeline/         # YouTube → Blossom → Nostr (NIP-71 kind 22) publisher (uv project)
blossom-server/   # self-hosted hzrd149/blossom-server (docker compose)
relay/            # nostr-rs-relay 0.10.0 (docker compose) — deployed on relay-2:7777, kind 34567 allowlist
scripts/          # Google Drive backup tooling (root pyproject.toml)
data/             # downloaded videos (gitignored); published.json tracked
```

Publish videos: `doppler run -- uv run --project pipeline pipeline/pipeline.py --url <youtube-url> --max-duration 90` (see `pipeline/README.md`).

Retract a published video: `doppler run -- uv run --project pipeline pipeline/delete_published.py --yt-id <id> --reason "…"`.

**Doppler:** project `dojopop`, config `prd_zorie` — signing key `NOSTR_NSEC` (inject via `doppler run --`, never commit).

**Relays (primary-then-public):** `ws://relay-2:7777` (Tailscale), `wss://relay.dojopop.live` (Cloudflare Tunnel), then YakiHonne + public relays — see `relay/README.md` and `pipeline/README.md`. Planned: `dojopop/` Rust CLI (post, verify, config, relay-start).

**Git remotes:** `origin` = [GitHub Z0rlord/nostr-pop](https://github.com/Z0rlord/nostr-pop); `gitlab` = [gitlab.com/zbarber1/nostr-pop](https://gitlab.com/zbarber1/nostr-pop). Push both: `git push origin main && git push gitlab main`.
