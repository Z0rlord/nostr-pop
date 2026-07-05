import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import {
  YOGA_SUTRA_FILM_ID,
  yogaSutraRentExpiresAt,
  type FilmPurchaseTier,
} from "@/lib/films/yoga-sutra";

export type FilmId = typeof YOGA_SUTRA_FILM_ID;
export type FilmPaymentMethod = "stripe" | "lightning";
export type FilmPurchaseStatus = "pending" | "unlocked";
export type { FilmPurchaseTier };

export interface FilmPurchase {
  id: string;
  filmId: FilmId;
  tier?: FilmPurchaseTier;
  npub?: string;
  email?: string;
  paymentMethod: FilmPaymentMethod;
  status: FilmPurchaseStatus;
  createdAt: string;
  unlockedAt?: string;
  expiresAt?: string;
  stripeSessionId?: string;
  lightningInvoiceId?: string;
  /** Opaque token for Stripe buyers without npub (stored client-side). */
  accessToken?: string;
}

export interface FilmAccessInfo {
  unlocked: boolean;
  tier?: FilmPurchaseTier;
  expiresAt?: string;
  canDownload: boolean;
}

interface FilmPurchaseStore {
  purchases: FilmPurchase[];
}

function dataDir(): string {
  return process.env.MEMBERSHIP_DATA_DIR || path.join(process.cwd(), "data");
}

function storePath(): string {
  return path.join(dataDir(), "film-purchases.json");
}

function effectiveTier(purchase: FilmPurchase): FilmPurchaseTier {
  return purchase.tier ?? "buy";
}

export function isPurchaseActive(purchase: FilmPurchase, now = Date.now()): boolean {
  if (purchase.status !== "unlocked") return false;
  const tier = effectiveTier(purchase);
  if (tier === "buy") return true;
  if (!purchase.expiresAt) return true;
  return new Date(purchase.expiresAt).getTime() > now;
}

async function ensureStore(): Promise<void> {
  const dir = dataDir();
  await fs.mkdir(dir, { recursive: true });
  try {
    await fs.access(storePath());
  } catch {
    const empty: FilmPurchaseStore = { purchases: [] };
    await fs.writeFile(storePath(), JSON.stringify(empty, null, 2));
  }
}

async function readStore(): Promise<FilmPurchaseStore> {
  await ensureStore();
  const raw = await fs.readFile(storePath(), "utf8");
  return JSON.parse(raw) as FilmPurchaseStore;
}

async function writeStore(store: FilmPurchaseStore): Promise<void> {
  await ensureStore();
  await fs.writeFile(storePath(), JSON.stringify(store, null, 2));
}

export async function findUnlockedPurchase(input: {
  filmId: FilmId;
  npub?: string;
  accessToken?: string;
}): Promise<FilmPurchase | undefined> {
  const store = await readStore();
  return store.purchases.find((p) => {
    if (p.filmId !== input.filmId || p.status !== "unlocked") return false;
    if (input.npub && p.npub === input.npub) return true;
    if (input.accessToken && p.accessToken === input.accessToken) return true;
    return false;
  });
}

export async function findActivePurchase(input: {
  filmId: FilmId;
  npub?: string;
  accessToken?: string;
}): Promise<FilmPurchase | undefined> {
  const purchase = await findUnlockedPurchase(input);
  if (!purchase || !isPurchaseActive(purchase)) return undefined;
  return purchase;
}

export async function findPurchaseById(
  id: string
): Promise<FilmPurchase | undefined> {
  const store = await readStore();
  return store.purchases.find((p) => p.id === id);
}

export async function findPurchaseByStripeSession(
  sessionId: string
): Promise<FilmPurchase | undefined> {
  const store = await readStore();
  return store.purchases.find((p) => p.stripeSessionId === sessionId);
}

export async function findPurchaseByLightningInvoice(
  invoiceId: string
): Promise<FilmPurchase | undefined> {
  const store = await readStore();
  return store.purchases.find((p) => p.lightningInvoiceId === invoiceId);
}

function existingUnlockCoversTier(
  existing: FilmPurchase,
  requestedTier: FilmPurchaseTier
): boolean {
  const existingTier = effectiveTier(existing);
  if (existingTier === "buy") return true;
  return requestedTier === "rent" && existingTier === "rent";
}

export async function createPendingFilmPurchase(input: {
  filmId: FilmId;
  tier: FilmPurchaseTier;
  npub?: string;
  email?: string;
  paymentMethod: FilmPaymentMethod;
  lightningInvoiceId?: string;
  stripeSessionId?: string;
}): Promise<FilmPurchase> {
  const store = await readStore();

  if (input.npub) {
    const active = store.purchases.find(
      (p) =>
        p.filmId === input.filmId &&
        p.npub === input.npub &&
        isPurchaseActive(p)
    );
    if (active && existingUnlockCoversTier(active, input.tier)) {
      return active;
    }
  }

  const pending = store.purchases.find(
    (p) =>
      p.filmId === input.filmId &&
      p.status === "pending" &&
      p.paymentMethod === input.paymentMethod &&
      p.tier === input.tier &&
      ((input.npub && p.npub === input.npub) ||
        (input.lightningInvoiceId &&
          p.lightningInvoiceId === input.lightningInvoiceId) ||
        (input.stripeSessionId && p.stripeSessionId === input.stripeSessionId))
  );
  if (pending) {
    if (input.email && !pending.email) pending.email = input.email;
    if (input.lightningInvoiceId)
      pending.lightningInvoiceId = input.lightningInvoiceId;
    if (input.stripeSessionId) pending.stripeSessionId = input.stripeSessionId;
    await writeStore(store);
    return pending;
  }

  const purchase: FilmPurchase = {
    id: randomUUID(),
    filmId: input.filmId,
    tier: input.tier,
    npub: input.npub,
    email: input.email,
    paymentMethod: input.paymentMethod,
    status: "pending",
    createdAt: new Date().toISOString(),
    lightningInvoiceId: input.lightningInvoiceId,
    stripeSessionId: input.stripeSessionId,
  };
  store.purchases.push(purchase);
  await writeStore(store);
  return purchase;
}

export async function updateFilmPurchase(
  id: string,
  updates: Partial<FilmPurchase>
): Promise<FilmPurchase | undefined> {
  const store = await readStore();
  const purchase = store.purchases.find((p) => p.id === id);
  if (!purchase) return undefined;
  Object.assign(purchase, updates);
  await writeStore(store);
  return purchase;
}

export async function unlockFilmPurchase(
  id: string,
  updates: Partial<FilmPurchase> = {}
): Promise<FilmPurchase | undefined> {
  const store = await readStore();
  const purchase = store.purchases.find((p) => p.id === id);
  if (!purchase) return undefined;

  const tier = updates.tier ?? purchase.tier ?? "buy";
  const accessToken = purchase.accessToken || randomUUID();
  const expiresAt =
    tier === "rent" ? yogaSutraRentExpiresAt() : undefined;

  Object.assign(purchase, updates, {
    tier,
    status: "unlocked" as FilmPurchaseStatus,
    unlockedAt: new Date().toISOString(),
    accessToken,
    expiresAt,
  });
  await writeStore(store);
  return purchase;
}

export async function hasFilmAccess(input: {
  filmId: FilmId;
  npub?: string;
  accessToken?: string;
}): Promise<boolean> {
  return Boolean(await findActivePurchase(input));
}

export async function getFilmAccessInfo(input: {
  filmId: FilmId;
  npub?: string;
  accessToken?: string;
}): Promise<FilmAccessInfo> {
  const purchase = await findActivePurchase(input);
  if (!purchase) {
    return { unlocked: false, canDownload: false };
  }

  const tier = effectiveTier(purchase);
  return {
    unlocked: true,
    tier,
    expiresAt: purchase.expiresAt,
    canDownload: tier === "buy",
  };
}
