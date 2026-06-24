import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  try {
    // Handle both JSON and form data
    let name, email, password, firebaseUid, photoURL;
    
    const contentType = req.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");
    
    if (isJson) {
      const body = await req.json();
      name = body.name;
      email = body.email;
      password = body.password;
      firebaseUid = body.firebaseUid;
      photoURL = body.photoURL;
    } else {
      // Form data
      const formData = await req.formData();
      name = formData.get("name") as string;
      email = formData.get("email") as string;
      password = formData.get("password") as string;
    }

    // Validation
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

    // Check if email already exists
    const existingStudent = await prisma.student.findFirst({
      where: { email },
    });

    if (existingStudent) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate unique QR code
    const qrCode = `dojo-${randomUUID()}`;

    // Get default dojo
    const defaultDojo = await prisma.dojo.findFirst();
    if (!defaultDojo) {
      return NextResponse.json(
        { error: "No dojo available" },
        { status: 400 }
      );
    }

    // Create student with FREE tier
    const student = await prisma.student.create({
      data: {
        name,
        email,
        password: hashedPassword,
        qrCode,
        dojoId: defaultDojo.id,
        beltRank: "WHITE",
        stripes: 0,
        dojoBalance: 0,
        totalEarned: 0,
        totalSpent: 0,
        isActive: true,
        firebaseUid: firebaseUid || null,
        // Membership defaults to FREE tier
        membershipTier: "FREE",
        membershipStatus: "active",
      },
    });

    // If JSON request (React form), set session cookie and return JSON
    if (isJson) {
      const response = NextResponse.json({
        success: true,
        student: { 
          id: student.id, 
          name: student.name, 
          email: student.email,
          tier: student.membershipTier,
        }
      });
      
      response.cookies.set("session", student.id, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
        maxAge: 30 * 24 * 60 * 60,
      });
      
      response.cookies.set("role", "student", {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
        maxAge: 30 * 24 * 60 * 60,
      });
      
      return response;
    }

    // Return HTML success page for form submissions
    return new NextResponse(
      `
      <!DOCTYPE html>
      <html>
        <head><title>Success</title></head>
        <body style="font-family: sans-serif; padding: 24px; background: #f5f5f5;">
          <div style="max-width: 400px; margin: 0 auto; background: white; padding: 24px; text-align: center;">
            <h1>Account Created!</h1>
            <p>Welcome, ${student.name}!</p>
            <p style="color: #666;">You're on the FREE tier. Upgrade anytime!</p>
            <a href="/login" style="display: inline-block; margin-top: 16px; padding: 12px 24px; background: #000; color: #fff; text-decoration: none;">Go to Login</a>
          </div>
        </body>
      </html>
      `,
      { headers: { "Content-Type": "text/html" } }
    );
  } catch (error: any) {
    console.error("Create student error:", error);
    return NextResponse.json(
      { error: "Failed to create account: " + (error.message || "Unknown error") },
      { status: 500 }
    );
  }
}
