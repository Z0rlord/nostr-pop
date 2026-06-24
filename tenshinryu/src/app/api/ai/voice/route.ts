import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Voice AI not configured for this deployment" },
    { status: 501 }
  );
}
