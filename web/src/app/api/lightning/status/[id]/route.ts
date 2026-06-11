import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { activateMember, findMemberByLightningInvoice } from "@/lib/membership";
import {
  lightningConfigured,
  refreshInvoiceStatus,
} from "@/lib/lightning";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    let invoice = await refreshInvoiceStatus(params.id);
    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    if (invoice.status === "paid") {
      const member = await findMemberByLightningInvoice(invoice.id);
      if (member && member.status !== "active") {
        await activateMember(member.id, {
          lightningInvoiceId: invoice.id,
          paymentMethod: "lightning",
        });
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
        : "Add BTCPAY_URL, BTCPAY_API_KEY, and BTCPAY_STORE_ID to enable live Lightning.",
      checkoutLink: invoice.checkoutLink,
      qrDataUrl,
    });
  } catch (e) {
    console.error("lightning status error", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Status check failed" },
      { status: 500 }
    );
  }
}
