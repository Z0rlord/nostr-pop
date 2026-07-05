import { NextRequest, NextResponse } from "next/server";
import { appUrl } from "@/lib/constants";
import {
  createPendingFilmPurchase,
  updateFilmPurchase,
} from "@/lib/film-purchases";
import { ensureFilmPriceId } from "@/lib/film-stripe";
import { YOGA_SUTRA_FILM_ID, type FilmPurchaseTier } from "@/lib/films/yoga-sutra";
import { isValidEmail, isValidNpub } from "@/lib/nostr";
import { getStripe } from "@/lib/stripe";

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
    if (npub && !isValidNpub(npub)) {
      return NextResponse.json({ error: "Invalid npub" }, { status: 400 });
    }
    if (email && !isValidEmail(email)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const purchase = await createPendingFilmPurchase({
      filmId: YOGA_SUTRA_FILM_ID,
      tier,
      npub: npub || undefined,
      email: email || undefined,
      paymentMethod: "stripe",
    });

    const stripe = getStripe();
    const priceId = await ensureFilmPriceId(YOGA_SUTRA_FILM_ID, tier);
    const base = appUrl();

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${base}/films/yoga-sutra?unlocked=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/films/yoga-sutra`,
      metadata: {
        filmId: YOGA_SUTRA_FILM_ID,
        purchaseId: purchase.id,
        tier,
        npub: npub || "",
      },
      ...(email ? { customer_email: email } : {}),
    });

    if (session.id) {
      await updateFilmPurchase(purchase.id, { stripeSessionId: session.id });
    }

    return NextResponse.json({ url: session.url, tier });
  } catch (e) {
    console.error("film stripe checkout error", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Checkout failed" },
      { status: 500 }
    );
  }
}
