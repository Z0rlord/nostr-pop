import { nip19 } from "nostr-tools";

declare global {
  interface Window {
    nostr?: {
      getPublicKey(): Promise<string>;
      signEvent(event: Record<string, unknown>): Promise<Record<string, unknown>>;
    };
  }
}

export async function connectNip07(): Promise<{
  pubkeyHex: string;
  npub: string;
} | null> {
  if (typeof window === "undefined" || !window.nostr?.getPublicKey) {
    return null;
  }
  const pubkeyHex = await window.nostr.getPublicKey();
  return { pubkeyHex, npub: nip19.npubEncode(pubkeyHex) };
}

export async function signEventNip07(
  template: Record<string, unknown>
): Promise<Record<string, unknown> | null> {
  if (!window.nostr?.signEvent) return null;
  return window.nostr.signEvent(template);
}

export async function publishEvent(event: Record<string, unknown>): Promise<void> {
  const { publishEventToRelay } = await import("@/lib/relay-publish");
  await publishEventToRelay(event as import("nostr-tools").Event);
}
