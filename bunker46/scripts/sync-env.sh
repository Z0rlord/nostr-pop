#!/usr/bin/env bash
# Write production .env for Bunker46 on relay-2 from Doppler BUNKER46_* secrets.
set -euo pipefail
export PATH="/opt/homebrew/bin:$PATH"
OUT="${1:-/tmp/bunker46.env}"

python3 <<'PY' > "$OUT"
import subprocess

PROJECT = "dojopop"
CONFIG = "prd_zorie"

# Doppler name -> compose .env name (same prefix for compose variable substitution)
KEYS = [
    "BUNKER46_POSTGRES_PASSWORD",
    "BUNKER46_JWT_SECRET",
    "BUNKER46_JWT_REFRESH_SECRET",
    "BUNKER46_ENCRYPTION_KEY",
    "BUNKER46_JWT_EXPIRES_IN",
    "BUNKER46_JWT_REFRESH_EXPIRES_IN",
    "BUNKER46_CORS_ORIGINS",
    "BUNKER46_WEBAUTHN_RP_NAME",
    "BUNKER46_WEBAUTHN_RP_ID",
    "BUNKER46_WEBAUTHN_ORIGIN",
    "BUNKER46_NOSTR_DEFAULT_RELAYS",
    "BUNKER46_ALLOW_REGISTRATION",
    "BUNKER46_LOG_LEVEL",
]

DEFAULTS = {
    "BUNKER46_JWT_EXPIRES_IN": "15m",
    "BUNKER46_JWT_REFRESH_EXPIRES_IN": "7d",
    "BUNKER46_WEBAUTHN_RP_NAME": "Bunker46",
    "BUNKER46_ALLOW_REGISTRATION": "true",
    "BUNKER46_LOG_LEVEL": "info",
}


def get(name: str) -> str:
    r = subprocess.run(
        ["doppler", "secrets", "get", name, "--project", PROJECT, "--config", CONFIG, "--plain"],
        capture_output=True,
        text=True,
    )
    if r.returncode != 0:
        raise SystemExit(f"Missing Doppler secret: {name}")
    return r.stdout.rstrip("\n")


lines = []
for key in KEYS:
    try:
        val = get(key)
    except SystemExit:
        if key in DEFAULTS:
            val = DEFAULTS[key]
        else:
            raise
    if not val and key in DEFAULTS:
        val = DEFAULTS[key]
    lines.append(f"{key}={val}")

print("\n".join(lines))
PY

chmod 600 "$OUT"
echo "Wrote $OUT"
