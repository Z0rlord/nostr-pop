import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { DEFAULT_MEMBERSHIP_SATS } from "@/lib/constants";
import { INVOICE_EXPIRY_SEC, nwcConfigured, withNwcClient } from "@/lib/nwc-client";

export interface LightningInvoiceRecord {
  id: string;
  npub: string;
  email?: string;
  amountSats: number;
  bolt11?: string;
  checkoutLink?: string;
  provider: "nwc" | "scaffold";
  status: "pending" | "paid" | "expired";
  createdAt: string;
  paidAt?: string;
  /** NWC payment_hash (hex) for lookup_invoice */
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

/** @deprecated use nwcConfigured — kept for API response field name */
export function lightningConfigured(): boolean {
  return nwcConfigured();
}

export function membershipSats(): number {
  const raw = process.env.LIGHTNING_MEMBERSHIP_SATS;
  if (!raw) return DEFAULT_MEMBERSHIP_SATS;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_MEMBERSHIP_SATS;
}

export async function getInvoice(
  id: string
): Promise<LightningInvoiceRecord | undefined> {
  const store = await readStore();
  return store.invoices.find((i) => i.id === id);
}

export async function findInvoiceByExternalId(
  externalOrInternalId: string
): Promise<LightningInvoiceRecord | undefined> {
  const store = await readStore();
  return store.invoices.find(
    (i) => i.id === externalOrInternalId || i.externalId === externalOrInternalId
  );
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

export async function markInvoicePaid(
  id: string
): Promise<LightningInvoiceRecord | undefined> {
  const store = await readStore();
  const invoice = store.invoices.find((i) => i.id === id);
  if (!invoice) return undefined;
  invoice.status = "paid";
  invoice.paidAt = new Date().toISOString();
  await writeStore(store);
  return invoice;
}

function isNwcInvoiceSettled(result: {
  settled_at?: number;
  preimage?: string;
  state?: string;
}): boolean {
  return Boolean(
    result.settled_at ||
      result.preimage ||
      result.state === "settled"
  );
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

  if (!nwcConfigured()) {
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
        "Add NWC_CONNECTION_SECRET to Doppler (nostr+walletconnect://… from Alby Hub or Alby Account). See docs/lightning-nwc.md.",
    };
  }

  const memo = `DojoPop membership — ${input.npub.slice(0, 16)}…`;
  const tx = await withNwcClient((client) =>
    client.makeInvoice({
      amount: amountSats * 1000,
      description: memo,
      expiry: INVOICE_EXPIRY_SEC,
    })
  );

  const invoice: LightningInvoiceRecord = {
    id,
    npub: input.npub,
    email: input.email,
    amountSats,
    bolt11: tx.invoice,
    provider: "nwc",
    status: "pending",
    createdAt: new Date().toISOString(),
    externalId: tx.payment_hash,
  };

  await saveInvoice(invoice);
  return { invoice, configured: true };
}

export async function refreshInvoiceStatus(
  id: string
): Promise<LightningInvoiceRecord | undefined> {
  const invoice = await getInvoice(id);
  if (!invoice || invoice.status === "paid") return invoice;
  if (!nwcConfigured() || invoice.provider !== "nwc" || !invoice.externalId) {
    return invoice;
  }

  const lookup = await withNwcClient((client) =>
    client.lookupInvoice({ payment_hash: invoice.externalId })
  );

  if (isNwcInvoiceSettled(lookup)) {
    return markInvoicePaid(id);
  }

  if (
    lookup.expires_at &&
    lookup.expires_at > 0 &&
    lookup.expires_at < Math.floor(Date.now() / 1000)
  ) {
    const expired = { ...invoice, status: "expired" as const };
    await saveInvoice(expired);
    return expired;
  }

  return invoice;
}
