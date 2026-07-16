import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/session";

/** GET — list dojos the current staff member can access */
export async function GET(req: NextRequest) {
  const staff = await requireStaff(req);
  if (staff instanceof NextResponse) return staff;

  const dojos = await prisma.dojo.findMany({
    where: { id: { in: staff.dojoIds } },
    select: { id: true, name: true, location: true, code: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({
    dojos,
    activeDojoId: staff.dojoId,
    isAdmin: staff.isAdmin,
  });
}

/** POST — switch active dojo { dojoId } */
export async function POST(req: NextRequest) {
  const staff = await requireStaff(req);
  if (staff instanceof NextResponse) return staff;

  const { dojoId } = await req.json();
  if (!dojoId || !staff.dojoIds.includes(dojoId)) {
    return NextResponse.json({ error: "Invalid dojo" }, { status: 400 });
  }

  const membership = await prisma.instructorDojoMembership.findUnique({
    where: {
      instructorId_dojoId: {
        instructorId: staff.instructorId,
        dojoId,
      },
    },
  });
  const isAdmin =
    membership?.isAdmin ||
    (dojoId === staff.primaryDojoId &&
      (
        await prisma.instructor.findUnique({
          where: { id: staff.instructorId },
          select: { isAdmin: true },
        })
      )?.isAdmin);

  const response = NextResponse.json({
    success: true,
    activeDojoId: dojoId,
    role: isAdmin ? "admin" : "instructor",
  });

  response.cookies.set("activeDojo", dojoId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });

  response.cookies.set("role", isAdmin ? "admin" : "instructor", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });

  return response;
}
