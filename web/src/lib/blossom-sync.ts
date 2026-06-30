import { promises as fs } from "fs";
import http from "http";
import { collectWhitelistHexPubkeys } from "@/lib/relay-sync";

const BLOSSOM_CONTAINER = process.env.BLOSSOM_CONTAINER_NAME || "dojopop-blossom";

function blossomConfigPath(): string {
  return process.env.BLOSSOM_CONFIG_PATH || "/blossom/config.yml";
}

function renderPubkeyList(pubkeys: string[], indent = "        "): string {
  return pubkeys.map((pk) => `${indent}- "${pk}"`).join("\n");
}

function renderStorageRules(pubkeys: string[]): string {
  const list = renderPubkeyList(pubkeys);
  return `    - type: "video/*"
      expiration: 10 years
      pubkeys:
${list}
    - type: "image/*"
      expiration: 10 years
      pubkeys:
${list}`;
}

export async function updateBlossomConfigYaml(pubkeys: string[]): Promise<void> {
  const configPath = blossomConfigPath();
  const raw = await fs.readFile(configPath, "utf8");
  const replacement = renderStorageRules(pubkeys);
  const pattern =
    /    - type: "video\/\*"[\s\S]*?    - type: "image\/\*"[\s\S]*?pubkeys:\n(?:        - "[0-9a-f]+"\n)+/m;

  if (!pattern.test(raw)) {
    throw new Error(`Blossom storage rules block not found in ${configPath}`);
  }

  const updated = raw.replace(pattern, `${replacement}\n`);
  await fs.writeFile(configPath, updated);
}

function restartBlossomViaDockerSocket(): Promise<void> {
  const socketPath = process.env.DOCKER_SOCKET || "/var/run/docker.sock";
  const path = `/containers/${BLOSSOM_CONTAINER}/restart?t=10`;

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
              `blossom restart failed (${res.statusCode}): ${body || "no body"}`
            )
          );
        });
      }
    );
    req.on("error", reject);
    req.end();
  });
}

export interface BlossomSyncResult {
  pubkeys: string[];
  memberCount: number;
  restarted: boolean;
  configPath: string;
}

export async function syncBlossomWhitelist(): Promise<BlossomSyncResult> {
  const pubkeys = await collectWhitelistHexPubkeys();
  const configPath = blossomConfigPath();

  await updateBlossomConfigYaml(pubkeys);

  let restarted = false;
  try {
    await restartBlossomViaDockerSocket();
    restarted = true;
  } catch (e) {
    console.error(
      "blossom-sync: config updated but container restart failed — run sync-blossom-whitelist.mjs manually",
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
