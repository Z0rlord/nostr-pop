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
import { throwIfAborted, withTimeout } from "@/lib/promise-timeout";

/** Relays NIP-46 signers use (Primal, Clave, bunker46). Never relay.dojopop.live (blocks kind 24133). */
export const NIP46_RELAYS = [
  "wss://relay.powr.build",
  "wss://relay.primal.net",
  "wss://purplepag.es",
  "wss://nos.lol",
  "wss://relay.damus.io",
];

/** Primal's bunker listens here — NIP-46 fails if the browser cannot open this relay. */
export const PRIMAL_NIP46_RELAY = "wss://relay.primal.net";

export const NIP46_CONNECT_TIMEOUT_MS = 120_000;
export const NIP46_RECONNECT_TIMEOUT_MS = 8_000;
/** Per-relay WebSocket open — without this, ensureRelay can hang forever on mobile Safari. */
export const NIP46_RELAY_CONNECT_TIMEOUT_MS = 10_000;
/** Per sign_event / connect wait — Primal must approve on the phone (large uploads may need two approvals). */
export const NIP46_SIGN_TIMEOUT_MS = 300_000;

const BLOCKED_NIP46_RELAY = /relay\.dojopop\.live/i;

function normalizeRelayUrl(relay: string): string {
  try {
    const u = new URL(relay);
    u.pathname = u.pathname.replace(/\/+/g, "/").replace(/\/$/, "");
    if (u.port === "80" && u.protocol === "ws:") u.port = "";
    if (u.port === "443" && u.protocol === "wss:") u.port = "";
    return u.toString();
  } catch {
    return relay;
  }
}

/** Intersect bunker relays with relays the browser actually connected to; Primal first. */
export function activeNip46Relays(
  connected: string[],
  bunkerRelays: string[]
): string[] {
  const connectedSet = new Set(connected.map(normalizeRelayUrl));
  const ordered = Array.from(
    new Set([...NIP46_RELAYS, ...bunkerRelays.filter((r) => !BLOCKED_NIP46_RELAY.test(r))])
  );
  const active = ordered.filter((relay) => connectedSet.has(normalizeRelayUrl(relay)));
  return active.length > 0 ? active : connected;
}

/** True when the signer expects traffic on relay.primal.net (Primal remote login). */
function signerUsesPrimalRelay(signerRelays: string[]): boolean {
  const primal = normalizeRelayUrl(PRIMAL_NIP46_RELAY);
  return signerRelays.some((relay) => normalizeRelayUrl(relay) === primal);
}

/** Require at least one signer relay reachable; Primal-only hint when that relay is in the set. */
function assertSignerRelaysReachable(
  connected: string[],
  signerRelays: string[]
): void {
  const connectedSet = new Set(connected.map(normalizeRelayUrl));
  const normalizedSigner = signerRelays.map(normalizeRelayUrl);
  const anySignerRelayUp = normalizedSigner.some((relay) => connectedSet.has(relay));
  if (normalizedSigner.length > 0 && !anySignerRelayUp) {
    throw new Error(
      "Could not reach your remote signer's Nostr relay(s) from this browser. Try another network, disable ad blockers or VPN, then try again."
    );
  }
  if (
    signerUsesPrimalRelay(signerRelays) &&
    !connectedSet.has(normalizeRelayUrl(PRIMAL_NIP46_RELAY))
  ) {
    throw new Error(
      "Could not reach relay.primal.net from this browser. Primal signing needs that relay — disable ad blockers or VPN, try another network, then tap Upload again — or sign out and use Remote Login."
    );
  }
}

export function isNip46TimeoutError(message: string): boolean {
  const lower = message.toLowerCase();
  return lower.includes("timed out") && lower.includes("primal");
}

export type Nip46SignerHooks = {
  /** Fires when Primal needs an in-app approval (open this URL on the phone). */
  onAuthUrl?: (url: string) => void;
};

/** Thrown when Primal never acks ping/connect — caller should clear stale nip46 session. */
export class Nip46SessionTimeoutError extends Error {
  readonly staleSession = true;
  constructor(message: string) {
    super(message);
    this.name = "Nip46SessionTimeoutError";
  }
}

/** Connect pool relays in parallel; succeeds when at least one relay is reachable. */
export async function connectPoolRelays(
  pool: SimplePool,
  relays: string[],
  signal?: AbortSignal
): Promise<string[]> {
  throwIfAborted(signal);
  const connected: string[] = [];
  await Promise.all(
    relays.map(async (relay) => {
      throwIfAborted(signal);
      try {
        await withTimeout(
          pool.ensureRelay(relay, {
            connectionTimeout: NIP46_RELAY_CONNECT_TIMEOUT_MS,
          }),
          NIP46_RELAY_CONNECT_TIMEOUT_MS + 2_000,
          `Timed out connecting to ${relay}`,
          signal
        );
        connected.push(relay);
      } catch {
        /* ignore single relay failure */
      }
    })
  );
  return connected;
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
  signLabel?: string,
  signal?: AbortSignal
): Promise<void> {
  const label = signLabel ?? "connection";
  if (signer.bp.secret) {
    signer.bp = { ...signer.bp, secret: null };
  }
  try {
    await withTimeout(
      signer.ping(),
      5_000,
      "ping",
      signal
    );
    return;
  } catch {
    /* ping failed — wake Primal with connect (empty secret, not nostrconnect token) */
  }
  await withTimeout(
    signer.connect(),
    60_000,
    `Timed out waiting for Primal to approve the ${label}. Open Primal on your phone, approve, then try again.`,
    signal
  );
  // Never switchRelays here — Primal may move to relay.dojopop.live (blocks kind 24133).
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

  const connected = await connectPoolRelays(pool, relays, signal);
  relayStatus.connected.push(...connected);
  relayStatus.failed.push(
    ...relays.filter((relay) => !connected.includes(relay))
  );
  reportStatus();
  if (relayStatus.connected.length === 0) {
    pool.close(relays);
    throw new Error(
      "Could not reach Nostr relays from this browser. Try another network, disable ad blockers, or use the bunker link option."
    );
  }
  assertSignerRelaysReachable(connected, relays);

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
                : "Timed out waiting for your phone to approve. Refresh the QR and try again."
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

export async function connectViaBunkerInput(
  input: string,
  signal?: AbortSignal
) {
  const bunker = await parseBunkerInput(input.trim());
  if (!bunker) {
    throw new Error("Invalid bunker or NIP-05 identifier");
  }

  const clientSecretKey = generateSecretKey();
  const pool = new SimplePool({ enableReconnect: true });
  const bp = normalizeBunkerPointer({
    ...bunker,
    relays: bunker.relays.length > 0 ? bunker.relays : NIP46_RELAYS,
  });
  const relays = bp.relays;
  try {
    const connected = await connectPoolRelays(pool, relays, signal);
    if (connected.length === 0) {
      throw new Error(
        "Could not reach Nostr relays from this browser. Try another network or use the QR login option."
      );
    }
    assertSignerRelaysReachable(connected, relays);
    const activeRelays = activeNip46Relays(connected, relays);
    const signer = BunkerSigner.fromBunker(
      clientSecretKey,
      { ...bp, relays: activeRelays },
      {
        pool,
        skipSwitchRelays: true,
        onauth: (url) => window.open(url, "_blank", "noopener,noreferrer"),
      }
    );
    await withTimeout(
      signer.connect(),
      NIP46_CONNECT_TIMEOUT_MS,
      "Timed out waiting for Primal to approve. Open Primal on your phone and try again.",
      signal
    );
    const pubkeyHex = await withTimeout(
      signer.getPublicKey(),
      NIP46_RECONNECT_TIMEOUT_MS,
      "Could not reach your Primal signer — open Primal and try again.",
      signal
    );
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
  label = "signing request",
  signal?: AbortSignal
): BunkerSigner {
  const original = signer.signEvent.bind(signer);
  signer.signEvent = (template) =>
    withTimeout(
      original(template),
      NIP46_SIGN_TIMEOUT_MS,
      `Timed out waiting for Primal to approve the ${label}. Open Primal on your phone, approve, then try again.`,
      signal
    );
  return signer;
}

/** Open a short-lived bunker signer (extension-like sign_event for uploads). */
export async function withNip46Signer<T>(
  session: StoredNip46Session,
  fn: (signer: BunkerSigner) => Promise<T>,
  hooks?: Nip46SignerHooks,
  signLabel?: string,
  signal?: AbortSignal
): Promise<T> {
  throwIfAborted(signal);
  const clientSecretKey = hexToBytes(session.clientSecretKeyHex);
  const bunker = normalizeBunkerPointer(session.bunker);
  const relays = bunker.relays;
  const pool = new SimplePool({ enableReconnect: true });

  const connected = await connectPoolRelays(pool, relays, signal);
  if (connected.length === 0) {
    pool.close(relays);
    throw new Error(
      "Could not reach Nostr relays from this browser. Check your network or ad blockers, then try again."
    );
  }
  assertSignerRelaysReachable(connected, relays);

  const activeRelays = activeNip46Relays(connected, relays);
  const signer = openBunkerSigner(
    clientSecretKey,
    { ...bunker, relays: activeRelays },
    pool,
    hooks
  );
  wrapSigner(signer, hooks, signLabel, signal);
  try {
    await withTimeout(
      ensureBunkerSession(signer, signLabel ?? "connection", signal),
      NIP46_CONNECT_TIMEOUT_MS,
      `Timed out connecting to Primal. Open Primal on your phone, approve the request, then tap Upload again — or sign out and sign in fresh.`,
      signal
    );
    return await fn(signer);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (isStaleNip46SessionError(msg)) {
      throw new Error(
        "Your Primal session expired. Sign out, then sign in again with Remote Login before publishing."
      );
    }
    if (isNip46TimeoutError(msg)) {
      throw new Nip46SessionTimeoutError(
        "Timed out waiting for Primal. Open Primal on your phone, approve the signing request, then tap Upload again — or sign out and sign in fresh with Remote Login."
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
  const pool = new SimplePool({ enableReconnect: true });
  const bunker = normalizeBunkerPointer(session.bunker);
  const connected = await connectPoolRelays(pool, bunker.relays);
  if (connected.length === 0) {
    pool.close(bunker.relays);
    return null;
  }
  const signer = openBunkerSigner(clientSecretKey, bunker, pool);
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
    pool.close(bunker.relays);
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
