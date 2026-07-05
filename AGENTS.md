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
web/              # Next.js landing + membership; school attendance pilot (hikari-warsaw)
tenshinryu/       # Tenshinryu ONLINE KIWAMI PWA — Firebase auth, Hetzner :3003 (prod) / :3013 (staging)
tenshinryu-wiki/  # Multilingual EN/JA/ES/EL Hyoho wiki — wiki.tenshinryu.xyz :3014 (nginx static)
nsecbunker/       # DEPRECATED — replaced by bunker46 (volume kept for rollback)
nsecbunker-admin-ui/  # git submodule — legacy SvelteKit admin UI
admin/            # DojoPop ops placeholder — admin.dojopop.live :3002 (future dashboard)
bunker46/         # dsbaars/bunker46 NIP-46 manager — primary (bunker.dojopop.live :3005)
pipeline/         # YouTube → Blossom → Nostr (NIP-71 kind 22) publisher (uv project);
                  # PubSubHubbub webhook relay-2:3009, hooks.dojopop.live (auto-mirror @Z0rlord)
alby-hub/         # Alby Hub — relay-2:8080, hub.dojopop.live (NWC wallet)
blossom-server/   # self-hosted hzrd149/blossom-server — relay-2:3004, blossom.dojopop.live
kosync/           # koreader/kosync progress sync — relay-2:3007, sync.krtrmesh.xyz
relay/            # nostr-rs-relay 0.10.0 (docker compose) — deployed on relay-2:7777, kind 34567 allowlist
scripts/          # Google Drive backup tooling (root pyproject.toml)
data/             # downloaded videos (gitignored); published.json tracked
```

Publish videos: `doppler run -- uv run --project pipeline pipeline/pipeline.py --url <youtube-url>` (60 s / 480p transcode; see `pipeline/README.md`).

YouTube auto-mirror: PubSubHubbub at `hooks.dojopop.live` → `pipeline/youtube_pubsub.py` on relay-2:3009 (channel `YOUTUBE_CHANNEL_ID` in Doppler).

Retract a published video: `doppler run -- uv run --project pipeline pipeline/delete_published.py --yt-id <id> --reason "…"`.

**Doppler:** project `dojopop`, config `prd_zorie` — signing key `NOSTR_NSEC` (inject via `doppler run --`, never commit).

**Relays (primary-then-public):** `ws://relay-2:7777` (Tailscale), `wss://relay.dojopop.live` (Cloudflare Tunnel), then YakiHonne + public relays — see `relay/README.md` and `pipeline/README.md`. Planned: `dojopop/` Rust CLI (post, verify, config, relay-start).

**Git remotes:** `origin` = [GitHub Z0rlord/nostr-pop](https://github.com/Z0rlord/nostr-pop); `gitlab` = [gitlab.com/zbarber1/nostr-pop](https://gitlab.com/zbarber1/nostr-pop). Push both: `git push origin main && git push gitlab main`.
