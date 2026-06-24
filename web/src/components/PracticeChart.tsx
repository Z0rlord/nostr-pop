import { formatDuration, type DailyPracticeBucket } from "@/lib/practice-events";

type Props = {
  buckets: DailyPracticeBucket[];
  title?: string;
  subtitle?: string;
};

export function PracticeChart({
  buckets,
  title = "Dojo activity",
  subtitle,
}: Props) {
  const max = Math.max(...buckets.map((b) => b.totalSeconds), 1);
  const total = buckets.reduce((s, b) => s + b.totalSeconds, 0);
  const sessionCount = buckets.reduce((s, b) => s + b.sessions, 0);
  const defaultSubtitle = `Last 28 days · ${formatDuration(total)} logged · ${sessionCount} sessions`;

  return (
    <div className="card-glow rounded-2xl border border-white/5 bg-dojo-slate/60 p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-xl text-white">{title}</h2>
          <p className="mt-1 text-sm text-dojo-mist/60">
            {subtitle ?? defaultSubtitle}
          </p>
        </div>
      </div>
      <div className="mt-6 flex h-36 items-end gap-1 sm:gap-1.5">
        {buckets.map((b) => {
          const h = b.totalSeconds ? Math.max(8, (b.totalSeconds / max) * 100) : 4;
          return (
            <div
              key={b.date}
              className="group relative flex flex-1 flex-col items-center justify-end"
              title={`${b.label}: ${formatDuration(b.totalSeconds)} (${b.sessions} sessions)`}
            >
              <div
                className="w-full rounded-t bg-dojo-crimson/80 transition group-hover:bg-dojo-gold"
                style={{ height: `${h}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-dojo-mist/40">
        <span>{buckets[0]?.label}</span>
        <span>{buckets[buckets.length - 1]?.label}</span>
      </div>
    </div>
  );
}
