# Session: Foreign-country Tenshinryu schools
**Date:** 2026-07-17
**Project:** dojopop

## Summary
Imported all 17 foreign schools from international.tenshinryu.net into KIWAMI as separate dojos (staging then production). UI now groups Japan / Global Keikokai / Foreign. Leaders with known emails received pending owner invites for their school only; Kuwami Sensei remains admin on all schools.

## Decisions
- Stable dojo IDs: `tenshinryu-foreign-{code-slug}` with short country/org codes (`ES`, `IT`, `CL`, `FIT`, …).
- Do not mix foreign into Japan branches; classify via Japan-code allowlist + KEIKOKAI + everything else foreign (`src/lib/dojo-groups.ts`).
- Prefer owner invites over provisioned passwords; emails not sent automatically (create pending invites; re-run with `--send-email` when ready).
- Leaders admin only on their own school; no cross-foreign admin grants.

## Actions taken
- Added `scripts/foreign-schools.mjs` + `scripts/seed-foreign-dojos.mjs`.
- Updated seed-staging / backfill-prod / DojoSwitcher / SchoolsOverview / README.
- Seeded staging (25 dojos) and production; deployed both to relay-2.
- Commit: `2542f067b`.

## Open items
- Send invite emails (`--send-email`) or share invite URLs securely for: ES, IT×2, CL, UK, AT, NL, CA, NY.
- Collect emails and invite for: FIT, AU, HK, RU, MX, FR, DE, GR, RO.
- Confirm leaders accept invites and can only see their school in the switcher.

## References
- Source: https://international.tenshinryu.net/foreign-country-dojo
- Staging: https://staging.tenshinryu.xyz
- Production: https://tenshinryu.xyz
- Script: `tenshinryu/scripts/seed-foreign-dojos.mjs`
