import Stripe from "stripe";
import {
  MEMBERSHIP_PRICE_CENTS,
  MEMBERSHIP_PRICE_USD,
} from "@/lib/constants";

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  if (!stripeClient) {
    stripeClient = new Stripe(key, { apiVersion: "2025-02-24.acacia" });
  }
  return stripeClient;
}

export async function ensureMembershipPriceId(): Promise<string> {
  const existing = process.env.STRIPE_PRICE_MEMBERSHIP;
  if (existing) return existing;

  const stripe = getStripe();
  const products = await stripe.products.search({
    query: 'name:"DojoPop Membership" AND active:"true"',
  });

  let product = products.data[0];
  if (!product) {
    product = await stripe.products.create({
      name: "DojoPop Membership",
      description: "Monthly DojoPop proof-of-practice membership",
      metadata: { service: "dojopop" },
    });
  }

  const prices = await stripe.prices.list({
    product: product.id,
    active: true,
    limit: 20,
  });

  const match = prices.data.find(
    (p) =>
      p.recurring?.interval === "month" &&
      p.unit_amount === MEMBERSHIP_PRICE_CENTS &&
      p.currency === "usd"
  );
  if (match) return match.id;

  const created = await stripe.prices.create({
    product: product.id,
    unit_amount: MEMBERSHIP_PRICE_CENTS,
    currency: "usd",
    recurring: { interval: "month" },
    metadata: {
      service: "dojopop",
      amount_usd: String(MEMBERSHIP_PRICE_USD),
    },
  });
  return created.id;
}
