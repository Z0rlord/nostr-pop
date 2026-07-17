#!/usr/bin/env bash
set -euo pipefail
ROOT="${1:-/src}"

cp /patches/dojopop-default-servers.ts "${ROOT}/src/utils/dojopop-default-servers.ts"

node <<'NODE'
const fs = require("fs");
const path = require("path");
const root = "/src";

let text = fs.readFileSync(path.join(root, "src/utils/useUserServers.ts"), "utf8");
const needle = "import useEvent from './useEvent';";
const insert =
  needle + "\nimport { DOJOPOP_DEFAULT_BLOSSOM_SERVERS } from './dojopop-default-servers';";
if (!text.includes(needle)) throw new Error("useUserServers import anchor missing");
text = text.replace(needle, insert);

const oldServers = `  const servers = useMemo((): Server[] => {
    return [
      ...(blossomServers || []),
      ...(nip96Servers || []).map((server, index) => ({ ...server, nip96: nip96InfoQueries[index].data })),
    ];
  }, [blossomServers, nip96Servers, nip96InfoQueries]);`;

const newServers = `  const servers = useMemo((): Server[] => {
    const blossom =
      blossomServers && blossomServers.length > 0
        ? blossomServers
        : blossomServerListEvent?.isSuccess
          ? (DOJOPOP_DEFAULT_BLOSSOM_SERVERS as Server[])
          : [];
    return [
      ...blossom,
      ...(nip96Servers || []).map((server, index) => ({ ...server, nip96: nip96InfoQueries[index].data })),
    ];
  }, [blossomServers, blossomServerListEvent?.isSuccess, nip96Servers, nip96InfoQueries]);`;

if (!text.includes(oldServers)) throw new Error("useUserServers servers useMemo anchor missing");
text = text.replace(oldServers, newServers);
fs.writeFileSync(path.join(root, "src/utils/useUserServers.ts"), text);

text = fs.readFileSync(path.join(root, "src/utils/blossom.ts"), "utf8");
const oldFetch = `export async function fetchBlossomList(
  serverUrl: string,
  pubkey: string,
  signEventTemplate: (template: EventTemplate) => Promise<SignedEvent>
): Promise<BlobDescriptor[]> {
  const listAuthEvent = await createListAuth(signEventTemplate);`;

const newFetch = `export async function fetchBlossomList(
  serverUrl: string,
  pubkey: string,
  signEventTemplate: (template: EventTemplate) => Promise<SignedEvent>
): Promise<BlobDescriptor[]> {
  let listAuthEvent: SignedEvent | undefined;
  try {
    listAuthEvent = await createListAuth(signEventTemplate);
  } catch (error) {
    console.warn("Blossom list auth unavailable; trying unauthenticated list", error);
  }`;

if (!text.includes(oldFetch)) throw new Error("fetchBlossomList anchor missing");
text = text.replace(oldFetch, newFetch);
text = text.replace(
  "  const options: any = { auth: listAuthEvent };",
  "  const options: any = listAuthEvent ? { auth: listAuthEvent } : {};"
);
fs.writeFileSync(path.join(root, "src/utils/blossom.ts"), text);
console.log("applied dojopop bouquet patches");
NODE
