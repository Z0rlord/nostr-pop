import { type Event } from "nostr-tools";
import { SimplePool } from "nostr-tools/pool";
import { RELAY_URL, PUBLISH_RELAYS } from "@/lib/constants";

export type NostrProfile = {
  name?: string;
  displayName?: string;
  picture?: string;
  nip05?: string;
  about?: string;
};

function parseProfileContent(event: Event): NostrProfile {
  try {
    const data = JSON.parse(event.content) as Record<string, unknown>;
    return {
      name: typeof data.name === "string" ? data.name : undefined,
      displayName:
        typeof data.display_name === "string"
          ? data.display_name
          : typeof data.displayName === "string"
            ? data.displayName
            : undefined,
      picture: typeof data.picture === "string" ? data.picture : undefined,
      nip05: typeof data.nip05 === "string" ? data.nip05 : undefined,
      about: typeof data.about === "string" ? data.about : undefined,
    };
  } catch {
    return {};
  }
}

/** Best-effort kind-0 profile from DojoPop relay + public mirrors. */
export async function fetchNostrProfile(
  pubkeyHex: string
): Promise<NostrProfile | null> {
  const pool = new SimplePool();
  const relays = [RELAY_URL, ...PUBLISH_RELAYS.filter((r) => r !== RELAY_URL)];
  try {
    const events = await pool.querySync(relays, {
      kinds: [0],
      authors: [pubkeyHex],
      limit: 3,
    });
    if (events.length === 0) return null;
    const latest = events.sort((a, b) => b.created_at - a.created_at)[0];
    return parseProfileContent(latest);
  } catch {
    return null;
  } finally {
    pool.close(relays);
  }
}

export function profileDisplayName(
  profile: NostrProfile | null | undefined,
  fallback: string
): string {
  const name = profile?.displayName?.trim() || profile?.name?.trim();
  return name || fallback;
}
