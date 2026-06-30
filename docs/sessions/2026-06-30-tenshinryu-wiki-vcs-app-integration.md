# Session: Tenshinryu wiki VCS + KIWAMI app integration
**Date:** 2026-06-30
**Project:** dojopop | tenshinryu-wiki | tenshinryu

## Summary
Added `tenshinryu-wiki/` to the dojopop monorepo (~3400 tracked files; books/assets/dist remain gitignored). Integrated wiki access into the KIWAMI PWA via locale-aware `/wiki` redirect, nav, home quick links, and i18n footer.

## Decisions
- **Keep `tenshinryu-wiki/` at monorepo root** — preserves deploy path `relay-2:/opt/dojopop/tenshinryu-wiki`; no move into `tenshinryu/wiki/`
- **Redirect, not embed** — `/wiki` → `wiki.tenshinryu.xyz/{locale}/` (en/ja/es/el; app locales without wiki fall back to en)
- **Separate deploys** — wiki `deploy.sh` vs PWA `deploy.sh`; static wiki stays public (no Firebase gate)

## Actions taken
- Committed wiki sources, scripts, deploy config, raw/web, wiki markdown
- App: `src/lib/wiki.ts`, `src/app/wiki/route.ts`, `AppShell` nav, `/home` quick links, i18n `SiteFooter`, landing `SiteHeader`
- Updated `tenshinryu/README.md`, `tenshinryu-wiki/README.md`, `AGENTS.md`

## Open items
- Push commits to origin + gitlab when ready
- Deploy PWA after pull on relay-2: `cd tenshinryu && ./deploy.sh relay-2`
- Wiki redeploy only when content changes: `cd tenshinryu-wiki && ./deploy.sh relay-2`

## References
- Monorepo layout: `AGENTS.md`
- Prior deploy session: [2026-06-29-tenshinryu-wiki-deploy](./2026-06-29-tenshinryu-wiki-deploy.md)
