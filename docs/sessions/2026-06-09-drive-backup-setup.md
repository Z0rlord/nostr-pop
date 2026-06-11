# Session: Google Drive backup setup
**Date:** 2026-06-09
**Project:** dojopop

## Summary

User provided `certs.json` for Google credentials. That file holds federation certificates, not a Drive API private key. Wired backup using `dojopop-backup@dojopop.iam.gserviceaccount.com` and `Keys/dojopop-2cb80fff450f.json`. Initial upload blocked: SA-owned folders have no storage quota.

## Decisions

- Use `dojopop-2cb80fff450f.json` for Drive API (not `certs.json`).
- Target Drive folder must be **user-owned** or on a **Shared Drive** with SA as member.
- Transcripts uploaded with redaction (nsec, PAT, private keys).
- Config at `~/.config/dojopop/drive-backup.json`.

## Actions taken

- Added `scripts/backup-to-drive.py` and `.venv-drive` with google-api-python-client.
- Updated `session-log.mdc` to run backup after sessions.
- Documented setup in `docs/DRIVE_BACKUP_SETUP.md`.

## Open items

- [ ] User shares a folder from personal Drive with `dojopop-backup@dojopop.iam.gserviceaccount.com`.
- [ ] User provides folder ID; run first successful backup.
- [ ] Optional: Workspace Shared Drive or domain-wide delegation if personal share insufficient.

## References

- SA email: `dojopop-backup@dojopop.iam.gserviceaccount.com`
- Setup: `docs/DRIVE_BACKUP_SETUP.md`
