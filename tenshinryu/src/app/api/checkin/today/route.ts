import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Get today's check-ins
export async function GET() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const checkIns = await prisma.checkIn.findMany({
      where: {
        checkedInAt: {
          gte: today,
        },
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        checkedInAt: "desc",
      },
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
    });
  } catch (error: any) {
    console.error("Fetch check-ins error:", error);
    return NextResponse.json(
      { error: "Failed to fetch check-ins" },
      { status: 500 }
    );
  }
}
