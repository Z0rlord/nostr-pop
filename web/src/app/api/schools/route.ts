import { NextResponse } from "next/server";
import { listAffiliatedSchoolsPublic } from "@/lib/affiliated-schools-server";

/** Public directory of affiliated dojos (no secrets or npubs). */
export async function GET() {
  const schools = await listAffiliatedSchoolsPublic();
  return NextResponse.json({ schools });
}
