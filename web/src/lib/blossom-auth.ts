import { nip19, verifyEvent, type Event } from "nostr-tools";
import { findMemberByNpub } from "@/lib/membership";

export class UploadAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UploadAuthError";
  }
}

export function parseNostrAuthHeader(header: string | null): Event {
  if (!header?.startsWith("Nostr ")) {
    throw new UploadAuthError("Missing upload authorization");
  }
  let event: Event;
  try {
    const raw = header.slice(6).trim();
    const json =
      typeof Buffer !== "undefined"
        ? Buffer.from(raw, "base64").toString("utf8")
        : atob(raw);
    event = JSON.parse(json) as Event;
  } catch {
    throw new UploadAuthError("Malformed upload authorization");
  }
  if (!verifyEvent(event)) {
    throw new UploadAuthError("Invalid upload signature");
  }
  if (event.kind !== 24242) {
    throw new UploadAuthError("Invalid upload auth event");
  }
  const exp = event.tags.find((t) => t[0] === "expiration")?.[1];
  if (exp && Number(exp) < Math.floor(Date.now() / 1000)) {
    throw new UploadAuthError("Upload authorization expired — try again");
  }
  return event;
}

export async function assertActiveMemberPubkey(pubkeyHex: string): Promise<void> {
  const npub = nip19.npubEncode(pubkeyHex);
  const member = await findMemberByNpub(npub);
  if (!member || member.status !== "active") {
    throw new UploadAuthError("Active DojoPop membership required to upload");
  }
}
