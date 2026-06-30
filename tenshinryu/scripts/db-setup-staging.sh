#!/usr/bin/env bash
# Apply Prisma migrations to the staging database (Neon).
set -euo pipefail
export PATH="/opt/homebrew/bin:$PATH"
cd "$(dirname "$0")/.."

DOPPLER_CONFIG="${DOPPLER_CONFIG:-prd_zorie}"

echo "==> Prisma migrate deploy (staging DB)..."
doppler run --project dojopop --config "$DOPPLER_CONFIG" -- bash -c '
  if [[ -n "${TENSHINRYU_STAGING_DATABASE_URL:-}" ]]; then
    export DATABASE_URL="$(doppler secrets get TENSHINRYU_STAGING_DATABASE_URL --project dojopop --config '"$DOPPLER_CONFIG"' --plain)"
  else
    echo "WARN: TENSHINRYU_STAGING_DATABASE_URL unset — migrating shared TENSHINRYU_DATABASE_URL"
    export DATABASE_URL="$(doppler secrets get TENSHINRYU_DATABASE_URL --project dojopop --config '"$DOPPLER_CONFIG"' --plain)"
  fi
  npx prisma migrate deploy
'

echo "==> Staging database ready."
