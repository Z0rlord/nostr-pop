import { NextRequest, NextResponse } from "next/server";
import {
  runStreakPayouts,
  streakPayoutConfigFromEnv,
} from "@/lib/streak-payouts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** LNURL + NWC + relay queries can take a while for many members. */
export const maxDuration = 120;

function authorize(req: NextRequest): boolean {
  const expected = process.env.STREAK_PAYOUT_CRON_SECRET?.trim();
  if (!expected) return false;

  const header =
    req.headers.get("x-streak-payout-secret")?.trim() ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();

  return Boolean(header && header === expected);
}

/**
 * Cron-callable streak sats worker.
 *
 * POST /api/ops/streak-payouts
 * Header: x-streak-payout-secret: $STREAK_PAYOUT_CRON_SECRET
 * Optional JSON body: { "dryRun": true|false } overrides STREAK_PAYOUT_DRY_RUN
 */
export async function POST(req: NextRequest) {
  if (!authorize(req)) {
    return NextResponse.json(
      {
        error:
          "Unauthorized — set STREAK_PAYOUT_CRON_SECRET and pass x-streak-payout-secret",
      },
      { status: 401 }
    );
  }

  const config = streakPayoutConfigFromEnv();
  try {
    const body = (await req.json().catch(() => ({}))) as {
      dryRun?: boolean;
    };
    if (typeof body.dryRun === "boolean") {
      config.dryRun = body.dryRun;
    }
  } catch {
    /* empty body ok */
  }

  try {
    const summary = await runStreakPayouts(config);
    const paidOrDry = summary.results.filter(
      (r) => r.status === "paid" || r.status === "dry_run"
    ).length;
    const failed = summary.results.filter((r) => r.status === "failed").length;

    return NextResponse.json({
      ok: true,
      ...summary,
      counts: {
        paidOrDry,
        failed,
        skipped: summary.results.length - paidOrDry - failed,
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "streak payout failed",
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  if (!authorize(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const config = streakPayoutConfigFromEnv();
  return NextResponse.json({
    ok: true,
    endpoint: "POST /api/ops/streak-payouts",
    config: {
      amountSats: config.amountSats,
      minStreak: config.minStreak,
      dailyBudgetSats: config.dailyBudgetSats,
      dryRun: config.dryRun,
      nwcConfigured: Boolean(
        process.env.STREAK_NWC_CONNECTION_SECRET?.trim() ||
          process.env.NWC_CONNECTION_SECRET?.trim()
      ),
    },
  });
}
