import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/session";
import { isSuperadminKey } from "@/lib/superadmin";
import { existsSync, readdirSync } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";

const BELT_RANKS = [
  "WHITE", "YELLOW", "ORANGE", "GREEN", "BLUE", "PURPLE",
  "BROWN", "BLACK", "RED_BLACK", "RED_WHITE", "RED",
] as const;
const MEMBERSHIP_TIERS = ["NONE", "YOUTUBE", "GOLD", "ROYAL"] as const;

function avatarMap() {
  const uploadsDir = join(process.cwd(), "public", "uploads", "avatars");
  try {
    return existsSync(uploadsDir) ? readdirSync(uploadsDir) : [];
  } catch {
    return [];
  }
}

function serialize(student: any, avatarFiles: string[]) {
  const avatarFile = avatarFiles.find((f) => f.startsWith(student.id));
  return {
    id: student.id,
    name: student.name,
    email: student.email,
    phone: student.phone,
    beltRank: student.beltRank,
    stripes: student.stripes,
    qrCode: student.qrCode,
    isActive: student.isActive,
    membershipTier: student.membershipTier,
    membershipStatus: student.membershipStatus,
    lastCheckIn: student.lastCheckIn,
    avatarUrl: avatarFile ? `/uploads/avatars/${avatarFile}` : null,
    dojoId: student.dojoId,
    dojoName: student.dojo?.name,
    createdAt: student.joinedAt,
  };
}

// GET students for the active dojo (staff), or any dojo with ?dojoId=
// when authenticated with the superadmin key.
export async function GET(req: NextRequest) {
  try {
    let dojoId: string;
    if (isSuperadminKey(req)) {
      dojoId = req.nextUrl.searchParams.get("dojoId") || "";
      if (!dojoId) {
        return NextResponse.json({ error: "dojoId required" }, { status: 400 });
      }
    } else {
      const staff = await requireStaff(req);
      if (staff instanceof NextResponse) return staff;
      dojoId = staff.dojoId;
    }

    const students = await prisma.student.findMany({
      where: { dojoId },
      include: { dojo: { select: { name: true } } },
      orderBy: { name: "asc" },
    });

    const files = avatarMap();
    return NextResponse.json({
      students: students.map((s) => serialize(s, files)),
      dojoId,
    });
  } catch (error: unknown) {
    console.error("Fetch students error:", error);
    return NextResponse.json({ error: "Failed to fetch students" }, { status: 500 });
  }
}

// POST create a student in the active dojo (admin), or in body.dojoId with
// the superadmin key.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    let dojoId: string;
    if (isSuperadminKey(req)) {
      dojoId = typeof body.dojoId === "string" ? body.dojoId : "";
      if (!dojoId) {
        return NextResponse.json({ error: "dojoId required" }, { status: 400 });
      }
    } else {
      const staff = await requireStaff(req, { adminOnly: true });
      if (staff instanceof NextResponse) return staff;
      dojoId = staff.dojoId;
    }

    const beltRank = BELT_RANKS.includes(body.beltRank) ? body.beltRank : "WHITE";
    const membershipTier = MEMBERSHIP_TIERS.includes(body.membershipTier)
      ? body.membershipTier
      : "NONE";
    const stripes = Number.isInteger(body.stripes)
      ? Math.min(Math.max(body.stripes, 0), 10)
      : 0;

    const student = await prisma.student.create({
      data: {
        dojoId,
        name,
        email: typeof body.email === "string" && body.email.trim() ? body.email.trim() : null,
        phone: typeof body.phone === "string" && body.phone.trim() ? body.phone.trim() : null,
        beltRank,
        stripes,
        membershipTier,
        qrCode: `M-${randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`,
      },
      include: { dojo: { select: { name: true } } },
    });

    return NextResponse.json({ student: serialize(student, avatarMap()) }, { status: 201 });
  } catch (error: unknown) {
    console.error("Create student error:", error);
    return NextResponse.json({ error: "Failed to create student" }, { status: 500 });
  }
}
