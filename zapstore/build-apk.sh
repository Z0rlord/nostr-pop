#!/usr/bin/env bash
# Build a DojoPop Android APK by wrapping https://dojopop.live (or local web build) with goapk.
# Requires: goapk binary on PATH — https://github.com/zapstore/goapk/releases
# Does NOT require Android SDK.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="$ROOT/zapstore/dist"
APK="$OUT_DIR/dojopop-release.apk"

# Override to wrap a local Next export: SOURCE=./web/out ./zapstore/build-apk.sh
SOURCE="${SOURCE:-https://dojopop.live}"
PACKAGE="${PACKAGE:-live.dojopop.app}"
VERSION_NAME="${VERSION_NAME:-1.0.0}"
VERSION_CODE="${VERSION_CODE:-1}"
GOAPK="${GOAPK:-goapk}"

mkdir -p "$OUT_DIR"

if ! command -v "$GOAPK" >/dev/null 2>&1; then
  echo "ERROR: goapk not found. Install from https://github.com/zapstore/goapk/releases" >&2
  echo "  Example: curl -L -o /usr/local/bin/goapk <release-url> && chmod +x /usr/local/bin/goapk" >&2
  exit 1
fi

ARGS=(
  build
  -s "$SOURCE"
  --package "$PACKAGE"
  --version-name "$VERSION_NAME"
  --version-code "$VERSION_CODE"
  --name "DojoPop"
)

if [[ -n "${KEYSTORE_PATH:-}" ]]; then
  ARGS+=(--keystore "$KEYSTORE_PATH")
  if [[ -n "${KEYSTORE_PASSWORD:-}" ]]; then
    ARGS+=(--keystore-pass "$KEYSTORE_PASSWORD")
  fi
else
  echo "NOTE: Using goapk debug keystore. For production Zapstore releases, set KEYSTORE_PATH + KEYSTORE_PASSWORD." >&2
fi

echo "Building APK from source=$SOURCE package=$PACKAGE ..."
"$GOAPK" "${ARGS[@]}" "$APK"
echo "Wrote $APK"
echo "Next: set pubkey in zapstore/zapstore.yaml, then: SIGN_WITH=... zsp publish zapstore/zapstore.yaml"
