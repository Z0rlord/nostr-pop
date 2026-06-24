#!/usr/bin/env node
/**
 * Sync active member pubkeys into blossom-server storage upload rules.
 * Run on relay-2 after membership changes (mirrors sync-relay-whitelist.mjs).
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
  process.env.BLOSSOM_CONFIG_PATH || "/opt/dojopop/blossom/config.yml";
const DRY_RUN = process.env.DRY_RUN === "1";

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

function renderPubkeyList(pubkeys, indent = "        ") {
  return pubkeys.map((pk) => `${indent}- "${pk}"`).join("\n");
}

function updateBlossomConfig(raw, pubkeys) {
  const videoBlock = `    - type: "video/*"
      expiration: 10 years
      pubkeys:
${renderPubkeyList(pubkeys)}
    - type: "image/*"
      expiration: 10 years
      pubkeys:
${renderPubkeyList(pubkeys)}`;

  const pattern =
    /    - type: "video\/\*"[\s\S]*?    - type: "image\/\*"[\s\S]*?pubkeys:\n(?:        - "[0-9a-f]+"\n)+/m;

  if (!pattern.test(raw)) {
    throw new Error("Could not find blossom storage rules block in config");
  }
  return raw.replace(pattern, `${videoBlock}\n`);
}

async function main() {
  const pubkeys = await loadActivePubkeys();
  console.log(`Active upload pubkeys: ${pubkeys.length}`);
  const raw = await readFile(CONFIG_PATH, "utf8");
  const next = updateBlossomConfig(raw, pubkeys);
  if (next === raw) {
    console.log("Blossom config already up to date.");
    return;
  }
  if (DRY_RUN) {
    console.log("DRY_RUN=1 — would write", CONFIG_PATH);
    console.log(next.slice(next.indexOf('type: "video/*"'), next.indexOf("upload:")));
    return;
  }
  await writeFile(CONFIG_PATH, next, "utf8");
  console.log(`Updated ${CONFIG_PATH}`);

  const CONTAINER = process.env.BLOSSOM_CONTAINER_NAME || "dojopop-blossom";
  const SOCKET = process.env.DOCKER_SOCKET || "/var/run/docker.sock";
  await new Promise((resolve, reject) => {
    const req = http.request(
      {
        socketPath: SOCKET,
        path: `/containers/${CONTAINER}/restart?t=10`,
        method: "POST",
      },
      (res) => {
        res.resume();
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) resolve();
        else reject(new Error(`docker restart ${CONTAINER} failed (${res.statusCode})`));
      }
    );
    req.on("error", reject);
    req.end();
  });
  console.log(`Restarted ${CONTAINER}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
