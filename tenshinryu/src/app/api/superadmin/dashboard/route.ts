import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  assertCanInviteEmail,
  createDojoInvite,
  inviteAcceptPath,
  sendInviteEmail,
} from "@/lib/invites";

// GET /api/superadmin/dashboard - Cross-dojo system metrics
export async function GET(req: NextRequest) {
  try {
    // Check for super admin - requires SUPERADMIN_KEY env var
    const authHeader = req.headers.get("x-superadmin-key");
    const superAdminKey = process.env.SUPERADMIN_KEY;
    
    if (!superAdminKey) {
      return NextResponse.json({ error: "Superadmin not configured" }, { status: 503 });
    }
    
    if (!authHeader || authHeader !== superAdminKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // System-wide metrics
    const [
      totalDojos,
      totalStudents,
      totalInstructors,
      totalClasses,
      totalCheckIns,
      recentSignups,
      dojoStats,
      recentErrors,
      dbStats
    ] = await Promise.all([
      prisma.dojo.count(),
      prisma.student.count(),
      prisma.instructor.count(),
      prisma.class.count(),
      prisma.checkIn.count(),
      
      // Recent signups (last 7 days)
      prisma.student.count({
        where: {
          joinedAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      }),

      // Per-dojo breakdown
      prisma.dojo.findMany({
        select: {
          id: true,
          name: true,
          timezone: true,
          createdAt: true,
          _count: {
            select: {
              students: true,
              instructors: true,
              classes: true,
              checkIns: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),

      // Recent errors from a simple log (we'll track in memory for now)
      Promise.resolve([]), // Placeholder for error tracking

      // Database size estimation
      Promise.all([
        prisma.$queryRaw`SELECT pg_size_pretty(pg_database_size(current_database())) as size`,
        prisma.$queryRaw`SELECT count(*) as count FROM "Student"`,
        prisma.$queryRaw`SELECT count(*) as count FROM "CheckIn"`
      ])
    ]);

    // Calculate revenue across all dojos
    const tierCounts = await prisma.student.groupBy({
      by: ['membershipTier'],
      _count: { id: true }
    });

    const tierPricing: Record<string, number> = {
      'FREE': 0,
      'YOUTUBE': 10,
      'GOLD': 50,
      'ROYAL': 100
    };

    const revenue = tierCounts.reduce((acc, tier) => {
      return acc + (tier._count.id * (tierPricing[tier.membershipTier] || 0));
    }, 0);

    return NextResponse.json({
      success: true,
      system: {
        totalDojos,
        totalStudents,
        totalInstructors,
        totalClasses,
        totalCheckIns,
        recentSignups,
        estimatedMonthlyRevenue: revenue,
        estimatedAnnualRevenue: revenue * 12
      },
      dojos: dojoStats.map(d => ({
        id: d.id,
        name: d.name,
        timezone: d.timezone,
        createdAt: d.createdAt,
        students: d._count.students,
        instructors: d._count.instructors,
        classes: d._count.classes,
        checkIns: d._count.checkIns
      })),
      database: {
        size: dbStats[0][0]?.size || 'unknown',
        studentsTable: Number(dbStats[1][0]?.count || 0),
        checkInsTable: Number(dbStats[2][0]?.count || 0)
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error("Super admin error:", error);
    return NextResponse.json(
      { error: "Failed to load system data", details: error.message },
      { status: 500 }
    );
  }
}

// POST /api/superadmin/action - Perform admin actions
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("x-superadmin-key");
    const superAdminKey = process.env.SUPERADMIN_KEY || "dev-admin-123";
    
    if (authHeader !== superAdminKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action, data } = body;

    switch (action) {
      case "listInvites": {
        const { dojoId, status = "pending" } = data;
        const invites = await prisma.instructorInvite.findMany({
          where: { 
            ...(dojoId && { dojoId }),
            status
          },
          select: {
            id: true,
            email: true,
            name: true,
            status: true,
            inviteRole: true,
            createdAt: true,
            expiresAt: true,
            token: true,
            dojo: { select: { id: true, name: true } }
          },
          orderBy: { createdAt: 'desc' }
        });
        
        const invitesWithLinks = invites.map((invite) => ({
          ...invite,
          link: inviteAcceptPath(
            invite.inviteRole === "owner" ? "owner" : "instructor",
            invite.token
          ),
        }));
        
        return NextResponse.json({ success: true, invites: invitesWithLinks });
      }

      case "resendInvite": {
        const { inviteId } = data;

        const invite = await prisma.instructorInvite.findUnique({
          where: { id: inviteId },
        });

        if (!invite) {
          return NextResponse.json({ error: "Invite not found" }, { status: 404 });
        }

        if (invite.status !== "pending") {
          return NextResponse.json({ error: "Invite is not pending" }, { status: 400 });
        }

        const dojo = await prisma.dojo.findUnique({
          where: { id: invite.dojoId },
        });

        const inviteRole = invite.inviteRole === "owner" ? "owner" : "instructor";
        const inviteUrl = inviteAcceptPath(inviteRole, invite.token);

        try {
          await sendInviteEmail({
            to: invite.email,
            name: invite.name,
            dojoName: dojo?.name || "Tenshinryu",
            inviteUrl,
            inviteRole,
            expiresAt: invite.expiresAt,
            reminder: true,
          });
        } catch (emailError) {
          console.error("Resend invite email failed:", emailError);
          return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
        }

        return NextResponse.json({
          success: true,
          message: "Invite resent successfully",
        });
      }

      case "makeAdmin": {
        const { instructorId } = data;
        await prisma.instructor.update({
          where: { id: instructorId },
          data: { isAdmin: true }
        });
        return NextResponse.json({ success: true, message: "Instructor promoted to admin" });
      }

      case "listInstructors": {
        const { dojoId } = data;
        const instructors = await prisma.instructor.findMany({
          where: dojoId ? { dojoId } : undefined,
          select: {
            id: true,
            name: true,
            email: true,
            isAdmin: true,
            dojo: { select: { name: true } }
          },
          orderBy: { name: 'asc' }
        });
        return NextResponse.json({ success: true, instructors });
      }

      case "deleteDojo": {
        const { dojoId } = data;
        // Cascade delete would happen here if configured
        await prisma.dojo.delete({ where: { id: dojoId } });
        return NextResponse.json({ success: true, message: "Dojo deleted" });
      }

      case "inviteOwner": {
        const { dojoId, leaderName, leaderEmail } = data;

        if (!dojoId || !leaderEmail) {
          return NextResponse.json(
            { error: "dojoId and leaderEmail are required" },
            { status: 400 }
          );
        }

        try {
          await assertCanInviteEmail(leaderEmail);
        } catch (err: unknown) {
          return NextResponse.json(
            { error: err instanceof Error ? err.message : "Invalid email" },
            { status: 400 }
          );
        }

        const dojo = await prisma.dojo.findUnique({ where: { id: dojoId } });
        if (!dojo) {
          return NextResponse.json({ error: "Dojo not found" }, { status: 404 });
        }

        const { invite, inviteUrl } = await createDojoInvite({
          email: leaderEmail,
          name: leaderName,
          dojoId,
          invitedBy: "superadmin",
          inviteRole: "owner",
        });

        let emailSent = false;
        try {
          emailSent = await sendInviteEmail({
            to: leaderEmail,
            name: leaderName,
            dojoName: dojo.name,
            inviteUrl,
            inviteRole: "owner",
            expiresAt: invite.expiresAt,
          });
        } catch (emailError) {
          console.error("Owner invite email failed:", emailError);
        }

        return NextResponse.json({
          success: true,
          message: emailSent
            ? "Owner invite sent by email"
            : "Owner invite created (email not sent — check RESEND_API_KEY)",
          invite: {
            id: invite.id,
            email: invite.email,
            link: inviteUrl,
            expiresAt: invite.expiresAt,
          },
        });
      }

      case "createDojo": {
        const { dojoName, leaderName, leaderEmail, timezone = "Europe/Warsaw" } = data;

        try {
          await assertCanInviteEmail(leaderEmail);
        } catch (err: unknown) {
          return NextResponse.json(
            { error: err instanceof Error ? err.message : "Invalid email" },
            { status: 400 }
          );
        }

        const dojo = await prisma.dojo.create({
          data: {
            name: dojoName,
            location: "",
            timezone,
          },
        });

        const { invite, inviteUrl } = await createDojoInvite({
          email: leaderEmail,
          name: leaderName,
          dojoId: dojo.id,
          invitedBy: "superadmin",
          inviteRole: "owner",
        });

        let emailSent = false;
        try {
          emailSent = await sendInviteEmail({
            to: leaderEmail,
            name: leaderName,
            dojoName: dojo.name,
            inviteUrl,
            inviteRole: "owner",
            expiresAt: invite.expiresAt,
          });
        } catch (emailError) {
          console.error("Owner invite email failed:", emailError);
        }

        return NextResponse.json({
          success: true,
          message: emailSent
            ? "Dojo created and owner invite emailed"
            : "Dojo created — copy the invite link (email not sent)",
          dojo: { id: dojo.id, name: dojo.name },
          invite: {
            id: invite.id,
            email: invite.email,
            token: invite.token,
            link: inviteUrl,
            expiresAt: invite.expiresAt,
          },
        });
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error: any) {
    console.error("Super admin action error:", error);
    return NextResponse.json(
      { error: "Action failed", details: error.message },
      { status: 500 }
    );
  }
}
