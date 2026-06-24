import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const student = await prisma.student.findFirst({
      where: { firebaseUid: authResult.userId },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const badges = await prisma.badge.findMany({
      where: { studentId: student.id },
      orderBy: { earnedAt: "desc" },
      include: {
        dojo: { select: { name: true } },
      },
    });

    return NextResponse.json({ badges });
  } catch (error) {
    console.error("Failed to fetch badges:", error);
    return NextResponse.json({ error: "Failed to fetch badges" }, { status: 500 });
  }
}
