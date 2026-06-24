import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { YOGA_SUTRA_FILM_ID, yogaSutraPriceSats } from "@/lib/films/yoga-sutra";
import { INVOICE_EXPIRY_SEC, nwcConfigured, withNwcClient } from "@/lib/nwc-client";

export type FilmLightningFilmId = typeof YOGA_SUTRA_FILM_ID;

export interface FilmLightningInvoice {
  id: string;
  filmId: FilmLightningFilmId;
  npub: string;
  email?: string;
  amountSats: number;
  bolt11?: string;
  provider: "nwc" | "scaffold";
  status: "pending" | "paid" | "expired";
  createdAt: string;
  paidAt?: string;
  externalId?: string;
}

interface InvoiceStore {
  invoices: FilmLightningInvoice[];
}

function dataDir(): string {
  return process.env.MEMBERSHIP_DATA_DIR || path.join(process.cwd(), "data");
}

function storePath(): string {
  return path.join(dataDir(), "film-lightning-invoices.json");
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

function filmSats(filmId: FilmLightningFilmId): number {
  if (filmId === YOGA_SUTRA_FILM_ID) return yogaSutraPriceSats();
  return yogaSutraPriceSats();
}

function filmTitle(filmId: FilmLightningFilmId): string {
  if (filmId === YOGA_SUTRA_FILM_ID) return "Yoga Sutra";
  return filmId;
}

export function filmLightningConfigured(): boolean {
  return nwcConfigured();
}

export async function getFilmInvoice(
  id: string
): Promise<FilmLightningInvoice | undefined> {
  const store = await readStore();
  return store.invoices.find((i) => i.id === id);
}

async function saveInvoice(invoice: FilmLightningInvoice): Promise<void> {
  const store = await readStore();
  const idx = store.invoices.findIndex((i) => i.id === invoice.id);
  if (idx >= 0) store.invoices[idx] = invoice;
  else store.invoices.push(invoice);
  await writeStore(store);
}

export async function markFilmInvoicePaid(
  id: string
): Promise<FilmLightningInvoice | undefined> {
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
    result.settled_at || result.preimage || result.state === "settled"
  );
}

export async function createFilmLightningInvoice(input: {
  filmId: FilmLightningFilmId;
  npub: string;
  email?: string;
}): Promise<{
  invoice: FilmLightningInvoice;
  configured: boolean;
  setupHint?: string;
}> {
  const id = randomUUID();
  const amountSats = filmSats(input.filmId);

  if (!nwcConfigured()) {
    const invoice: FilmLightningInvoice = {
      id,
      filmId: input.filmId,
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
        "Add NWC_CONNECTION_SECRET to Doppler (nostr+walletconnect://… from Alby Hub). See docs/lightning-nwc.md.",
    };
  }

  const memo = `DojoPop film — ${filmTitle(input.filmId)} — ${input.npub.slice(0, 16)}…`;
  const tx = await withNwcClient((client) =>
    client.makeInvoice({
      amount: amountSats * 1000,
      description: memo,
      expiry: INVOICE_EXPIRY_SEC,
    })
  );

  const invoice: FilmLightningInvoice = {
    id,
    filmId: input.filmId,
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

export async function refreshFilmInvoiceStatus(
  id: string
): Promise<FilmLightningInvoice | undefined> {
  const invoice = await getFilmInvoice(id);
  if (!invoice || invoice.status === "paid") return invoice;
  if (!nwcConfigured() || invoice.provider !== "nwc" || !invoice.externalId) {
    return invoice;
  }

  const lookup = await withNwcClient((client) =>
    client.lookupInvoice({ payment_hash: invoice.externalId })
  );

  if (isNwcInvoiceSettled(lookup)) {
    return markFilmInvoicePaid(id);
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
