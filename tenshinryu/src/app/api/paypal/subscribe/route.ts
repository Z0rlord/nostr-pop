import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  createPayPalSubscription,
  getPayPalPlanIdForTier,
  isPayPalConfigured,
} from "@/lib/paypal";

export const dynamic = "force-dynamic";

const OFFICIAL_SIGNUP_URL = "https://international.tenshinryu.net/tenshinryu-online";

/** Start a PayPal subscription checkout for GOLD or ROYAL. */
export async function POST(req: NextRequest) {
  const sessionId = cookies().get("session")?.value;
  if (!sessionId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const student = await prisma.student.findUnique({
    where: { id: sessionId },
    select: { id: true, email: true, membershipTier: true },
  });

  if (!student?.email) {
    return NextResponse.json({ error: "Student profile not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const tier = typeof body.tier === "string" ? body.tier.toUpperCase() : "";

  if (tier !== "GOLD" && tier !== "ROYAL") {
    return NextResponse.json(
      { error: "tier must be GOLD or ROYAL" },
      { status: 400 }
    );
  }

  if (!isPayPalConfigured()) {
    return NextResponse.json({
      configured: false,
      fallbackUrl: OFFICIAL_SIGNUP_URL,
      message:
        "PayPal is not configured yet. Subscribe via the official KIWAMI page until credentials are added.",
    });
  }

  const planId = getPayPalPlanIdForTier(tier);
  if (!planId) {
    return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://tenshinryu.xyz";
  const result = await createPayPalSubscription({
    planId,
    studentId: student.id,
    studentEmail: student.email,
    returnUrl: `${appUrl}/member?paypal=success`,
    cancelUrl: `${appUrl}/member?paypal=cancel`,
  });

  if (!result) {
    return NextResponse.json(
      { error: "Failed to create PayPal subscription" },
      { status: 502 }
    );
  }

  return NextResponse.json({
    configured: true,
    subscriptionId: result.subscriptionId,
    approvalUrl: result.approvalUrl,
  });
}
