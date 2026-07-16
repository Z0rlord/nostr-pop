import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff, unauthorized, forbidden } from "@/lib/session";
import { existsSync, readdirSync } from "fs";
import { join } from "path";

// GET students for the active dojo (staff only)
export async function GET(req: NextRequest) {
  try {
    const staff = await requireStaff(req);
    if (staff instanceof NextResponse) return staff;

    const students = await prisma.student.findMany({
      where: { dojoId: staff.dojoId },
      include: {
        dojo: {
          select: { name: true },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    const uploadsDir = join(process.cwd(), "public", "uploads", "avatars");
    let avatarFiles: string[] = [];
    try {
      if (existsSync(uploadsDir)) avatarFiles = readdirSync(uploadsDir);
    } catch {
      // Directory doesn't exist yet
    }

    const studentsWithAvatars = students.map((student) => {
      const avatarFile = avatarFiles.find((f) => f.startsWith(student.id));
      const avatarUrl = avatarFile ? `/uploads/avatars/${avatarFile}` : null;

      return {
        id: student.id,
        name: student.name,
        email: student.email,
        beltRank: student.beltRank,
        qrCode: student.qrCode,
        avatarUrl,
        dojoId: student.dojoId,
        dojoName: student.dojo.name,
        createdAt: student.joinedAt,
      };
    });

    return NextResponse.json({
      students: studentsWithAvatars,
      dojoId: staff.dojoId,
    });
  } catch (error: unknown) {
    console.error("Fetch students error:", error);
    return NextResponse.json({ error: "Failed to fetch students" }, { status: 500 });
  }
}
