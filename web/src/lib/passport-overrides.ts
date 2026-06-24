import { promises as fs } from "fs";
import path from "path";

export interface PassportOverride {
  affiliatedSchoolId?: string;
  displaySchool?: string;
  /** Self-reported belt, kyu, dan, or grade (not roster role). */
  rank?: string;
  discipline?: string;
  location?: string;
  updatedAt: string;
}

interface OverrideStore {
  overrides: Record<string, PassportOverride>;
}

function dataDir(): string {
  return process.env.MEMBERSHIP_DATA_DIR || path.join(process.cwd(), "data");
}

function storePath(): string {
  return path.join(dataDir(), "passport-overrides.json");
}

async function ensureStore(): Promise<void> {
  const dir = dataDir();
  await fs.mkdir(dir, { recursive: true });
  try {
    await fs.access(storePath());
  } catch {
    const empty: OverrideStore = { overrides: {} };
    await fs.writeFile(storePath(), JSON.stringify(empty, null, 2));
  }
}

async function readStore(): Promise<OverrideStore> {
  await ensureStore();
  const raw = await fs.readFile(storePath(), "utf8");
  return JSON.parse(raw) as OverrideStore;
}

async function writeStore(store: OverrideStore): Promise<void> {
  await ensureStore();
  await fs.writeFile(storePath(), JSON.stringify(store, null, 2));
}

export async function getPassportOverride(
  pubkeyHex: string
): Promise<PassportOverride | null> {
  const store = await readStore();
  return store.overrides[pubkeyHex.toLowerCase()] ?? null;
}

export type PassportOverrideInput = {
  affiliatedSchoolId?: string | null;
  displaySchool?: string | null;
  rank?: string | null;
  discipline?: string | null;
  location?: string | null;
};

function trimOrUndef(value: string | null | undefined): string | undefined {
  if (value == null) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export async function upsertPassportOverride(
  pubkeyHex: string,
  input: PassportOverrideInput
): Promise<PassportOverride> {
  const store = await readStore();
  const key = pubkeyHex.toLowerCase();
  const prev = store.overrides[key];

  const next: PassportOverride = {
    updatedAt: new Date().toISOString(),
  };

  const affiliatedSchoolId = trimOrUndef(input.affiliatedSchoolId ?? undefined);
  const displaySchool = trimOrUndef(input.displaySchool ?? undefined);
  const rank = trimOrUndef(input.rank ?? undefined);
  const discipline = trimOrUndef(input.discipline ?? undefined);
  const location = trimOrUndef(input.location ?? undefined);

  if (affiliatedSchoolId) next.affiliatedSchoolId = affiliatedSchoolId;
  if (displaySchool) next.displaySchool = displaySchool;
  if (rank) next.rank = rank;
  if (discipline) next.discipline = discipline;
  if (location) next.location = location;

  const hasValues =
    next.affiliatedSchoolId ||
    next.displaySchool ||
    next.rank ||
    next.discipline ||
    next.location;

  if (hasValues) {
    store.overrides[key] = next;
  } else {
    delete store.overrides[key];
  }

  await writeStore(store);
  return store.overrides[key] ?? { updatedAt: next.updatedAt };
}
