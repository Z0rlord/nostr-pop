import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/goals - Get practice goals for a student
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");
    const isActive = searchParams.get("isActive");

    if (!studentId) {
      return NextResponse.json(
        { error: "studentId is required" },
        { status: 400 }
      );
    }

    const where: any = { studentId };
    if (isActive !== null) {
      where.isActive = isActive === "true";
    }

    const goals = await prisma.practiceGoal.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ goals });
  } catch (error: any) {
    console.error("[Goals] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch goals" },
      { status: 500 }
    );
  }
}

// POST /api/goals - Create a new goal
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      studentId,
      title,
      description,
      goalType,
      targetValue,
      unit,
      startDate,
      endDate,
      reminderTime,
      reminderDays,
    } = body;

    if (!studentId || !title || !goalType || !targetValue || !unit) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const goal = await prisma.practiceGoal.create({
      data: {
        studentId,
        title,
        description,
        goalType,
        targetValue,
        unit,
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : null,
        reminderTime,
        reminderDays: reminderDays || [],
      },
    });

    return NextResponse.json({ success: true, goal });
  } catch (error: any) {
    console.error("[Goals] POST error:", error);
    return NextResponse.json(
      { error: "Failed to create goal" },
      { status: 500 }
    );
  }
}

// PUT /api/goals - Update a goal
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: "id is required" },
        { status: 400 }
      );
    }

    const goal = await prisma.practiceGoal.update({
      where: { id },
      data: {
        ...updateData,
        startDate: updateData.startDate ? new Date(updateData.startDate) : undefined,
        endDate: updateData.endDate ? new Date(updateData.endDate) : null,
        completedAt: updateData.isCompleted ? new Date() : undefined,
      },
    });

    return NextResponse.json({ success: true, goal });
  } catch (error: any) {
    console.error("[Goals] PUT error:", error);
    return NextResponse.json(
      { error: "Failed to update goal" },
      { status: 500 }
    );
  }
}

// DELETE /api/goals - Delete a goal
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "id is required" },
        { status: 400 }
      );
    }

    await prisma.practiceGoal.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Goals] DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete goal" },
      { status: 500 }
    );
  }
}
