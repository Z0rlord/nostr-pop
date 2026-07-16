import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  assertCanInviteEmail,
  createDojoInvite,
  inviteAcceptPath,
  sendInviteEmail,
} from "@/lib/invites";

// POST /api/instructor/invite - Create a new instructor invite
export async function POST(req: NextRequest) {
  try {
    // Get current user from session
    const sessionCookie = req.cookies.get("session")?.value;
    const roleCookie = req.cookies.get("role")?.value;
    
    if (!sessionCookie || !roleCookie) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Only instructors/admins can invite
    if (roleCookie !== "instructor" && roleCookie !== "admin") {
      return NextResponse.json(
        { error: "Only instructors can invite other instructors" },
        { status: 403 }
      );
    }

    const { email, name } = await req.json();
    
    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    const invitingInstructor = await prisma.instructor.findUnique({
      where: { id: sessionCookie },
    });

    if (!invitingInstructor) {
      return NextResponse.json(
        { error: "Inviting instructor not found" },
        { status: 404 }
      );
    }

    const activeDojo =
      req.cookies.get("activeDojo")?.value || invitingInstructor.dojoId;

    try {
      await assertCanInviteEmail(email, activeDojo);
    } catch (err: unknown) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Invalid email" },
        { status: 400 }
      );
    }

    const dojo = await prisma.dojo.findUnique({
      where: { id: activeDojo },
    });

    const { invite, inviteUrl } = await createDojoInvite({
      email,
      name,
      dojoId: activeDojo,
      invitedBy: sessionCookie,
      inviteRole: "instructor",
    });

    try {
      await sendInviteEmail({
        to: email,
        name,
        dojoName: dojo?.name || "Tenshinryu",
        inviteUrl,
        inviteRole: "instructor",
        expiresAt: invite.expiresAt,
      });
    } catch (emailError) {
      console.error("Failed to send invite email:", emailError);
    }

    return NextResponse.json({
      success: true,
      invite: {
        id: invite.id,
        email: invite.email,
        name: invite.name,
        token: invite.token,
        expiresAt: invite.expiresAt,
        inviteUrl,
      },
    });
  } catch (error: any) {
    console.error("Create invite error:", error);
    return NextResponse.json(
      { error: "Failed to create invite" },
      { status: 500 }
    );
  }
}

// PATCH /api/instructor/invite - Resend an existing invite
export async function PATCH(req: NextRequest) {
  try {
    const sessionCookie = req.cookies.get("session")?.value;
    const roleCookie = req.cookies.get("role")?.value;
    
    if (!sessionCookie || !roleCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (roleCookie !== "instructor" && roleCookie !== "admin") {
      return NextResponse.json(
        { error: "Only instructors can resend invites" },
        { status: 403 }
      );
    }

    const { inviteId } = await req.json();
    
    if (!inviteId) {
      return NextResponse.json(
        { error: "Invite ID is required" },
        { status: 400 }
      );
    }

    // Get the inviting instructor
    const invitingInstructor = await prisma.instructor.findUnique({
      where: { id: sessionCookie }
    });
    
    if (!invitingInstructor) {
      return NextResponse.json(
        { error: "Instructor not found" },
        { status: 404 }
      );
    }

    // Find the invite
    const invite = await prisma.instructorInvite.findFirst({
      where: { 
        id: inviteId,
        dojoId: invitingInstructor.dojoId,
        status: "pending"
      }
    });
    
    if (!invite) {
      return NextResponse.json(
        { error: "Invite not found or already accepted/expired" },
        { status: 404 }
      );
    }

    // Get dojo info
    const dojo = await prisma.dojo.findUnique({
      where: { id: invite.dojoId }
    });

    // Generate invite URL
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://tenshinryu.xyz"}/invite/instructor?token=${invite.token}`;

    // Resend email
    try {
      const resend = getResendClient();
      if (resend) {
      await resend.emails.send({
        from: "Tenshinryu <onboarding@resend.dev>",
        to: invite.email,
        subject: `Reminder: You've been invited to join ${dojo?.name || "Tenshinryu"} as an instructor`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Instructor Invitation - Reminder</h2>
            <p>Hi ${invite.name || "there"},</p>
            <p>This is a reminder that you have been invited to join <strong>${dojo?.name || "Tenshinryu"}</strong> as an instructor.</p>
            <p>Click the link below to accept your invitation:</p>
            <p><a href="${inviteUrl}" style="display: inline-block; background: #ff4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Accept Invitation</a></p>
            <p>Or copy this link:<br /><code>${inviteUrl}</code></p>
            <p>This invitation expires on ${invite.expiresAt.toLocaleDateString()}.</p>
            <hr>
            <p style="font-size: 12px; color: #666;">If you did not expect this invitation, please ignore this email.</p>
          </div>
        `,
      });
      console.log("Invite email resent to:", invite.email);
      }
    } catch (emailError) {
      console.error("Failed to resend invite email:", emailError);
      return NextResponse.json(
        { error: "Failed to send email" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Invite email resent successfully",
      invite: {
        id: invite.id,
        email: invite.email,
        name: invite.name,
        inviteUrl,
      }
    });
  } catch (error: any) {
    console.error("Resend invite error:", error);
    return NextResponse.json(
      { error: "Failed to resend invite" },
      { status: 500 }
    );
  }
}

// GET /api/instructor/invite - List all invites for the current dojo
export async function GET(req: NextRequest) {
  try {
    const sessionCookie = req.cookies.get("session")?.value;
    const roleCookie = req.cookies.get("role")?.value;
    
    if (!sessionCookie || !roleCookie) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (roleCookie !== "instructor" && roleCookie !== "admin") {
      return NextResponse.json(
        { error: "Only instructors can view invites" },
        { status: 403 }
      );
    }

    const instructor = await prisma.instructor.findUnique({
      where: { id: sessionCookie }
    });

    if (!instructor) {
      return NextResponse.json(
        { error: "Instructor not found" },
        { status: 404 }
      );
    }

    const invites = await prisma.instructorInvite.findMany({
      where: { dojoId: instructor.dojoId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        createdAt: true,
        expiresAt: true,
        acceptedAt: true,
      }
    });

    return NextResponse.json({ success: true, invites });
  } catch (error: any) {
    console.error("List invites error:", error);
    return NextResponse.json(
      { error: "Failed to fetch invites" },
      { status: 500 }
    );
  }
}
