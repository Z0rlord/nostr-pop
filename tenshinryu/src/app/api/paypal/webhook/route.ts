import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getTierFromPayPalPlanId,
  isPayPalConfigured,
  readPayPalWebhookHeaders,
  shouldProcessUnverifiedWebhook,
  verifyPayPalWebhook,
} from "@/lib/paypal";
import type { MembershipTier } from "@prisma/client";

export const dynamic = "force-dynamic";

type PayPalSubscriptionResource = {
  id?: string;
  plan_id?: string;
  status?: string;
  custom_id?: string;
  subscriber?: { email_address?: string };
  billing_info?: {
    next_billing_time?: string;
    last_payment?: { time?: string };
  };
};

type PayPalWebhookEvent = {
  id?: string;
  event_type?: string;
  resource?: PayPalSubscriptionResource;
};

function mapPayPalStatus(status?: string): string {
  switch (status?.toUpperCase()) {
    case "ACTIVE":
      return "active";
    case "SUSPENDED":
      return "past_due";
    case "CANCELLED":
    case "EXPIRED":
      return "cancelled";
    case "APPROVAL_PENDING":
      return "pending";
    default:
      return status?.toLowerCase() || "unknown";
  }
}

function tierFromResource(resource: PayPalSubscriptionResource): MembershipTier | null {
  if (!resource.plan_id) return null;
  const tier = getTierFromPayPalPlanId(resource.plan_id);
  return tier as MembershipTier | null;
}

async function findStudent(resource: PayPalSubscriptionResource) {
  if (resource.id) {
    const bySub = await prisma.student.findFirst({
      where: { paypalSubscriptionId: resource.id },
    });
    if (bySub) return bySub;
  }

  if (resource.custom_id) {
    const byId = await prisma.student.findUnique({
      where: { id: resource.custom_id },
    });
    if (byId) return byId;
  }

  const email = resource.subscriber?.email_address?.toLowerCase();
  if (email) {
    return prisma.student.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
    });
  }

  return null;
}

async function activateSubscription(resource: PayPalSubscriptionResource) {
  const student = await findStudent(resource);
  if (!student) {
    console.warn("[PayPal Webhook] No student for subscription", resource.id);
    return;
  }

  const tier = tierFromResource(resource);
  const nextBill = resource.billing_info?.next_billing_time;

  await prisma.student.update({
    where: { id: student.id },
    data: {
      paypalSubscriptionId: resource.id ?? student.paypalSubscriptionId,
      membershipTier: tier ?? student.membershipTier,
      membershipStatus: "active",
      membershipExpires: nextBill ? new Date(nextBill) : null,
    },
  });

  console.log(
    `[PayPal] Subscription activated: ${resource.id} student=${student.id} tier=${tier ?? "unchanged"}`
  );
}

async function updateSubscription(resource: PayPalSubscriptionResource) {
  const student = await findStudent(resource);
  if (!student || !resource.id) return;

  const status = mapPayPalStatus(resource.status);
  const nextBill = resource.billing_info?.next_billing_time;

  await prisma.student.update({
    where: { id: student.id },
    data: {
      paypalSubscriptionId: resource.id,
      membershipStatus: status,
      membershipExpires: nextBill ? new Date(nextBill) : student.membershipExpires,
    },
  });

  console.log(`[PayPal] Subscription updated: ${resource.id} status=${status}`);
}

async function cancelSubscription(resource: PayPalSubscriptionResource) {
  const student = await findStudent(resource);
  if (!student) return;

  await prisma.student.update({
    where: { id: student.id },
    data: {
      membershipStatus: "cancelled",
      membershipTier: "NONE",
      membershipExpires: new Date(),
      paypalSubscriptionId: null,
    },
  });

  console.log(`[PayPal] Subscription cancelled: ${resource.id} student=${student.id}`);
}

async function markPaymentFailed(resource: PayPalSubscriptionResource) {
  const student = await findStudent(resource);
  if (!student) return;

  await prisma.student.update({
    where: { id: student.id },
    data: { membershipStatus: "past_due" },
  });

  console.log(`[PayPal] Payment failed: ${resource.id} student=${student.id}`);
}

async function handleEvent(event: PayPalWebhookEvent) {
  const type = event.event_type ?? "";
  const resource = event.resource ?? {};

  switch (type) {
    case "BILLING.SUBSCRIPTION.ACTIVATED":
      await activateSubscription(resource);
      break;
    case "BILLING.SUBSCRIPTION.UPDATED":
      await updateSubscription(resource);
      break;
    case "BILLING.SUBSCRIPTION.CANCELLED":
    case "BILLING.SUBSCRIPTION.EXPIRED":
      await cancelSubscription(resource);
      break;
    case "BILLING.SUBSCRIPTION.SUSPENDED":
      await updateSubscription({ ...resource, status: "SUSPENDED" });
      break;
    case "BILLING.SUBSCRIPTION.PAYMENT.FAILED":
      await markPaymentFailed(resource);
      break;
    default:
      console.log(`[PayPal Webhook] Unhandled event: ${type}`);
  }
}

export async function POST(req: NextRequest) {
  let event: PayPalWebhookEvent;

  try {
    event = (await req.json()) as PayPalWebhookEvent;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventType = event.event_type ?? "unknown";
  console.log(`[PayPal Webhook] Received: ${eventType} id=${event.id ?? "?"}`);

  const webhookHeaders = readPayPalWebhookHeaders(req.headers);
  let verified = false;

  if (webhookHeaders && isPayPalConfigured()) {
    verified = await verifyPayPalWebhook(webhookHeaders, event);
  }

  if (!verified && !shouldProcessUnverifiedWebhook()) {
    const stub = !isPayPalConfigured();
    return NextResponse.json({
      received: true,
      processed: false,
      verified: false,
      mode: stub ? "stub_credentials" : "verification_failed",
      event_type: eventType,
    });
  }

  if (!verified && shouldProcessUnverifiedWebhook()) {
    console.warn("[PayPal Webhook] Processing without verification (PAYPAL_SKIP_WEBHOOK_VERIFY=true)");
  }

  try {
    await handleEvent(event);
    return NextResponse.json({
      received: true,
      processed: true,
      verified,
      event_type: eventType,
    });
  } catch (err) {
    console.error("[PayPal Webhook] Handler error:", err);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}

/** PayPal dashboard "Verify webhook" sends GET — respond OK. */
export async function GET() {
  return NextResponse.json({
    ok: true,
    provider: "paypal",
    configured: isPayPalConfigured(),
    endpoint: "/api/paypal/webhook",
  });
}
