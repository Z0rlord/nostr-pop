import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { DEFAULT_MEMBERSHIP_SATS } from "@/lib/constants";

export interface LightningInvoiceRecord {
  id: string;
  npub: string;
  email?: string;
  amountSats: number;
  bolt11?: string;
  checkoutLink?: string;
  provider: "btcpay" | "scaffold";
  status: "pending" | "paid" | "expired";
  createdAt: string;
  paidAt?: string;
  externalId?: string;
}

interface InvoiceStore {
  invoices: LightningInvoiceRecord[];
}

function dataDir(): string {
  return process.env.MEMBERSHIP_DATA_DIR || path.join(process.cwd(), "data");
}

function storePath(): string {
  return path.join(dataDir(), "lightning-invoices.json");
}

async function ensureStore(): Promise<void> {
  const dir = dataDir();
  await fs.mkdir(dir, { recursive: true });
  try {
    await fs.access(storePath());
  } catch {
    await fs.writeFile(storePath(), JSON.stringify({ invoices: [] }, null, 2));
  }
}

async function readStore(): Promise<InvoiceStore> {
  await ensureStore();
  return JSON.parse(await fs.readFile(storePath(), "utf8")) as InvoiceStore;
}

async function writeStore(store: InvoiceStore): Promise<void> {
  await ensureStore();
  await fs.writeFile(storePath(), JSON.stringify(store, null, 2));
}

export function lightningConfigured(): boolean {
  return Boolean(
    process.env.BTCPAY_URL &&
      process.env.BTCPAY_API_KEY &&
      process.env.BTCPAY_STORE_ID
  );
}

export function membershipSats(): number {
  const raw = process.env.LIGHTNING_MEMBERSHIP_SATS;
  if (!raw) return DEFAULT_MEMBERSHIP_SATS;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_MEMBERSHIP_SATS;
}

export async function getInvoice(id: string): Promise<LightningInvoiceRecord | undefined> {
  const store = await readStore();
  return store.invoices.find((i) => i.id === id);
}

export async function saveInvoice(
  invoice: LightningInvoiceRecord
): Promise<void> {
  const store = await readStore();
  const idx = store.invoices.findIndex((i) => i.id === invoice.id);
  if (idx >= 0) store.invoices[idx] = invoice;
  else store.invoices.push(invoice);
  await writeStore(store);
}

export async function markInvoicePaid(id: string): Promise<LightningInvoiceRecord | undefined> {
  const store = await readStore();
  const invoice = store.invoices.find((i) => i.id === id);
  if (!invoice) return undefined;
  invoice.status = "paid";
  invoice.paidAt = new Date().toISOString();
  await writeStore(store);
  return invoice;
}

interface CreateInvoiceInput {
  npub: string;
  email?: string;
}

interface CreateInvoiceResult {
  invoice: LightningInvoiceRecord;
  configured: boolean;
  setupHint?: string;
}

export async function createLightningInvoice(
  input: CreateInvoiceInput
): Promise<CreateInvoiceResult> {
  const id = randomUUID();
  const amountSats = membershipSats();

  if (!lightningConfigured()) {
    const invoice: LightningInvoiceRecord = {
      id,
      npub: input.npub,
      email: input.email,
      amountSats,
      provider: "scaffold",
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    await saveInvoice(invoice);
    return {
      invoice,
      configured: false,
      setupHint:
        "Add BTCPAY_URL, BTCPAY_API_KEY, and BTCPAY_STORE_ID to Doppler to enable Lightning invoices.",
    };
  }

  const base = process.env.BTCPAY_URL!.replace(/\/$/, "");
  const storeId = process.env.BTCPAY_STORE_ID!;
  const res = await fetch(`${base}/api/v1/stores/${storeId}/invoices`, {
    method: "POST",
    headers: {
      Authorization: `token ${process.env.BTCPAY_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: (amountSats / 100_000_000).toFixed(8),
      currency: "BTC",
      metadata: {
        npub: input.npub,
        email: input.email || "",
        membership: "dojopop-monthly",
      },
      checkout: {
        speedPolicy: "HighSpeed",
        expirationMinutes: 30,
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`BTCPay invoice failed (${res.status}): ${text.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    id: string;
    checkoutLink: string;
  };

  const invoice: LightningInvoiceRecord = {
    id,
    npub: input.npub,
    email: input.email,
    amountSats,
    bolt11: undefined,
    checkoutLink: data.checkoutLink,
    provider: "btcpay",
    status: "pending",
    createdAt: new Date().toISOString(),
    externalId: data.id,
  };

  await saveInvoice(invoice);
  return { invoice, configured: true };
}

export async function refreshInvoiceStatus(
  id: string
): Promise<LightningInvoiceRecord | undefined> {
  const invoice = await getInvoice(id);
  if (!invoice || invoice.status === "paid") return invoice;
  if (!lightningConfigured() || !invoice.externalId) return invoice;

  const base = process.env.BTCPAY_URL!.replace(/\/$/, "");
  const storeId = process.env.BTCPAY_STORE_ID!;
  const res = await fetch(
    `${base}/api/v1/stores/${storeId}/invoices/${invoice.externalId}`,
    {
      headers: { Authorization: `token ${process.env.BTCPAY_API_KEY}` },
    }
  );
  if (!res.ok) return invoice;

  const data = (await res.json()) as { status: string };
  if (data.status === "Settled" || data.status === "Processing") {
    return markInvoicePaid(id);
  }
  return invoice;
}
