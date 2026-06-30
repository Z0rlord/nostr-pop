import { NextResponse } from "next/server";

/** NWC membership payments are confirmed via GET /api/lightning/status/[id] polling. */
export async function POST() {
  return NextResponse.json({
    received: true,
    ignored: true,
    note: "DojoPop uses NWC (NIP-47); invoice settlement is polled, not webhooks.",
  });
}
