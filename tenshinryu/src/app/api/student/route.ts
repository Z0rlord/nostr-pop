import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  try {
    let name: string | undefined;
    let email: string | undefined;
    let password: string | undefined;
    let firebaseUid: string | undefined;
    let dojoId: string | undefined;
    let dojoCode: string | undefined;

    const contentType = req.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");

    if (isJson) {
      const body = await req.json();
      name = body.name;
      email = body.email;
      password = body.password;
      firebaseUid = body.firebaseUid;
      dojoId = body.dojoId;
      dojoCode = body.dojoCode;
    } else {
      const formData = await req.formData();
      name = formData.get("name") as string;
      email = formData.get("email") as string;
      password = formData.get("password") as string;
      dojoId = (formData.get("dojoId") as string) || undefined;
      dojoCode = (formData.get("dojoCode") as string) || undefined;
    }

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const existingStudent = await prisma.student.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
    });

    if (existingStudent) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    let dojo = null;
    if (dojoId) {
      dojo = await prisma.dojo.findUnique({ where: { id: dojoId } });
    } else if (dojoCode) {
      dojo = await prisma.dojo.findFirst({
        where: { code: { equals: dojoCode.trim(), mode: "insensitive" } },
      });
    }

    if (!dojo) {
      return NextResponse.json(
        {
          error:
            "School required — provide dojoCode (or dojoId). Open signup from your school’s invite link.",
          code: "DOJO_REQUIRED",
        },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const qrCode = `dojo-${randomUUID()}`;

    const student = await prisma.student.create({
      data: {
        name,
        email,
        password: hashedPassword,
        qrCode,
        dojoId: dojo.id,
        beltRank: "WHITE",
        stripes: 0,
        dojoBalance: 0,
        totalEarned: 0,
        totalSpent: 0,
        isActive: true,
        firebaseUid: firebaseUid || null,
        membershipTier: "FREE",
        membershipStatus: "active",
      },
    });

    if (isJson) {
      const response = NextResponse.json({
        success: true,
        student: {
          id: student.id,
          name: student.name,
          email: student.email,
          tier: student.membershipTier,
          dojoId: dojo.id,
        },
      });

      response.cookies.set("session", student.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 30 * 24 * 60 * 60,
      });

      response.cookies.set("role", "student", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 30 * 24 * 60 * 60,
      });

      return response;
    }

    return new NextResponse(
      `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:24px">
        <h1>Account Created!</h1>
        <p>Welcome, ${student.name}!</p>
        <a href="/login">Go to Login</a>
      </body></html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  } catch (error: unknown) {
    console.error("Create student error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to create account: " + message },
      { status: 500 }
    );
  }
}
