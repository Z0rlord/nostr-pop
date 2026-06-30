import type { Event, EventTemplate } from "nostr-tools";
import { PRACTICE_HASHTAGS, appUrl } from "@/lib/constants";
import { publishEventToRelay } from "@/lib/relay-publish";

/** Primal profile Media tab indexes kind-1 notes with imeta, not NIP-71 kind 22. */
export function buildPrimalMirrorTemplate(source: Event): EventTemplate {
  const imetaTag = source.tags.find((tag) => tag[0] === "imeta");
  if (!imetaTag) {
    throw new Error("Practice event is missing imeta tags.");
  }

  const title =
    source.tags.find((tag) => tag[0] === "title")?.[1] ||
    source.content.trim().split("\n", 1)[0] ||
    "Practice session";

  const alt =
    source.tags.find((tag) => tag[0] === "alt")?.[1] ||
    `Practice video: ${title}`;

  const hashtags = source.tags
    .filter((tag) => tag[0] === "t")
    .map((tag) => tag[1])
    .filter(Boolean);

  const tags: string[][] = [
    ["e", source.id, "", "root"],
    ["k", String(source.kind)],
    [...imetaTag],
    ["alt", alt],
    ...hashtags.map((tag) => ["t", tag]),
    ["t", "dojopop-mirror"],
  ];

  for (const required of PRACTICE_HASHTAGS) {
    if (!tags.some((tag) => tag[0] === "t" && tag[1] === required)) {
      tags.push(["t", required]);
    }
  }

  const shareUrl = `${appUrl().replace(/\/$/, "")}/v/${source.id}`;
  return {
    kind: 1,
    created_at: Math.floor(Date.now() / 1000),
    tags,
    content: `${title}\n${shareUrl}`,
  };
}

export async function publishPrimalMirror(
  source: Event,
  sign: (template: EventTemplate) => Promise<Event>
): Promise<void> {
  const template = buildPrimalMirrorTemplate(source);
  const signed = await sign(template);
  await publishEventToRelay(signed);
}
