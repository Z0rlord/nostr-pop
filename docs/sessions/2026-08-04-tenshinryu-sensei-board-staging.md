# Session: Sensei board / schedule / news (staging)
**Date:** 2026-08-04
**Project:** dojopop | tenshinryu

## Summary
Shipped v1 bulletin board, class schedule (physical vs online), and news/breaking announcements on **staging only** (`staging.tenshinryu.xyz`). All features are scoped to the active dojo (multi-dojo / Global Keikokai ready). Production (`tenshinryu.xyz` / `./deploy.sh`) was **not** deployed.

## Decisions
- Per-dojo scoping only (no org-wide broadcast yet)
- Login required to post/view board, schedule, and news (`requireMember`)
- Extended existing `Class` with `mode` (`PHYSICAL` | `ONLINE`) + `meetingUrl` rather than a separate schedule table
- Staff moderate board (pin/hide) and CRUD schedule/news; students ask questions and reply
- Local branch `staging/sensei-board` — no remote push required for staging (rsync deploy)

## Actions taken
- Prisma models: `BulletinPost`, `BulletinReply`, `NewsItem`; `ClassMode` + Class fields
- Migration applied to staging DB only (`TENSHINRYU_STAGING_DATABASE_URL`)
- APIs: `/api/bulletin`, `/api/bulletin/[id]`, `/api/bulletin/[id]/replies`, `/api/news`, `/api/schedule`; calendar reads real dojo classes
- Pages: `/board`, `/schedule`, `/news` with `CommunityShell` (StaffShell vs WorkShell)
- Nav: StaffNav + WorkNav “Board”; student overview quick links; breaking banner component
- i18n: EN + JA `community.*` keys
- Deployed via `./deploy-staging.sh relay-2`

## Open items
- User approval before production migrate + `./deploy.sh`
- Optional: guest/public schedule view; broadcast HQ news across dojos; richer calendar UI; email/LINE notify on news
- Backfill existing classes to set `mode` / `meetingUrl` where known

## References
- Staging: https://staging.tenshinryu.xyz/board | `/schedule` | `/news`
- Branch: `staging/sensei-board`
- Migration: `tenshinryu/prisma/migrations/20260804150000_sensei_board_schedule_news`
