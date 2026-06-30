#!/usr/bin/env bash
# Apply Prisma migrations and seed owner/dojo on Neon (TENSHINRYU_DATABASE_URL).
#
# Usage: ./scripts/db-setup.sh
set -euo pipefail
export PATH="/opt/homebrew/bin:$PATH"
cd "$(dirname "$0")/.."

echo "==> Prisma migrate deploy..."
doppler run --project dojopop --config prd_zorie -- bash -c '
  export DATABASE_URL="$(doppler secrets get TENSHINRYU_DATABASE_URL --project dojopop --config prd_zorie --plain)"
  npx prisma migrate deploy
'

echo "==> Seed owner + default dojo..."
doppler run --project dojopop --config prd_zorie -- bash -c '
  export DATABASE_URL="$(doppler secrets get TENSHINRYU_DATABASE_URL --project dojopop --config prd_zorie --plain)"
  npx tsx prisma/seed.ts
'

echo "==> Database ready."
