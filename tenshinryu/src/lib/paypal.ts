/**
 * PayPal Subscriptions (REST API). Replace PLACEHOLDER_* env vars with live/sandbox creds from
 * https://developer.paypal.com/dashboard/applications
 */

import { MEMBERSHIP_TIERS } from "./membership-tiers";

const PLACEHOLDER = "PLACEHOLDER";

export const PAYPAL_PLAN_IDS = {
  GOLD: process.env.PAYPAL_PLAN_GOLD || `P-${PLACEHOLDER}-GOLD`,
  ROYAL: process.env.PAYPAL_PLAN_ROYAL || `P-${PLACEHOLDER}-ROYAL`,
} as const;

const PLAN_TO_TIER: Record<string, "GOLD" | "ROYAL"> = {
  [PAYPAL_PLAN_IDS.GOLD]: "GOLD",
  [PAYPAL_PLAN_IDS.ROYAL]: "ROYAL",
};

export function getTierFromPayPalPlanId(planId: string): "GOLD" | "ROYAL" | null {
  return PLAN_TO_TIER[planId] ?? null;
}

export function getPayPalPlanIdForTier(tier: string): string | null {
  if (tier === "GOLD") return PAYPAL_PLAN_IDS.GOLD;
  if (tier === "ROYAL") return PAYPAL_PLAN_IDS.ROYAL;
  return null;
}

function env(name: string): string {
  return process.env[name]?.trim() ?? "";
}

export function isPayPalPlaceholder(value: string): boolean {
  return !value || value.includes(PLACEHOLDER);
}

/** True when real (non-placeholder) Client ID + Secret are set. */
export function isPayPalConfigured(): boolean {
  const clientId = env("PAYPAL_CLIENT_ID");
  const secret = env("PAYPAL_CLIENT_SECRET");
  return !isPayPalPlaceholder(clientId) && !isPayPalPlaceholder(secret);
}

export function getPayPalMode(): "sandbox" | "live" {
  return env("PAYPAL_MODE") === "live" ? "live" : "sandbox";
}

export function getPayPalApiBase(): string {
  return getPayPalMode() === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

export function getPayPalWebBase(): string {
  return getPayPalMode() === "live"
    ? "https://www.paypal.com"
    : "https://www.sandbox.paypal.com";
}

/** Where members manage/cancel PayPal subscriptions in their PayPal account. */
export function getPayPalManageUrl(): string {
  return `${getPayPalWebBase()}/myaccount/autopay/`;
}

export function getPublicPayPalClientId(): string {
  return env("NEXT_PUBLIC_PAYPAL_CLIENT_ID") || env("PAYPAL_CLIENT_ID");
}

let cachedToken: { value: string; expiresAt: number } | null = null;

export async function getPayPalAccessToken(): Promise<string | null> {
  if (!isPayPalConfigured()) return null;

  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.value;
  }

  const clientId = env("PAYPAL_CLIENT_ID");
  const secret = env("PAYPAL_CLIENT_SECRET");
  const auth = Buffer.from(`${clientId}:${secret}`).toString("base64");

  const res = await fetch(`${getPayPalApiBase()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    console.error("[PayPal] OAuth failed:", res.status, await res.text());
    return null;
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return data.access_token;
}

export type PayPalWebhookHeaders = {
  authAlgo: string;
  certUrl: string;
  transmissionId: string;
  transmissionSig: string;
  transmissionTime: string;
};

export function readPayPalWebhookHeaders(
  headers: Headers
): PayPalWebhookHeaders | null {
  const authAlgo = headers.get("paypal-auth-algo");
  const certUrl = headers.get("paypal-cert-url");
  const transmissionId = headers.get("paypal-transmission-id");
  const transmissionSig = headers.get("paypal-transmission-sig");
  const transmissionTime = headers.get("paypal-transmission-time");

  if (!authAlgo || !certUrl || !transmissionId || !transmissionSig || !transmissionTime) {
    return null;
  }

  return {
    authAlgo,
    certUrl,
    transmissionId,
    transmissionSig,
    transmissionTime,
  };
}

/** Verify webhook via PayPal REST API. Returns false if creds/webhook id missing. */
export async function verifyPayPalWebhook(
  headers: PayPalWebhookHeaders,
  event: unknown
): Promise<boolean> {
  const webhookId = env("PAYPAL_WEBHOOK_ID");
  if (isPayPalPlaceholder(webhookId)) {
    console.warn("[PayPal] Webhook ID is placeholder — skipping signature verification");
    return false;
  }

  const token = await getPayPalAccessToken();
  if (!token) return false;

  const res = await fetch(
    `${getPayPalApiBase()}/v1/notifications/verify-webhook-signature`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        auth_algo: headers.authAlgo,
        cert_url: headers.certUrl,
        transmission_id: headers.transmissionId,
        transmission_sig: headers.transmissionSig,
        transmission_time: headers.transmissionTime,
        webhook_id: webhookId,
        webhook_event: event,
      }),
    }
  );

  if (!res.ok) {
    console.error("[PayPal] Webhook verify failed:", res.status, await res.text());
    return false;
  }

  const data = (await res.json()) as { verification_status?: string };
  return data.verification_status === "SUCCESS";
}

export function shouldProcessUnverifiedWebhook(): boolean {
  return env("PAYPAL_SKIP_WEBHOOK_VERIFY") === "true";
}

/** Create a PayPal subscription; returns approval URL for the payer. */
export async function createPayPalSubscription(params: {
  planId: string;
  studentId: string;
  studentEmail: string;
  returnUrl: string;
  cancelUrl: string;
}): Promise<{ subscriptionId: string; approvalUrl: string } | null> {
  const token = await getPayPalAccessToken();
  if (!token) return null;

  const res = await fetch(`${getPayPalApiBase()}/v1/billing/subscriptions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      plan_id: params.planId,
      custom_id: params.studentId,
      subscriber: {
        email_address: params.studentEmail,
      },
      application_context: {
        brand_name: "Tenshinryu ONLINE KIWAMI",
        locale: "en-US",
        shipping_preference: "NO_SHIPPING",
        user_action: "SUBSCRIBE_NOW",
        payment_method: {
          payer_selected: "PAYPAL",
          payee_preferred: "IMMEDIATE_PAYMENT_REQUIRED",
        },
        return_url: params.returnUrl,
        cancel_url: params.cancelUrl,
      },
    }),
  });

  if (!res.ok) {
    console.error("[PayPal] Create subscription failed:", res.status, await res.text());
    return null;
  }

  const data = (await res.json()) as {
    id: string;
    links?: { rel: string; href: string }[];
  };

  const approve = data.links?.find((l) => l.rel === "approve");
  if (!approve?.href) return null;

  return { subscriptionId: data.id, approvalUrl: approve.href };
}

export { MEMBERSHIP_TIERS };
