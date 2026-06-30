import { NextRequest, NextResponse } from "next/server";
import { createPendingFilmPurchase, unlockFilmPurchase } from "@/lib/film-purchases";
import { createFilmLightningInvoice } from "@/lib/film-lightning";
import { YOGA_SUTRA_FILM_ID } from "@/lib/films/yoga-sutra";
import { isValidEmail, isValidNpub } from "@/lib/nostr";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { npub?: string; email?: string };
    const npub = body.npub?.trim();
    const email = body.email?.trim();

    if (!npub || !isValidNpub(npub)) {
      return NextResponse.json({ error: "Valid npub required" }, { status: 400 });
    }
    if (email && !isValidEmail(email)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const { invoice, configured, setupHint } = await createFilmLightningInvoice({
      filmId: YOGA_SUTRA_FILM_ID,
      npub,
      email,
    });

    await createPendingFilmPurchase({
      filmId: YOGA_SUTRA_FILM_ID,
      npub,
      email,
      paymentMethod: "lightning",
      lightningInvoiceId: invoice.id,
    });

    return NextResponse.json({
      invoiceId: invoice.id,
      amountSats: invoice.amountSats,
      configured,
      setupHint,
    });
  } catch (e) {
    console.error("film lightning invoice error", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Invoice creation failed" },
      { status: 500 }
    );
  }
}
