import { NextRequest, NextResponse } from "next/server";
import { findMemberByNpub } from "@/lib/membership";
import { isValidNpub } from "@/lib/nostr";

/** Public membership lookup by npub (no secrets). */
export async function GET(req: NextRequest) {
  const npub = req.nextUrl.searchParams.get("npub")?.trim();
  if (!npub || !isValidNpub(npub)) {
    return NextResponse.json({ error: "Valid npub required" }, { status: 400 });
  }

  const member = await findMemberByNpub(npub);
  if (!member) {
    return NextResponse.json({
      npub,
      registered: false,
      status: null,
      active: false,
    });
  }

  return NextResponse.json({
    npub,
    registered: true,
    status: member.status,
    active: member.status === "active",
    paidUntil: member.paidUntil ?? null,
    paymentMethod: member.paymentMethod,
  });
}
