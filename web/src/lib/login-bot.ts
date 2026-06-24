import { getPublicKey, nip19 } from "nostr-tools";
import { hexToBytes } from "nostr-tools/utils";

/** Dedicated Nostr identity for sign-in DMs only — not the founder / pipeline key. */
export function loadLoginBotSecretKey(): Uint8Array {
  const raw = process.env.DOJOPOP_LOGIN_NSEC?.trim();
  if (!raw) {
    throw new Error(
      "DM login is not configured (set DOJOPOP_LOGIN_NSEC in Doppler)."
    );
  }
  if (raw.startsWith("nsec1")) {
    const decoded = nip19.decode(raw);
    if (decoded.type !== "nsec") {
      throw new Error("Invalid DOJOPOP_LOGIN_NSEC");
    }
    const data = decoded.data;
    if (typeof data === "string") return hexToBytes(data);
    return data;
  }
  return hexToBytes(raw.replace(/^0x/, ""));
}

export function loginBotPubkeyHex(): string {
  const fromEnv = process.env.DOJOPOP_LOGIN_NPUB?.trim();
  if (fromEnv?.startsWith("npub1")) {
    const decoded = nip19.decode(fromEnv);
    if (decoded.type === "npub" && typeof decoded.data === "string") {
      return decoded.data;
    }
  }
  return getPublicKey(loadLoginBotSecretKey());
}

export function loginBotNpub(): string {
  return nip19.npubEncode(loginBotPubkeyHex());
}
