"use client";

import { useEffect, useMemo, useState } from "react";
import {
  buildDailyBuckets,
  buildPractitionerStats,
  fetchPracticeSessions,
  formatDuration,
  truncateNpub,
  type PracticeSession,
  type PractitionerStats,
} from "@/lib/practice-events";
import { PracticeChart } from "@/components/PracticeChart";
import { PracticeFeed } from "@/components/PracticeFeed";

function Leaderboard({ stats }: { stats: PractitionerStats[] }) {
  if (stats.length === 0) {
    return (
      <p className="text-sm text-dojo-mist/60 py-8 text-center">No practitioners yet.</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-white/10 text-dojo-mist/50">
            <th className="pb-3 pr-4 font-medium">#</th>
            <th className="pb-3 pr-4 font-medium">Practitioner</th>
            <th className="pb-3 pr-4 font-medium text-right">Sessions</th>
            <th className="pb-3 pr-4 font-medium text-right">
              Practice time
            </th>
            <th className="pb-3 font-medium text-right hidden sm:table-cell">
              Last active
            </th>
          </tr>
        </thead>
        <tbody>
          {stats.map((row, i) => (
            <tr
              key={row.pubkey}
              className="border-b border-white/5 last:border-0"
            >
              <td className="py-3 pr-4 text-dojo-gold font-medium">{i + 1}</td>
              <td className="py-3 pr-4">
                <span className="font-mono text-xs text-white" title={row.npub}>
                  {truncateNpub(row.npub)}
                </span>
                {row.displayName.startsWith("Day ") && (
                  <span className="ml-2 text-xs text-dojo-mist/50">
                    ({row.displayName})
                  </span>
                )}
              </td>
              <td className="py-3 pr-4 text-right text-dojo-mist">{row.sessions}</td>
              <td className="py-3 pr-4 text-right text-white">
                {formatDuration(row.totalSeconds)}
              </td>
              <td className="py-3 text-right text-dojo-mist/60 hidden sm:table-cell">
                {new Date(row.lastPracticeAt * 1000).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PracticeDashboard() {
  const [sessions, setSessions] = useState<PracticeSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchPracticeSessions()
      .then((items) => {
        if (!cancelled) setSessions(items);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => buildPractitionerStats(sessions), [sessions]);
  const buckets = useMemo(() => buildDailyBuckets(sessions), [sessions]);

  if (loading) {
    return (
      <p className="text-center text-dojo-mist/60 py-16">Loading practice data…</p>
    );
  }

  if (error) {
    return (
      <p className="rounded-xl border border-dojo-crimson/30 bg-dojo-crimson/10 p-6 text-center text-sm text-dojo-mist">
        Could not load practice data. Try again in a moment.
      </p>
    );
  }

  return (
    <div className="space-y-12">
      <PracticeChart buckets={buckets} />

      <section>
        <h2 className="font-display text-2xl text-white">Leaderboard</h2>
        <p className="mt-2 text-sm text-dojo-mist/60">
          Ranked by total practice time from daily training sessions.
        </p>
        <div className="mt-6 card-glow rounded-2xl border border-white/5 bg-dojo-slate/60 p-4 sm:p-6">
          <Leaderboard stats={stats} />
        </div>
      </section>

      <section>
        <h2 className="font-display text-2xl text-white">Daily practice videos</h2>
        <p className="mt-2 text-sm text-dojo-mist/60">
          {sessions.length} daily practice session{sessions.length === 1 ? "" : "s"}.
        </p>
        <div className="mt-8">
          <PracticeFeed sessions={sessions} />
        </div>
      </section>
    </div>
  );
}
