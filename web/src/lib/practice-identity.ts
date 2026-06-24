import type { StoredNip46Session } from "@/lib/nip46-auth";
import { normalizeBunkerPointer } from "@/lib/nip46-auth";

const STORAGE_KEY = "dojopop_practice_identity";
const LEGACY_SESSION_KEY = "dojopop_practice_identity";

export type DmSession = {
  token: string;
  expiresAt: number;
};

export type PracticeIdentity = {
  pubkeyHex: string;
  npub: string;
  source: "extension" | "nip46" | "dm";
  nip46?: StoredNip46Session;
  dmSession?: DmSession;
};

function parseIdentity(raw: string): PracticeIdentity | null {
  try {
    const parsed = JSON.parse(raw) as PracticeIdentity & { source?: string };
    if (!parsed.pubkeyHex || !parsed.npub) return null;
    if (
      parsed.source !== "extension" &&
      parsed.source !== "nip46" &&
      parsed.source !== "dm"
    ) {
      return null;
    }
    if (parsed.source === "dm") {
      if (!parsed.dmSession?.token || !parsed.dmSession.expiresAt) return null;
      if (Date.now() > parsed.dmSession.expiresAt) return null;
    }
    return {
      pubkeyHex: parsed.pubkeyHex,
      npub: parsed.npub,
      source: parsed.source,
      nip46: parsed.nip46
        ? {
            ...parsed.nip46,
            bunker: normalizeBunkerPointer(parsed.nip46.bunker),
          }
        : undefined,
      dmSession: parsed.dmSession,
    };
  } catch {
    /* ignore */
  }
  return null;
}

/** Load saved identity (localStorage, with one-time sessionStorage migration). */
export function loadPracticeIdentity(): PracticeIdentity | null {
  if (typeof window === "undefined") return null;

  const fromLocal = localStorage.getItem(STORAGE_KEY);
  if (fromLocal) {
    const identity = parseIdentity(fromLocal);
    if (identity) return identity;
    localStorage.removeItem(STORAGE_KEY);
  }

  const fromSession = sessionStorage.getItem(LEGACY_SESSION_KEY);
  if (fromSession) {
    const identity = parseIdentity(fromSession);
    sessionStorage.removeItem(LEGACY_SESSION_KEY);
    if (identity) {
      savePracticeIdentity(identity);
      return identity;
    }
  }

  return null;
}

export function savePracticeIdentity(identity: PracticeIdentity): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
}

export function clearPracticeIdentity(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem(LEGACY_SESSION_KEY);
}

export function canSignPractice(identity: PracticeIdentity): boolean {
  return identity.source === "extension" || !!identity.nip46;
}

export function attachNip46Signer(
  identity: PracticeIdentity,
  nip46: StoredNip46Session
): PracticeIdentity {
  return {
    ...identity,
    nip46: {
      ...nip46,
      bunker: normalizeBunkerPointer(nip46.bunker),
    },
    source: identity.source === "extension" ? "extension" : "nip46",
  };
}
