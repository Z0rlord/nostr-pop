import { BLOSSOM_URL } from "@/lib/constants";
import { siteUrl } from "@/lib/media-url";

const BLOSSOM_HOST = new URL(BLOSSOM_URL).hostname;

/** Same-origin OG image URL — Facebook fetches this, we proxy Blossom internally. */
export function practiceOgImagePath(eventId: string): string {
  return `/og/practice/${eventId}.jpg`;
}

export function practiceOgImageUrl(eventId: string): string {
  return `${siteUrl()}${practiceOgImagePath(eventId)}`;
}

export function toInternalBlossomUrl(publicUrl: string): string {
  const internalBase = (
    process.env.BLOSSOM_INTERNAL_URL || "http://dojopop-blossom:3000"
  ).replace(/\/$/, "");

  try {
    const parsed = new URL(publicUrl);
    if (
      parsed.hostname === BLOSSOM_HOST ||
      parsed.hostname.endsWith(".dojopop.live")
    ) {
      return `${internalBase}${parsed.pathname}`;
    }
  } catch {
    /* use public URL */
  }
  return publicUrl;
}
