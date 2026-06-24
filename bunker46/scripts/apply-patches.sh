#!/usr/bin/env bash
# Copy DojoPop-specific overrides onto pinned upstream/ after git checkout.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PATCHES_DIR="$SCRIPT_DIR/../patches"
UPSTREAM_DIR="$SCRIPT_DIR/../upstream"

if [[ ! -d "$PATCHES_DIR" ]]; then
  echo "No patches directory; skipping."
  exit 0
fi

rsync -a "$PATCHES_DIR/" "$UPSTREAM_DIR/"
echo "Applied DojoPop patches to upstream/"
