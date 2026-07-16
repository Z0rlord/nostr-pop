import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { upsertFirebaseEmailUser } from "@/lib/firebase-users";
import { ensureMembership } from "@/lib/session";

// POST /api/instructor/invite/accept - Accept invite and create/link instructor account
export async function POST(req: NextRequest) {
  try {
    const { token, name, password } = await req.json();

    if (!token || !name || !password) {
      return NextResponse.json(
        { error: "Token, name, and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const invite = await prisma.instructorInvite.findUnique({
      where: { token },
    });

    if (!invite) {
      return NextResponse.json({ error: "Invalid invite token" }, { status: 404 });
    }

    if (invite.status !== "pending") {
      return NextResponse.json(
        { error: "This invite has already been used" },
        { status: 400 }
      );
    }

    if (new Date() > invite.expiresAt) {
      return NextResponse.json({ error: "This invite has expired" }, { status: 400 });
    }

    const isOwner = invite.inviteRole === "owner";
    const hashedPassword = await bcrypt.hash(password, 10);

    let firebaseUid: string | undefined;
    try {
      firebaseUid = await upsertFirebaseEmailUser({
        email: invite.email,
        password,
        displayName: name,
      });
    } catch (e) {
      console.error("Firebase user create failed (continuing with DB account):", e);
    }

    let instructor = await prisma.instructor.findFirst({
      where: { email: { equals: invite.email, mode: "insensitive" } },
    });

    if (instructor) {
      // Existing person joining another dojo (or re-accept)
      instructor = await prisma.instructor.update({
        where: { id: instructor.id },
        data: {
          name,
          password: hashedPassword,
          ...(firebaseUid ? { firebaseUid } : {}),
          // Keep primary dojo; memberships track access
          ...(isOwner ? { isAdmin: true } : {}),
        },
      });
    } else {
      instructor = await prisma.instructor.create({
        data: {
          email: invite.email,
          name,
          password: hashedPassword,
          dojoId: invite.dojoId,
          isAdmin: isOwner,
          firebaseUid: firebaseUid || null,
        },
      });
    }

    await ensureMembership({
      instructorId: instructor.id,
      dojoId: invite.dojoId,
      isAdmin: isOwner,
    });

    await prisma.instructorInvite.update({
      where: { id: invite.id },
      data: {
        status: "accepted",
        acceptedAt: new Date(),
      },
    });

    const role = isOwner ? "admin" : "instructor";
    const response = NextResponse.json({
      success: true,
      message: "Account created successfully",
      role,
      instructor: {
        id: instructor.id,
        name: instructor.name,
        email: instructor.email,
        isAdmin: isOwner,
        dojoId: invite.dojoId,
      },
    });

    response.cookies.set("session", instructor.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });

    response.cookies.set("role", role, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });

    response.cookies.set("activeDojo", invite.dojoId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });

    return response;
  } catch (error: unknown) {
    console.error("Accept invite error:", error);
    return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
  }
}
