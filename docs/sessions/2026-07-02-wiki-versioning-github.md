# Session: Wiki versioning and GitHub commit
**Date:** 2026-07-02
**Project:** dojopop

## Summary

Added lightweight version control for tenshinryu-wiki: `VERSION` file, `scripts/tag-wiki-release.sh`, git tags (`wiki-vYYYY.MM.DD`), and rollback documentation in `tenshinryu-wiki/README.md`. Committed pending wiki content (spirit-of-chugi, community pages, scrape cleanup, nav/site fixes) and pushed to GitHub.

## Decisions

- **Primary rollback:** git tag → checkout → rebuild → `./deploy.sh relay-2 --skip-build`
- **Emergency rollback:** relay-2 keeps `dist-old` after atomic swap until next deploy; manual `mv` swap documented
- **No heavy infra:** git tags + README only; no separate release CI

## Actions taken

- Added `tenshinryu-wiki/VERSION` (`2026.07.02`)
- Added `scripts/tag-wiki-release.sh`
- Updated `deploy.sh` to retain `dist-old` on relay-2 for one generation
- Documented rollback in `tenshinryu-wiki/README.md`
- Committed wiki content, site scripts, and related monorepo changes
- Tagged `wiki-v2026.07.02` and pushed to `origin` (+ `gitlab` if configured)

## Open items

- Run `./scripts/tag-wiki-release.sh` after each production deploy
- Exclude accidental `tenshinryu-wiki/Year` junk file from git (tar error log)

## References

- Deploy: `tenshinryu-wiki/deploy.sh` → relay-2 `/opt/dojopop/tenshinryu-wiki` :3014
- Live: https://wiki.tenshinryu.xyz
- Tag script: `scripts/tag-wiki-release.sh`
