import { promises as fs } from "node:fs";
import path from "node:path";

export type EventAnalytics = {
  views: number;
  uniqueDays: number;
  lastViewedAt: number;
  referrers: Record<string, number>;
};

export type MemberAnalytics = {
  totalViews: number;
  events: Record<string, EventAnalytics>;
};

type AnalyticsFile = {
  events: Record<string, EventAnalytics & { viewersByDay?: Record<string, number> }>;
};

function dataPath(): string {
  const dir = process.env.MEMBERSHIP_DATA_DIR || "./data";
  return path.join(dir, "practice-analytics.json");
}

async function loadFile(): Promise<AnalyticsFile> {
  try {
    const raw = await fs.readFile(dataPath(), "utf8");
    return JSON.parse(raw) as AnalyticsFile;
  } catch {
    return { events: {} };
  }
}

async function saveFile(data: AnalyticsFile): Promise<void> {
  await fs.mkdir(path.dirname(dataPath()), { recursive: true });
  await fs.writeFile(dataPath(), JSON.stringify(data, null, 2));
}

export async function recordPracticeView(
  eventId: string,
  referrer?: string
): Promise<void> {
  const data = await loadFile();
  const day = new Date().toISOString().slice(0, 10);
  const entry = data.events[eventId] || {
    views: 0,
    uniqueDays: 0,
    lastViewedAt: 0,
    referrers: {},
    viewersByDay: {},
  };
  entry.views += 1;
  entry.lastViewedAt = Math.floor(Date.now() / 1000);
  entry.viewersByDay = entry.viewersByDay || {};
  entry.viewersByDay[day] = (entry.viewersByDay[day] || 0) + 1;
  entry.uniqueDays = Object.keys(entry.viewersByDay).length;
  if (referrer) {
    const host = safeReferrerHost(referrer);
    entry.referrers[host] = (entry.referrers[host] || 0) + 1;
  }
  data.events[eventId] = entry;
  await saveFile(data);
}

function safeReferrerHost(referrer: string): string {
  try {
    return new URL(referrer).hostname || "direct";
  } catch {
    return "direct";
  }
}

export async function getEventAnalytics(
  eventId: string
): Promise<EventAnalytics | null> {
  const data = await loadFile();
  const entry = data.events[eventId];
  if (!entry) return null;
  const { viewersByDay: _d, ...rest } = entry;
  return rest;
}

export async function getAnalyticsForEventIds(
  eventIds: string[]
): Promise<MemberAnalytics> {
  const data = await loadFile();
  const events: Record<string, EventAnalytics> = {};
  let totalViews = 0;
  for (const id of eventIds) {
    const entry = data.events[id];
    if (!entry) continue;
    const { viewersByDay: _d, ...rest } = entry;
    events[id] = rest;
    totalViews += rest.views;
  }
  return { totalViews, events };
}
