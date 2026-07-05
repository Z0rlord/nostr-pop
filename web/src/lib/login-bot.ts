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

/** Pubkey hex always derived from DOJOPOP_LOGIN_NSEC (signing identity). */
export function loginBotPubkeyHex(): string {
  return getPublicKey(loadLoginBotSecretKey());
}

function assertLoginBotNpubMatchesSecret(): void {
  const fromEnv = process.env.DOJOPOP_LOGIN_NPUB?.trim();
  if (!fromEnv?.startsWith("npub1")) return;

  const decoded = nip19.decode(fromEnv);
  if (decoded.type !== "npub" || typeof decoded.data !== "string") {
    throw new Error(
      "Invalid DOJOPOP_LOGIN_NPUB (must match pubkey from DOJOPOP_LOGIN_NSEC)."
    );
  }
  if (decoded.data !== loginBotPubkeyHex()) {
    throw new Error(
      "DOJOPOP_LOGIN_NPUB does not match DOJOPOP_LOGIN_NSEC — update Doppler so both come from generate-login-bot-key.mjs."
    );
  }
}

/** Call before signing/publishing so a stale npub env cannot break DM login. */
export function assertLoginBotConfigured(): void {
  loadLoginBotSecretKey();
  assertLoginBotNpubMatchesSecret();
}

export function loginBotNpub(): string {
  return nip19.npubEncode(loginBotPubkeyHex());
}
