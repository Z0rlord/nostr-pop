#!/usr/bin/env bash
# Pick a data directory on the largest available mount (Pi NVMe/USB) and wire
# it into the blossom deploy tree. Run on the Pi (invoked by deploy.sh).
set -euo pipefail

DEPLOY_DIR="${1:-/opt/dojopop/blossom}"
MIN_GB="${BLOSSOM_MIN_DATA_GB:-400}"

if [[ -n "${BLOSSOM_DATA_ROOT:-}" ]]; then
  DATA_ROOT="$BLOSSOM_DATA_ROOT"
else
  # Largest non-system mount with enough free space (expect ~975 GB on Pi 5).
  DATA_ROOT="$(
    df -BG --output=avail,target 2>/dev/null \
      | awk -v min="$MIN_GB" '
          NR > 1 {
            gsub(/G/, "", $1)
            if ($1 + 0 >= min && $2 !~ /^\/(boot|run|dev|proc|sys|tmp)(\/|$)/) {
              print $1, $2
            }
          }
        ' \
      | sort -rn \
      | head -1 \
      | awk '{print $2}'
  )"
  if [[ -z "$DATA_ROOT" ]]; then
    echo "ERROR: no mount with >= ${MIN_GB}G free; set BLOSSOM_DATA_ROOT and re-run deploy"
    df -h
    exit 1
  fi
  DATA_ROOT="${DATA_ROOT%/}/dojopop-blossom"
fi

mkdir -p "$DATA_ROOT/blobs"
chmod 755 "$DATA_ROOT" "$DATA_ROOT/blobs"

LINK="${DEPLOY_DIR}/data"
if [[ -L "$LINK" ]]; then
  rm -f "$LINK"
elif [[ -d "$LINK" && ! -L "$LINK" ]]; then
  echo "WARN: ${LINK} is a real directory; move contents to ${DATA_ROOT} manually if needed"
  exit 1
fi
ln -sfn "$DATA_ROOT" "$LINK"

echo "==> Blossom data → ${DATA_ROOT} (symlink ${LINK})"
df -h "$DATA_ROOT" | tail -1
