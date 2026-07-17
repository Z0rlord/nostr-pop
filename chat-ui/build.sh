#!/usr/bin/env bash
# Build Cordn web client for dojopop.live at /chat-app/
#
# Output: web/public/chat-app/ (static SvelteKit SPA)
# Requires: node >= 20, npx (pnpm via npx)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
VENDOR="$SCRIPT_DIR/.vendor/cordn-web"
OUT="$REPO_ROOT/web/public/chat-app"
REF="${CORDN_WEB_REF:-master}"
REPO="${CORDN_WEB_REPO:-https://github.com/Cordn-msg/cordn-web}"

DOJOPOP_COORDINATOR="d969813a5c0e3e65dad03fc9e1d2db5933dda8b307ddce474e8da60b4e288259"

echo "==> Cordn web build (ref=${REF})"

if [[ ! -d "$VENDOR/.git" ]]; then
  mkdir -p "$SCRIPT_DIR/.vendor"
  git clone --depth 1 --branch "$REF" "$REPO" "$VENDOR" 2>/dev/null \
    || git clone --depth 1 "$REPO" "$VENDOR"
else
  git -C "$VENDOR" fetch --depth 1 origin "$REF" 2>/dev/null || true
  git -C "$VENDOR" checkout "$REF" 2>/dev/null || true
  git -C "$VENDOR" pull --ff-only 2>/dev/null || true
fi

echo "==> Patching DojoPop coordinator default + base path /chat-app"
python3 <<PY
from pathlib import Path
import re
root = Path("$VENDOR")
chat = root / "src/lib/constants/chat.ts"
text = chat.read_text()
if "$DOJOPOP_COORDINATOR" not in text:
    text = re.sub(
        r"export const DEFAULT_CHAT_COORDINATOR_PUBKEY =\s*\n\s*'[0-9a-f]{64}';",
        f"export const DEFAULT_CHAT_COORDINATOR_PUBKEY =\n\t'$DOJOPOP_COORDINATOR';",
        text,
        count=1,
    )
    chat.write_text(text)

cfg = root / "svelte.config.js"
cfg_text = cfg.read_text()
if "base: '/chat-app'" not in cfg_text:
    cfg_text = cfg_text.replace(
        "paths: {\n\t\t\trelative: false\n\t\t},",
        "paths: {\n\t\t\tbase: '/chat-app',\n\t\t\trelative: false\n\t\t},",
        1,
    )
    cfg.write_text(cfg_text)
PY

echo "==> Applying DojoPop news + branding patches"
chmod +x "$SCRIPT_DIR/patches/apply-dojopop-patches.sh"
"$SCRIPT_DIR/patches/apply-dojopop-patches.sh" "$VENDOR"

cd "$VENDOR"
echo "==> Installing dependencies"
npx pnpm@10 install --frozen-lockfile 2>/dev/null || npx pnpm@10 install

echo "==> Building"
npx pnpm@10 run build

echo "==> Copying to $OUT"
rm -rf "$OUT"
mkdir -p "$OUT"
cp -R "$VENDOR/build/." "$OUT/"

echo "==> Done. Chat app at web/public/chat-app/"
