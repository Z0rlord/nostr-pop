import { nip19 } from "nostr-tools";

export const ADMIN_NPUB =
  "npub1k0v9gnwatzt0whhkdsss7hqddhke77f9zclte0yfueutms0y334qg380wg";

export const ADMIN_PUBKEY_HEX =
  "b3d8544ddd5896f75ef66c210f5c0d6ded9f7925163ebcbc89e678bdc1e48c6a";

export function isValidNpub(npub: string): boolean {
  if (!npub.startsWith("npub1")) return false;
  if (npub.length < 59 || npub.length > 64) return false;
  return /^npub1[a-z0-9]+$/.test(npub);
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** NIP-05 identifier with required local part and dotted domain (e.g. name@domain.tld). */
export const NIP05_INPUT_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function isValidNip05Input(input: string): boolean {
  return NIP05_INPUT_PATTERN.test(input.trim());
}

/** True for nsec / ncryptsec bech32 — must never be accepted in login forms. */
export function isPrivateKeyInput(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed) return false;
  const lower = trimmed.toLowerCase();
  if (lower.startsWith("nsec1") || lower.startsWith("ncryptsec1")) {
    return true;
  }
  try {
    const decoded = nip19.decode(trimmed);
    return decoded.type === "nsec";
  } catch {
    return false;
  }
}

/** Raw 64-char hex is ambiguous; reject with guidance (often a pasted secret key). */
export function isRawHexKeyInput(input: string): boolean {
  return /^[0-9a-fA-F]{64}$/.test(input.trim());
}

export const PRIVATE_KEY_INPUT_MESSAGE =
  "Use your npub or NIP-05 address — never your private key (nsec).";

export const RAW_HEX_KEY_INPUT_MESSAGE =
  "This looks like a raw hex key. Use your npub or NIP-05 — never a private key.";

export function assertPublicIdentityInput(input: string): void {
  const trimmed = input.trim();
  if (isPrivateKeyInput(trimmed)) {
    throw new Error(PRIVATE_KEY_INPUT_MESSAGE);
  }
  if (isRawHexKeyInput(trimmed)) {
    throw new Error(RAW_HEX_KEY_INPUT_MESSAGE);
  }
}

export function isValidNostrIdentityInput(input: string): boolean {
  const trimmed = input.trim();
  if (isPrivateKeyInput(trimmed) || isRawHexKeyInput(trimmed)) {
    return false;
  }
  return isValidNpub(trimmed) || isValidNip05Input(trimmed);
}

export function decodeNpubToHex(npub: string): string | null {
  if (!isValidNpub(npub)) return null;
  try {
    const decoded = nip19.decode(npub);
    if (decoded.type !== "npub") return null;
    const data = decoded.data;
    if (typeof data === "string") return data;
    return Buffer.from(data).toString("hex");
  } catch {
    return null;
  }
}
