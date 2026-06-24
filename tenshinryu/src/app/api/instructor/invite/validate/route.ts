import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/instructor/invite/validate?token=xxx - Validate an invite token
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { error: "Token is required" },
        { status: 400 }
      );
    }

    const invite = await prisma.instructorInvite.findUnique({
      where: { token },
      include: {
        dojo: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    });

    if (!invite) {
      return NextResponse.json(
        { error: "Invalid invite token" },
        { status: 404 }
      );
    }

    if (invite.status !== "pending") {
      return NextResponse.json(
        { error: "This invite has already been used", status: invite.status },
        { status: 400 }
      );
    }

    if (new Date() > invite.expiresAt) {
      return NextResponse.json(
        { error: "This invite has expired", expired: true },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      invite: {
        email: invite.email,
        name: invite.name,
        dojoName: invite.dojo.name,
        inviteRole: invite.inviteRole,
        expiresAt: invite.expiresAt,
      },
    });
  } catch (error: any) {
    console.error("Validate invite error:", error);
    return NextResponse.json(
      { error: "Failed to validate invite" },
      { status: 500 }
    );
  }
}
