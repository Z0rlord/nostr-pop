import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  handleApiError,
  validateRequiredFields,
  createValidationError,
} from "@/lib/api-error-handler";
import { checkWeeklyBadge } from "@/lib/badges";

async function isInstructorForDojo(
  instructorId: string,
  dojoId: string
): Promise<boolean> {
  const membership = await prisma.instructorDojoMembership.findUnique({
    where: { instructorId_dojoId: { instructorId, dojoId } },
  });
  if (membership) return true;
  const instructor = await prisma.instructor.findFirst({
    where: { id: instructorId, dojoId },
  });
  return !!instructor;
}

async function canAccessStudent(
  req: NextRequest,
  student: { id: string; dojoId: string }
): Promise<boolean> {
  const sessionId = req.cookies.get("session")?.value;
  const role = req.cookies.get("role")?.value;
  if (!sessionId) return false;
  if (sessionId === student.id) return true;
  if (role === "instructor" || role === "admin") {
    return isInstructorForDojo(sessionId, student.dojoId);
  }
  return false;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { studentId, qrCode, method, classId, timestamp } = body;

    const validation = validateRequiredFields(body, ["studentId"]);
    if (!validation.valid) {
      return createValidationError(validation.missing);
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      return NextResponse.json(
        { error: "Student not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    if (!(await canAccessStudent(req, student))) {
      return NextResponse.json(
        { error: "Forbidden", code: "FORBIDDEN" },
        { status: 403 }
      );
    }

    if (qrCode && qrCode !== student.qrCode) {
      return NextResponse.json(
        { error: "Invalid QR code", code: "INVALID_CREDENTIALS" },
        { status: 401 }
      );
    }

    // Get or create a default class for this dojo
    let targetClassId = classId;
    if (!targetClassId) {
      const defaultClass = await prisma.class.findFirst({
        where: { dojoId: student.dojoId },
        orderBy: { schedule: "desc" },
      });
      if (!defaultClass) {
        return NextResponse.json(
          { error: "No active class found for this dojo", code: "NO_ACTIVE_CLASS" },
          { status: 400 }
        );
      }
      targetClassId = defaultClass.id;
    } else {
      // IDOR Protection: Verify the class belongs to the student's dojo
      const targetClass = await prisma.class.findUnique({
        where: { id: targetClassId },
      });
      if (!targetClass || targetClass.dojoId !== student.dojoId) {
        return NextResponse.json(
          { error: "Invalid class", code: "INVALID_CLASS" },
          { status: 400 }
        );
      }
    }

    // Check if already checked in today for this class
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existingCheckIn = await prisma.checkIn.findFirst({
      where: {
        studentId,
        classId: targetClassId,
        checkedInAt: {
          gte: today,
        },
      },
    });

    if (existingCheckIn) {
      return NextResponse.json(
        { 
          error: "Already checked in today", 
          code: "ALREADY_CHECKED_IN",
          checkIn: existingCheckIn 
        },
        { status: 409 }
      );
    }

    // Create check-in record within a transaction
    const checkIn = await prisma.$transaction(async (tx) => {
      // Create the check-in
      const checkIn = await tx.checkIn.create({
        data: {
          studentId,
          dojoId: student.dojoId,
          classId: targetClassId,
          checkedInAt: timestamp ? new Date(timestamp) : new Date(),
          method: method || "qr",
          tokensAwarded: 10,
        },
      });

      // Award DOJO tokens for attendance
      await tx.tokenTransaction.create({
        data: {
          studentId,
          amount: 10,
          type: "CHECK_IN",
          description: "Class attendance",
        },
      });

      // Update student's last check-in
      await tx.student.update({
        where: { id: studentId },
        data: {
          lastCheckIn: new Date(),
        },
      });

      return checkIn;
    });

    // Check for badge awards asynchronously (don't block response)
    checkWeeklyBadge(studentId, student.dojoId).catch((err) => {
      console.error("Badge check failed:", err);
    });

    return NextResponse.json({
      success: true,
      checkIn: {
        id: checkIn.id,
        timestamp: checkIn.checkedInAt,
        method: checkIn.method,
      },
    });

  } catch (error) {
    return handleApiError(error, {
      path: req.nextUrl.pathname,
      method: req.method,
    });
  }
}

// GET endpoint for retrieving check-in history
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");

    if (!studentId) {
      return createValidationError(["studentId"]);
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      return NextResponse.json(
        { error: "Student not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    if (!(await canAccessStudent(req, student))) {
      return NextResponse.json(
        { error: "Forbidden", code: "FORBIDDEN" },
        { status: 403 }
      );
    }

    const checkIns = await prisma.checkIn.findMany({
      where: { studentId },
      orderBy: { checkedInAt: "desc" },
      take: 50,
      include: {
        class: true,
      },
    });

    return NextResponse.json({ checkIns });

  } catch (error) {
    return handleApiError(error, {
      path: req.nextUrl.pathname,
      method: req.method,
    });
  }
}
