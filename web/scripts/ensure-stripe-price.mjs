#!/usr/bin/env node
/**
 * Find or create the $0.99/mo DojoPop Membership Stripe Price.
 * Prints the price ID — add to Doppler as STRIPE_PRICE_MEMBERSHIP.
 *
 * Usage: doppler run -- npm run stripe:ensure-price
 */
import Stripe from "stripe";

const AMOUNT_CENTS = 99;

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error("STRIPE_SECRET_KEY is required");
  process.exit(1);
}

const stripe = new Stripe(key);

const existing = process.env.STRIPE_PRICE_MEMBERSHIP;
if (existing) {
  console.log(`STRIPE_PRICE_MEMBERSHIP already set: ${existing}`);
  process.exit(0);
}

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
  console.log(`Created product: ${product.id}`);
}

const prices = await stripe.prices.list({
  product: product.id,
  active: true,
  limit: 20,
});

const match = prices.data.find(
  (p) =>
    p.recurring?.interval === "month" &&
    p.unit_amount === AMOUNT_CENTS &&
    p.currency === "usd"
);

const priceId = match
  ? match.id
  : (
      await stripe.prices.create({
        product: product.id,
        unit_amount: AMOUNT_CENTS,
        currency: "usd",
        recurring: { interval: "month" },
        metadata: { service: "dojopop", amount_usd: "0.99" },
      })
    ).id;

console.log("");
console.log("Add to Doppler (dojopop / prd_zorie):");
console.log(`  STRIPE_PRICE_MEMBERSHIP=${priceId}`);
console.log("");
