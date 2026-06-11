# Google Drive chat backup setup

**Target folder:** [cursor backup](https://drive.google.com/drive/folders/1nEC-WUSO-t1wLMyFZhBqthYqS0vCQck0) (`1nEC-WUSO-t1wLMyFZhBqthYqS0vCQck0`)

Owned by `zbarber@gmail.com`, shared with `firebase-adminsdk-k70ab@dojopop.iam.gserviceaccount.com`.

## Why OAuth (not service account upload)

Google blocks **service account uploads** to personal Gmail Drive (`storageQuotaExceeded`), even into folders you shared. Domain-wide delegation also fails on `@gmail.com`.

**Fix:** backup runs as **your Google account** via OAuth (one-time browser login).

## One-time setup (5 minutes)

### 1. Enable Drive API

https://console.cloud.google.com/apis/library/drive.googleapis.com?project=dojopop

### 2. Create Desktop OAuth client

https://console.cloud.google.com/apis/credentials?project=dojopop

- **Create credentials** → **OAuth client ID**
- Application type: **Desktop app**
- Download JSON → save as:

```
~/.config/dojopop/oauth-client.json
```

### 3. Authorize (opens browser once)

In your **normal terminal** (not sandboxed):

```bash
cd ~/Projects/dojopop
.venv-drive/bin/python3 scripts/drive-oauth-setup.py
```

Sign in as `zbarber@gmail.com` and allow Drive file access.

### 4. Run backup

```bash
.venv-drive/bin/python3 scripts/backup-to-drive.py
```

## What gets uploaded

| Local | Drive subfolder |
|-------|-----------------|
| `docs/sessions/*.md` | `cursor-sessions/` |
| `~/.cursor/.../agent-transcripts/*.jsonl` | `cursor-transcripts/` (redacted) |

## Config

`~/.config/dojopop/drive-backup.json` — already points at your folder ID.

## Service account note

`firebase-adminsdk-k70ab@dojopop.iam.gserviceaccount.com` can **see** the shared folder but cannot **upload** files. Keep OAuth as `auth_mode`.

## Files to never commit

- `~/.config/dojopop/oauth-client.json`
- `~/.config/dojopop/drive-oauth-token.json`
- `Desktop/AAA DojoPop.xyz/Keys/*.json`
