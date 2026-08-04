import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/session";

/** GET classes schedule for the member's active dojo (replaces mock calendar). */
export async function GET(req: NextRequest) {
  try {
    const member = await requireMember(req);
    if (member instanceof NextResponse) {
      // Unauthenticated: return empty with note (landing widgets)
      return NextResponse.json({
        source: "database",
        events: [],
        note: "Sign in to see your dojo schedule",
      });
    }

    const classes = await prisma.class.findMany({
      where: { dojoId: member.dojoId },
      include: { instructor: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({
      source: "database",
      events: classes.map((c) => ({
        id: c.id,
        title: c.name,
        schedule: c.schedule,
        location: c.mode === "ONLINE" ? c.meetingUrl || c.location || "Online" : c.location || "Dojo",
        instructor: c.instructor?.name || "TBD",
        mode: c.mode,
        meetingUrl: c.meetingUrl,
        isRecurring: c.isRecurring,
      })),
      dojoId: member.dojoId,
    });
  } catch (error: unknown) {
    console.error("[Calendar] Error:", error);
    return NextResponse.json({ error: "Failed to fetch schedule" }, { status: 500 });
  }
}
