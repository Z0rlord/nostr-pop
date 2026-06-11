import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { activateMember, findMemberByLightningInvoice } from "@/lib/membership";
import {
  findInvoiceByExternalId,
  markInvoicePaid,
} from "@/lib/lightning";
import { onMembershipChanged } from "@/lib/webhook-side-effects";

function verifyBtcpaySignature(
  body: string,
  sig: string | null,
  secret: string
): boolean {
  if (!sig || !sig.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", secret)
    .update(body)
    .digest("hex");
  const provided = sig.slice("sha256=".length);
  try {
    return timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(provided, "hex")
    );
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const webhookSecret = process.env.BTCPAY_WEBHOOK_SECRET;
    if (webhookSecret) {
      const sig = req.headers.get("btcpay-sig");
      if (!verifyBtcpaySignature(body, sig, webhookSecret)) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    }

    const payload = JSON.parse(body) as {
      type?: string;
      invoiceId?: string;
      metadata?: Record<string, string>;
    };

    if (payload.type !== "InvoiceSettled") {
      return NextResponse.json({ received: true, ignored: true });
    }

    const lookupId =
      payload.metadata?.memberInvoiceId ||
      payload.invoiceId;

    const invoice = lookupId
      ? await findInvoiceByExternalId(lookupId)
      : undefined;

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    await markInvoicePaid(invoice.id);
    const member = await findMemberByLightningInvoice(invoice.id);
    if (member) {
      await activateMember(member.id, {
        lightningInvoiceId: invoice.id,
        paymentMethod: "lightning",
      });
      await onMembershipChanged("lightning:InvoiceSettled");
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
