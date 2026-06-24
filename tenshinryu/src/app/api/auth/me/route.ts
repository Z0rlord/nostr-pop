import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const sessionCookie = req.cookies.get("session")?.value;
    const roleCookie = req.cookies.get("role")?.value;
    
    if (!sessionCookie) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }
    
    // If role cookie exists, use it
    if (roleCookie) {
      return NextResponse.json({
        role: roleCookie,
        userId: sessionCookie,
      });
    }
    
    // Otherwise look up the user
    const instructor = await prisma.instructor.findUnique({
      where: { id: sessionCookie },
      select: { isAdmin: true, name: true, email: true }
    });
    
    if (instructor) {
      return NextResponse.json({
        role: instructor.isAdmin ? "admin" : "instructor",
        userId: sessionCookie,
        name: instructor.name,
        email: instructor.email,
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
      });
    }
    
    return NextResponse.json(
      { error: "User not found" },
      { status: 404 }
    );
    
  } catch (error) {
    console.error("Auth me error:", error);
    return NextResponse.json(
      { error: "Failed to get user info" },
      { status: 500 }
    );
  }
}
