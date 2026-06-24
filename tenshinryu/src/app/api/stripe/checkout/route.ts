import { NextRequest, NextResponse } from "next/server";
import { stripe, STRIPE_PRICE_IDS, getTierFromPriceId } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json(
        { error: "Stripe not configured" },
        { status: 503 }
      );
    }

    const { priceId, studentId, email, name } = await req.json();

    // Validate price ID
    if (!Object.values(STRIPE_PRICE_IDS).includes(priceId)) {
      return NextResponse.json(
        { error: "Invalid price ID" },
        { status: 400 }
      );
    }

    // Get or create Stripe customer
    let customerId: string;
    
    if (studentId) {
      // Check if student already has a Stripe customer ID
      const student = await prisma.student.findUnique({
        where: { id: studentId },
        select: { stripeCustomerId: true, email: true, name: true },
      });

      if (student?.stripeCustomerId) {
        customerId = student.stripeCustomerId;
      } else {
        // Create new Stripe customer
        const customer = await stripe.customers.create({
          email: student?.email || email,
          name: student?.name || name,
          metadata: {
            studentId: studentId || "",
          },
        });
        customerId = customer.id;

        // Save customer ID to database
        if (studentId) {
          await prisma.student.update({
            where: { id: studentId },
            data: { stripeCustomerId: customerId },
          });
        }
      }
    } else {
      // Create customer without student record (signup flow)
      const customer = await stripe.customers.create({
        email,
        name,
      });
      customerId = customer.id;
    }

    // Create checkout session for subscription
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/payments/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/payments/cancel`,
      subscription_data: {
        metadata: {
          studentId: studentId || "",
          tier: getTierFromPriceId(priceId) || "",
        },
      },
      metadata: {
        studentId: studentId || "",
        tier: getTierFromPriceId(priceId) || "",
      },
      allow_promotion_codes: true,
      billing_address_collection: "auto",
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error: any) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
