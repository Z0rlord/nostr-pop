import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { activateMember, findMemberByLightningInvoice } from "@/lib/membership";
import {
  lightningConfigured,
  refreshInvoiceStatus,
} from "@/lib/lightning";
import { onMembershipChanged } from "@/lib/webhook-side-effects";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const before = await refreshInvoiceStatus(params.id);
    if (!before) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    let invoice = before;
    let activated = false;

    if (invoice.status === "paid") {
      const member = await findMemberByLightningInvoice(invoice.id);
      if (member && member.status !== "active") {
        await activateMember(member.id, {
          lightningInvoiceId: invoice.id,
          paymentMethod: "lightning",
        });
        await onMembershipChanged("lightning:poll-paid");
        activated = true;
      }
    }

    let qrDataUrl: string | undefined;
    const qrPayload = invoice.bolt11 || invoice.checkoutLink;
    if (qrPayload) {
      qrDataUrl = await QRCode.toDataURL(qrPayload, { margin: 1, width: 220 });
    }

    return NextResponse.json({
      id: invoice.id,
      amountSats: invoice.amountSats,
      status: invoice.status,
      configured: lightningConfigured(),
      setupHint: lightningConfigured()
        ? undefined
        : "Add NWC_CONNECTION_SECRET (nostr+walletconnect://…) to enable live Lightning.",
      checkoutLink: invoice.checkoutLink,
      bolt11: invoice.bolt11,
      qrDataUrl,
      activated,
    });
  } catch (e) {
    console.error("lightning status error", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Status check failed" },
      { status: 500 }
    );
  }
}
