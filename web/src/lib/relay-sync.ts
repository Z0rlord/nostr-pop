import { promises as fs } from "fs";
import http from "http";
import { listActiveMembers } from "@/lib/membership";
import { ADMIN_PUBKEY_HEX, decodeNpubToHex } from "@/lib/nostr";
import { listSchools, staffNpubs } from "@/lib/schools";

const RELAY_CONTAINER = process.env.RELAY_CONTAINER_NAME || "dojopop-relay";

function relayConfigPath(): string {
  return process.env.RELAY_CONFIG_PATH || "/relay/config.toml";
}

export async function collectWhitelistHexPubkeys(): Promise<string[]> {
  const admin = process.env.RELAY_ADMIN_PUBKEY_HEX || ADMIN_PUBKEY_HEX;
  const seen = new Set<string>([admin.toLowerCase()]);
  const ordered = [admin.toLowerCase()];

  const schools = await listSchools();
  for (const school of schools) {
    for (const npub of staffNpubs(school)) {
      const hex = decodeNpubToHex(npub);
      if (!hex) continue;
      const normalized = hex.toLowerCase();
      if (!seen.has(normalized)) {
        seen.add(normalized);
        ordered.push(normalized);
      }
    }
  }

  const members = await listActiveMembers();
  for (const member of members) {
    const hex = decodeNpubToHex(member.npub);
    if (!hex) {
      console.warn(`relay-sync: skip invalid npub ${member.npub.slice(0, 12)}…`);
      continue;
    }
    const normalized = hex.toLowerCase();
    if (!seen.has(normalized)) {
      seen.add(normalized);
      ordered.push(normalized);
    }
  }
  return ordered;
}

export function renderWhitelistToml(pubkeys: string[]): string {
  const lines = pubkeys.map((pk) => `  "${pk}",`);
  return `pubkey_whitelist = [\n${lines.join("\n")}\n]`;
}

export async function updateRelayConfigToml(pubkeys: string[]): Promise<void> {
  const configPath = relayConfigPath();
  const raw = await fs.readFile(configPath, "utf8");
  const replacement = renderWhitelistToml(pubkeys);
  const pattern = /pubkey_whitelist\s*=\s*\[[\s\S]*?\]/m;

  if (!pattern.test(raw)) {
    throw new Error(`pubkey_whitelist block not found in ${configPath}`);
  }

  const updated = raw.replace(pattern, replacement);
  await fs.writeFile(configPath, updated);
}

function restartRelayViaDockerSocket(): Promise<void> {
  const socketPath = process.env.DOCKER_SOCKET || "/var/run/docker.sock";
  const path = `/containers/${RELAY_CONTAINER}/restart?t=10`;

  return new Promise((resolve, reject) => {
    const req = http.request(
      { socketPath, path, method: "POST", headers: { "Content-Type": "application/json" } },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve();
            return;
          }
          const body = Buffer.concat(chunks).toString("utf8").slice(0, 300);
          reject(
            new Error(
              `docker restart failed (${res.statusCode}): ${body || "no body"}`
            )
          );
        });
      }
    );
    req.on("error", reject);
    req.end();
  });
}

export interface SyncResult {
  pubkeys: string[];
  memberCount: number;
  restarted: boolean;
  configPath: string;
}

export async function syncRelayWhitelist(): Promise<SyncResult> {
  const pubkeys = await collectWhitelistHexPubkeys();
  const configPath = relayConfigPath();

  await updateRelayConfigToml(pubkeys);

  let restarted = false;
  try {
    await restartRelayViaDockerSocket();
    restarted = true;
  } catch (e) {
    console.error(
      "relay-sync: config updated but container restart failed — run sync-relay-whitelist.sh manually",
      e
    );
  }

  return {
    pubkeys,
    memberCount: pubkeys.length - 1,
    restarted,
    configPath,
  };
}
