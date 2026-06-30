import { NextResponse } from "next/server";
import { resolveNostrIdentity } from "@/lib/resolve-nostr-identity";
import {
  assertRateLimit,
  CODE_TTL_SEC,
  createLoginChallenge,
  dmLoginSenderNpub,
  generateLoginCode,
  RateLimitError,
  sendLoginDm,
} from "@/lib/dm-login-server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { npub?: string };
    const identityInput = body.npub?.trim() || "";

    let pubkeyHex: string;
    try {
      ({ pubkeyHex } = await resolveNostrIdentity(identityInput));
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Invalid npub or NIP-05 address.";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";

    assertRateLimit(`npub:${pubkeyHex}`, 3, 15 * 60 * 1000);
    assertRateLimit(`ip:${ip}`, 12, 60 * 60 * 1000);

    const code = generateLoginCode();
    const { challenge, expiresAt } = createLoginChallenge(pubkeyHex, code);
    await sendLoginDm(pubkeyHex, code);

    console.info("[dm-login] request ok", {
      pubkey: `${pubkeyHex.slice(0, 8)}…`,
    });

    return NextResponse.json({
      ok: true,
      challenge,
      expiresAt,
      expiresInSec: CODE_TTL_SEC,
      senderNpub: dmLoginSenderNpub(),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not send login code.";
    const status = e instanceof RateLimitError ? 429 : 500;
    console.warn("[dm-login] request failed", {
      status,
      reason: message,
      retryAfterSec: e instanceof RateLimitError ? e.retryAfterSec : undefined,
    });
    return NextResponse.json(
      {
        error: message,
        ...(e instanceof RateLimitError ? { retryAfterSec: e.retryAfterSec } : {}),
      },
      { status }
    );
  }
}
