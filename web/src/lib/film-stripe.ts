import {
  YOGA_SUTRA_FILM_ID,
  yogaSutraPriceCents,
} from "@/lib/films/yoga-sutra";
import {
  findPurchaseById,
  findPurchaseByStripeSession,
  unlockFilmPurchase,
} from "@/lib/film-purchases";
import { getStripe } from "@/lib/stripe";
import type { FilmId } from "@/lib/film-purchases";
import type Stripe from "stripe";

export async function ensureFilmPriceId(filmId: FilmId): Promise<string> {
  if (filmId === YOGA_SUTRA_FILM_ID) {
    const existing = process.env.FILM_YOGA_SUTRA_STRIPE_PRICE_ID?.trim();
    if (existing) return existing;

    const stripe = getStripe();
    const products = await stripe.products.search({
      query: 'name:"DojoPop Film — Yoga Sutra" AND active:"true"',
    });

    let product = products.data[0];
    if (!product) {
      product = await stripe.products.create({
        name: "DojoPop Film — Yoga Sutra",
        description: "One-time stream access — Yoga Sutra",
        metadata: { service: "dojopop", filmId: YOGA_SUTRA_FILM_ID },
      });
    }

    const cents = yogaSutraPriceCents();
    const prices = await stripe.prices.list({
      product: product.id,
      active: true,
      limit: 20,
    });

    const match = prices.data.find(
      (p) =>
        !p.recurring &&
        p.unit_amount === cents &&
        p.currency === "usd"
    );
    if (match) return match.id;

    const created = await stripe.prices.create({
      product: product.id,
      unit_amount: cents,
      currency: "usd",
      metadata: {
        service: "dojopop",
        filmId: YOGA_SUTRA_FILM_ID,
      },
    });
    return created.id;
  }

  throw new Error(`Unknown film: ${filmId}`);
}

export async function fulfillFilmStripeSession(
  session: Stripe.Checkout.Session
): Promise<{ unlocked: boolean; accessToken?: string; alreadyUnlocked?: boolean }> {
  const filmId = session.metadata?.filmId;
  const purchaseId = session.metadata?.purchaseId;

  if (!filmId || filmId !== YOGA_SUTRA_FILM_ID || !purchaseId) {
    return { unlocked: false };
  }

  if (session.payment_status !== "paid") {
    return { unlocked: false };
  }

  const bySession = await findPurchaseByStripeSession(session.id);
  const purchase = bySession || (await findPurchaseById(purchaseId));

  if (!purchase) {
    return { unlocked: false };
  }

  if (purchase.status === "unlocked") {
    return {
      unlocked: true,
      alreadyUnlocked: true,
      accessToken: purchase.accessToken,
    };
  }

  const npub = session.metadata?.npub?.trim() || purchase.npub;
  const unlocked = await unlockFilmPurchase(purchase.id, {
    stripeSessionId: session.id,
    npub: npub || undefined,
    paymentMethod: "stripe",
  });

  return {
    unlocked: Boolean(unlocked),
    accessToken: unlocked?.accessToken,
  };
}
