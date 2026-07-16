import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/session";

export async function GET(req: NextRequest) {
  try {
    const staff = await requireStaff(req);
    if (staff instanceof NextResponse) return staff;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const checkIns = await prisma.checkIn.findMany({
      where: {
        dojoId: staff.dojoId,
        checkedInAt: { gte: today },
      },
      include: {
        student: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { checkedInAt: "desc" },
    });

    return NextResponse.json({
      checkIns: checkIns.map((c) => ({
        id: c.id,
        studentId: c.studentId,
        studentName: c.student.name,
        timestamp: c.checkedInAt,
        method: c.method,
        status: "present",
      })),
      dojoId: staff.dojoId,
    });
  } catch (error: unknown) {
    console.error("Fetch check-ins error:", error);
    return NextResponse.json({ error: "Failed to fetch check-ins" }, { status: 500 });
  }
}
