import { NextRequest, NextResponse } from "next/server";
import { appUrl } from "@/lib/constants";
import { createPendingMember } from "@/lib/membership";
import { isValidEmail, isValidNpub } from "@/lib/nostr";
import { ensureMembershipPriceId, getStripe } from "@/lib/stripe";

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

    const member = await createPendingMember({
      npub,
      email,
      paymentMethod: "stripe",
    });

    const stripe = getStripe();
    const priceId = await ensureMembershipPriceId();
    const base = appUrl();

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${base}/join/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/join`,
      metadata: {
        npub,
        memberId: member.id,
      },
      subscription_data: {
        metadata: {
          npub,
          memberId: member.id,
        },
      },
      ...(email ? { customer_email: email } : {}),
    });

    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error("stripe checkout error", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Checkout failed" },
      { status: 500 }
    );
  }
}
