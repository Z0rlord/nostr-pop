import { NextRequest, NextResponse } from "next/server";
import { activateMember, findMemberByLightningInvoice } from "@/lib/membership";
import { getInvoice, markInvoicePaid } from "@/lib/lightning";

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const invoiceId =
      payload?.metadata?.invoiceId ||
      payload?.metadata?.memberInvoiceId ||
      payload?.invoiceId;

    if (!invoiceId) {
      return NextResponse.json({ error: "Missing invoice reference" }, { status: 400 });
    }

    const type = payload?.type || payload?.event?.type;
    const settled =
      type === "InvoiceSettled" ||
      payload?.status === "Settled" ||
      payload?.event?.status === "Settled";

    if (!settled) {
      return NextResponse.json({ received: true, ignored: true });
    }

    await markInvoicePaid(invoiceId);
    const member = await findMemberByLightningInvoice(invoiceId);
    if (member) {
      await activateMember(member.id, {
        lightningInvoiceId: invoiceId,
        paymentMethod: "lightning",
      });
    }

    return NextResponse.json({ received: true });
  } catch (e) {
    console.error("lightning webhook error", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Webhook failed" },
      { status: 500 }
    );
  }
}
