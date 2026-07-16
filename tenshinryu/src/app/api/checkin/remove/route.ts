import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff, isStaffForDojo } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const staff = await requireStaff(req);
    if (staff instanceof NextResponse) return staff;

    const body = await req.json();
    const { studentId } = body;

    if (!studentId) {
      return NextResponse.json({ error: "Student ID is required" }, { status: 400 });
    }

    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student || !staff.dojoIds.includes(student.dojoId)) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }
    if (!(await isStaffForDojo(staff.instructorId, student.dojoId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const checkIn = await prisma.checkIn.findFirst({
      where: {
        studentId,
        dojoId: student.dojoId,
        checkedInAt: { gte: today },
      },
    });

    if (!checkIn) {
      return NextResponse.json({ error: "No check-in found for today" }, { status: 404 });
    }

    await prisma.checkIn.delete({ where: { id: checkIn.id } });

    if (checkIn.tokensAwarded > 0) {
      await prisma.tokenTransaction.create({
        data: {
          studentId,
          amount: -checkIn.tokensAwarded,
          type: "ADMIN_ADJUSTMENT",
          description: "Attendance correction - check-in removed",
        },
      });

      await prisma.student.update({
        where: { id: studentId },
        data: {
          dojoBalance: { decrement: checkIn.tokensAwarded },
          totalEarned: { decrement: checkIn.tokensAwarded },
        },
      });
    }

    return NextResponse.json({ success: true, message: "Check-in removed successfully" });
  } catch (error: unknown) {
    console.error("Remove check-in error:", error);
    return NextResponse.json({ error: "Failed to remove check-in" }, { status: 500 });
  }
}
