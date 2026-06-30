#!/usr/bin/env node
/**
 * Create pilot school: Hikari Dojo (Bartłomiej Gajowiec) — https://hikaridojo.pl
 *
 * Usage (on relay-2 or local with MEMBERSHIP_DATA_DIR):
 *   OWNER_NPUB=npub1… node scripts/seed-hikari-warsaw.mjs
 */
import { randomBytes } from "crypto";
import { promises as fs } from "fs";
import path from "path";

const SCHOOL_ID = "hikari-warsaw";
const ownerNpub = process.env.OWNER_NPUB?.trim();
const dataDir = process.env.MEMBERSHIP_DATA_DIR || path.join(process.cwd(), "data");
const storePath = path.join(dataDir, "schools.json");

if (!ownerNpub?.startsWith("npub1")) {
  console.error("Set OWNER_NPUB to Bartłomiej Gajowiec's npub");
  process.exit(1);
}

await fs.mkdir(dataDir, { recursive: true });
let store = { schools: [] };
try {
  store = JSON.parse(await fs.readFile(storePath, "utf8"));
} catch {
  /* new file */
}

if (store.schools.some((s) => s.id === SCHOOL_ID)) {
  console.log("School already exists: Hikari Dojo");
} else {
  store.schools.push({
    id: SCHOOL_ID,
    name: "Hikari Dojo",
    disciplines: ["aikido"],
    ownerNpub,
    instructorNpubs: [],
    studentNpubs: [],
    encryptionKeyHex: randomBytes(32).toString("hex"),
    createdAt: new Date().toISOString(),
  });
  await fs.writeFile(storePath, JSON.stringify(store, null, 2));
  console.log("Created school: Hikari Dojo");
}

console.log("Join QR URL: https://dojopop.live/school/hikari-warsaw/join");
console.log("Dashboard:   https://dojopop.live/school/hikari-warsaw");
console.log("Log class:   https://dojopop.live/school/hikari-warsaw/attendance");
console.log("\nNext: add OWNER_NPUB to relay whitelist and redeploy.");
