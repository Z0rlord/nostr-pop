import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { getTierFromPriceId } from "@/lib/stripe";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
  if (!stripe || !webhookSecret) {
    return NextResponse.json(
      { error: "Stripe not configured" },
      { status: 503 }
    );
  }

  const payload = await req.text();
  const signature = req.headers.get("stripe-signature") || "";

  let event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  console.log(`[Stripe Webhook] Received: ${event.type}`);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as any;
        
        if (session.mode === "subscription") {
          await handleSubscriptionCreated(session);
        }
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as any;
        await handleInvoicePaid(invoice);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as any;
        await handlePaymentFailed(invoice);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as any;
        await handleSubscriptionUpdated(subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as any;
        await handleSubscriptionCancelled(subscription);
        break;
      }

      default:
        console.log(`[Stripe Webhook] Unhandled event: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("[Stripe Webhook] Error processing event:", err);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

async function handleSubscriptionCreated(session: any) {
  const customerId = session.customer;
  const subscriptionId = session.subscription;
  const studentId = session.metadata?.studentId;
  const tier = session.metadata?.tier;

  console.log(`[Stripe] Subscription created: ${subscriptionId} for student: ${studentId}, tier: ${tier}`);

  if (studentId) {
    await prisma.student.update({
      where: { id: studentId },
      data: {
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        membershipTier: tier,
        membershipStatus: "active",
        membershipExpires: null, // Subscription handles this
      },
    });
  }
}

async function handleInvoicePaid(invoice: any) {
  const subscriptionId = invoice.subscription;
  const customerId = invoice.customer;

  // Find student by subscription ID
  const student = await prisma.student.findFirst({
    where: { stripeSubscriptionId: subscriptionId },
  });

  if (student) {
    // Update membership status and expiration
    const periodEnd = new Date(invoice.lines.data[0]?.period?.end * 1000);
    
    await prisma.student.update({
      where: { id: student.id },
      data: {
        membershipStatus: "active",
        membershipExpires: periodEnd,
      },
    });

    console.log(`[Stripe] Invoice paid for student: ${student.id}, valid until: ${periodEnd}`);
  }
}

async function handlePaymentFailed(invoice: any) {
  const subscriptionId = invoice.subscription;

  const student = await prisma.student.findFirst({
    where: { stripeSubscriptionId: subscriptionId },
  });

  if (student) {
    await prisma.student.update({
      where: { id: student.id },
      data: {
        membershipStatus: "past_due",
      },
    });

    console.log(`[Stripe] Payment failed for student: ${student.id}`);
    
    // TODO: Send email notification about failed payment
  }
}

async function handleSubscriptionUpdated(subscription: any) {
  const subscriptionId = subscription.id;
  const status = subscription.status;
  const cancelAtPeriodEnd = subscription.cancel_at_period_end;

  const student = await prisma.student.findFirst({
    where: { stripeSubscriptionId: subscriptionId },
  });

  if (student) {
    let membershipStatus = status;
    
    if (cancelAtPeriodEnd) {
      membershipStatus = "canceling";
    }

    await prisma.student.update({
      where: { id: student.id },
      data: {
        membershipStatus,
        membershipExpires: subscription.current_period_end 
          ? new Date(subscription.current_period_end * 1000)
          : null,
      },
    });

    console.log(`[Stripe] Subscription updated for student: ${student.id}, status: ${membershipStatus}`);
  }
}

async function handleSubscriptionCancelled(subscription: any) {
  const subscriptionId = subscription.id;

  const student = await prisma.student.findFirst({
    where: { stripeSubscriptionId: subscriptionId },
  });

  if (student) {
    await prisma.student.update({
      where: { id: student.id },
      data: {
        membershipStatus: "cancelled",
        membershipTier: "YOUTUBE", // Downgrade to free tier
        stripeSubscriptionId: null,
      },
    });

    console.log(`[Stripe] Subscription cancelled for student: ${student.id}`);
  }
}
