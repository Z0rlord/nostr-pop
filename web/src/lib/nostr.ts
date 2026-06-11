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
