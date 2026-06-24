import { ADMIN_PUBKEY_HEX } from "./nostr";

export const NIP05_DOMAIN = "dojopop.live";

/** Lowercase NIP-05 local-part → hex pubkey (NIP-05). */
export const NIP05_NAMES: Record<string, string> = {
  z0rlord: ADMIN_PUBKEY_HEX,
};

/** Optional relay hints per pubkey (NIP-05). */
export const NIP05_RELAYS: Record<string, string[]> = {
  [ADMIN_PUBKEY_HEX]: [
    "wss://relay.dojopop.live",
    "wss://relay.primal.net",
    "wss://relay.damus.io",
  ],
};
