import { verifyEvent, type Event } from "nostr-tools";
import { verifyDmSessionToken } from "@/lib/dm-login-server";

export class PracticeAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PracticeAuthError";
  }
}

function parseNostrAuthEvent(header: string | null): Event {
  if (!header?.startsWith("Nostr ")) {
    throw new PracticeAuthError("Missing authorization");
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
    throw new PracticeAuthError("Malformed authorization");
  }
  if (!verifyEvent(event)) {
    throw new PracticeAuthError("Invalid signature");
  }
  return event;
}

function assertHttpAuthEvent(event: Event, req: Request): void {
  if (event.kind !== 27235) {
    throw new PracticeAuthError("Invalid auth event kind");
  }
  const now = Math.floor(Date.now() / 1000);
  if (event.created_at < now - 300 || event.created_at > now + 60) {
    throw new PracticeAuthError("Authorization expired — try again");
  }
  const method = event.tags.find((t) => t[0] === "method")?.[1]?.toUpperCase();
  if (method && method !== req.method.toUpperCase()) {
    throw new PracticeAuthError("Authorization method mismatch");
  }
  const urlTag = event.tags.find((t) => t[0] === "u")?.[1];
  if (urlTag) {
    const expected = new URL(req.url);
    const tagged = new URL(urlTag, expected.origin);
    if (
      tagged.origin !== expected.origin ||
      tagged.pathname !== expected.pathname
    ) {
      throw new PracticeAuthError("Authorization URL mismatch");
    }
  }
}

/** Verify DM session or NIP-98 HTTP auth for the given pubkey. */
export function assertPracticeIdentityAuth(
  req: Request,
  pubkeyHex: string
): void {
  const normalized = pubkeyHex.toLowerCase();
  const session = req.headers.get("x-dojopop-session");
  if (session && verifyDmSessionToken(session, normalized)) {
    return;
  }

  const authHeader = req.headers.get("authorization");
  if (authHeader) {
    const event = parseNostrAuthEvent(authHeader);
    if (event.pubkey.toLowerCase() !== normalized) {
      throw new PracticeAuthError("Pubkey mismatch");
    }
    assertHttpAuthEvent(event, req);
    return;
  }

  throw new PracticeAuthError("Sign in required to edit passport");
}
