import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/session";
import { isSuperadminKey } from "@/lib/superadmin";

const BELT_RANKS = [
  "WHITE", "YELLOW", "ORANGE", "GREEN", "BLUE", "PURPLE",
  "BROWN", "BLACK", "RED_BLACK", "RED_WHITE", "RED",
] as const;
const MEMBERSHIP_TIERS = ["NONE", "YOUTUBE", "GOLD", "ROYAL"] as const;

// Resolve access: superadmin key manages any dojo; otherwise the caller must
// be an admin of the student's dojo. Returns { student } or a NextResponse error.
async function resolveAccess(req: NextRequest, id: string) {
  const student = await prisma.student.findUnique({ where: { id } });
  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }
  if (isSuperadminKey(req)) return { student };

  const staff = await requireStaff(req, { adminOnly: true });
  if (staff instanceof NextResponse) return staff;
  if (staff.dojoId !== student.dojoId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return { student };
}

// PATCH update a student (admin of the dojo, or superadmin key).
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const access = await resolveAccess(req, id);
    if (access instanceof NextResponse) return access;

    const body = await req.json().catch(() => ({}));
    const data: Record<string, unknown> = {};

    if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim();
    if (body.email !== undefined)
      data.email = typeof body.email === "string" && body.email.trim() ? body.email.trim() : null;
    if (body.phone !== undefined)
      data.phone = typeof body.phone === "string" && body.phone.trim() ? body.phone.trim() : null;
    if (BELT_RANKS.includes(body.beltRank)) data.beltRank = body.beltRank;
    if (MEMBERSHIP_TIERS.includes(body.membershipTier)) data.membershipTier = body.membershipTier;
    if (Number.isInteger(body.stripes))
      data.stripes = Math.min(Math.max(body.stripes, 0), 10);
    if (typeof body.isActive === "boolean") data.isActive = body.isActive;
    if (typeof body.membershipStatus === "string" && body.membershipStatus.trim())
      data.membershipStatus = body.membershipStatus.trim();

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const student = await prisma.student.update({ where: { id }, data });
    return NextResponse.json({
      student: {
        id: student.id,
        name: student.name,
        email: student.email,
        phone: student.phone,
        beltRank: student.beltRank,
        stripes: student.stripes,
        isActive: student.isActive,
        membershipTier: student.membershipTier,
        membershipStatus: student.membershipStatus,
        lastCheckIn: student.lastCheckIn,
        dojoId: student.dojoId,
      },
    });
  } catch (error: unknown) {
    console.error("Update student error:", error);
    return NextResponse.json({ error: "Failed to update student" }, { status: 500 });
  }
}

// DELETE a student and all dependent records (admin of the dojo, or
// superadmin key). Hard delete: check-ins, journal, leaderboard, lineage,
// notifications, goals, practice logs, token transactions and videos go with it.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const access = await resolveAccess(req, id);
    if (access instanceof NextResponse) return access;

    await prisma.$transaction([
      prisma.checkIn.deleteMany({ where: { studentId: id } }),
      prisma.journalEntry.deleteMany({ where: { studentId: id } }),
      prisma.leaderboardEntry.deleteMany({ where: { studentId: id } }),
      prisma.lineage.deleteMany({ where: { studentId: id } }),
      prisma.notificationLog.deleteMany({ where: { studentId: id } }),
      prisma.practiceGoal.deleteMany({ where: { studentId: id } }),
      prisma.soloPracticeLog.deleteMany({ where: { studentId: id } }),
      prisma.tokenTransaction.deleteMany({ where: { studentId: id } }),
      prisma.video.deleteMany({ where: { studentId: id } }),
      prisma.student.delete({ where: { id } }),
    ]);

    return NextResponse.json({ deleted: true, id });
  } catch (error: unknown) {
    console.error("Delete student error:", error);
    return NextResponse.json({ error: "Failed to delete student" }, { status: 500 });
  }
}
