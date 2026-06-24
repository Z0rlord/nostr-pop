import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canAccessFeature, hasTierAccess, getTierInfo } from "@/lib/tiers";
import type { FeatureKey } from "@/lib/tiers";

// GET /api/tiers/check?feature=view:youtube_lessons
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const feature = searchParams.get("feature") as FeatureKey;
    const targetTier = searchParams.get("tier");
    
    // Get session from cookie
    const sessionId = req.cookies.get("session")?.value;
    
    if (!sessionId) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }
    
    // Get student
    const student = await prisma.student.findUnique({
      where: { id: sessionId },
      select: { membershipTier: true, membershipStatus: true },
    });
    
    if (!student) {
      return NextResponse.json(
        { error: "Student not found" },
        { status: 404 }
      );
    }
    
    // Check feature access
    if (feature) {
      const hasAccess = canAccessFeature(student.membershipTier, feature);
      return NextResponse.json({
        hasAccess,
        feature,
        userTier: student.membershipTier,
        requiredTier: targetTier || null,
      });
    }
    
    // Check tier level
    if (targetTier) {
      const hasAccess = hasTierAccess(student.membershipTier, targetTier);
      return NextResponse.json({
        hasAccess,
        userTier: student.membershipTier,
        targetTier,
      });
    }
    
    // Return tier info
    return NextResponse.json({
      tier: student.membershipTier,
      status: student.membershipStatus,
      info: getTierInfo(student.membershipTier),
    });
  } catch (error: any) {
    console.error("Tier check error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to check tier" },
      { status: 500 }
    );
  }
}
