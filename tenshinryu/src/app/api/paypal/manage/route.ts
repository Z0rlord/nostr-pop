import { NextResponse } from "next/server";
import { getPayPalManageUrl, isPayPalConfigured } from "@/lib/paypal";

export const dynamic = "force-dynamic";

/** Redirect members to PayPal to manage/cancel their subscription. */
export async function GET() {
  const url = getPayPalManageUrl();
  return NextResponse.json({
    configured: isPayPalConfigured(),
    url,
    hint: "Members manage PayPal subscriptions in their PayPal account under Automatic Payments.",
  });
}

export async function POST() {
  const url = getPayPalManageUrl();
  return NextResponse.json({ url });
}
