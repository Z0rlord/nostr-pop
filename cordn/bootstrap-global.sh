#!/usr/bin/env bash
# Create the DojoPop Global MLS group on the self-hosted coordinator.
#
# Requires Doppler secrets:
#   DOJOPOP_CORDN_ADMIN_PRIVATE_KEY  — 64-hex client key (group admin; NOT coordinator key)
#
# Usage:
#   openssl rand -hex 32   # once → doppler secrets set DOJOPOP_CORDN_ADMIN_PRIVATE_KEY=...
#   doppler run --project dojopop --config prd_zorie -- ./bootstrap-global.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT="${SCRIPT_DIR}/dojopop-global.json"
COORDINATOR_PUBKEY="${CORDN_COORDINATOR_PUBKEY:-d969813a5c0e3e65dad03fc9e1d2db5933dda8b307ddce474e8da60b4e288259}"
RELAYS="${CORDN_RELAYS:-wss://relay.dojopop.live,wss://relay.primal.net,wss://relay.damus.io,wss://nos.lol}"
CORDN_REF="${CORDN_GIT_REF:-master}"

if [[ -z "${DOJOPOP_CORDN_ADMIN_PRIVATE_KEY:-}" ]]; then
  echo "ERROR: set DOJOPOP_CORDN_ADMIN_PRIVATE_KEY in Doppler (openssl rand -hex 32)"
  exit 1
fi

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

echo "==> Cloning cordn @ ${CORDN_REF}..."
git clone --depth 1 --branch "$CORDN_REF" https://github.com/Z0rlord/cordn "$WORK" 2>/dev/null \
  || git clone --depth 1 https://github.com/Z0rlord/cordn "$WORK"

cd "$WORK"
corepack enable 2>/dev/null || true
if command -v pnpm >/dev/null 2>&1; then
  pnpm install --frozen-lockfile 2>/dev/null || pnpm install
else
  npm install
fi

cat > bootstrap-dojopop-global.mts <<'TS'
import { writeFileSync } from "node:fs";
import { CliSession } from "./src/cli/session.ts";

const privateKey = process.env.DOJOPOP_CORDN_ADMIN_PRIVATE_KEY!;
const coordinator = process.env.CORDN_COORDINATOR_PUBKEY!;
const relays = process.env.CORDN_RELAYS!.split(",").map((r) => r.trim()).filter(Boolean);
const outputPath = process.env.OUTPUT_PATH!;
const force = process.env.FORCE_RECREATE === "1";

const session = new CliSession({
  privateKey,
  serverPubkey: coordinator,
  relays,
  encryptOutbound: true,
});

await session.generateKeyPackage("admin");
const existing = session.listGroups().find((g) => g.alias === "dojopop-global");

let group;
if (existing && !force) {
  group = session.getGroup("dojopop-global");
  console.log("Group dojopop-global already exists in session — reusing");
} else {
  group = await session.createGroup("dojopop-global", {
    metadata: {
      name: "DojoPop Global",
      description: "Encrypted global channel for DojoPop practitioners",
      icon: "🥋",
    },
  });
  try {
    await session.sendMessage(
      "dojopop-global",
      "Welcome to DojoPop Global — encrypted practice chat for the DojoPop community.",
    );
  } catch (error) {
    console.warn("Welcome message post failed (group created locally):", error);
  }
}

const gid = session.deriveGroupId(group.state);
const payload = {
  alias: "dojopop-global",
  gid,
  name: "DojoPop Global",
  description: "Encrypted global channel for DojoPop practitioners",
  icon: "🥋",
  coordinatorPubkey: coordinator,
  relays,
  adminPubkey: session.stablePubkey,
  createdAt: new Date().toISOString(),
};

writeFileSync(outputPath, JSON.stringify(payload, null, 2) + "\n");
console.log(JSON.stringify(payload, null, 2));
await session.disconnect();
TS

echo "==> Creating DojoPop Global group..."
OUTPUT_PATH="$OUTPUT" \
  CORDN_COORDINATOR_PUBKEY="$COORDINATOR_PUBKEY" \
  CORDN_RELAYS="$RELAYS" \
  DOJOPOP_CORDN_ADMIN_PRIVATE_KEY="$DOJOPOP_CORDN_ADMIN_PRIVATE_KEY" \
  node --experimental-strip-types bootstrap-dojopop-global.mts

echo "==> Wrote ${OUTPUT}"
