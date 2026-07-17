/** LUD-16 lightning address → LNURL-pay BOLT11 invoice. */

export type LnurlPayInvoice = {
  bolt11: string;
  paymentHash?: string;
  amountMsats: number;
};

function normalizeLud16(input: string): string | null {
  const trimmed = input.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed)) {
    return null;
  }
  return trimmed;
}

function lightningAddressUrl(lud16: string): string {
  const [name, domain] = lud16.split("@");
  return `https://${domain}/.well-known/lnurlp/${encodeURIComponent(name)}`;
}

type LnurlPayMetadata = {
  tag?: string;
  callback?: string;
  minSendable?: number;
  maxSendable?: number;
  status?: string;
  reason?: string;
};

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    redirect: "follow",
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`LNURL request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

export async function fetchInvoiceForLnAddr(
  lud16Raw: string,
  amountMsats: number,
  comment?: string
): Promise<LnurlPayInvoice> {
  if (!Number.isFinite(amountMsats) || amountMsats < 1000) {
    throw new Error("LNURL amount must be at least 1000 msats");
  }

  const lud16 = normalizeLud16(lud16Raw);
  if (!lud16) {
    throw new Error("Invalid lightning address");
  }

  const meta = await fetchJson<LnurlPayMetadata>(lightningAddressUrl(lud16));

  if (meta.status === "ERROR") {
    throw new Error(meta.reason || "LNURL pay error");
  }
  if (meta.tag !== "payRequest" || !meta.callback) {
    throw new Error("LNURL endpoint is not payRequest");
  }

  const min = meta.minSendable ?? 1000;
  const max = meta.maxSendable ?? Number.MAX_SAFE_INTEGER;
  if (amountMsats < min || amountMsats > max) {
    throw new Error(
      `LNURL amount ${amountMsats} outside bounds ${min}–${max}`
    );
  }

  const callback = new URL(meta.callback);
  callback.searchParams.set("amount", String(amountMsats));
  if (comment) {
    callback.searchParams.set("comment", comment.slice(0, 120));
  }

  const invoiceRes = await fetchJson<{
    pr?: string;
    payment_hash?: string;
    status?: string;
    reason?: string;
  }>(callback.toString());

  if (invoiceRes.status === "ERROR") {
    throw new Error(invoiceRes.reason || "LNURL invoice error");
  }
  if (!invoiceRes.pr) {
    throw new Error("LNURL callback missing payment request");
  }

  return {
    bolt11: invoiceRes.pr,
    paymentHash: invoiceRes.payment_hash?.toLowerCase(),
    amountMsats,
  };
}

export function isValidLud16(input: string): boolean {
  return normalizeLud16(input) !== null;
}
