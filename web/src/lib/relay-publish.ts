import type { Event } from "nostr-tools";
import { SimplePool } from "nostr-tools/pool";
import { PUBLISH_RELAYS, RELAY_URL } from "@/lib/constants";

function relayError(reason: unknown): string {
  if (reason instanceof Error) return reason.message;
  if (typeof reason === "string") return reason;
  return "unknown reason";
}

export async function publishEventToRelay(event: Event): Promise<void> {
  const pool = new SimplePool();
  const relays = [...PUBLISH_RELAYS];
  try {
    const pubs = pool.publish(relays, event);
    const results = await Promise.allSettled(pubs);
    const primaryIdx = relays.indexOf(RELAY_URL);
    const primary = results[primaryIdx];

    if (primary?.status === "rejected") {
      throw new Error(`Relay rejected the event: ${relayError(primary.reason)}`);
    }
    if (primary?.status !== "fulfilled") {
      throw new Error("DojoPop relay did not accept the event.");
    }
  } finally {
    pool.close(relays);
  }
}
