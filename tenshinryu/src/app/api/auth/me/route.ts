import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const sessionCookie = req.cookies.get("session")?.value;
    const roleCookie = req.cookies.get("role")?.value;
    const activeDojoCookie = req.cookies.get("activeDojo")?.value;

    if (!sessionCookie) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const instructor = await prisma.instructor.findUnique({
      where: { id: sessionCookie },
      include: {
        memberships: {
          include: {
            dojo: { select: { id: true, name: true, code: true, location: true } },
          },
        },
        dojo: { select: { id: true, name: true, code: true, location: true } },
      },
    });

    if (instructor) {
      const membershipDojos = instructor.memberships.map((m) => ({
        id: m.dojo.id,
        name: m.dojo.name,
        code: m.dojo.code,
        location: m.dojo.location,
        isAdmin: m.isAdmin,
      }));
      if (
        membershipDojos.length === 0 ||
        !membershipDojos.some((d) => d.id === instructor.dojoId)
      ) {
        membershipDojos.unshift({
          id: instructor.dojo.id,
          name: instructor.dojo.name,
          code: instructor.dojo.code,
          location: instructor.dojo.location,
          isAdmin: instructor.isAdmin,
        });
      }
      const dojoIds = [...new Set(membershipDojos.map((d) => d.id))];
      const activeDojoId =
        (activeDojoCookie && dojoIds.includes(activeDojoCookie) && activeDojoCookie) ||
        instructor.dojoId;
      const active = membershipDojos.find((d) => d.id === activeDojoId);
      const isAdmin = !!(active?.isAdmin || instructor.isAdmin);
      const role = roleCookie || (isAdmin ? "admin" : "instructor");

      return NextResponse.json({
        role,
        userId: sessionCookie,
        name: instructor.name,
        email: instructor.email,
        activeDojoId,
        dojos: membershipDojos,
        isAdmin,
      });
    }

    const student = await prisma.student.findUnique({
      where: { id: sessionCookie },
      select: {
        id: true,
        name: true,
        email: true,
        beltRank: true,
        stripes: true,
        membershipTier: true,
        membershipStatus: true,
        avatar: true,
        dojoId: true,
        dojo: { select: { id: true, name: true, code: true } },
      },
    });

    if (student) {
      return NextResponse.json({
        role: "student",
        userId: sessionCookie,
        name: student.name,
        email: student.email,
        beltRank: student.beltRank,
        stripes: student.stripes,
        membershipTier: student.membershipTier,
        membershipStatus: student.membershipStatus,
        avatar: student.avatar,
        dojoId: student.dojoId,
        dojo: student.dojo,
      });
    }

    return NextResponse.json({ error: "User not found" }, { status: 404 });
  } catch (error) {
    console.error("Auth me error:", error);
    return NextResponse.json({ error: "Failed to get user info" }, { status: 500 });
  }
}
