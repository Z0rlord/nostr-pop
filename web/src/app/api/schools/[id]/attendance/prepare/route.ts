import { NextResponse } from "next/server";
import { buildAttendanceEventTemplate } from "@/lib/class-attendance";
import { canInstruct, getSchool } from "@/lib/schools";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const school = await getSchool(params.id);
  if (!school) {
    return NextResponse.json({ error: "School not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const npub = typeof body.npub === "string" ? body.npub.trim() : "";
  if (!npub || !canInstruct(school, npub)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const {
    className,
    discipline,
    startedAt,
    endedAt,
    location,
    presentNpubs,
    notes,
  } = body;

  if (!className || !startedAt || !Array.isArray(presentNpubs)) {
    return NextResponse.json({ error: "Invalid class payload" }, { status: 400 });
  }

  const template = buildAttendanceEventTemplate(school, {
    className,
    discipline: discipline || school.disciplines[0] || "aikido",
    startedAt,
    endedAt,
    location,
    presentNpubs,
    notes,
  });

  return NextResponse.json({ template });
}
