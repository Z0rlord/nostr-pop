import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";

export type PaymentMethod = "stripe" | "lightning";
export type MemberStatus = "pending" | "active" | "canceled" | "expired";

export interface Member {
  id: string;
  npub: string;
  email?: string;
  paymentMethod: PaymentMethod;
  status: MemberStatus;
  createdAt: string;
  paidUntil?: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  lightningInvoiceId?: string;
}

interface MemberStore {
  members: Member[];
}

function dataDir(): string {
  return process.env.MEMBERSHIP_DATA_DIR || path.join(process.cwd(), "data");
}

function storePath(): string {
  return path.join(dataDir(), "members.json");
}

async function ensureStore(): Promise<void> {
  const dir = dataDir();
  await fs.mkdir(dir, { recursive: true });
  try {
    await fs.access(storePath());
  } catch {
    const empty: MemberStore = { members: [] };
    await fs.writeFile(storePath(), JSON.stringify(empty, null, 2));
  }
}

async function readStore(): Promise<MemberStore> {
  await ensureStore();
  const raw = await fs.readFile(storePath(), "utf8");
  return JSON.parse(raw) as MemberStore;
}

async function writeStore(store: MemberStore): Promise<void> {
  await ensureStore();
  await fs.writeFile(storePath(), JSON.stringify(store, null, 2));
}

export async function findMemberByNpub(npub: string): Promise<Member | undefined> {
  const store = await readStore();
  const matches = store.members.filter((m) => m.npub === npub);
  if (matches.length === 0) return undefined;
  if (matches.length === 1) return matches[0];

  const rank: Record<MemberStatus, number> = {
    active: 0,
    pending: 1,
    canceled: 2,
    expired: 3,
  };
  return matches.sort((a, b) => rank[a.status] - rank[b.status])[0];
}

export async function findMemberByStripeSubscription(
  subscriptionId: string
): Promise<Member | undefined> {
  const store = await readStore();
  return store.members.find((m) => m.stripeSubscriptionId === subscriptionId);
}

export async function findMemberByLightningInvoice(
  invoiceId: string
): Promise<Member | undefined> {
  const store = await readStore();
  return store.members.find((m) => m.lightningInvoiceId === invoiceId);
}

export async function createPendingMember(input: {
  npub: string;
  email?: string;
  paymentMethod: PaymentMethod;
  lightningInvoiceId?: string;
}): Promise<Member> {
  const store = await readStore();
  const existing = store.members.find(
    (m) => m.npub === input.npub && m.status === "active"
  );
  if (existing) return existing;

  const pending = store.members.find(
    (m) =>
      m.npub === input.npub &&
      m.paymentMethod === input.paymentMethod &&
      m.status === "pending"
  );
  if (pending) {
    if (input.email && !pending.email) pending.email = input.email;
    if (input.lightningInvoiceId)
      pending.lightningInvoiceId = input.lightningInvoiceId;
    await writeStore(store);
    return pending;
  }

  const member: Member = {
    id: randomUUID(),
    npub: input.npub,
    email: input.email,
    paymentMethod: input.paymentMethod,
    status: "pending",
    createdAt: new Date().toISOString(),
    lightningInvoiceId: input.lightningInvoiceId,
  };
  store.members.push(member);
  await writeStore(store);
  return member;
}

export async function activateMember(
  id: string,
  updates: Partial<Member>
): Promise<Member | undefined> {
  const store = await readStore();
  const member = store.members.find((m) => m.id === id);
  if (!member) return undefined;

  const paidUntil = new Date();
  paidUntil.setMonth(paidUntil.getMonth() + 1);

  Object.assign(member, updates, {
    status: "active" as MemberStatus,
    paidUntil: paidUntil.toISOString(),
  });
  await writeStore(store);
  return member;
}

export async function updateMemberStatus(
  subscriptionId: string,
  status: MemberStatus
): Promise<Member | undefined> {
  const store = await readStore();
  const member = store.members.find(
    (m) => m.stripeSubscriptionId === subscriptionId
  );
  if (!member) return undefined;
  member.status = status;
  await writeStore(store);
  return member;
}

export async function listActiveMembers(): Promise<Member[]> {
  const store = await readStore();
  return store.members.filter((m) => m.status === "active");
}
