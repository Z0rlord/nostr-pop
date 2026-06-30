import { NextRequest, NextResponse } from "next/server";
import { decodeNpubToHex, isValidNpub } from "@/lib/nostr";
import { getPracticeUploadCooldown } from "@/lib/practice-upload-limit";

export const runtime = "nodejs";

/** Public cooldown lookup by npub (no secrets). */
export async function GET(req: NextRequest) {
  const npub = req.nextUrl.searchParams.get("npub")?.trim();
  if (!npub || !isValidNpub(npub)) {
    return NextResponse.json({ error: "Valid npub required" }, { status: 400 });
  }

  const pubkeyHex = decodeNpubToHex(npub);
  if (!pubkeyHex) {
    return NextResponse.json({ error: "Invalid npub" }, { status: 400 });
  }

  const cooldown = await getPracticeUploadCooldown(pubkeyHex);
  return NextResponse.json({
    npub,
    allowed: cooldown.allowed,
    lastUploadedAt: cooldown.lastUploadedAt,
    nextAllowedAt: cooldown.nextAllowedAt,
    waitSeconds: cooldown.waitSeconds,
  });
}
