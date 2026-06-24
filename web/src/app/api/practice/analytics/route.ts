import { NextRequest, NextResponse } from "next/server";
import { fetchPracticeSessionsForPubkey } from "@/lib/practice-events";
import { getAnalyticsForEventIds } from "@/lib/practice-analytics";
import { decodeNpubToHex, isValidNpub } from "@/lib/nostr";
import { findMemberByNpub } from "@/lib/membership";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const npub = req.nextUrl.searchParams.get("npub")?.trim();
  if (!npub || !isValidNpub(npub)) {
    return NextResponse.json({ error: "Valid npub required" }, { status: 400 });
  }

  const member = await findMemberByNpub(npub);
  if (!member || member.status !== "active") {
    return NextResponse.json({ error: "Active membership required" }, { status: 403 });
  }

  const pubkeyHex = decodeNpubToHex(npub)!;
  const sessions = await fetchPracticeSessionsForPubkey(pubkeyHex, 200);
  const analytics = await getAnalyticsForEventIds(sessions.map((s) => s.id));

  const byEvent = sessions.map((s) => ({
    eventId: s.id,
    title: s.title,
    publishedAt: s.publishedAt,
    views: analytics.events[s.id]?.views ?? 0,
    lastViewedAt: analytics.events[s.id]?.lastViewedAt ?? null,
  }));

  return NextResponse.json({
    totalViews: analytics.totalViews,
    sessions: byEvent,
  });
}
