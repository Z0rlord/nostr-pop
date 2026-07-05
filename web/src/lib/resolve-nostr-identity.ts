import { nip19 } from "nostr-tools";
import { queryProfile } from "nostr-tools/nip05";
import { NIP05_DOMAIN, NIP05_NAMES } from "./nip05";
import {
  assertPublicIdentityInput,
  decodeNpubToHex,
  isValidNpub,
  NIP05_INPUT_PATTERN,
} from "./nostr";

export type ResolvedNostrIdentity = {
  pubkeyHex: string;
  npub: string;
  displayInput: string;
};

function lookupLocalNip05(fullname: string): string | null {
  if (!NIP05_INPUT_PATTERN.test(fullname)) return null;
  const at = fullname.lastIndexOf("@");
  const name = fullname.slice(0, at).toLowerCase();
  const domain = fullname.slice(at + 1).toLowerCase();
  if (domain !== NIP05_DOMAIN) return null;
  return NIP05_NAMES[name] ?? null;
}

export async function resolveNostrIdentity(
  input: string
): Promise<ResolvedNostrIdentity> {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error("Enter a npub or NIP-05 address (name@domain).");
  }
  assertPublicIdentityInput(trimmed);

  if (isValidNpub(trimmed)) {
    const pubkeyHex = decodeNpubToHex(trimmed);
    if (!pubkeyHex) {
      throw new Error("Invalid npub.");
    }
    return { pubkeyHex, npub: trimmed, displayInput: trimmed };
  }

  if (!NIP05_INPUT_PATTERN.test(trimmed)) {
    throw new Error(
      "Enter a valid npub (npub1…) or NIP-05 address (name@domain)."
    );
  }

  const localPubkey = lookupLocalNip05(trimmed);
  if (localPubkey) {
    return {
      pubkeyHex: localPubkey,
      npub: nip19.npubEncode(localPubkey),
      displayInput: trimmed,
    };
  }

  const profile = await queryProfile(trimmed);
  if (!profile?.pubkey) {
    throw new Error(
      `NIP-05 address not verified or not found: ${trimmed}. Check spelling and that your profile lists this identifier.`
    );
  }

  return {
    pubkeyHex: profile.pubkey,
    npub: nip19.npubEncode(profile.pubkey),
    displayInput: trimmed,
  };
}
