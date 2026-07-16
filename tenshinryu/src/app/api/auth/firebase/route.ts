import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { verifyIdToken } from "@/lib/firebase-admin";

// Structured error logging
class AuthError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = "AuthError";
  }
}

function logError(context: string, error: unknown, metadata?: Record<string, unknown>) {
  const timestamp = new Date().toISOString();
  const errorInfo = error instanceof Error 
    ? { message: error.message, stack: error.stack, name: error.name }
    : { message: String(error) };
    
  console.error(JSON.stringify({
    timestamp,
    level: "ERROR",
    context,
    ...errorInfo,
    ...metadata,
  }));
}

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  console.log('[API Auth] Request started:', requestId);
  
  try {
    let body;
    try {
      body = await req.json();
      console.log('[API Auth] Request body:', { email: body.email, hasIdToken: !!body.idToken });
    } catch (e) {
      console.error('[API Auth] Invalid JSON body:', e);
      throw new AuthError("Invalid JSON body", "INVALID_BODY", 400);
    }
    
    const { idToken, email, name, photoURL } = body;
    
    if (!email || typeof email !== "string") {
      throw new AuthError("Email required", "MISSING_EMAIL", 400);
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new AuthError("Invalid email format", "INVALID_EMAIL", 400);
    }

    let firebaseUid: string | undefined;
    if (idToken && typeof idToken === "string") {
      try {
        firebaseUid = (await verifyIdToken(idToken)).uid;
      } catch {
        throw new AuthError("Invalid Firebase token", "INVALID_TOKEN", 401);
      }
    }
    
    let role = "";
    let userId = "";
    let userName = "";
    let userEmail = email.toLowerCase();
    let found = false;

    const instructor = await prisma.instructor.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      include: { memberships: true },
    });

    if (instructor) {
      found = true;
      const isAdminAnywhere =
        instructor.isAdmin || instructor.memberships.some((m) => m.isAdmin);
      role = isAdminAnywhere ? "admin" : "instructor";
      userId = instructor.id;
      userName = instructor.name;
      userEmail = instructor.email;
      if (firebaseUid && !instructor.firebaseUid) {
        await prisma.instructor.update({
          where: { id: instructor.id },
          data: { firebaseUid },
        });
      }
    } else {
      const student = await prisma.student.findFirst({
        where: { email: { equals: email, mode: "insensitive" } },
      });

      if (student) {
        found = true;
        role = "student";
        userId = student.id;
        userName = student.name;
        userEmail = student.email || email;
        if (firebaseUid && !student.firebaseUid) {
          await prisma.student.update({
            where: { id: student.id },
            data: { firebaseUid },
          });
        }
      }
    }

    if (!found) {
      // Require an explicit school — never assign to an arbitrary findFirst() dojo
      const dojoId = typeof body.dojoId === "string" ? body.dojoId : undefined;
      const dojoCode = typeof body.dojoCode === "string" ? body.dojoCode.trim() : undefined;

      let dojo = null;
      if (dojoId) {
        dojo = await prisma.dojo.findUnique({ where: { id: dojoId } });
      } else if (dojoCode) {
        dojo = await prisma.dojo.findFirst({
          where: { code: { equals: dojoCode, mode: "insensitive" } },
        });
      }

      if (!dojo) {
        throw new AuthError(
          "Choose a school (dojo code or invite) before creating an account",
          "DOJO_REQUIRED",
          400
        );
      }

      const newStudent = await prisma.student.create({
        data: {
          email: email.toLowerCase(),
          name: name || email.split("@")[0],
          firebaseUid,
          qrCode: crypto.randomUUID(),
          dojoId: dojo.id,
          isActive: true,
          beltRank: "WHITE",
        },
      });

      role = "student";
      userId = newStudent.id;
      userName = newStudent.name;
      userEmail = newStudent.email || email;
    }

    const response = NextResponse.json({
      role,
      name: userName,
      email: userEmail,
    });
    
    // Debug: log cookie settings
    console.log('[API Auth] Setting cookie for user:', userId.slice(0, 8) + '...');
    console.log('[API Auth] NODE_ENV:', process.env.NODE_ENV);
    
    try {
      response.cookies.set("session", userId, {
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

    if (instructor) {
      const activeDojo =
        instructor.memberships.find((m) => m.isAdmin)?.dojoId ||
        instructor.memberships[0]?.dojoId ||
        instructor.dojoId;
      response.cookies.set("activeDojo", activeDojo, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 30 * 24 * 60 * 60,
      });
    }
    console.log('[API Auth] Cookies set successfully');
    } catch (cookieErr: any) {
      console.error('[API Auth] Cookie error:', cookieErr);
      throw new AuthError("Failed to set session cookie: " + cookieErr.message, "COOKIE_ERROR", 500);
    }
    
    logError("Auth: Success", new Error("OK"), { 
      email, 
      role, 
      requestId,
      userId: userId.slice(0, 8) + "..."
    });
    
    console.log('[API Auth] Request completed successfully:', requestId);
    return response;
    
  } catch (error) {
    if (error instanceof AuthError) {
      logError("Auth: Validation error", error, { requestId, code: error.code });
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }

    const isDbError =
      error instanceof Prisma.PrismaClientInitializationError ||
      (error instanceof Prisma.PrismaClientKnownRequestError &&
        ["P1001", "P1002", "P1017"].includes(error.code));

    if (isDbError) {
      logError("Auth: Database unavailable", error, { requestId });
      return NextResponse.json(
        {
          error: "Database temporarily unavailable. Please try again in a moment.",
          code: "DATABASE_UNAVAILABLE",
        },
        { status: 503 }
      );
    }

    logError("Auth: System error", error, { requestId });

    return NextResponse.json(
      { error: "Authentication service unavailable", code: "SYSTEM_ERROR" },
      { status: 500 }
    );
  }
}
