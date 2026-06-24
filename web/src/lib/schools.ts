import { promises as fs } from "fs";
import path from "path";
import { decodeNpubToHex, isValidNpub } from "@/lib/nostr";
import { generateSchoolKeyHex } from "@/lib/school-crypto";

export interface School {
  id: string;
  name: string;
  disciplines: string[];
  ownerNpub: string;
  instructorNpubs: string[];
  studentNpubs: string[];
  encryptionKeyHex: string;
  createdAt: string;
}

interface SchoolStore {
  schools: School[];
}

function dataDir(): string {
  return process.env.MEMBERSHIP_DATA_DIR || path.join(process.cwd(), "data");
}

function storePath(): string {
  return path.join(dataDir(), "schools.json");
}

async function ensureStore(): Promise<void> {
  const dir = dataDir();
  await fs.mkdir(dir, { recursive: true });
  try {
    await fs.access(storePath());
  } catch {
    await fs.writeFile(
      storePath(),
      JSON.stringify({ schools: [] } satisfies SchoolStore, null, 2)
    );
  }
}

async function readStore(): Promise<SchoolStore> {
  await ensureStore();
  const raw = await fs.readFile(storePath(), "utf8");
  return JSON.parse(raw) as SchoolStore;
}

async function writeStore(store: SchoolStore): Promise<void> {
  await ensureStore();
  await fs.writeFile(storePath(), JSON.stringify(store, null, 2));
}

export async function getSchool(id: string): Promise<School | undefined> {
  const store = await readStore();
  return store.schools.find((s) => s.id === id);
}

export async function listSchools(): Promise<School[]> {
  const store = await readStore();
  return store.schools;
}

export type SchoolRole = "owner" | "instructor" | "student" | null;

export function roleForNpub(school: School, npub: string): SchoolRole {
  if (school.ownerNpub === npub) return "owner";
  if (school.instructorNpubs.includes(npub)) return "instructor";
  if (school.studentNpubs.includes(npub)) return "student";
  return null;
}

export function canInstruct(school: School, npub: string): boolean {
  const role = roleForNpub(school, npub);
  return role === "owner" || role === "instructor";
}

export function isMember(school: School, npub: string): boolean {
  return roleForNpub(school, npub) !== null;
}

export async function addStudentToSchool(
  schoolId: string,
  npub: string
): Promise<{ ok: boolean; error?: string; school?: School }> {
  if (!isValidNpub(npub)) {
    return { ok: false, error: "Invalid npub" };
  }
  if (!decodeNpubToHex(npub)) {
    return { ok: false, error: "Could not decode npub" };
  }

  const store = await readStore();
  const school = store.schools.find((s) => s.id === schoolId);
  if (!school) return { ok: false, error: "School not found" };

  if (
    school.ownerNpub === npub ||
    school.instructorNpubs.includes(npub) ||
    school.studentNpubs.includes(npub)
  ) {
    return { ok: true, school };
  }

  school.studentNpubs.push(npub);
  await writeStore(store);
  return { ok: true, school };
}

export async function createSchool(input: {
  id: string;
  name: string;
  ownerNpub: string;
  disciplines?: string[];
}): Promise<School> {
  if (!isValidNpub(input.ownerNpub)) {
    throw new Error("Invalid owner npub");
  }
  const store = await readStore();
  if (store.schools.some((s) => s.id === input.id)) {
    throw new Error("School id already exists");
  }

  const school: School = {
    id: input.id,
    name: input.name,
    disciplines: input.disciplines ?? ["aikido"],
    ownerNpub: input.ownerNpub,
    instructorNpubs: [],
    studentNpubs: [],
    encryptionKeyHex: generateSchoolKeyHex(),
    createdAt: new Date().toISOString(),
  };
  store.schools.push(school);
  await writeStore(store);
  return school;
}

/** Pubkeys that must be on relay whitelist to publish attendance. */
export function staffNpubs(school: School): string[] {
  return [school.ownerNpub, ...school.instructorNpubs];
}
