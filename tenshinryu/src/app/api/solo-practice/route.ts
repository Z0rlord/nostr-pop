import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/solo-practice - Get practice logs for a student
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const practiceType = searchParams.get("practiceType");

    if (!studentId) {
      return NextResponse.json(
        { error: "studentId is required" },
        { status: 400 }
      );
    }

    const where: any = { studentId };

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    if (practiceType) {
      where.practiceType = practiceType;
    }

    const logs = await prisma.soloPracticeLog.findMany({
      where,
      orderBy: { date: "desc" },
    });

    // Calculate stats
    const stats = {
      totalSessions: logs.length,
      totalMinutes: logs.reduce((sum, log) => sum + log.durationMinutes, 0),
      averageIntensity: logs.length > 0 
        ? logs.reduce((sum, log) => sum + (log.energyLevel || 5), 0) / logs.length 
        : 0,
      streakDays: calculateStreak(logs),
    };

    return NextResponse.json({ logs, stats });
  } catch (error: any) {
    console.error("[SoloPractice] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch practice logs" },
      { status: 500 }
    );
  }
}

// POST /api/solo-practice - Create a new practice log
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      studentId,
      date,
      durationMinutes,
      practiceType,
      location,
      latitude,
      longitude,
      intensity,
      notes,
      photos,
      videoUrl,
      voiceNoteUrl,
      voiceNoteDuration,
      tags,
      mood,
      energyLevel,
    } = body;

    if (!studentId || !durationMinutes || !practiceType) {
      return NextResponse.json(
        { error: "studentId, durationMinutes, and practiceType are required" },
        { status: 400 }
      );
    }

    const log = await prisma.soloPracticeLog.create({
      data: {
        studentId,
        date: date ? new Date(date) : new Date(),
        durationMinutes,
        practiceType,
        location,
        latitude,
        longitude,
        intensity: intensity || "medium",
        notes,
        photos: photos || [],
        videoUrl,
        voiceNoteUrl,
        voiceNoteDuration,
        tags: tags || [],
        mood: mood || "neutral",
        energyLevel: energyLevel || 5,
      },
    });

    // Update or create practice goal progress if applicable
    await updateGoalProgress(studentId, durationMinutes);

    return NextResponse.json({ success: true, log });
  } catch (error: any) {
    console.error("[SoloPractice] POST error:", error);
    return NextResponse.json(
      { error: "Failed to create practice log" },
      { status: 500 }
    );
  }
}

// PUT /api/solo-practice - Update a practice log
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

    const log = await prisma.soloPracticeLog.update({
      where: { id },
      data: {
        ...updateData,
        date: updateData.date ? new Date(updateData.date) : undefined,
      },
    });

    return NextResponse.json({ success: true, log });
  } catch (error: any) {
    console.error("[SoloPractice] PUT error:", error);
    return NextResponse.json(
      { error: "Failed to update practice log" },
      { status: 500 }
    );
  }
}

// DELETE /api/solo-practice - Delete a practice log
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

    await prisma.soloPracticeLog.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[SoloPractice] DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete practice log" },
      { status: 500 }
    );
  }
}

// Helper: Calculate current streak
function calculateStreak(logs: any[]): number {
  if (logs.length === 0) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sortedLogs = [...logs].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  let streak = 0;
  let checkDate = new Date(today);

  for (const log of sortedLogs) {
    const logDate = new Date(log.date);
    logDate.setHours(0, 0, 0, 0);

    const diffDays = Math.floor(
      (checkDate.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 0 || diffDays === 1) {
      streak++;
      checkDate = logDate;
    } else {
      break;
    }
  }

  return streak;
}

// Helper: Update goal progress
async function updateGoalProgress(studentId: string, durationMinutes: number) {
  try {
    const activeGoals = await prisma.practiceGoal.findMany({
      where: {
        studentId,
        isActive: true,
        isCompleted: false,
      },
    });

    for (const goal of activeGoals) {
      if (goal.goalType === "daily_practice" || goal.goalType === "weekly_hours") {
        await prisma.practiceGoal.update({
          where: { id: goal.id },
          data: {
            currentValue: { increment: durationMinutes / 60 }, // Convert to hours
          },
        });
      }
    }
  } catch (error) {
    console.error("[SoloPractice] Failed to update goal progress:", error);
  }
}
