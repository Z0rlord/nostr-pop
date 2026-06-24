import { NextRequest, NextResponse } from "next/server";
import { activateMember, findMemberByNpub } from "@/lib/membership";
import { getStripe } from "@/lib/stripe";
import { onMembershipChanged } from "@/lib/webhook-side-effects";

/**
 * Backup activation when Stripe webhook is delayed or misconfigured.
 * Called from /join/success?session_id=… after checkout.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { sessionId?: string };
    const sessionId = body.sessionId?.trim();
    if (!sessionId) {
      return NextResponse.json({ error: "sessionId required" }, { status: 400 });
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"],
    });

    if (session.payment_status !== "paid") {
      return NextResponse.json({
        activated: false,
        status: session.payment_status,
      });
    }

    const npub = session.metadata?.npub;
    const memberId = session.metadata?.memberId;
    if (!npub || !memberId) {
      return NextResponse.json(
        { error: "Checkout session missing membership metadata" },
        { status: 422 }
      );
    }

    const existing = await findMemberByNpub(npub);
    if (existing?.status === "active") {
      return NextResponse.json({
        activated: true,
        alreadyActive: true,
        npub,
      });
    }

    const subId =
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription?.id;

    const member = await activateMember(memberId, {
      npub,
      stripeCustomerId:
        typeof session.customer === "string"
          ? session.customer
          : session.customer?.id,
      stripeSubscriptionId: subId,
      paymentMethod: "stripe",
    });

    if (!member) {
      return NextResponse.json({ error: "Member record not found" }, { status: 404 });
    }

    await onMembershipChanged("stripe:confirm-session");

    return NextResponse.json({
      activated: true,
      npub,
      status: member.status,
      paidUntil: member.paidUntil,
    });
  } catch (e) {
    console.error("stripe confirm-session error", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Confirmation failed" },
      { status: 500 }
    );
  }
}
