import { nip19 } from "nostr-tools";
import { NextResponse } from "next/server";
import { resolveNostrIdentity } from "@/lib/resolve-nostr-identity";
import {
  assertRateLimit,
  createDmSessionToken,
  parseLoginChallenge,
  RateLimitError,
  verifyLoginChallenge,
} from "@/lib/dm-login-server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      npub?: string;
      code?: string;
      challenge?: string;
    };
    const identityInput = body.npub?.trim() || "";
    const code = body.code?.trim() || "";
    const challenge = body.challenge?.trim() || "";

    if (!challenge || !code) {
      return NextResponse.json(
        { error: "Missing code or challenge." },
        { status: 400 }
      );
    }

    const challengeData = parseLoginChallenge(challenge);
    if (!challengeData) {
      return NextResponse.json(
        { error: "Invalid or expired challenge. Request a new code." },
        { status: 400 }
      );
    }

    const pubkeyHex = challengeData.pubkeyHex.toLowerCase();

    if (identityInput) {
      try {
        const resolved = await resolveNostrIdentity(identityInput);
        if (resolved.pubkeyHex.toLowerCase() !== pubkeyHex) {
          return NextResponse.json(
            {
              error:
                "Identity does not match the account that received the code. Use the same npub or NIP-05 as when you requested the code.",
            },
            { status: 400 }
          );
        }
      } catch (e) {
        const message =
          e instanceof Error ? e.message : "Invalid npub or NIP-05 address.";
        return NextResponse.json({ error: message }, { status: 400 });
      }
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";
    assertRateLimit(`verify:${ip}`, 20, 15 * 60 * 1000);

    if (!verifyLoginChallenge(challenge, pubkeyHex, code)) {
      console.warn("[dm-login] verify rejected", {
        pubkey: `${pubkeyHex.slice(0, 8)}…`,
        reason: "invalid_or_expired",
      });
      return NextResponse.json(
        { error: "Invalid or expired code. Request a new one." },
        { status: 401 }
      );
    }

    const npub = nip19.npubEncode(pubkeyHex);
    const session = createDmSessionToken(pubkeyHex);
    console.info("[dm-login] verify ok", {
      pubkey: `${pubkeyHex.slice(0, 8)}…`,
    });
    return NextResponse.json({
      ok: true,
      pubkeyHex,
      npub,
      sessionToken: session.token,
      sessionExpiresAt: session.expiresAt,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Verification failed.";
    const status = e instanceof RateLimitError ? 429 : 500;
    console.warn("[dm-login] verify failed", {
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
