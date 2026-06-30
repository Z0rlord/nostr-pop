import { NextRequest, NextResponse } from "next/server";
import { recordPracticeView } from "@/lib/practice-analytics";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { eventId?: string };
    const eventId = body.eventId?.toLowerCase();
    if (!eventId || !/^[0-9a-f]{64}$/.test(eventId)) {
      return NextResponse.json({ error: "Invalid event id" }, { status: 400 });
    }
    const referrer = req.headers.get("referer") || undefined;
    await recordPracticeView(eventId, referrer);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Could not record view" }, { status: 500 });
  }
}
