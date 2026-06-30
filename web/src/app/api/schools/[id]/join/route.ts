import { NextResponse } from "next/server";
import { addStudentToSchool, getSchool } from "@/lib/schools";

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
  if (!npub) {
    return NextResponse.json({ error: "npub required" }, { status: 400 });
  }

  const result = await addStudentToSchool(params.id, npub);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    schoolName: result.school!.name,
    message: "You are on the dojo roster.",
  });
}
