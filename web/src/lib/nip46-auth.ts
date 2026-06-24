import { nip19 } from "nostr-tools";
import {
  BunkerSigner,
  createNostrConnectURI,
  parseBunkerInput,
  type BunkerPointer,
} from "nostr-tools/nip46";
import { NostrConnect } from "nostr-tools/kinds";
import { decrypt, getConversationKey } from "nostr-tools/nip44";
import { generateSecretKey, getPublicKey } from "nostr-tools/pure";
import { SimplePool } from "nostr-tools/pool";
import { bytesToHex, hexToBytes } from "nostr-tools/utils";
import { appUrl } from "@/lib/constants";

/** Relays Primal + most NIP-46 signers use. Never use relay.dojopop.live (blocks kind 24133). */
export const NIP46_RELAYS = [
  "wss://relay.primal.net",
  "wss://purplepag.es",
  "wss://nos.lol",
  "wss://relay.damus.io",
];

export const NIP46_CONNECT_TIMEOUT_MS = 120_000;
export const NIP46_RECONNECT_TIMEOUT_MS = 8_000;
/** Per sign_event / connect wait — Primal must approve on the phone (large uploads may need two approvals). */
export const NIP46_SIGN_TIMEOUT_MS = 300_000;

const BLOCKED_NIP46_RELAY = /relay\.dojopop\.live/i;

export type Nip46SignerHooks = {
  /** Fires when Primal needs an in-app approval (open this URL on the phone). */
  onAuthUrl?: (url: string) => void;
};

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message: string
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

export type Nip46RelayStatus = {
  connected: string[];
  failed: string[];
};

export type StoredNip46Session = {
  clientSecretKeyHex: string;
  bunker: BunkerPointer;
};

/** Primal / NIP-46: nostrconnect secrets are single-use — never resend a stored secret. */
export function isStaleNip46SessionError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("new secret") ||
    lower.includes("old secret") ||
    lower.includes("not open anymore")
  );
}

/** Drop relays that block NIP-46 (kind 24133) and merge Primal-friendly defaults. */
export function normalizeBunkerPointer(bunker: BunkerPointer): BunkerPointer {
  const mergedRelays = Array.from(
    new Set([
      ...bunker.relays.filter((r) => !BLOCKED_NIP46_RELAY.test(r)),
      ...NIP46_RELAYS,
    ])
  );
  return {
    ...bunker,
    relays: mergedRelays.length > 0 ? mergedRelays : [...NIP46_RELAYS],
    // nostrconnect secrets are single-use — never persist or resend after sign-in.
    secret: bunker.secret ?? null,
  };
}

function openBunkerSigner(
  clientSecretKey: Uint8Array,
  bunker: BunkerPointer,
  pool: SimplePool,
  hooks?: Nip46SignerHooks,
  options?: { skipSwitchRelays?: boolean }
): BunkerSigner {
  const bp = normalizeBunkerPointer(bunker);
  return BunkerSigner.fromBunker(clientSecretKey, bp, {
    pool,
    skipSwitchRelays: options?.skipSwitchRelays ?? true,
    onauth: (url) => openSignerApprovalUrl(url, hooks),
  });
}

async function ensureBunkerSession(
  signer: BunkerSigner,
  signLabel?: string
): Promise<void> {
  const label = signLabel ?? "connection";
  if (signer.bp.secret) {
    signer.bp = { ...signer.bp, secret: null };
  }
  try {
    await withTimeout(signer.ping(), 12_000, "ping");
    return;
  } catch {
    /* ping failed — wake Primal with connect (empty secret, not nostrconnect token) */
  }
  await withTimeout(
    signer.connect(),
    90_000,
    `Timed out waiting for Primal to approve the ${label}. Open Primal on your phone, approve, then try again.`
  );
  try {
    await withTimeout(
      Promise.race([
        signer.switchRelays(),
        new Promise<void>((resolve) => setTimeout(resolve, 2_500)),
      ]),
      4_000,
      "relay switch"
    );
  } catch {
    /* optional */
  }
}

function randomConnectSecret(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

function toIdentity(pubkeyHex: string, session: StoredNip46Session) {
  return {
    pubkeyHex,
    npub: nip19.npubEncode(pubkeyHex),
    source: "nip46" as const,
    nip46: session,
  };
}

function connectSecretMatched(payload: unknown, secret: string): boolean {
  if (!payload || typeof payload !== "object") return false;
  const row = payload as Record<string, unknown>;
  if (row.result === secret) return true;
  if (Array.isArray(row.params) && row.params.some((p) => p === secret)) return true;
  if (row.result && typeof row.result === "object") {
    const nested = row.result as Record<string, unknown>;
    if (nested.secret === secret) return true;
  }
  return false;
}

/** Start a NIP-46 nostrconnect:// session; show `connectionUri` as QR before awaiting. */
export function beginNostrConnectSession() {
  const clientSecretKey = generateSecretKey();
  const clientPubkey = getPublicKey(clientSecretKey);
  const secret = randomConnectSecret();
  const uri = new URL(
    createNostrConnectURI({
      clientPubkey,
      relays: NIP46_RELAYS,
      secret,
      name: "DojoPop",
      url: appUrl(),
      perms: ["get_public_key", "sign_event"],
    })
  );
  uri.searchParams.set(
    "metadata",
    JSON.stringify({
      name: "DojoPop",
      url: appUrl(),
      description: "Sign in to your DojoPop practice log",
    })
  );
  return { clientSecretKey, connectionUri: uri.toString() };
}

export async function waitForNostrConnectSession(
  clientSecretKey: Uint8Array,
  connectionUri: string,
  signal: AbortSignal,
  onAuthUrl?: (url: string) => void,
  onRelayStatus?: (status: Nip46RelayStatus) => void
) {
  const uri = new URL(connectionUri);
  const relays = uri.searchParams.getAll("relay");
  const secret = uri.searchParams.get("secret");
  if (!secret) throw new Error("Invalid Nostr Connect URI (missing secret)");

  const clientPubkey = getPublicKey(clientSecretKey);
  const relayStatus: Nip46RelayStatus = { connected: [], failed: [] };
  const reportStatus = () => onRelayStatus?.({ ...relayStatus });

  const pool = new SimplePool({ enableReconnect: true });

  await Promise.all(
    relays.map(async (relay) => {
      try {
        await pool.ensureRelay(relay);
        relayStatus.connected.push(relay);
      } catch {
        relayStatus.failed.push(relay);
      }
    })
  );
  reportStatus();
  if (relayStatus.connected.length === 0) {
    pool.close(relays);
    throw new Error(
      "Could not reach Nostr relays from this browser. Try another network, disable ad blockers, or use the bunker link option."
    );
  }

  try {
    const signer = await new Promise<BunkerSigner>((resolve, reject) => {
      let settled = false;
      const finish = (fn: () => void) => {
        if (settled) return;
        settled = true;
        fn();
      };

      const onAbort = () =>
        finish(() =>
          reject(
            new Error(
              relayStatus.connected.length === 0
                ? "Could not reach Nostr relays from this browser. Try another network or use the bunker link option."
                : "Timed out waiting for Primal to approve. Refresh the QR and try again."
            )
          )
        );
      signal.addEventListener("abort", onAbort, { once: true });

      const sub = pool.subscribe(
        relays,
        {
          kinds: [NostrConnect],
          "#p": [clientPubkey],
          since: Math.floor(Date.now() / 1000) - 30,
        },
        {
          onevent: async (event) => {
            try {
              const convKey = getConversationKey(clientSecretKey, event.pubkey);
              const payload = JSON.parse(decrypt(event.content, convKey));
              if (!connectSecretMatched(payload, secret)) return;

              sub.close();
              const remote = BunkerSigner.fromBunker(
                clientSecretKey,
                {
                  pubkey: event.pubkey,
                  relays,
                  secret,
                },
                {
                  pool,
                  skipSwitchRelays: true,
                  onauth: (url) => {
                    onAuthUrl?.(url);
                    window.open(url, "_blank", "noopener,noreferrer");
                  },
                }
              );
              finish(() => resolve(remote));
            } catch {
              /* ignore unrelated 24133 traffic */
            }
          },
          // Do not reject when a single relay drops — wait for abort or a valid signer event.
          onclose: () => {},
          abort: signal,
        }
      );
    });

    const pubkeyHex = await signer.getPublicKey();
    const session: StoredNip46Session = {
      clientSecretKeyHex: bytesToHex(clientSecretKey),
      bunker: normalizeBunkerPointer({ ...signer.bp, secret: null }),
    };
    await signer.close();
    return toIdentity(pubkeyHex, session);
  } finally {
    pool.close(relays);
  }
}

export async function connectViaBunkerInput(input: string) {
  const bunker = await parseBunkerInput(input.trim());
  if (!bunker) {
    throw new Error("Invalid bunker or NIP-05 identifier");
  }

  const clientSecretKey = generateSecretKey();
  const pool = new SimplePool({ enableReconnect: true });
  const relays = bunker.relays.length > 0 ? bunker.relays : NIP46_RELAYS;
  try {
    const signer = BunkerSigner.fromBunker(
      clientSecretKey,
      { ...bunker, relays },
      {
        pool,
        skipSwitchRelays: true,
        onauth: (url) => window.open(url, "_blank", "noopener,noreferrer"),
      }
    );
    await signer.connect();
    const pubkeyHex = await signer.getPublicKey();
    const session: StoredNip46Session = {
      clientSecretKeyHex: bytesToHex(clientSecretKey),
      bunker: normalizeBunkerPointer({ ...signer.bp, secret: null }),
    };
    await signer.close();
    return toIdentity(pubkeyHex, session);
  } finally {
    pool.close(relays);
  }
}

/** Open Primal / remote-signer approval — window.open is often blocked on iOS Safari. */
export function openSignerApprovalUrl(url: string, hooks?: Nip46SignerHooks) {
  hooks?.onAuthUrl?.(url);
  try {
    const opened = window.open(url, "_blank", "noopener,noreferrer");
    if (!opened) {
      const link = document.createElement("a");
      link.href = url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
  } catch {
    hooks?.onAuthUrl?.(url);
  }
}

function wrapSigner(
  signer: BunkerSigner,
  hooks?: Nip46SignerHooks,
  label = "signing request"
): BunkerSigner {
  const original = signer.signEvent.bind(signer);
  signer.signEvent = (template) =>
    withTimeout(
      original(template),
      NIP46_SIGN_TIMEOUT_MS,
      `Timed out waiting for Primal to approve the ${label}. Open Primal on your phone, approve, then try again.`
    );
  return signer;
}

/** Open a short-lived bunker signer (extension-like sign_event for uploads). */
export async function withNip46Signer<T>(
  session: StoredNip46Session,
  fn: (signer: BunkerSigner) => Promise<T>,
  hooks?: Nip46SignerHooks,
  signLabel?: string
): Promise<T> {
  const clientSecretKey = hexToBytes(session.clientSecretKeyHex);
  const bunker = normalizeBunkerPointer(session.bunker);
  const relays = bunker.relays;
  const pool = new SimplePool({ enableReconnect: true });

  const connected: string[] = [];
  await Promise.all(
    relays.map(async (relay) => {
      try {
        await pool.ensureRelay(relay);
        connected.push(relay);
      } catch {
        /* ignore single relay failure */
      }
    })
  );
  if (connected.length === 0) {
    pool.close(relays);
    throw new Error(
      "Could not reach Nostr relays from this browser. Check your network or ad blockers, then try again."
    );
  }

  const signer = openBunkerSigner(clientSecretKey, bunker, pool, hooks);
  wrapSigner(signer, hooks, signLabel);
  try {
    await ensureBunkerSession(signer, signLabel ?? "connection");
    return await fn(signer);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (isStaleNip46SessionError(msg)) {
      throw new Error(
        "Your Primal session expired. Sign out, then sign in again with Remote Login before publishing."
      );
    }
    if (msg.toLowerCase().includes("timed out")) {
      throw new Error(
        "Timed out waiting for Primal. Open Primal on your phone, approve the signing request, then tap Upload again — or sign out and sign in fresh."
      );
    }
    if (
      msg.toLowerCase().includes("could not reach") ||
      msg.toLowerCase().includes("not connected")
    ) {
      throw new Error(
        "Could not reach Primal. Open the app on your phone, keep it in the foreground, then tap Upload again — or sign out and sign in with Remote Login."
      );
    }
    throw e;
  } finally {
    await signer.close().catch(() => {});
    pool.close(relays);
  }
}

export async function reconnectNip46Session(session: StoredNip46Session) {
  const clientSecretKey = hexToBytes(session.clientSecretKeyHex);
  const relays =
    session.bunker.relays.length > 0 ? session.bunker.relays : NIP46_RELAYS;
  const pool = new SimplePool({ enableReconnect: true });
  const signer = openBunkerSigner(clientSecretKey, session.bunker, pool);
  try {
    const pubkeyHex = await withTimeout(
      signer.getPublicKey(),
      NIP46_RECONNECT_TIMEOUT_MS,
      "Could not reach your Primal signer — open Primal and try again."
    );
    return {
      pubkeyHex,
      npub: nip19.npubEncode(pubkeyHex),
      source: "nip46" as const,
      nip46: session,
    };
  } catch {
    return null;
  } finally {
    await signer.close().catch(() => {});
    pool.close(relays);
  }
}

/** Parse scanned remote-signer payloads (must prove key ownership). */
export async function connectViaQrPayload(text: string) {
  const value = text.trim();
  if (value.startsWith("npub1")) {
    throw new Error("NPUB_ONLY");
  }
  if (value.startsWith("bunker://") || value.includes("@")) {
    return connectViaBunkerInput(value);
  }
  if (value.startsWith("nostrconnect://")) {
    throw new Error("NOSTRCONNECT_CLIENT_URI");
  }
  throw new Error("Unrecognized QR — scan a bunker:// code from Primal Remote Login");
}
