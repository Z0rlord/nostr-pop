import { NextRequest, NextResponse } from "next/server";
import { getFilmAccessInfo } from "@/lib/film-purchases";
import { YOGA_SUTRA_FILM_ID } from "@/lib/films/yoga-sutra";
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

  return NextResponse.json({ ...access, filmId: YOGA_SUTRA_FILM_ID });
}
