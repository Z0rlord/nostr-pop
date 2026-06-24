import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/admin/dashboard - Get business metrics
export async function GET(req: NextRequest) {
  try {
    // Get current user from session
    const sessionCookie = req.cookies.get("session")?.value;
    const roleCookie = req.cookies.get("role")?.value;
    
    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user is admin
    const instructor = await prisma.instructor.findUnique({
      where: { id: sessionCookie },
    });

    if (!instructor || !instructor.isAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const dojoId = instructor.dojoId;

    // Get date ranges
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Parallel queries for performance
    const [
      totalStudents,
      activeStudents,
      newThisMonth,
      newLastMonth,
      studentsByTier,
      totalClasses,
      classesThisMonth,
      checkInsToday,
      checkInsThisWeek,
      checkInsThisMonth,
      attendanceRate,
      atRiskStudents,
      recentCheckIns,
      upcomingClasses,
      revenueData,
    ] = await Promise.all([
      // Total students
      prisma.student.count({ where: { dojoId } }),

      // Active students (checked in within 30 days)
      prisma.student.count({
        where: { 
          dojoId,
          lastCheckIn: { gte: thirtyDaysAgo }
        }
      }),

      // New students this month
      prisma.student.count({
        where: { 
          dojoId,
          joinedAt: { gte: thisMonth }
        }
      }),

      // New students last month
      prisma.student.count({
        where: { 
          dojoId,
          joinedAt: { gte: lastMonth, lt: thisMonth }
        }
      }),

      // Students by membership tier
      prisma.student.groupBy({
        by: ['membershipTier'],
        where: { dojoId },
        _count: { id: true }
      }),

      // Total classes
      prisma.class.count({ where: { dojoId } }),

      // Classes this month
      prisma.class.count({
        where: { 
          dojoId,
          createdAt: { gte: thisMonth }
        }
      }),

      // Check-ins today
      prisma.checkIn.count({
        where: {
          dojoId,
          checkedInAt: { gte: today }
        }
      }),

      // Check-ins this week
      prisma.checkIn.count({
        where: {
          dojoId,
          checkedInAt: { gte: sevenDaysAgo }
        }
      }),

      // Check-ins this month
      prisma.checkIn.count({
        where: {
          dojoId,
          checkedInAt: { gte: thisMonth }
        }
      }),

      // Calculate attendance rate
      (async () => {
        const totalClassesHeld = await prisma.checkIn.groupBy({
          by: ['classId'],
          where: {
            dojoId,
            checkedInAt: { gte: thirtyDaysAgo }
          }
        });
        
        const uniqueStudents = await prisma.student.count({ where: { dojoId } });
        const totalCheckIns = await prisma.checkIn.count({
          where: {
            dojoId,
            checkedInAt: { gte: thirtyDaysAgo }
          }
        });

        // Rough estimate: average attendance rate
        const potentialAttendances = totalClassesHeld.length * uniqueStudents;
        return potentialAttendances > 0 
          ? Math.round((totalCheckIns / potentialAttendances) * 100)
          : 0;
      })(),

      // At-risk students (no check-in for 14+ days)
      prisma.student.findMany({
        where: {
          dojoId,
          OR: [
            { lastCheckIn: { lt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000) } },
            { lastCheckIn: null }
          ],
          isActive: true
        },
        select: {
          id: true,
          name: true,
          email: true,
          beltRank: true,
          membershipTier: true,
          lastCheckIn: true,
          joinedAt: true,
        },
        take: 10,
        orderBy: { lastCheckIn: 'asc' }
      }),

      // Recent check-ins with student details
      prisma.checkIn.findMany({
        where: { dojoId },
        select: {
          id: true,
          checkedInAt: true,
          method: true,
          student: {
            select: {
              id: true,
              name: true,
              beltRank: true,
              membershipTier: true,
            }
          },
          class: {
            select: {
              id: true,
              name: true,
            }
          }
        },
        orderBy: { checkedInAt: 'desc' },
        take: 20
      }),

      // Upcoming classes
      prisma.class.findMany({
        where: { dojoId },
        select: {
          id: true,
          name: true,
          schedule: true,
          location: true,
          maxStudents: true,
          instructor: {
            select: { name: true }
          },
          _count: {
            select: { checkIns: true }
          }
        },
        take: 10,
        orderBy: { schedule: 'asc' }
      }),

      // Revenue estimation (based on membership tiers)
      (async () => {
        const tierCounts = await prisma.student.groupBy({
          by: ['membershipTier'],
          where: { dojoId },
          _count: { id: true }
        });

        // Estimated monthly revenue per tier (adjust based on your pricing)
        const tierPricing: Record<string, number> = {
          'FREE': 0,
          'YOUTUBE': 10,
          'GOLD': 50,
          'ROYAL': 100
        };

        let estimatedMonthly = 0;
        const tierBreakdown = tierCounts.map(t => {
          const price = tierPricing[t.membershipTier] || 0;
          const revenue = t._count.id * price;
          estimatedMonthly += revenue;
          return {
            tier: t.membershipTier,
            count: t._count.id,
            price,
            revenue
          };
        });

        return {
          estimatedMonthly,
          tierBreakdown,
          estimatedAnnual: estimatedMonthly * 12
        };
      })()
    ]);

    // Calculate growth rate
    const growthRate = newLastMonth > 0 
      ? Math.round(((newThisMonth - newLastMonth) / newLastMonth) * 100)
      : 0;

    // Calculate retention rate
    const retentionRate = totalStudents > 0
      ? Math.round((activeStudents / totalStudents) * 100)
      : 0;

    return NextResponse.json({
      success: true,
      metrics: {
        overview: {
          totalStudents,
          activeStudents,
          retentionRate,
          newThisMonth,
          growthRate,
          totalClasses,
          totalInstructors: await prisma.instructor.count({ where: { dojoId } })
        },
        attendance: {
          today: checkInsToday,
          thisWeek: checkInsThisWeek,
          thisMonth: checkInsThisMonth,
          rate: attendanceRate
        },
        membership: {
          byTier: studentsByTier.map(t => ({
            tier: t.membershipTier,
            count: t._count.id
          }))
        },
        revenue: revenueData,
        atRisk: atRiskStudents.map(s => ({
          ...s,
          daysSinceCheckIn: s.lastCheckIn 
            ? Math.floor((now.getTime() - new Date(s.lastCheckIn).getTime()) / (1000 * 60 * 60 * 24))
            : null
        })),
        recentActivity: recentCheckIns.map(c => ({
          id: c.id,
          studentName: c.student.name,
          studentBelt: c.student.beltRank,
          membershipTier: c.student.membershipTier,
          className: c.class.name,
          checkedInAt: c.checkedInAt,
          method: c.method
        })),
        upcomingClasses: upcomingClasses.map(c => ({
          id: c.id,
          name: c.name,
          schedule: c.schedule,
          location: c.location,
          maxStudents: c.maxStudents,
          registered: c._count.checkIns,
          instructorName: c.instructor.name
        }))
      }
    });
  } catch (error: any) {
    console.error("Admin dashboard error:", error);
    return NextResponse.json(
      { error: "Failed to load dashboard" },
      { status: 500 }
    );
  }
}
