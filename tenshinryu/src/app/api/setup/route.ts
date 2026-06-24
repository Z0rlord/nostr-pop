import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    // Check if any instructors already exist
    const existingInstructors = await prisma.instructor.count();
    if (existingInstructors > 0) {
      return new NextResponse(
        `<!DOCTYPE html><html><body>
          <h1>Setup Already Complete</h1>
          <p>An instructor already exists. Please contact them to add you.</p>
          <a href="/login">Go to Login</a>
        </body></html>`,
        { headers: { "Content-Type": "text/html" } }
      );
    }

    // Handle form data
    const formData = await req.formData();
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const dojoName = formData.get("dojoName") as string;

    if (!name || !email || !password || !dojoName) {
      return new NextResponse(
        `<!DOCTYPE html><html><body>
          <h1>Error</h1><p>All fields are required</p>
          <a href="/setup">Back to Setup</a>
        </body></html>`,
        { headers: { "Content-Type": "text/html" }, status: 400 }
      );
    }

    // Create dojo first
    const dojo = await prisma.dojo.create({
      data: {
        name: dojoName,
        location: "",
        timezone: "Europe/Warsaw",
      },
    });

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create instructor
    const instructor = await prisma.instructor.create({
      data: {
        name,
        email,
        password: hashedPassword,
        dojoId: dojo.id,
        isAdmin: true,
      },
    });

    return new NextResponse(
      `<!DOCTYPE html>
      <html>
        <head><title>Setup Complete</title></head>
        <body style="font-family: sans-serif; padding: 24px; background: #f5f5f5;">
          <div style="max-width: 400px; margin: 0 auto; background: white; padding: 24px; text-align: center;">
            <h1>Setup Complete!</h1>
            <p>Dojo: ${dojo.name}</p>
            <p>Instructor: ${instructor.name}</p>
            <a href="/login" style="display: inline-block; margin-top: 16px; padding: 12px 24px; background: #000; color: #fff; text-decoration: none;">Go to Login</a>
          </div>
        </body>
      </html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  } catch (error: any) {
    console.error("Setup error:", error);
    return new NextResponse(
      `<!DOCTYPE html><html><body>
        <h1>Error</h1><p>${error.message}</p>
        <a href="/setup">Back to Setup</a>
      </body></html>`,
      { headers: { "Content-Type": "text/html" }, status: 500 }
    );
  }
}
