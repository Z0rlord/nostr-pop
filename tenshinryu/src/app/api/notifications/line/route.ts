import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "LINE notifications not configured" },
    { status: 501 }
  );
}
