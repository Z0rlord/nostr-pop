# Session: Tenshinryu wiki at wiki.tenshinryu.xyz
**Date:** 2026-06-29
**Project:** dojopop | tenshinryu-wiki

## Summary
Shipped a public static wiki at **https://wiki.tenshinryu.xyz** — bilingual EN/JA HTML built from `wiki/en` + `wiki/ja`, served by nginx on relay-2 port **3014** via the existing `dojopop-relay` Cloudflare tunnel.

## Decisions
- **Static SSG in Python** (`scripts/build-site.py`) rather than Quartz/MkDocs — minimal deps, handles `[[wikilinks]]` and frontmatter `pair:` for language toggle
- **Separate from KIWAMI PWA** — public reference wiki; no Firebase gate
- **Port 3014** on relay-2 (after staging :3013)

## Actions taken
- Added `tenshinryu-wiki/pyproject.toml`, build script, templates, CSS, client search index
- `docker-compose.yml` + `nginx.conf` + `deploy.sh`
- Extended `web/scripts/update-tunnel-ingress.sh` with `wiki.tenshinryu.xyz → localhost:3014` + DNS CNAME `wiki`
- Deployed to relay-2; tunnel ingress version 13
- Updated README, AGENTS.md, nextdns allowlist script, log.md

## Open items
- Run `doppler run -- ./scripts/nextdns-allow-dojopop.sh` if Tailscale DNS blocks new subdomain
- Optional: link from KIWAMI app footer to wiki
- Optional: Pagefind or graph view later

## References
- `tenshinryu-wiki/deploy.sh`
- `tenshinryu-wiki/scripts/build-site.py`
- Remote path: `/opt/dojopop/tenshinryu-wiki`
