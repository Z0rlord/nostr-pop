import { type Event, finalizeEvent, nip19, verifyEvent } from "nostr-tools";
import { SimplePool } from "nostr-tools/pool";
import { appUrl, PUBLISH_RELAYS, RELAY_URL } from "@/lib/constants";
import {
  isPublisherConfigured,
  loadPublisherSecretKey,
  publisherPubkeyHex,
} from "@/lib/publisher-account";

/** nostu.be default read relays + DojoPop publish fan-out. */
export const NOSTUBE_MIRROR_RELAYS = [
  RELAY_URL,
  "wss://relay.divine.video",
  "wss://relay.damus.io",
  "wss://relay.primal.net",
  "wss://nos.lol",
] as const;

export const NOSTUBE_MIRROR_TAG = "dojopop-nostube";

/** Canonical login-bot pubkey (DOJOPOP_LOGIN_NSEC). */
export const NOSTUBE_CANONICAL_PUBKEY =
  "58d5fd86797cc2914e7be0e76583ab293af5dd35bc0da15b77d92d093bec417c";

function tagValue(tags: string[][], name: string): string | undefined {
  return tags.find((t) => t[0] === name)?.[1];
}

function imetaTags(tags: string[][]): string[][] {
  return tags.filter((t) => t[0] === "imeta").map((t) => [...t]);
}

export function buildNostubeMirrorEvent(source: Event): Event {
  if (source.kind !== 22) {
    throw new Error("nostu.be mirror requires kind 22");
  }

  const meta = imetaTags(source.tags);
  if (meta.length === 0) {
    throw new Error("missing imeta on source event");
  }

  const title =
    tagValue(source.tags, "title") ||
    source.content.trim().split("\n")[0] ||
    "Practice session";

  const tags: string[][] = [
    ["title", title],
    ...meta,
    ["e", source.id, "", "root"],
    ["p", source.pubkey],
    ["k", "22"],
  ];

  for (const name of ["duration", "published_at", "alt"] as const) {
    const found = source.tags.find((t) => t[0] === name);
    if (found) tags.push([...found]);
  }

  const hashtags = new Set(
    source.tags
      .filter((t) => t[0] === "t")
      .map((t) => t[1].toLowerCase())
  );
  hashtags.add(NOSTUBE_MIRROR_TAG);

  for (const tag of Array.from(hashtags)) {
    tags.push(["t", tag]);
  }

  const shareUrl = `${appUrl()}/v/${source.id}`;
  const authorNpub = nip19.npubEncode(source.pubkey);
  const content = `${title}\n${shareUrl}\nPractice by ${authorNpub}`;

  const signed = finalizeEvent(
    {
      kind: 22,
      created_at: Math.floor(Date.now() / 1000),
      tags,
      content,
    },
    loadPublisherSecretKey()
  );

  if (!verifyEvent(signed)) {
    throw new Error("nostu.be mirror failed local signature verification");
  }

  return signed;
}

/**
 * Skip if the canonical login-bot (or current publisher) already mirrored
 * this source — avoids duplicates when keys rotate or concurrent publishes.
 */
async function nostubeMirrorExists(sourceEventId: string): Promise<boolean> {
  const pool = new SimplePool();
  const relays = [RELAY_URL];
  try {
    const events = await pool.querySync(relays, {
      kinds: [22],
      "#e": [sourceEventId],
      "#t": [NOSTUBE_MIRROR_TAG],
      limit: 20,
    });
    const publisher = publisherPubkeyHex();
    return events.some(
      (e) =>
        e.pubkey === NOSTUBE_CANONICAL_PUBKEY || e.pubkey === publisher
    );
  } finally {
    pool.close(relays);
  }
}

async function publishMirror(event: Event): Promise<void> {
  const pool = new SimplePool();
  const relays = Array.from(
    new Set([...NOSTUBE_MIRROR_RELAYS, ...PUBLISH_RELAYS])
  );
  try {
    const results = await Promise.allSettled(pool.publish(relays, event));
    const primaryIdx = relays.indexOf(RELAY_URL);
    const primary = results[primaryIdx];
    const anyOk = results.some((r) => r.status === "fulfilled");

    if (primary?.status === "rejected" && !anyOk) {
      throw new Error("No relay accepted the nostu.be mirror event");
    }
    if (!anyOk) {
      throw new Error("No relay accepted the nostu.be mirror event");
    }
  } finally {
    pool.close(relays);
  }
}

/** Cross-post a member practice video to the DojoPop admin nostu.be profile. */
export async function mirrorPracticeToNostube(source: Event): Promise<string | null> {
  if (!isPublisherConfigured()) {
    return null;
  }

  if (await nostubeMirrorExists(source.id)) {
    return null;
  }

  const mirror = buildNostubeMirrorEvent(source);
  await publishMirror(mirror);
  return mirror.id;
}
