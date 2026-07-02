import {
  YOGA_SUTRA_FILM_ID,
  yogaSutraBuyPriceCents,
  yogaSutraRentPriceCents,
  type FilmPurchaseTier,
} from "@/lib/films/yoga-sutra";
import {
  findPurchaseById,
  findPurchaseByStripeSession,
  unlockFilmPurchase,
} from "@/lib/film-purchases";
import { getStripe } from "@/lib/stripe";
import type { FilmId } from "@/lib/film-purchases";
import type Stripe from "stripe";

function tierEnvKey(tier: FilmPurchaseTier): string {
  return tier === "buy"
    ? "FILM_YOGA_SUTRA_BUY_STRIPE_PRICE_ID"
    : "FILM_YOGA_SUTRA_RENT_STRIPE_PRICE_ID";
}

function tierCents(tier: FilmPurchaseTier): number {
  return tier === "buy" ? yogaSutraBuyPriceCents() : yogaSutraRentPriceCents();
}

function tierLabel(tier: FilmPurchaseTier): string {
  return tier === "buy" ? "Own + download" : "Stream 48 hours";
}

export async function ensureFilmPriceId(
  filmId: FilmId,
  tier: FilmPurchaseTier
): Promise<string> {
  if (filmId !== YOGA_SUTRA_FILM_ID) {
    throw new Error(`Unknown film: ${filmId}`);
  }

  const existing = process.env[tierEnvKey(tier)]?.trim();
  if (existing) return existing;

  const legacyBuy =
    tier === "buy"
      ? process.env.FILM_YOGA_SUTRA_STRIPE_PRICE_ID?.trim()
      : undefined;
  if (legacyBuy) return legacyBuy;

  const stripe = getStripe();
  const products = await stripe.products.search({
    query: 'name:"DojoPop Film — Yoga Sutra" AND active:"true"',
  });

  let product = products.data[0];
  if (!product) {
    product = await stripe.products.create({
      name: "DojoPop Film — Yoga Sutra",
      description: "Yoga Sutra — own or 48-hour stream",
      metadata: { service: "dojopop", filmId: YOGA_SUTRA_FILM_ID },
    });
  }

  const cents = tierCents(tier);
  const prices = await stripe.prices.list({
    product: product.id,
    active: true,
    limit: 50,
  });

  const match = prices.data.find(
    (p) =>
      !p.recurring &&
      p.unit_amount === cents &&
      p.currency === "usd" &&
      p.metadata?.tier === tier
  );
  if (match) return match.id;

  const created = await stripe.prices.create({
    product: product.id,
    unit_amount: cents,
    currency: "usd",
    metadata: {
      service: "dojopop",
      filmId: YOGA_SUTRA_FILM_ID,
      tier,
    },
    nickname: tierLabel(tier),
  });
  return created.id;
}

export async function fulfillFilmStripeSession(
  session: Stripe.Checkout.Session
): Promise<{ unlocked: boolean; accessToken?: string; alreadyUnlocked?: boolean }> {
  const filmId = session.metadata?.filmId;
  const purchaseId = session.metadata?.purchaseId;
  const tier = (session.metadata?.tier as FilmPurchaseTier | undefined) ?? "buy";

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
    tier: purchase.tier ?? tier,
  });

  return {
    unlocked: Boolean(unlocked),
    accessToken: unlocked?.accessToken,
  };
}
