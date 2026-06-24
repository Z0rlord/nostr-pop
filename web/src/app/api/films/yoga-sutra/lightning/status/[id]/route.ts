import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import {
  findPurchaseByLightningInvoice,
  unlockFilmPurchase,
} from "@/lib/film-purchases";
import {
  filmLightningConfigured,
  refreshFilmInvoiceStatus,
} from "@/lib/film-lightning";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const before = await refreshFilmInvoiceStatus(params.id);
    if (!before) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    let invoice = before;
    let unlocked = false;
    let accessToken: string | undefined;

    if (invoice.status === "paid") {
      const purchase = await findPurchaseByLightningInvoice(invoice.id);
      if (purchase && purchase.status !== "unlocked") {
        const updated = await unlockFilmPurchase(purchase.id, {
          lightningInvoiceId: invoice.id,
          paymentMethod: "lightning",
        });
        accessToken = updated?.accessToken;
        unlocked = true;
      } else if (purchase?.status === "unlocked") {
        accessToken = purchase.accessToken;
        unlocked = true;
      }
    }

    let qrDataUrl: string | undefined;
    if (invoice.bolt11) {
      qrDataUrl = await QRCode.toDataURL(invoice.bolt11, { margin: 1, width: 220 });
    }

    return NextResponse.json({
      id: invoice.id,
      amountSats: invoice.amountSats,
      status: invoice.status,
      configured: filmLightningConfigured(),
      setupHint: filmLightningConfigured()
        ? undefined
        : "Add NWC_CONNECTION_SECRET (nostr+walletconnect://…) to enable live Lightning.",
      bolt11: invoice.bolt11,
      qrDataUrl,
      unlocked,
      accessToken,
      npub: invoice.npub,
    });
  } catch (e) {
    console.error("film lightning status error", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Status check failed" },
      { status: 500 }
    );
  }
}
