import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { existsSync, readdirSync } from "fs";
import { join } from "path";

const prisma = new PrismaClient();

// GET all students with avatar URLs
export async function GET() {
  try {
    const students = await prisma.student.findMany({
      include: {
        dojo: {
          select: { name: true },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    // Get list of avatar files
    const uploadsDir = join(process.cwd(), "public", "uploads", "avatars");
    let avatarFiles: string[] = [];
    try {
      avatarFiles = readdirSync(uploadsDir);
    } catch {
      // Directory doesn't exist yet
    }

    // Check for avatar files and add URLs
    const studentsWithAvatars = students.map((student) => {
      // Find any file starting with student ID
      const avatarFile = avatarFiles.find(f => f.startsWith(student.id));
      const avatarUrl = avatarFile ? `/uploads/avatars/${avatarFile}` : null;

      return {
        id: student.id,
        name: student.name,
        email: student.email,
        beltRank: student.beltRank,
        qrCode: student.qrCode,
        avatarUrl,
        dojoName: student.dojo.name,
        createdAt: student.createdAt,
      };
    });

    return NextResponse.json({
      students: studentsWithAvatars,
    });
  } catch (error: any) {
    console.error("Fetch students error:", error);
    return NextResponse.json(
      { error: "Failed to fetch students" },
      { status: 500 }
    );
  }
}
