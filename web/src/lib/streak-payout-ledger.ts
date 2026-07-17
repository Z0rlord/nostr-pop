import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";

export type StreakPayoutStatus =
  | "dry_run"
  | "paid"
  | "failed"
  | "skipped_no_lud16"
  | "skipped_not_qualified"
  | "skipped_budget"
  | "skipped_duplicate";

export type StreakPayoutRecord = {
  id: string;
  pubkey: string;
  npub: string;
  date: string;
  amountSats: number;
  status: StreakPayoutStatus;
  lud16?: string;
  paymentHash?: string;
  error?: string;
  streakDays?: number;
  createdAt: string;
};

type StreakPayoutStore = {
  payouts: StreakPayoutRecord[];
};

function dataDir(): string {
  return process.env.MEMBERSHIP_DATA_DIR || path.join(process.cwd(), "data");
}

function storePath(): string {
  return path.join(dataDir(), "streak-payouts.json");
}

function lockPath(): string {
  return path.join(dataDir(), ".streak-payouts.lock");
}

async function ensureStore(): Promise<void> {
  const dir = dataDir();
  await fs.mkdir(dir, { recursive: true });
  try {
    await fs.access(storePath());
  } catch {
    const empty: StreakPayoutStore = { payouts: [] };
    await fs.writeFile(storePath(), JSON.stringify(empty, null, 2));
  }
}

async function readStore(): Promise<StreakPayoutStore> {
  await ensureStore();
  const raw = await fs.readFile(storePath(), "utf8");
  return JSON.parse(raw) as StreakPayoutStore;
}

async function writeStore(store: StreakPayoutStore): Promise<void> {
  await ensureStore();
  await fs.writeFile(storePath(), JSON.stringify(store, null, 2));
}

const LOCK_STALE_MS = 120_000;

async function withLedgerLock<T>(fn: () => Promise<T>): Promise<T> {
  await ensureStore();
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const handle = await fs.open(lockPath(), "wx");
      await handle.close();
      break;
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code !== "EEXIST") throw err;
      try {
        const st = await fs.stat(lockPath());
        if (Date.now() - st.mtimeMs > LOCK_STALE_MS) {
          await fs.unlink(lockPath());
          continue;
        }
      } catch {
        /* race */
      }
      await new Promise((r) => setTimeout(r, 50));
    }
  }

  if (Date.now() >= deadline) {
    throw new Error("streak payout ledger lock timeout");
  }

  try {
    return await fn();
  } finally {
    await fs.unlink(lockPath()).catch(() => undefined);
  }
}

export function utcDateKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export async function hasPaidStreakPayoutToday(
  pubkey: string,
  date: string = utcDateKey()
): Promise<boolean> {
  const store = await readStore();
  return store.payouts.some(
    (p) =>
      p.pubkey === pubkey &&
      p.date === date &&
      (p.status === "paid" || p.status === "dry_run")
  );
}

export async function sumPaidSatsForUtcDate(
  date: string = utcDateKey()
): Promise<number> {
  const store = await readStore();
  return store.payouts
    .filter(
      (p) =>
        p.date === date &&
        (p.status === "paid" || p.status === "dry_run")
    )
    .reduce((sum, p) => sum + p.amountSats, 0);
}

export async function tryClaimStreakPayoutSlot(
  record: Omit<StreakPayoutRecord, "id" | "createdAt">
): Promise<{ claimed: boolean; record?: StreakPayoutRecord }> {
  return withLedgerLock(async () => {
    const store = await readStore();
    const already = store.payouts.some(
      (p) =>
        p.pubkey === record.pubkey &&
        p.date === record.date &&
        (p.status === "paid" || p.status === "dry_run")
    );
    if (already && (record.status === "paid" || record.status === "dry_run")) {
      return { claimed: false };
    }

    const full: StreakPayoutRecord = {
      ...record,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
    };
    store.payouts.push(full);
    await writeStore(store);
    return { claimed: true, record: full };
  });
}

export async function appendStreakPayout(
  record: Omit<StreakPayoutRecord, "id" | "createdAt">
): Promise<StreakPayoutRecord> {
  return withLedgerLock(async () => {
    const store = await readStore();
    const full: StreakPayoutRecord = {
      ...record,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
    };
    store.payouts.push(full);
    await writeStore(store);
    return full;
  });
}

export async function listRecentStreakPayouts(
  limit = 50
): Promise<StreakPayoutRecord[]> {
  const store = await readStore();
  return [...store.payouts]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}
