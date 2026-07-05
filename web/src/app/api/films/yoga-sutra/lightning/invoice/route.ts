import { NextRequest, NextResponse } from "next/server";
import { createPendingFilmPurchase } from "@/lib/film-purchases";
import { createFilmLightningInvoice } from "@/lib/film-lightning";
import { YOGA_SUTRA_FILM_ID, type FilmPurchaseTier } from "@/lib/films/yoga-sutra";
import { isValidEmail, isValidNpub } from "@/lib/nostr";

function parseTier(raw: unknown): FilmPurchaseTier | null {
  if (raw === "buy" || raw === "rent") return raw;
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      npub?: string;
      email?: string;
      tier?: string;
    };
    const npub = body.npub?.trim();
    const email = body.email?.trim();
    const tier = parseTier(body.tier);

    if (!tier) {
      return NextResponse.json(
        { error: "tier required (buy or rent)" },
        { status: 400 }
      );
    }
    if (!npub || !isValidNpub(npub)) {
      return NextResponse.json({ error: "Valid npub required" }, { status: 400 });
    }
    if (email && !isValidEmail(email)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const { invoice, configured, setupHint } = await createFilmLightningInvoice({
      filmId: YOGA_SUTRA_FILM_ID,
      tier,
      npub,
      email,
    });

    await createPendingFilmPurchase({
      filmId: YOGA_SUTRA_FILM_ID,
      tier,
      npub,
      email,
      paymentMethod: "lightning",
      lightningInvoiceId: invoice.id,
    });

    return NextResponse.json({
      invoiceId: invoice.id,
      amountSats: invoice.amountSats,
      tier,
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
