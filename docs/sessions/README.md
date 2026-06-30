# Session log

Agent conversations with material decisions are captured here (local, git-tracked). **No secrets** in these files.

| Date | Session | Topics |
|------|---------|--------|
| 2026-06-30 | [tenshinryu-wiki-vcs-app-integration](./2026-06-30-tenshinryu-wiki-vcs-app-integration.md) | Wiki in monorepo git, `/wiki` locale redirect, KIWAMI nav integration |
| 2026-06-29 | [tenshinryu-wiki-deploy](./2026-06-29-tenshinryu-wiki-deploy.md) | wiki.tenshinryu.xyz static wiki, Python SSG, relay-2 :3014 |
| 2026-06-18 | [tenshinryu-staging](./2026-06-18-tenshinryu-staging.md) | staging.tenshinryu.xyz on relay-2:3013, deploy-staging workflow |
| 2026-06-16 | [tenshinryu-kiwami-pwa](./2026-06-16-tenshinryu-kiwami-pwa.md) | Tenshinryu KIWAMI PWA on Hetzner vol1, Firebase auth, kiwami.tenshinryu.xyz |
| 2026-06-11 | [dojopop-relay-relay2](./2026-06-11-dojopop-relay-relay2.md) | nostr-rs-relay scaffold + deploy to relay-2 (Hetzner), kind allowlist, pubkey whitelist |
| 2026-06-11 | [youtube-blossom-pipeline](./2026-06-11-youtube-blossom-pipeline.md) | YouTube→Blossom→Nostr pipeline, blossom-server scaffold, git remotes, Doppler prd_zorie |
| 2026-06-09 | [drive-backup-setup](./2026-06-09-drive-backup-setup.md) | Google Drive backup, certs.json vs SA key |
| 2026-06-02 | [dojopop-architecture-and-tooling](./2026-06-02-dojopop-architecture-and-tooling.md) | DojoPop spec, Doppler, pass-cli, gstack minimal, rules |

## How it works

- Rule: `.cursor/rules/session-log.mdc` instructs the agent to append after significant work.
- Cursor also stores transcripts under `~/.cursor/projects/` (not in this repo).
- Prefer this directory for **decisions and next steps** the whole team can read.
