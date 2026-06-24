"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  buildDailyBuckets,
  buildPersonalStats,
  buildPractitionerStats,
  fetchPracticeSessions,
  fetchPracticeSessionsForPubkey,
  formatDuration,
  leaderboardRank,
  truncateNpub,
  type PracticeSession,
} from "@/lib/practice-events";
import { profileShareText } from "@/lib/media-url";
import { DojoPopPassport } from "@/components/DojoPopPassport";
import { PracticeChart } from "@/components/PracticeChart";
import { PracticeFeed } from "@/components/PracticeFeed";
import { useI18n } from "@/i18n/context";
import type { PracticeIdentity } from "@/lib/practice-identity";

type Props = {
  pubkeyHex: string;
  npub: string;
  readOnly?: boolean;
  identity?: PracticeIdentity;
};

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-dojo-ink/40 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-dojo-mist/50">
        {label}
      </p>
      <p className="mt-1 font-display text-2xl text-white">{value}</p>
      {hint && <p className="mt-1 text-xs text-dojo-mist/50">{hint}</p>}
    </div>
  );
}

export function PersonalPracticeDashboard({
  pubkeyHex,
  npub,
  readOnly = false,
  identity,
}: Props) {
  const { t } = useI18n();
  const [sessions, setSessions] = useState<PracticeSession[]>([]);
  const [rank, setRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profileCopied, setProfileCopied] = useState(false);
  const [totalViews, setTotalViews] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      fetchPracticeSessionsForPubkey(pubkeyHex),
      fetchPracticeSessions(),
    ])
      .then(([mine, all]) => {
        if (cancelled) return;
        setSessions(mine);
        const stats = buildPractitionerStats(all);
        setRank(leaderboardRank(stats, pubkeyHex));
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [pubkeyHex]);

  useEffect(() => {
    if (readOnly) return;
    let cancelled = false;
    fetch(`/api/practice/analytics?npub=${encodeURIComponent(npub)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data && typeof data.totalViews === "number") {
          setTotalViews(data.totalViews);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [npub, readOnly]);

  function downloadBackup() {
    window.location.href = `/api/practice/export?npub=${encodeURIComponent(npub)}`;
  }

  const personal = useMemo(() => buildPersonalStats(sessions), [sessions]);
  const buckets = useMemo(() => buildDailyBuckets(sessions), [sessions]);
  const practiceDays = useMemo(() => {
    const dates = new Set(
      sessions.map((s) =>
        new Date(s.publishedAt * 1000).toISOString().slice(0, 10)
      )
    );
    return dates.size;
  }, [sessions]);

  if (loading) {
    return (
      <p className="py-16 text-center text-dojo-mist/60">Loading your practice log…</p>
    );
  }

  if (error) {
    return (
      <p className="rounded-xl border border-dojo-crimson/30 bg-dojo-crimson/10 p-6 text-center text-sm text-dojo-mist">
        Could not load practice data. Try again in a moment.
      </p>
    );
  }

  async function copyProfileShare() {
    try {
      await navigator.clipboard.writeText(profileShareText(npub));
      setProfileCopied(true);
      window.setTimeout(() => setProfileCopied(false), 2500);
    } catch {
      /* clipboard blocked */
    }
  }

  return (
    <div id="practice-log" className="space-y-10 scroll-mt-24">
      <DojoPopPassport
        npub={npub}
        pubkeyHex={pubkeyHex}
        editable={!readOnly}
        identity={identity}
        stats={{
          practiceDays,
          currentStreak: personal.currentStreak,
          longestStreak: personal.longestStreak,
          totalSessions: personal.sessions,
          latestDayNumber: personal.latestDayNumber,
          leaderboardRank: rank,
          firstPracticeAt: personal.firstPracticeAt,
        }}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-mono text-xs text-dojo-mist/50 break-all" title={npub}>
            {truncateNpub(npub, 12, 8)}
          </p>
          {personal.latestDayNumber !== undefined && (
            <p className="mt-2 font-display text-2xl text-dojo-gold">
              Day {personal.latestDayNumber}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/watch"
            className="rounded-full border border-white/15 px-4 py-2 text-sm text-dojo-mist hover:border-dojo-gold/40 hover:text-white transition-colors"
          >
            Practice hub
          </Link>
          {!readOnly && (
            <>
              <button
                type="button"
                onClick={downloadBackup}
                className="rounded-full border border-dojo-gold/40 px-4 py-2 text-sm text-dojo-gold hover:bg-dojo-gold/10 transition-colors"
              >
                {t("practice.exportBackup")}
              </button>
              <button
                type="button"
                onClick={() => void copyProfileShare()}
                className="rounded-full border border-white/15 px-4 py-2 text-sm text-dojo-mist hover:border-dojo-gold/40 hover:text-white transition-colors"
              >
                {profileCopied ? "Copied!" : "Copy share link"}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total practice"
          value={formatDuration(personal.totalSeconds)}
          hint={`${personal.sessions} session${personal.sessions === 1 ? "" : "s"}`}
        />
        <StatCard
          label={t("practice.totalViews")}
          value={totalViews === null ? "—" : String(totalViews)}
          hint={t("practice.viewsHint")}
        />
        <StatCard
          label="Current streak"
          value={`${personal.currentStreak} day${personal.currentStreak === 1 ? "" : "s"}`}
          hint={
            personal.longestStreak > personal.currentStreak
              ? `Best: ${personal.longestStreak} days`
              : personal.currentStreak > 0
                ? "Keep it going"
                : undefined
          }
        />
        <StatCard
          label="Leaderboard"
          value={rank ? `#${rank}` : "—"}
          hint={rank ? "By total practice time" : "Publish to rank"}
        />
        <StatCard
          label="Last session"
          value={
            personal.lastPracticeAt
              ? new Date(personal.lastPracticeAt * 1000).toLocaleDateString()
              : "—"
          }
          hint={
            personal.firstPracticeAt
              ? `Since ${new Date(personal.firstPracticeAt * 1000).toLocaleDateString()}`
              : undefined
          }
        />
      </div>

      {sessions.length === 0 ? (
        <div className="card-glow rounded-2xl border border-dojo-gold/20 bg-dojo-gold/5 p-8 text-center">
          <h2 className="font-display text-xl text-white">No sessions yet</h2>
          <p className="mt-3 text-sm text-dojo-mist/70">
            {readOnly
              ? "This practitioner has not published daily practice logs yet."
              : "Film your first session, publish to the relay, and your log will appear here."}
          </p>
          {!readOnly && (
            <a
              href="#publish"
              className="mt-6 inline-block rounded-full bg-dojo-crimson px-6 py-3 text-sm font-medium text-white hover:bg-red-700 transition-colors"
            >
              {t("publish.emptyCta")}
            </a>
          )}
        </div>
      ) : (
        <>
          <PracticeChart
            buckets={buckets}
            title="Your activity"
            subtitle={`Last 28 days · ${formatDuration(buckets.reduce((s, b) => s + b.totalSeconds, 0))} logged`}
          />

          <section>
            <h2 className="font-display text-2xl text-white">Your practice videos</h2>
            <p className="mt-2 text-sm text-dojo-mist/60">
              {sessions.length} daily session{sessions.length === 1 ? "" : "s"} on
              your public log.
            </p>
            <div className="mt-8">
              <PracticeFeed sessions={sessions} />
            </div>
          </section>
        </>
      )}
    </div>
  );
}
