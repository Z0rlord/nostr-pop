import {
  buildPersonalStats,
  fetchPracticeSessionsForPubkey,
} from "@/lib/practice-events";
import { listActiveMembers, type Member } from "@/lib/membership";
import { decodeNpubToHex } from "@/lib/nostr";
import { fetchNostrProfile } from "@/lib/nostr-profile";
import { fetchInvoiceForLnAddr, isValidLud16 } from "@/lib/lnurl-pay";
import {
  streakNwcCanPayInvoice,
  streakNwcConfigured,
  withStreakNwcClient,
} from "@/lib/streak-nwc-client";
import {
  appendStreakPayout,
  hasPaidStreakPayoutToday,
  sumPaidSatsForUtcDate,
  tryClaimStreakPayoutSlot,
  utcDateKey,
  type StreakPayoutRecord,
  type StreakPayoutStatus,
} from "@/lib/streak-payout-ledger";

export type StreakPayoutConfig = {
  amountSats: number;
  minStreak: number;
  dailyBudgetSats: number;
  dryRun: boolean;
};

export type StreakPayoutResultItem = {
  npub: string;
  pubkey: string;
  status: StreakPayoutStatus;
  amountSats: number;
  streakDays?: number;
  lud16?: string;
  error?: string;
  persisted: boolean;
};

export type StreakPayoutRunSummary = {
  date: string;
  dryRun: boolean;
  amountSats: number;
  minStreak: number;
  dailyBudgetSats: number;
  nwcConfigured: boolean;
  canPayInvoice: boolean;
  spentBefore: number;
  spentAfter: number;
  membersConsidered: number;
  results: StreakPayoutResultItem[];
};

function envInt(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function streakPayoutConfigFromEnv(): StreakPayoutConfig {
  const dryRaw = process.env.STREAK_PAYOUT_DRY_RUN?.trim();
  // Default dry-run ON until ops explicitly sets STREAK_PAYOUT_DRY_RUN=0
  const dryRun = dryRaw === undefined || dryRaw === "" || dryRaw === "1";
  return {
    amountSats: envInt("STREAK_SATS_AMOUNT", 21),
    minStreak: envInt("STREAK_SATS_MIN_STREAK", 1),
    dailyBudgetSats: envInt("STREAK_SATS_DAILY_BUDGET", 10_000),
    dryRun,
  };
}

function practicedToday(
  lastPracticeAt: number | undefined,
  date: string
): boolean {
  if (!lastPracticeAt) return false;
  return new Date(lastPracticeAt * 1000).toISOString().slice(0, 10) === date;
}

async function resolveLud16(
  member: Member,
  pubkeyHex: string
): Promise<string | undefined> {
  const override = member.lud16?.trim();
  if (override && isValidLud16(override)) return override.toLowerCase();

  const profile = await fetchNostrProfile(pubkeyHex);
  const lud16 = profile?.lud16?.trim();
  if (lud16 && isValidLud16(lud16)) return lud16.toLowerCase();
  return undefined;
}

function ephemeral(
  partial: Omit<StreakPayoutResultItem, "persisted">
): StreakPayoutResultItem {
  return { ...partial, persisted: false };
}

async function persist(
  partial: Omit<StreakPayoutRecord, "id" | "createdAt">
): Promise<StreakPayoutResultItem> {
  const record =
    partial.status === "paid" || partial.status === "dry_run"
      ? (await tryClaimStreakPayoutSlot(partial)).record
      : await appendStreakPayout(partial);

  if (!record) {
    return ephemeral({
      npub: partial.npub,
      pubkey: partial.pubkey,
      status: "skipped_duplicate",
      amountSats: 0,
      streakDays: partial.streakDays,
      lud16: partial.lud16,
    });
  }

  return {
    npub: record.npub,
    pubkey: record.pubkey,
    status: record.status,
    amountSats: record.amountSats,
    streakDays: record.streakDays,
    lud16: record.lud16,
    error: record.error,
    persisted: true,
  };
}

export async function runStreakPayouts(
  config: StreakPayoutConfig = streakPayoutConfigFromEnv()
): Promise<StreakPayoutRunSummary> {
  const date = utcDateKey();
  const nwcConfigured = streakNwcConfigured();
  const canPayInvoice =
    !config.dryRun && nwcConfigured ? await streakNwcCanPayInvoice() : false;

  let spent = await sumPaidSatsForUtcDate(date);
  const spentBefore = spent;
  const results: StreakPayoutResultItem[] = [];

  const members = await listActiveMembers();
  const byPubkey = new Map<string, Member>();
  for (const member of members) {
    const hex = decodeNpubToHex(member.npub);
    if (!hex) continue;
    byPubkey.set(hex, member);
  }

  for (const [pubkey, member] of Array.from(byPubkey.entries())) {
    if (await hasPaidStreakPayoutToday(pubkey, date)) {
      results.push(
        ephemeral({
          pubkey,
          npub: member.npub,
          amountSats: 0,
          status: "skipped_duplicate",
        })
      );
      continue;
    }

    if (spent + config.amountSats > config.dailyBudgetSats) {
      results.push(
        await persist({
          pubkey,
          npub: member.npub,
          date,
          amountSats: 0,
          status: "skipped_budget",
          error: `daily budget ${config.dailyBudgetSats} sats would be exceeded`,
        })
      );
      break;
    }

    let streakDays = 0;
    let lastPracticeAt: number | undefined;
    try {
      const sessions = await fetchPracticeSessionsForPubkey(pubkey, 200);
      const stats = buildPersonalStats(sessions);
      streakDays = stats.currentStreak;
      lastPracticeAt = stats.lastPracticeAt;
    } catch (err) {
      results.push(
        await persist({
          pubkey,
          npub: member.npub,
          date,
          amountSats: 0,
          status: "failed",
          error: err instanceof Error ? err.message : "practice fetch failed",
        })
      );
      continue;
    }

    if (
      streakDays < config.minStreak ||
      !practicedToday(lastPracticeAt, date)
    ) {
      results.push(
        ephemeral({
          pubkey,
          npub: member.npub,
          amountSats: 0,
          status: "skipped_not_qualified",
          streakDays,
        })
      );
      continue;
    }

    const lud16 = await resolveLud16(member, pubkey);
    if (!lud16) {
      results.push(
        await persist({
          pubkey,
          npub: member.npub,
          date,
          amountSats: config.amountSats,
          status: "skipped_no_lud16",
          streakDays,
        })
      );
      continue;
    }

    if (config.dryRun) {
      const item = await persist({
        pubkey,
        npub: member.npub,
        date,
        amountSats: config.amountSats,
        status: "dry_run",
        lud16,
        streakDays,
      });
      results.push(item);
      if (item.status === "dry_run") {
        spent += config.amountSats;
      }
      continue;
    }

    if (!nwcConfigured) {
      results.push(
        await persist({
          pubkey,
          npub: member.npub,
          date,
          amountSats: config.amountSats,
          status: "failed",
          lud16,
          streakDays,
          error:
            "STREAK_NWC_CONNECTION_SECRET (or NWC_CONNECTION_SECRET) not set",
        })
      );
      continue;
    }

    if (!canPayInvoice) {
      results.push(
        await persist({
          pubkey,
          npub: member.npub,
          date,
          amountSats: config.amountSats,
          status: "failed",
          lud16,
          streakDays,
          error:
            "NWC connection lacks pay_invoice — create a Hub app with pay_invoice and set STREAK_NWC_CONNECTION_SECRET",
        })
      );
      continue;
    }

    try {
      const invoice = await fetchInvoiceForLnAddr(
        lud16,
        config.amountSats * 1000,
        `DojoPop streak reward · ${streakDays}d`
      );

      await withStreakNwcClient((client) =>
        client.payInvoice({
          invoice: invoice.bolt11,
          metadata: {
            comment: `streak:${date}:${member.npub.slice(0, 16)}`,
          },
        })
      );

      const item = await persist({
        pubkey,
        npub: member.npub,
        date,
        amountSats: config.amountSats,
        status: "paid",
        lud16,
        paymentHash: invoice.paymentHash,
        streakDays,
      });
      results.push(item);
      if (item.status === "paid") {
        spent += config.amountSats;
      }
    } catch (err) {
      results.push(
        await persist({
          pubkey,
          npub: member.npub,
          date,
          amountSats: config.amountSats,
          status: "failed",
          lud16,
          streakDays,
          error: err instanceof Error ? err.message : "pay failed",
        })
      );
    }
  }

  return {
    date,
    dryRun: config.dryRun,
    amountSats: config.amountSats,
    minStreak: config.minStreak,
    dailyBudgetSats: config.dailyBudgetSats,
    nwcConfigured,
    canPayInvoice,
    spentBefore,
    spentAfter: spent,
    membersConsidered: byPubkey.size,
    results,
  };
}
