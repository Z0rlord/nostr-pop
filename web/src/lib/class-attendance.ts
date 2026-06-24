import { nip19 } from "nostr-tools";
import { SimplePool } from "nostr-tools/pool";
import { RELAY_URL } from "@/lib/constants";
import {
  decryptSchoolPayload,
  encryptSchoolPayload,
} from "@/lib/school-crypto";
import { decodeNpubToHex } from "@/lib/nostr";
import type { School } from "@/lib/schools";

export const KIND_CLASS_ATTENDANCE = 34567;

export interface ClassAttendancePayload {
  v: 1;
  type: "class_attendance";
  school_id: string;
  class: {
    name: string;
    discipline: string;
    started_at: string;
    ended_at?: string;
    location?: string;
  };
  present: string[];
  notes?: string;
}

export interface ClassAttendanceRecord {
  id: string;
  createdAt: number;
  title: string;
  startedAt: number;
  payload: ClassAttendancePayload;
}

export function schoolDTag(schoolId: string): string {
  return `school-${schoolId}`;
}

export function buildAttendanceEventTemplate(
  school: School,
  input: {
    className: string;
    discipline: string;
    startedAt: string;
    endedAt?: string;
    location?: string;
    presentNpubs: string[];
    notes?: string;
  }
): { kind: number; tags: string[][]; content: string; created_at: number } {
  const presentHex = input.presentNpubs
    .map((npub) => decodeNpubToHex(npub))
    .filter((h): h is string => Boolean(h));

  const payload: ClassAttendancePayload = {
    v: 1,
    type: "class_attendance",
    school_id: school.id,
    class: {
      name: input.className,
      discipline: input.discipline,
      started_at: input.startedAt,
      ended_at: input.endedAt,
      location: input.location,
    },
    present: presentHex,
    notes: input.notes,
  };

  const startedUnix = Math.floor(new Date(input.startedAt).getTime() / 1000);

  return {
    kind: KIND_CLASS_ATTENDANCE,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ["d", schoolDTag(school.id)],
      ["t", "dojopop"],
      ["t", "attendance"],
      ["t", "class"],
      ["enc", "v1"],
      ["title", input.className],
      ["started_at", String(startedUnix)],
    ],
    content: encryptSchoolPayload(school.encryptionKeyHex, payload),
  };
}

export async function fetchSchoolAttendance(
  school: School
): Promise<ClassAttendanceRecord[]> {
  const pool = new SimplePool();
  const dTag = schoolDTag(school.id);

  try {
    const events = await pool.querySync([RELAY_URL], {
      kinds: [KIND_CLASS_ATTENDANCE],
      "#d": [dTag],
      "#t": ["attendance"],
      limit: 500,
    });

    const records: ClassAttendanceRecord[] = [];

    for (const event of events.sort((a, b) => b.created_at - a.created_at)) {
      const payload = decryptSchoolPayload<ClassAttendancePayload>(
        school.encryptionKeyHex,
        event.content
      );
      if (!payload || payload.type !== "class_attendance") continue;

      records.push({
        id: event.id,
        createdAt: event.created_at,
        title: event.tags.find((t) => t[0] === "title")?.[1] || payload.class.name,
        startedAt: Number(
          event.tags.find((t) => t[0] === "started_at")?.[1] || event.created_at
        ),
        payload,
      });
    }

    return records;
  } finally {
    pool.close([RELAY_URL]);
  }
}

export function presentHexToNpubs(hexPubkeys: string[]): string[] {
  const out: string[] = [];
  for (const hex of hexPubkeys) {
    try {
      out.push(nip19.npubEncode(hex));
    } catch {
      /* skip invalid */
    }
  }
  return out;
}
