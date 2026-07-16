# Session: Staging harden + multi-dojo bug audit
**Date:** 2026-07-16
**Project:** dojopop

## Summary
Confirmed `staging.tenshinryu.xyz` is live (relay-2:3013) with latest deploy and STAGING banner. Staging currently shares the production Neon database (`TENSHINRYU_STAGING_DATABASE_URL` unset). Bug audit for multi-school adoption by Kuwami Sensei found P0 schema/API issues that block one owner across all dojos and leak unscoped student/class data.

## Decisions
- Keep production (`tenshinryu.xyz` :3003) untouched; all further multi-school work lands on staging first
- Do not run destructive multi-dojo experiments until staging has its own Neon branch

## Actions taken
- Redeployed staging via `./deploy-staging.sh relay-2`
- Verified staging banner + tunnel healthy
- **Isolated staging DB:** `tenshinryu_staging` on Neon + Doppler `TENSHINRYU_STAGING_DATABASE_URL`
- Locked `/api/students`, `/api/classes`, `/api/checkin/*`, `/api/attendance` behind session + dojo scope
- Added `InstructorDojoMembership` + school `code`; invite accept creates Firebase user; signup requires dojo code
- Seeded staging: Kuwami Sensei owner of all 8 schools; school switcher in StaffShell
- Confirmed unauth students/classes/checkin → 401; staging DB ≠ prod DB

## Open items
- Enable Firebase Email/Password in console (Google login still works)
- Promote same fixes to production only after Sensei validates on staging
- Optional: tighten remaining journal/goals studentId APIs
- Optional: lower invite password min length if needed (currently 8; temp password `Kiwami` is via provision/seed)

## References
- Staging: https://staging.tenshinryu.xyz
- Prod: https://tenshinryu.xyz
- Doppler: `dojopop` / `prd_zorie` — need `TENSHINRYU_STAGING_DATABASE_URL`
