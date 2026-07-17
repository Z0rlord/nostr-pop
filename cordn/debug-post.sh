#!/usr/bin/env bash
# Debug PostGroupMessage against live coordinator (prints raw MCP result).
set -euo pipefail
RELAYS="${CORDN_RELAYS:-wss://relay.primal.net,wss://nos.lol}"
COORDINATOR="${CORDN_COORDINATOR_PUBKEY:-d969813a5c0e3e65dad03fc9e1d2db5933dda8b307ddce474e8da60b4e288259}"

if [[ -z "${DOJOPOP_CORDN_ADMIN_PRIVATE_KEY:-}" ]]; then
  echo "ERROR: DOJOPOP_CORDN_ADMIN_PRIVATE_KEY required" >&2
  exit 1
fi

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
git clone --depth 1 https://github.com/Z0rlord/cordn "$WORK" >/dev/null 2>&1
cd "$WORK"
npm install --ignore-scripts >/dev/null 2>&1

cat > debug-post.mts <<'TS'
import { CliSession } from "./src/cli/session.ts";
import { cordnClient } from "./src/cli/coordinatorClient.ts";

const privateKey = process.env.DOJOPOP_CORDN_ADMIN_PRIVATE_KEY!;
const coordinator = process.env.CORDN_COORDINATOR_PUBKEY!;
const relays = process.env.CORDN_RELAYS!.split(",").map((r) => r.trim()).filter(Boolean);

const client = new cordnClient({
  privateKey,
  serverPubkey: coordinator,
  relays,
});
await client.stableConnected;
await client.ephemeralConnected;

const session = new CliSession({ privateKey, serverPubkey: coordinator, relays });
await session.generateKeyPackage("dbg", { localOnly: true });
const group = await session.createGroup("dbg-post", {
  metadata: { name: "debug", icon: "🔧" },
});
const gid = session.deriveGroupId(group.state);
console.log("gid", gid);

// Log raw MCP tool results
const ephClient = (client as any).ephemeralClient;
const orig = ephClient.callTool.bind(ephClient);
ephClient.callTool = async (req: unknown, ...rest: unknown[]) => {
  console.log("callTool req", JSON.stringify(req).slice(0, 200));
  const result = await orig(req, ...rest);
  console.log("callTool result", JSON.stringify(result, null, 2).slice(0, 2000));
  return result;
};

try {
  const msg = await session.sendMessage("dbg-post", "hello coordinator");
  console.log("SUCCESS", { cursor: msg.cursor, id: msg.id });
} catch (e) {
  console.error("sendMessage failed:", e);
}

await client.disconnect();
await session.disconnect();
TS

CORDN_COORDINATOR_PUBKEY="$COORDINATOR" \
  CORDN_RELAYS="$RELAYS" \
  DOJOPOP_CORDN_ADMIN_PRIVATE_KEY="$DOJOPOP_CORDN_ADMIN_PRIVATE_KEY" \
  node --experimental-strip-types debug-post.mts
