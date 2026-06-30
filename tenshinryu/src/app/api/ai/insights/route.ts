import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = req.cookies.get("session")?.value;
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({
    success: true,
    insights: {
      summary: "AI insights will return once practice data accumulates.",
      recommendations: [],
      streak: 0,
    },
  });
}
