import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Teacher correction endpoint
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { studentId, classId, checkedInAt, method } = body;

    if (!studentId || !classId) {
      return NextResponse.json(
        { error: "Student ID and Class ID are required" },
        { status: 400 }
      );
    }

    // Verify student exists
    const student = await prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      return NextResponse.json(
        { error: "Student not found" },
        { status: 404 }
      );
    }

    // Check if already has a check-in today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existingCheckIn = await prisma.checkIn.findFirst({
      where: {
        studentId,
        checkedInAt: {
          gte: today,
        },
      },
    });

    let checkIn;

    if (existingCheckIn) {
      // Update existing check-in
      checkIn = await prisma.checkIn.update({
        where: { id: existingCheckIn.id },
        data: {
          checkedInAt: checkedInAt ? new Date(checkedInAt) : new Date(),
          method: method || "manual",
        },
      });
    } else {
      // Create new check-in
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

      // Award tokens for new check-in
      await prisma.tokenTransaction.create({
        data: {
          studentId,
          amount: 10,
          type: "CHECK_IN",
          description: "Class attendance (manual correction)",
        },
      });

      // Update student's stats
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
  } catch (error: any) {
    console.error("Correction error:", error);
    return NextResponse.json(
      { error: "Failed to correct attendance" },
      { status: 500 }
    );
  }
}
