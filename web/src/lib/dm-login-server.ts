import { createHmac, randomInt, timingSafeEqual } from "crypto";
import { finalizeEvent, verifyEvent } from "nostr-tools";
import { encrypt } from "nostr-tools/nip04";
import { SimplePool } from "nostr-tools/pool";
import {
  loadLoginBotSecretKey,
  loginBotNpub,
  loginBotPubkeyHex,
} from "@/lib/login-bot";
import { ensureLoginBotProfile } from "@/lib/login-bot-profile";

export const CODE_TTL_MS = 15 * 60 * 1000;
export const CODE_TTL_SEC = CODE_TTL_MS / 1000;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** Kind 4 is not on relay.dojopop.live — use relays Primal users read. */
const PRIMARY_DM_RELAY = "wss://relay.primal.net";
const SECONDARY_DM_RELAYS = [
  "wss://purplepag.es",
  "wss://nos.lol",
  "wss://relay.damus.io",
] as const;
const DM_RELAYS = [PRIMARY_DM_RELAY, ...SECONDARY_DM_RELAYS];

/** Per-relay cap so the API does not wait on slow relays (nostr-tools default is ~4.4s each). */
const RELAY_CONNECT_MS = 2500;
const RELAY_PUBLISH_TIMEOUT_MS = 4500;

type ChallengePayload = {
  pubkeyHex: string;
  codeHash: string;
  exp: number;
};

type SessionPayload = {
  pubkeyHex: string;
  exp: number;
};

const requestCounts = new Map<string, { count: number; resetAt: number }>();

export class RateLimitError extends Error {
  readonly retryAfterSec: number;

  constructor(retryAfterSec: number) {
    super("Too many attempts. Wait a few minutes and try again.");
    this.name = "RateLimitError";
    this.retryAfterSec = retryAfterSec;
  }
}

function loginSecret(): string {
  const secret = process.env.DM_LOGIN_SECRET?.trim();
  if (!secret) {
    throw new Error(
      "DM login is not configured (set DM_LOGIN_SECRET in Doppler)."
    );
  }
  return secret;
}

function hashCode(code: string): string {
  return createHmac("sha256", loginSecret()).update(code).digest("hex");
}

function signPayload(payload: string): string {
  return createHmac("sha256", loginSecret()).update(payload).digest("base64url");
}

function verifySignedPayload<T>(token: string): T | null {
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = signPayload(payload);
  try {
    if (
      sig.length !== expected.length ||
      !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
    ) {
      return null;
    }
  } catch {
    return null;
  }
  try {
    const json = Buffer.from(payload, "base64url").toString("utf8");
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

function packSignedPayload(data: object): string {
  const payload = Buffer.from(JSON.stringify(data)).toString("base64url");
  return `${payload}.${signPayload(payload)}`;
}

export function generateLoginCode(): string {
  return String(randomInt(100_000, 1_000_000));
}

export function createLoginChallenge(
  pubkeyHex: string,
  code: string
): { challenge: string; expiresAt: number } {
  const expiresAt = Date.now() + CODE_TTL_MS;
  const payload: ChallengePayload = {
    pubkeyHex: pubkeyHex.toLowerCase(),
    codeHash: hashCode(code),
    exp: expiresAt,
  };
  return { challenge: packSignedPayload(payload), expiresAt };
}

export function verifyLoginChallenge(
  challenge: string,
  pubkeyHex: string,
  code: string
): boolean {
  const data = verifySignedPayload<ChallengePayload>(challenge);
  if (!data) return false;
  if (data.pubkeyHex !== pubkeyHex.toLowerCase()) return false;
  if (Date.now() > data.exp) return false;
  const normalized = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(normalized)) return false;
  return data.codeHash === hashCode(normalized);
}

export function createDmSessionToken(pubkeyHex: string): {
  token: string;
  expiresAt: number;
} {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const payload: SessionPayload = {
    pubkeyHex: pubkeyHex.toLowerCase(),
    exp: expiresAt,
  };
  return { token: packSignedPayload(payload), expiresAt };
}

export function verifyDmSessionToken(
  token: string,
  pubkeyHex: string
): boolean {
  const data = verifySignedPayload<SessionPayload>(token);
  if (!data) return false;
  if (data.pubkeyHex !== pubkeyHex.toLowerCase()) return false;
  return Date.now() <= data.exp;
}

export function assertRateLimit(key: string, max: number, windowMs: number): void {
  const now = Date.now();
  const entry = requestCounts.get(key);
  if (!entry || now > entry.resetAt) {
    requestCounts.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  if (entry.count >= max) {
    throw new RateLimitError(Math.max(1, Math.ceil((entry.resetAt - now) / 1000)));
  }
  entry.count += 1;
}

type PublishRelayResult = {
  relay: string;
  ok: boolean;
  ms: number;
  error?: string;
};

function publishToRelay(
  pool: SimplePool,
  relay: string,
  signed: ReturnType<typeof finalizeEvent>,
  timeoutMs: number
): Promise<PublishRelayResult> {
  const started = Date.now();
  const publishPromise = pool.publish([relay], signed)[0];
  return Promise.race([
    publishPromise.then(
      () => ({ relay, ok: true as const, ms: Date.now() - started }),
      (err: unknown) => {
        throw err instanceof Error ? err : new Error(String(err));
      }
    ),
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`publish timed out after ${timeoutMs}ms`)),
        timeoutMs
      )
    ),
  ]).catch((err: unknown) => ({
    relay,
    ok: false as const,
    ms: Date.now() - started,
    error: err instanceof Error ? err.message : String(err),
  }));
}

async function publishLoginDm(signed: ReturnType<typeof finalizeEvent>): Promise<void> {
  const pool = new SimplePool();
  let closed = false;
  const closePool = () => {
    if (closed) return;
    closed = true;
    pool.close([...DM_RELAYS]);
  };

  const publishSecondaryInBackground = () => {
    void Promise.all(
      SECONDARY_DM_RELAYS.map((relay) =>
        publishToRelay(pool, relay, signed, RELAY_PUBLISH_TIMEOUT_MS)
      )
    )
      .then((results) => {
        console.info("[dm-login] dm publish secondary", {
          delivered: results.filter((r) => r.ok).length,
          failed: results.filter((r) => !r.ok).length,
          relays: results.map((r) => ({ relay: r.relay, ok: r.ok, ms: r.ms })),
        });
      })
      .finally(closePool);
  };

  try {
    const primary = await publishToRelay(
      pool,
      PRIMARY_DM_RELAY,
      signed,
      RELAY_PUBLISH_TIMEOUT_MS
    );
    console.info("[dm-login] dm publish primary", primary);

    if (primary.ok) {
      publishSecondaryInBackground();
      return;
    }

    const secondary = await Promise.all(
      SECONDARY_DM_RELAYS.map((relay) =>
        publishToRelay(pool, relay, signed, RELAY_PUBLISH_TIMEOUT_MS)
      )
    );
    closePool();

    const delivered = secondary.filter((r) => r.ok).length;
    console.info("[dm-login] dm publish fallback", {
      delivered,
      failed: secondary.length - delivered,
      relays: secondary.map((r) => ({ relay: r.relay, ok: r.ok, ms: r.ms })),
    });

    if (delivered === 0) {
      throw new Error(
        "Could not deliver the login code to Nostr relays. Try again in a minute."
      );
    }
  } catch (err) {
    closePool();
    throw err;
  }
}

export async function sendLoginDm(
  recipientPubkeyHex: string,
  code: string
): Promise<void> {
  const secretKey = loadLoginBotSecretKey();
  await ensureLoginBotProfile();
  const botNpub = loginBotNpub();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "https://dojopop.live";
  const ttlMinutes = CODE_TTL_MS / 60_000;
  const message = [
    `DojoPop sign-in code: ${code}`,
    "",
    `Enter this at My practice on dojopop.live (expires in ${ttlMinutes} minutes).`,
    "",
    `From: ${botNpub}`,
    "",
    "If you didn't request this, ignore this message.",
    "",
    appUrl,
  ].join("\n");

  const encrypted = await encrypt(secretKey, recipientPubkeyHex, message);
  const signed = finalizeEvent(
    {
      kind: 4,
      created_at: Math.floor(Date.now() / 1000),
      tags: [["p", recipientPubkeyHex, PRIMARY_DM_RELAY]],
      content: encrypted,
    },
    secretKey
  );

  if (!verifyEvent(signed)) {
    throw new Error("Failed to sign login message.");
  }

  await publishLoginDm(signed);
  console.info("[dm-login] dm publish ok", {
    recipient: `${recipientPubkeyHex.slice(0, 8)}…`,
  });
}

export function dmLoginSenderNpub(): string {
  return loginBotNpub();
}

export function dmLoginSenderPubkeyHex(): string {
  return loginBotPubkeyHex();
}
