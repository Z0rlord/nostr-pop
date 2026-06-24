import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Remove a check-in (for instructor corrections)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { studentId } = body;

    if (!studentId) {
      return NextResponse.json(
        { error: "Student ID is required" },
        { status: 400 }
      );
    }

    // Find today's check-in for this student
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const checkIn = await prisma.checkIn.findFirst({
      where: {
        studentId,
        checkedInAt: {
          gte: today,
        },
      },
    });

    if (!checkIn) {
      return NextResponse.json(
        { error: "No check-in found for today" },
        { status: 404 }
      );
    }

    // Delete the check-in
    await prisma.checkIn.delete({
      where: { id: checkIn.id },
    });

    // Reverse the token award if tokens were given
    if (checkIn.tokensAwarded > 0) {
      await prisma.tokenTransaction.create({
        data: {
          studentId,
          amount: -checkIn.tokensAwarded,
          type: "ADMIN_ADJUSTMENT",
          description: "Attendance correction - check-in removed",
        },
      });

      // Update student balance
      await prisma.student.update({
        where: { id: studentId },
        data: {
          dojoBalance: { decrement: checkIn.tokensAwarded },
          totalEarned: { decrement: checkIn.tokensAwarded },
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Check-in removed successfully",
    });
  } catch (error: any) {
    console.error("Remove check-in error:", error);
    return NextResponse.json(
      { error: "Failed to remove check-in" },
      { status: 500 }
    );
  }
}
