import Stripe from "stripe";
import { MEMBERSHIP_TIERS } from "./membership-tiers";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  console.warn("STRIPE_SECRET_KEY not set - Stripe features will be disabled");
}

export const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      apiVersion: "2025-02-24.acacia",
      typescript: true,
    })
  : null;

export const STRIPE_PRICE_IDS = {
  YOUTUBE: process.env.STRIPE_PRICE_YOUTUBE || "price_youtube_monthly",
  GOLD: process.env.STRIPE_PRICE_GOLD || "price_gold_monthly",
  ROYAL: process.env.STRIPE_PRICE_ROYAL || "price_royal_monthly",
};

export const TIER_MAP: Record<string, string> = {
  [STRIPE_PRICE_IDS.YOUTUBE]: "YOUTUBE",
  [STRIPE_PRICE_IDS.GOLD]: "GOLD",
  [STRIPE_PRICE_IDS.ROYAL]: "ROYAL",
};

export { MEMBERSHIP_TIERS };

export const STRIPE_TIERS = MEMBERSHIP_TIERS.filter(
  (t) => t.id !== "FREE"
).map((t) => ({
  ...t,
  stripePriceId:
    t.id === "YOUTUBE"
      ? STRIPE_PRICE_IDS.YOUTUBE
      : t.id === "GOLD"
        ? STRIPE_PRICE_IDS.GOLD
        : t.id === "ROYAL"
          ? STRIPE_PRICE_IDS.ROYAL
          : null,
}));

export function getTierFromPriceId(priceId: string): string | null {
  return TIER_MAP[priceId] || null;
}

export function getPriceIdFromTier(tier: string): string | null {
  const entry = Object.entries(TIER_MAP).find(([, t]) => t === tier);
  return entry?.[0] || null;
}
