import { NextRequest, NextResponse } from "next/server";
import { getFilmAccessInfo } from "@/lib/film-purchases";
import {
  YOGA_SUTRA_FILM_ID,
  yogaSutraStreamUrl,
} from "@/lib/films/yoga-sutra";
import { isValidNpub } from "@/lib/nostr";

export async function GET(req: NextRequest) {
  const npub = req.nextUrl.searchParams.get("npub")?.trim();
  const token = req.nextUrl.searchParams.get("token")?.trim();

  if (!npub && !token) {
    return NextResponse.json(
      { error: "npub or token required" },
      { status: 400 }
    );
  }
  if (npub && !isValidNpub(npub)) {
    return NextResponse.json({ error: "Invalid npub" }, { status: 400 });
  }

  const access = await getFilmAccessInfo({
    filmId: YOGA_SUTRA_FILM_ID,
    npub: npub || undefined,
    accessToken: token || undefined,
  });

  if (!access.unlocked || !access.canDownload) {
    return NextResponse.json(
      { error: "Own + download purchase required" },
      { status: 403 }
    );
  }

  const downloadUrl = yogaSutraStreamUrl();
  if (!downloadUrl) {
    return NextResponse.json(
      { error: "Download not configured (FILM_YOGA_SUTRA_BLOSSOM_URL)" },
      { status: 503 }
    );
  }

  return NextResponse.json({
    downloadUrl,
    filmId: YOGA_SUTRA_FILM_ID,
    tier: access.tier,
  });
}
