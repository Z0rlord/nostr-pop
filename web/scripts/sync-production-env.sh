#!/usr/bin/env bash
# Build relay-2 web .env from Doppler + DojoPop production overrides.
#
# Usage:
#   doppler run --project dojopop --config prd_zorie -- ./scripts/sync-production-env.sh relay-2
set -euo pipefail

HOST="${1:-relay-2}"
REMOTE_ENV="/opt/dojopop/web/.env"
TMP="$(mktemp)"

doppler secrets download --project dojopop --config prd_zorie --no-file --format docker > "$TMP"

grep -E '^(NEXT_PUBLIC_|STRIPE_|NWC_|LIGHTNING_|MEMBERSHIP_|RESEND_|DOJOPOP_LOGIN_|DM_LOGIN_SECRET|FILM_)' "$TMP" \
  > "${TMP}.filtered" || true

{
  cat "${TMP}.filtered"
  echo 'LIGHTNING_MEMBERSHIP_SATS=10000'
  echo 'MEMBERSHIP_DATA_DIR=/app/data'
  echo 'NEXT_PUBLIC_BLOSSOM_URL=https://blossom.dojopop.live'
  echo 'NEXT_PUBLIC_CDN_URL=https://blossom.dojopop.live'
} > "${TMP}.final"

if ! grep -q '^NWC_CONNECTION_SECRET=' "${TMP}.final"; then
  echo "WARN: NWC_CONNECTION_SECRET not in Doppler — Lightning stays in scaffold mode until set."
fi

if ! grep -q '^DOJOPOP_LOGIN_NSEC=' "${TMP}.final"; then
  echo "ERROR: DOJOPOP_LOGIN_NSEC missing — run: node web/scripts/generate-login-bot-key.mjs && doppler secrets set ..."
  exit 1
fi

if ! grep -q '^DM_LOGIN_SECRET=' "${TMP}.final"; then
  echo "ERROR: DM_LOGIN_SECRET missing — run: node web/scripts/generate-login-bot-key.mjs && doppler secrets set ..."
  exit 1
fi

echo "==> Verifying login-bot key pair (npub must match nsec)…"
doppler run --project dojopop --config prd_zorie -- node --input-type=module -e "
import { getPublicKey, nip19 } from 'nostr-tools';
const nsec = process.env.DOJOPOP_LOGIN_NSEC?.trim();
const npubEnv = process.env.DOJOPOP_LOGIN_NPUB?.trim();
if (!nsec) process.exit(1);
const derived = getPublicKey(nip19.decode(nsec).data);
if (npubEnv?.startsWith('npub1')) {
  const envHex = nip19.decode(npubEnv).data;
  if (envHex !== derived) {
    console.error('ERROR: DOJOPOP_LOGIN_NPUB does not match DOJOPOP_LOGIN_NSEC in Doppler');
    process.exit(1);
  }
}
if (process.env.NOSTR_NSEC?.trim() === nsec) {
  console.error('ERROR: DOJOPOP_LOGIN_NSEC must not equal founder NOSTR_NSEC');
  process.exit(1);
}
console.log('OK: login-bot keys consistent');
"

scp "${TMP}.final" "${HOST}:${REMOTE_ENV}"
ssh -o BatchMode=yes "$HOST" "chmod 600 '${REMOTE_ENV}'"

rm -f "$TMP" "${TMP}.filtered" "${TMP}.final"
echo "==> Synced ${REMOTE_ENV} on ${HOST}"
