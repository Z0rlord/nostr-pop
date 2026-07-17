#!/usr/bin/env bash
# Add a member to DojoPop Global by key-package ref (server-side admin).
# Usage: doppler run -- ./add-member.sh <kp_ref>
set -euo pipefail
KP_REF="${1:?kp_ref required}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG="${SCRIPT_DIR}/dojopop-global.json"
COORDINATOR="$(python3 -c "import json; print(json.load(open('$CONFIG'))['coordinatorPubkey'])")"
RELAYS="$(python3 -c "import json; print(','.join(json.load(open('$CONFIG'))['relays']))")"
GID="$(python3 -c "import json; print(json.load(open('$CONFIG'))['gid'])")"

if [[ -z "${DOJOPOP_CORDN_ADMIN_PRIVATE_KEY:-}" ]]; then
  echo "ERROR: DOJOPOP_CORDN_ADMIN_PRIVATE_KEY not set" >&2
  exit 1
fi

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
git clone --depth 1 https://github.com/Z0rlord/cordn "$WORK"
cd "$WORK"
npm install --ignore-scripts 2>/dev/null || npm install

cat > add-member.mts <<TS
import { readFileSync } from "node:fs";
import { CliSession } from "./src/cli/session.ts";

const config = JSON.parse(readFileSync("${CONFIG}", "utf8"));
const kpRef = process.argv[2]!;

const session = new CliSession({
  privateKey: process.env.DOJOPOP_CORDN_ADMIN_PRIVATE_KEY!,
  serverPubkey: config.coordinatorPubkey,
  relays: config.relays,
});

await session.generateKeyPackage("admin", { localOnly: true }).catch(() => {});
let group = session.listGroups().find((g) => g.alias === config.alias);
if (!group) {
  throw new Error("Admin is not in dojopop-global — run bootstrap-global.sh first");
}
await session.useGroup(config.alias);
const result = await session.addMember(config.alias, kpRef);
console.log(JSON.stringify({ ok: true, keyPackageReference: result.keyPackageReference }));
await session.disconnect();
TS

node --experimental-strip-types add-member.mts "$KP_REF"
