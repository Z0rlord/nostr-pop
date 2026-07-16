import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff, isStaffForDojo } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const staff = await requireStaff(req);
    if (staff instanceof NextResponse) return staff;

    const body = await req.json();
    const { studentId, classId, checkedInAt, method } = body;

    if (!studentId || !classId) {
      return NextResponse.json(
        { error: "Student ID and Class ID are required" },
        { status: 400 }
      );
    }

    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student || !staff.dojoIds.includes(student.dojoId)) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    if (!(await isStaffForDojo(staff.instructorId, student.dojoId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const cls = await prisma.class.findUnique({ where: { id: classId } });
    if (!cls || cls.dojoId !== student.dojoId) {
      return NextResponse.json({ error: "Invalid class for student dojo" }, { status: 400 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existingCheckIn = await prisma.checkIn.findFirst({
      where: {
        studentId,
        checkedInAt: { gte: today },
      },
    });

    let checkIn;

    if (existingCheckIn) {
      checkIn = await prisma.checkIn.update({
        where: { id: existingCheckIn.id },
        data: {
          checkedInAt: checkedInAt ? new Date(checkedInAt) : new Date(),
          method: method || "manual",
          classId,
        },
      });
    } else {
      checkIn = await prisma.checkIn.create({
        data: {
          studentId,
          dojoId: student.dojoId,
          classId,
          checkedInAt: checkedInAt ? new Date(checkedInAt) : new Date(),
          method: method || "manual",
          tokensAwarded: 10,
        },
      });

      await prisma.tokenTransaction.create({
        data: {
          studentId,
          amount: 10,
          type: "CHECK_IN",
          description: "Class attendance (manual correction)",
        },
      });

      await prisma.student.update({
        where: { id: studentId },
        data: {
          lastCheckIn: new Date(),
          dojoBalance: { increment: 10 },
          totalEarned: { increment: 10 },
        },
      });
    }

    return NextResponse.json({
      success: true,
      checkIn: {
        id: checkIn.id,
        studentId: checkIn.studentId,
        checkedInAt: checkIn.checkedInAt,
        method: checkIn.method,
      },
    });
  } catch (error: unknown) {
    console.error("Correction error:", error);
    return NextResponse.json({ error: "Failed to correct attendance" }, { status: 500 });
  }
}
