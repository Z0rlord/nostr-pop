import { getPublicKey, nip19 } from "nostr-tools";
import { hexToBytes } from "nostr-tools/utils";

/** Primary: login-bot key used for nostu.be practice mirrors + DM login. */
const LOGIN_NSEC_ENV = "DOJOPOP_LOGIN_NSEC";
/** Optional transition fallback only — prefer LOGIN_NSEC. */
const ADMIN_NSEC_ENV = "DOJOPOP_ADMIN_NSEC";
const LEGACY_ADMIN_KEY_ENV = "DOJO_ADMIN_PRIVATE_KEY";

function publisherSecretRaw(): string | undefined {
  return (
    process.env[LOGIN_NSEC_ENV]?.trim() ||
    process.env[ADMIN_NSEC_ENV]?.trim() ||
    process.env[LEGACY_ADMIN_KEY_ENV]?.trim()
  );
}

/** nostu.be mirror signing key (`DOJOPOP_LOGIN_NSEC` preferred). */
export function loadPublisherSecretKey(): Uint8Array {
  const raw = publisherSecretRaw();
  if (!raw) {
    throw new Error(
      `Publisher key not configured (set ${LOGIN_NSEC_ENV} in Doppler).`
    );
  }
  if (raw.startsWith("nsec1")) {
    const decoded = nip19.decode(raw);
    if (decoded.type !== "nsec") {
      throw new Error(`Invalid publisher nsec`);
    }
    const data = decoded.data;
    if (typeof data === "string") return hexToBytes(data);
    return data;
  }
  return hexToBytes(raw.replace(/^0x/i, ""));
}

export function publisherPubkeyHex(): string {
  return getPublicKey(loadPublisherSecretKey());
}

export function publisherNpub(): string {
  return nip19.npubEncode(publisherPubkeyHex());
}

export function isPublisherConfigured(): boolean {
  return Boolean(publisherSecretRaw());
}
