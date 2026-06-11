import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { activateMember, updateMemberStatus } from "@/lib/membership";
import { getStripe } from "@/lib/stripe";
import { onMembershipChanged } from "@/lib/webhook-side-effects";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET not configured" },
      { status: 500 }
    );
  }

  const stripe = getStripe();
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (e) {
    console.error("stripe webhook verify failed", e);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let shouldSync = false;

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const npub = session.metadata?.npub;
        const memberId = session.metadata?.memberId;
        const subId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id;

        if (memberId && npub) {
          await activateMember(memberId, {
            npub,
            stripeCustomerId:
              typeof session.customer === "string"
                ? session.customer
                : session.customer?.id,
            stripeSubscriptionId: subId,
            paymentMethod: "stripe",
          });
          shouldSync = true;
        }
        break;
      }
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const status =
          sub.status === "active" || sub.status === "trialing"
            ? "active"
            : sub.status === "canceled"
              ? "canceled"
              : "expired";
        const member = await updateMemberStatus(sub.id, status);
        if (member && status !== "active") shouldSync = true;
        if (member && status === "active") shouldSync = true;
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const member = await updateMemberStatus(sub.id, "canceled");
        if (member) shouldSync = true;
        break;
      }
      default:
        break;
    }
  } catch (e) {
    console.error("stripe webhook handler error", event.type, e);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  if (shouldSync) {
    await onMembershipChanged(`stripe:${event.type}`);
  }

  return NextResponse.json({ received: true });
}
