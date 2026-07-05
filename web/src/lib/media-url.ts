import { BLOSSOM_URL, CDN_URL } from "@/lib/constants";

const BLOSSOM_HOST = new URL(BLOSSOM_URL).hostname;
const CDN_HOST = new URL(CDN_URL).hostname;

/** Public site origin for share links and OG tags. */
export function siteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "https://dojopop.live";
  if (raw.startsWith("http://") && !raw.includes("localhost") && !raw.includes("127.0.0.1")) {
    return raw.replace("http://", "https://");
  }
  return raw;
}

/** Default link-preview image (Facebook requires og:image). */
export function defaultOgImageUrl(): string {
  return `${siteUrl()}/hero-dojo.jpg`;
}

const VIDEO_EXT = /\.(qt|mov|mp4|webm|m4v|avi|mkv)(\?|$)/i;

/** Facebook rejects video files as og:image — only use real image URLs. */
export function isOgImageUrl(url: string): boolean {
  try {
    const path = new URL(url).pathname.toLowerCase();
    if (VIDEO_EXT.test(path)) return false;
    return /\.(jpe?g|png|gif|webp|avif)(\?|$)/i.test(path) || path.includes("/image");
  } catch {
    return false;
  }
}

/** Meta's image crawler (meta-externalagent) is blocked on dojopop.live by Cloudflare AI Crawl Control. */
function isMetaAccessibleOgHost(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host === "dojopop.live" || host.endsWith(".dojopop.live")) return false;
    return true;
  } catch {
    return false;
  }
}

const OG_VIDEO_THUMB_WIDTH = 1280;
const OG_VIDEO_THUMB_HEIGHT = 720;

export function ogImageForPracticeVideo(
  eventId: string,
  thumbUrl?: string
): { url: string; width?: number; height?: number } {
  const normalized = normalizeMediaUrl(thumbUrl);
  if (normalized && isOgImageUrl(normalized) && isMetaAccessibleOgHost(normalized)) {
    // Direct CDN URL — Meta can fetch hosts outside dojopop.live (e.g. blossom.yakihonne.com).
    return {
      url: normalized,
      width: OG_VIDEO_THUMB_WIDTH,
      height: OG_VIDEO_THUMB_HEIGHT,
    };
  }
  if (normalized && isOgImageUrl(normalized)) {
    // Same-zone Blossom/CDN — proxy on dojopop.live until Cloudflare allows meta-externalagent.
    return {
      url: `${siteUrl()}/og/practice/${eventId}.jpg`,
      width: OG_VIDEO_THUMB_WIDTH,
      height: OG_VIDEO_THUMB_HEIGHT,
    };
  }
  return { url: defaultOgImageUrl(), width: 1024, height: 576 };
}

/** Public CDN base for Blossom blobs (Cloudflare-fronted; defaults to blossom host). */
export function cdnBlobUrl(sha256: string, ext = "mp4"): string {
  const base = CDN_URL.replace(/\/$/, "");
  return `${base}/${sha256}.${ext}`;
}

export function cdnBlobUrlFromVideoUrl(videoUrl: string): string {
  const m = videoUrl.match(/\/([0-9a-f]{64})(?:\.(\w+))?/i);
  if (!m) return normalizeMediaUrl(videoUrl) || videoUrl;
  return cdnBlobUrl(m[1], m[2] || "mp4");
}

/** Prefer CDN URL in imeta; keep blossom as fallback for redundancy. */
export function blossomAndCdnUrls(sha256: string, ext: string): { primary: string; fallback?: string } {
  const blossom = `${BLOSSOM_URL.replace(/\/$/, "")}/${sha256}.${ext}`;
  const cdn = cdnBlobUrl(sha256, ext);
  if (cdn === blossom) return { primary: cdn };
  return { primary: cdn, fallback: blossom };
}

export function normalizeMediaUrl(url: string | undefined): string | undefined {
  if (!url) return url;
  try {
    const parsed = new URL(url);
    if (
      parsed.hostname === BLOSSOM_HOST ||
      parsed.hostname === CDN_HOST ||
      parsed.hostname.endsWith(".dojopop.live")
    ) {
      parsed.protocol = "https:";
    } else if (
      parsed.protocol === "http:" &&
      parsed.hostname !== "localhost" &&
      parsed.hostname !== "127.0.0.1"
    ) {
      parsed.protocol = "https:";
    }
    return parsed.toString();
  } catch {
    if (url.startsWith("http://")) return url.replace("http://", "https://");
    return url;
  }
}

export function facebookSharerUrl(targetUrl: string): string {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(targetUrl)}`;
}

export function practiceVideoSharePath(eventId: string): string {
  return `/v/${eventId}`;
}

export function practiceVideoShareUrl(eventId: string): string {
  return `${siteUrl()}${practiceVideoSharePath(eventId)}`;
}

/** Strip #hashtags — Facebook's parser chokes on them in og:title. */
export function ogSafeTitle(title: string): string {
  return title
    .replace(/#\S+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function profileShareUrl(npub: string): string {
  return `${siteUrl()}/u/${encodeURIComponent(npub)}`;
}

const JOIN_PITCH =
  "Film your training. Own the record. Join DojoPop — details on the page.";

/**
 * Clipboard / paste-friendly share message.
 * Exactly one https:// URL — Facebook breaks when a paste contains multiple links.
 */
export function practiceVideoShareText(title: string, eventId: string): string {
  const link = practiceVideoShareUrl(eventId);
  const cleanTitle = title.trim().replace(/\s+/g, " ");
  // URL first — Facebook paste/share parsers expect a single link on its own line.
  return `${link}\n\n${cleanTitle} — daily martial arts practice on DojoPop\n\n${JOIN_PITCH}`;
}

export function profileShareText(npub: string): string {
  const link = profileShareUrl(npub);
  return `${link}\n\nMy martial arts practice log on DojoPop\n\n${JOIN_PITCH}`;
}

/** Short caption for Web Share API (URL passed separately). */
export function practiceVideoShareCaption(title: string): string {
  const cleanTitle = title.trim().replace(/\s+/g, " ");
  return `${cleanTitle} — daily martial arts practice on DojoPop. ${JOIN_PITCH}`;
}

export function profileShareCaption(): string {
  return `My martial arts practice log on DojoPop. ${JOIN_PITCH}`;
}
