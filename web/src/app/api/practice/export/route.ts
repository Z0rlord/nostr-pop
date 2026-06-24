import { NextRequest, NextResponse } from "next/server";
import { fetchPracticeSessionsForPubkey } from "@/lib/practice-events";
import { decodeNpubToHex, isValidNpub } from "@/lib/nostr";
import { findMemberByNpub } from "@/lib/membership";
import { cdnBlobUrlFromVideoUrl } from "@/lib/media-url";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function GET(req: NextRequest) {
  const npub = req.nextUrl.searchParams.get("npub")?.trim();
  if (!npub || !isValidNpub(npub)) {
    return NextResponse.json({ error: "Valid npub required" }, { status: 400 });
  }

  const member = await findMemberByNpub(npub);
  if (!member || member.status !== "active") {
    return NextResponse.json({ error: "Active membership required" }, { status: 403 });
  }

  const pubkeyHex = decodeNpubToHex(npub);
  if (!pubkeyHex) {
    return NextResponse.json({ error: "Invalid npub" }, { status: 400 });
  }

  const sessions = await fetchPracticeSessionsForPubkey(pubkeyHex, 500);
  const exportedAt = new Date().toISOString();

  const manifest = {
    exportedAt,
    npub,
    count: sessions.length,
    videos: sessions.map((s) => ({
      eventId: s.id,
      title: s.title,
      publishedAt: s.publishedAt,
      durationSec: s.durationSec,
      dayNumber: s.dayNumber,
      videoUrl: s.videoUrl,
      cdnUrl: cdnBlobUrlFromVideoUrl(s.videoUrl),
      thumbUrl: s.thumbUrl,
      shareUrl: `${process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "https://dojopop.live"}/v/${s.id}`,
      roughLocation: s.roughLocation,
      geohash: s.geohash,
    })),
  };

  return new NextResponse(JSON.stringify(manifest, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="dojopop-practice-backup-${exportedAt.slice(0, 10)}.json"`,
    },
  });
}
