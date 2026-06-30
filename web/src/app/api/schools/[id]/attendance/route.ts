import { NextResponse } from "next/server";
import { fetchSchoolAttendance } from "@/lib/class-attendance";
import { getSchool, isMember } from "@/lib/schools";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const school = await getSchool(params.id);
  if (!school) {
    return NextResponse.json({ error: "School not found" }, { status: 404 });
  }

  const npub = new URL(request.url).searchParams.get("npub")?.trim() || "";
  if (!npub || !isMember(school, npub)) {
    return NextResponse.json({ error: "Members only" }, { status: 403 });
  }

  const records = await fetchSchoolAttendance(school);
  return NextResponse.json({
    school: { id: school.id, name: school.name },
    records,
  });
}
