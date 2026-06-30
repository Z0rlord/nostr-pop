import { NextResponse } from "next/server";
import { canInstruct, getSchool, isMember } from "@/lib/schools";

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

  return NextResponse.json({
    school: {
      id: school.id,
      name: school.name,
      disciplines: school.disciplines,
    },
    role: canInstruct(school, npub)
      ? school.ownerNpub === npub
        ? "owner"
        : "instructor"
      : "student",
    students: school.studentNpubs,
    instructors: [school.ownerNpub, ...school.instructorNpubs],
  });
}
