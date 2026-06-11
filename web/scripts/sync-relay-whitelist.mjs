#!/usr/bin/env node
/**
 * Sync active members → relay pubkey_whitelist and restart nostr-rs-relay.
 * Used by sync-relay-whitelist.sh on relay-2 and for local dry-runs.
 */
import { readFile, writeFile } from "fs/promises";
import http from "http";
import { nip19 } from "nostr-tools";

const ADMIN_HEX =
  process.env.RELAY_ADMIN_PUBKEY_HEX ||
  "b3d8544ddd5896f75ef66c210f5c0d6ded9f7925163ebcbc89e678bdc1e48c6a";
const MEMBERS_PATH =
  process.env.MEMBERSHIP_DATA_PATH ||
  process.env.MEMBERS_JSON_PATH ||
  "/app/data/members.json";
const CONFIG_PATH =
  process.env.RELAY_CONFIG_PATH || "/opt/dojopop/relay/config.toml";
const RELAY_CONTAINER = process.env.RELAY_CONTAINER_NAME || "dojopop-relay";
const DOCKER_SOCKET = process.env.DOCKER_SOCKET || "/var/run/docker.sock";
const SKIP_RESTART = process.env.SKIP_RELAY_RESTART === "1";

function decodeNpub(npub) {
  const decoded = nip19.decode(npub);
  if (decoded.type !== "npub") return null;
  const data = decoded.data;
  if (typeof data === "string") return data.toLowerCase();
  return Buffer.from(data).toString("hex").toLowerCase();
}

async function loadActivePubkeys() {
  const raw = await readFile(MEMBERS_PATH, "utf8");
  const store = JSON.parse(raw);
  const seen = new Set([ADMIN_HEX.toLowerCase()]);
  const ordered = [ADMIN_HEX.toLowerCase()];

  for (const m of store.members || []) {
    if (m.status !== "active") continue;
    const hex = decodeNpub(m.npub);
    if (!hex) {
      console.warn(`skip invalid npub: ${m.npub?.slice(0, 16)}…`);
      continue;
    }
    if (!seen.has(hex)) {
      seen.add(hex);
      ordered.push(hex);
    }
  }
  return ordered;
}

function renderWhitelist(pubkeys) {
  const lines = pubkeys.map((pk) => `  "${pk}",`);
  return `pubkey_whitelist = [\n${lines.join("\n")}\n]`;
}

async function updateConfig(pubkeys) {
  const raw = await readFile(CONFIG_PATH, "utf8");
  const pattern = /pubkey_whitelist\s*=\s*\[[\s\S]*?\]/m;
  if (!pattern.test(raw)) {
    throw new Error(`pubkey_whitelist not found in ${CONFIG_PATH}`);
  }
  await writeFile(CONFIG_PATH, raw.replace(pattern, renderWhitelist(pubkeys)));
}

function restartRelay() {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        socketPath: DOCKER_SOCKET,
        path: `/containers/${RELAY_CONTAINER}/restart?t=10`,
        method: "POST",
      },
      (res) => {
        res.resume();
        if (res.statusCode >= 200 && res.statusCode < 300) resolve();
        else reject(new Error(`docker restart HTTP ${res.statusCode}`));
      }
    );
    req.on("error", reject);
    req.end();
  });
}

const pubkeys = await loadActivePubkeys();
console.log(`==> Whitelist: admin + ${pubkeys.length - 1} active member(s)`);
pubkeys.forEach((pk) => console.log(`    ${pk}`));

await updateConfig(pubkeys);
console.log(`==> Updated ${CONFIG_PATH}`);

if (!SKIP_RESTART) {
  await restartRelay();
  console.log(`==> Restarted ${RELAY_CONTAINER}`);
} else {
  console.log("==> SKIP_RELAY_RESTART=1 — no container restart");
}
