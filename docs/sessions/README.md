# Session log

Agent conversations with material decisions are captured here (local, git-tracked). **No secrets** in these files.

| Date | Session | Topics |
|------|---------|--------|
| 2026-07-17 | [tenshinryu-foreign-dojos](./2026-07-17-tenshinryu-foreign-dojos.md) | 17 foreign schools seeded; Japan/Keikokai/Foreign UI; owner invites |
| 2026-07-16 | [tenshinryu-staging-multidojo-audit](./2026-07-16-tenshinryu-staging-multidojo-audit.md) | Staging DB isolation, multi-dojo membership, locked staff APIs |
| 2026-07-05 | [facebook-og-cloudflare](./2026-07-05-facebook-og-cloudflare.md) | Meta OG 403 from AI Crawl Control; external CDN og:image mitigation; token needs Bot Management Edit |
| 2026-07-02 | [wiki-versioning-github](./2026-07-02-wiki-versioning-github.md) | Wiki VERSION + git tags, rollback docs, commit/push to GitHub |
| 2026-07-02 | [youtube-pubsub-pipeline](./2026-07-02-youtube-pubsub-pipeline.md) | YouTube PubSub callback service, auto-trigger pipeline, renewal cadence |
| 2026-07-01 | [social-cross-post-pipeline](./2026-07-01-social-cross-post-pipeline.md) | `social_post.py` MVP, Meta/TikTok stubs, no Zernio |
| 2026-07-01 | [social-pipeline-own-build](./2026-07-01-social-pipeline-own-build.md) | Own social CLI, Nostr working, Meta/TikTok stubs, rejected Zernio |
| 2026-07-01 | [zernio-social-automation](./2026-07-01-zernio-social-automation.md) | Zernio API eval, Doppler key, n8n + relay-2 architecture |
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
