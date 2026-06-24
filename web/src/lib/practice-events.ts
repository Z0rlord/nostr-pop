import { type Event, nip19 } from "nostr-tools";
import { SimplePool } from "nostr-tools/pool";
import { RELAY_URL } from "@/lib/constants";
import { normalizeMediaUrl } from "@/lib/media-url";

/** Pipeline publishes clips ≤90s; daily logs use "Day NNNN" titles. */
export const MAX_PRACTICE_DURATION_SEC = 90;

const DAY_TITLE = /\bDay\s+\d+\b/i;

const EXCLUDED_TITLE =
  /\b(update|leaderboard|fundraising|beta\s*test|founder\s+provides|exploring\s+the\s+world|bulletpruf|aikido\s+enbu|matsuri|fundraising)\b/i;

export type PracticeSession = {
  id: string;
  pubkey: string;
  npub: string;
  title: string;
  videoUrl: string;
  thumbUrl?: string;
  publishedAt: number;
  durationSec: number;
  dayNumber?: number;
  roughLocation?: string;
  geohash?: string;
};

export type PractitionerStats = {
  pubkey: string;
  npub: string;
  sessions: number;
  totalSeconds: number;
  lastPracticeAt: number;
  displayName: string;
};

export type DailyPracticeBucket = {
  date: string;
  label: string;
  totalSeconds: number;
  sessions: number;
};

function tagValues(tags: string[][], name: string): string[] {
  return tags.filter((t) => t[0] === name).map((t) => t[1]);
}

function tagValue(tags: string[][], name: string): string | undefined {
  return tagValues(tags, name)[0];
}

function imetaValue(tags: string[][], key: string): string | undefined {
  for (const tag of tags) {
    if (tag[0] !== "imeta") continue;
    for (let i = 1; i < tag.length; i++) {
      const part = tag[i];
      if (part.startsWith(`${key} `)) return part.slice(key.length + 1);
    }
  }
  return undefined;
}

function durationSec(tags: string[][]): number | undefined {
  const raw = tagValue(tags, "duration") ?? imetaValue(tags, "duration");
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

function parseDayNumber(title: string): number | undefined {
  const m = title.match(/\bDay\s+(\d+)\b/i);
  return m ? Number(m[1]) : undefined;
}

/** True for short practice logs, not talking-head updates. */
export function isPracticeSessionEvent(event: Event): boolean {
  if (event.kind !== 22) return false;

  const tags = event.tags;
  const t = new Set(tagValues(tags, "t").map((x) => x.toLowerCase()));
  if (!t.has("dojopop") || !t.has("proofofpractice")) {
    return false;
  }

  const dur = durationSec(tags);
  if (!dur || dur > MAX_PRACTICE_DURATION_SEC) return false;

  const title = tagValue(tags, "title") || event.content.trim().split("\n")[0] || "";
  if (EXCLUDED_TITLE.test(title)) return false;

  return DAY_TITLE.test(title);
}

export function eventToPracticeSession(event: Event): PracticeSession | null {
  if (!isPracticeSessionEvent(event)) return null;

  const videoUrl = normalizeMediaUrl(imetaValue(event.tags, "url"));
  if (!videoUrl) return null;

  const title =
    tagValue(event.tags, "title") ||
    event.content.trim().split("\n")[0] ||
    "Practice session";

  const dur = durationSec(event.tags)!;
  const publishedAt = Number(
    tagValue(event.tags, "published_at") || event.created_at
  );

  return {
    id: event.id,
    pubkey: event.pubkey,
    npub: nip19.npubEncode(event.pubkey),
    title,
    videoUrl,
    thumbUrl: normalizeMediaUrl(imetaValue(event.tags, "image")),
    publishedAt,
    durationSec: dur,
    dayNumber: parseDayNumber(title),
    roughLocation: tagValue(event.tags, "location"),
    geohash: tagValues(event.tags, "g")[0],
  };
}

function eventsToSessions(events: Event[]): PracticeSession[] {
  const sessions: PracticeSession[] = [];
  const seen = new Set<string>();

  for (const event of events.sort((a, b) => b.created_at - a.created_at)) {
    const session = eventToPracticeSession(event);
    if (!session || seen.has(session.id)) continue;
    seen.add(session.id);
    sessions.push(session);
  }

  return sessions.sort((a, b) => b.publishedAt - a.publishedAt);
}

export async function fetchPracticeSessions(limit = 500): Promise<PracticeSession[]> {
  const pool = new SimplePool();
  try {
    const events = await pool.querySync([RELAY_URL], {
      kinds: [22],
      "#t": ["proofofpractice"],
      limit,
    });
    return eventsToSessions(events);
  } finally {
    pool.close([RELAY_URL]);
  }
}

export async function fetchPracticeSessionsForPubkey(
  pubkeyHex: string,
  limit = 200
): Promise<PracticeSession[]> {
  const pool = new SimplePool();
  try {
    const events = await pool.querySync([RELAY_URL], {
      kinds: [22],
      authors: [pubkeyHex],
      "#t": ["proofofpractice"],
      limit,
    });
    return eventsToSessions(events);
  } finally {
    pool.close([RELAY_URL]);
  }
}

export async function fetchPracticeSessionById(
  eventId: string
): Promise<PracticeSession | null> {
  const pool = new SimplePool();
  try {
    const events = await pool.querySync([RELAY_URL], { ids: [eventId], limit: 1 });
    const session = events[0] ? eventToPracticeSession(events[0]) : null;
    return session;
  } finally {
    pool.close([RELAY_URL]);
  }
}

export type PersonalPracticeStats = {
  sessions: number;
  totalSeconds: number;
  latestDayNumber?: number;
  firstPracticeAt?: number;
  lastPracticeAt?: number;
  currentStreak: number;
  longestStreak: number;
};

function utcDateKey(tsSec: number): string {
  return new Date(tsSec * 1000).toISOString().slice(0, 10);
}

function prevUtcDate(dateKey: string): string {
  const d = new Date(`${dateKey}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function daysBetween(earlier: string, later: string): number {
  const a = new Date(`${earlier}T12:00:00.000Z`).getTime();
  const b = new Date(`${later}T12:00:00.000Z`).getTime();
  return Math.round((b - a) / 86_400_000);
}

export function computeStreaks(practiceDatesAsc: string[]): {
  current: number;
  longest: number;
} {
  if (practiceDatesAsc.length === 0) {
    return { current: 0, longest: 0 };
  }

  const dateSet = new Set(practiceDatesAsc);
  let longest = 1;
  let run = 1;

  for (let i = 1; i < practiceDatesAsc.length; i++) {
    if (daysBetween(practiceDatesAsc[i - 1], practiceDatesAsc[i]) === 1) {
      run++;
      longest = Math.max(longest, run);
    } else {
      run = 1;
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const mostRecent = practiceDatesAsc[practiceDatesAsc.length - 1];
  const gap = daysBetween(mostRecent, today);

  if (gap > 1) {
    return { current: 0, longest };
  }

  let current = 0;
  let cursor = gap === 0 ? today : prevUtcDate(today);
  while (dateSet.has(cursor)) {
    current++;
    cursor = prevUtcDate(cursor);
  }

  return { current, longest };
}

export function buildPersonalStats(
  sessions: PracticeSession[]
): PersonalPracticeStats {
  if (sessions.length === 0) {
    return {
      sessions: 0,
      totalSeconds: 0,
      currentStreak: 0,
      longestStreak: 0,
    };
  }

  const totalSeconds = sessions.reduce((sum, s) => sum + s.durationSec, 0);
  const publishedTimes = sessions.map((s) => s.publishedAt);
  const practiceDates = Array.from(
    new Set(sessions.map((s) => utcDateKey(s.publishedAt)))
  ).sort();
  const { current, longest } = computeStreaks(practiceDates);
  const latestDayNumber = sessions.reduce(
    (max, s) => (s.dayNumber && (!max || s.dayNumber > max) ? s.dayNumber : max),
    undefined as number | undefined
  );

  return {
    sessions: sessions.length,
    totalSeconds,
    latestDayNumber,
    firstPracticeAt: Math.min(...publishedTimes),
    lastPracticeAt: Math.max(...publishedTimes),
    currentStreak: current,
    longestStreak: longest,
  };
}

export function leaderboardRank(
  stats: PractitionerStats[],
  pubkey: string
): number | null {
  const idx = stats.findIndex((row) => row.pubkey === pubkey);
  return idx === -1 ? null : idx + 1;
}

export function buildPractitionerStats(sessions: PracticeSession[]): PractitionerStats[] {
  const byPubkey = new Map<string, PracticeSession[]>();

  for (const s of sessions) {
    const list = byPubkey.get(s.pubkey) ?? [];
    list.push(s);
    byPubkey.set(s.pubkey, list);
  }

  const stats: PractitionerStats[] = [];

  for (const [pubkey, list] of Array.from(byPubkey.entries())) {
    const totalSeconds = list.reduce((sum, s) => sum + s.durationSec, 0);
    const lastPracticeAt = Math.max(...list.map((s) => s.publishedAt));
    const npub = list[0].npub;
    const bestDay = list.reduce(
      (max, s) => (s.dayNumber && (!max || s.dayNumber > max) ? s.dayNumber : max),
      0 as number | undefined
    );
    const displayName = bestDay
      ? `Day ${bestDay}`
      : truncateNpub(npub);

    stats.push({
      pubkey,
      npub,
      sessions: list.length,
      totalSeconds,
      lastPracticeAt,
      displayName,
    });
  }

  return stats.sort((a, b) => {
    if (b.totalSeconds !== a.totalSeconds) return b.totalSeconds - a.totalSeconds;
    return b.sessions - a.sessions;
  });
}

export function buildDailyBuckets(
  sessions: PracticeSession[],
  days = 28
): DailyPracticeBucket[] {
  const now = new Date();
  const buckets: DailyPracticeBucket[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    buckets.push({
      date: key,
      label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      totalSeconds: 0,
      sessions: 0,
    });
  }

  const index = new Map(buckets.map((b, i) => [b.date, i]));

  for (const s of sessions) {
    const key = new Date(s.publishedAt * 1000).toISOString().slice(0, 10);
    const idx = index.get(key);
    if (idx === undefined) continue;
    buckets[idx].totalSeconds += s.durationSec;
    buckets[idx].sessions += 1;
  }

  return buckets;
}

export function formatDuration(totalSeconds: number): string {
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return s ? `${m}m ${s}s` : `${m}m`;
}

export function truncateNpub(npub: string, head = 8, tail = 6): string {
  if (npub.length <= head + tail + 3) return npub;
  return `${npub.slice(0, head)}…${npub.slice(-tail)}`;
}
