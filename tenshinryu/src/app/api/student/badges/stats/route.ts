import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";
import { BadgeStatus } from "@prisma/client";
import { BadgeType } from "@/lib/badges";

const badgeTypeNames: Record<BadgeType, string> = {
  [BadgeType.WEEKLY_WARRIOR]: "Weekly Warrior",
  [BadgeType.PERFECT_WEEK]: "Perfect Week",
  [BadgeType.DEDICATED_STUDENT]: "Dedicated Student",
  [BadgeType.MILESTONE_50]: "50 Classes",
  [BadgeType.MILESTONE_100]: "100 Classes",
  [BadgeType.MILESTONE_250]: "250 Classes",
  [BadgeType.MILESTONE_500]: "500 Classes",
  [BadgeType.MILESTONE_1000]: "1000 Classes - Master",
};

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

    const [total, minted, pending, byType] = await Promise.all([
      prisma.badge.count({ where: { studentId: student.id } }),
      prisma.badge.count({ where: { studentId: student.id, status: BadgeStatus.MINTED } }),
      prisma.badge.count({
        where: {
          studentId: student.id,
          status: { in: [BadgeStatus.EARNED, BadgeStatus.QUEUED] },
        },
      }),
      prisma.badge.groupBy({
        by: ["badgeType"],
        where: { studentId: student.id },
        _count: { badgeType: true },
      }),
    ]);

    return NextResponse.json({
      total,
      minted,
      pending,
      byType: byType.map((t) => ({
        type: t.badgeType,
        count: t._count.badgeType,
        name: badgeTypeNames[t.badgeType as BadgeType],
      })),
    });
  } catch (error) {
    console.error("Failed to fetch badge stats:", error);
    return NextResponse.json({ error: "Failed to fetch badge stats" }, { status: 500 });
  }
}
