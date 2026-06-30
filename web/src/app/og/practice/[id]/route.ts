import { NextResponse } from "next/server";
import { fetchPracticeSessionById } from "@/lib/practice-events";
import { defaultOgImageUrl, isOgImageUrl, normalizeMediaUrl } from "@/lib/media-url";
import { toInternalBlossomUrl } from "@/lib/og-practice-image";
import { PRACTICE_VIDEO_REDIRECTS } from "@/lib/practice-video-redirects";

export const runtime = "nodejs";

function eventIdFromParam(raw: string): string {
  return raw.replace(/\.jpe?g$/i, "").toLowerCase();
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  let eventId = eventIdFromParam(params.id);
  eventId = PRACTICE_VIDEO_REDIRECTS[eventId] ?? eventId;

  const session = await fetchPracticeSessionById(eventId);
  const thumb = normalizeMediaUrl(session?.thumbUrl);

  if (!thumb || !isOgImageUrl(thumb)) {
    return NextResponse.redirect(defaultOgImageUrl(), 302);
  }

  const fetchUrl = toInternalBlossomUrl(thumb);
  let upstream: Response;
  try {
    upstream = await fetch(fetchUrl, { next: { revalidate: 3600 } });
  } catch {
    upstream = await fetch(thumb, { next: { revalidate: 3600 } });
  }

  if (!upstream.ok) {
    return NextResponse.redirect(defaultOgImageUrl(), 302);
  }

  const body = await upstream.arrayBuffer();
  const contentType = upstream.headers.get("content-type") || "image/jpeg";

  return new NextResponse(body, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
    },
  });
}
