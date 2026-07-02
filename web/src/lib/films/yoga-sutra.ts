export const YOGA_SUTRA_FILM_ID = "yoga-sutra" as const;
export const YOGA_SUTRA_SLUG = "yoga-sutra";

export const YOGA_SUTRA_SYNOPSIS =
  "Friday, fired from her dead end corporate job, is on a vision quest. When her motorcycle breaks down on the Arizona Mexico border, the local sheriff detains her and discovers a strange book in her possession. Thinking the handwritten book may be terrorist gang code, the sheriff imprisons her in a backwater jail. As Friday transforms the jail and its inhabitants with the secret teachings of the Patanjali Yoga Sutra, we begin to see how the ancient teachings allow Friday to overcome an extremely desperate situation.";

export type FilmPurchaseTier = "buy" | "rent";

export const YOGA_SUTRA_RENT_DURATION_MS = 48 * 60 * 60 * 1000;

export const DEFAULT_YOGA_SUTRA_BUY_SATS = 100_000;
export const DEFAULT_YOGA_SUTRA_RENT_SATS = 27_000;
export const DEFAULT_YOGA_SUTRA_BUY_PRICE_CENTS = 1499;
export const DEFAULT_YOGA_SUTRA_RENT_PRICE_CENTS = 399;

export interface YogaSutraTierConfig {
  tier: FilmPurchaseTier;
  label: string;
  description: string;
  sats: number;
  cents: number;
  usd: number;
}

export type YogaSutraTrailerType = "vimeo" | "video";

export interface YogaSutraTrailerConfig {
  type: YogaSutraTrailerType;
  vimeoId?: string;
  url?: string;
}

function parseVimeoIdFromUrl(raw: string): string | undefined {
  const playerMatch = raw.match(/player\.vimeo\.com\/video\/(\d+)/);
  if (playerMatch) return playerMatch[1];

  try {
    const parsed = new URL(raw);
    const videoParam = parsed.searchParams.get("video");
    if (videoParam && /^\d+$/.test(videoParam)) return videoParam;
  } catch {
    /* not a URL */
  }

  const vimeoMatch = raw.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeoMatch) return vimeoMatch[1];

  return undefined;
}

/** Vimeo numeric ID from `FILM_YOGA_SUTRA_TRAILER_VIMEO_ID` or parsed from trailer URL. */
export function yogaSutraTrailerVimeoId(): string | undefined {
  const dedicated = process.env.FILM_YOGA_SUTRA_TRAILER_VIMEO_ID?.trim();
  if (dedicated && /^\d+$/.test(dedicated)) return dedicated;

  const url = process.env.FILM_YOGA_SUTRA_TRAILER_URL?.trim();
  if (url) return parseVimeoIdFromUrl(url);

  return undefined;
}

/** @deprecated Prefer yogaSutraTrailer() — returns raw MP4 URL when not Vimeo. */
export function yogaSutraTrailerUrl(): string | undefined {
  if (yogaSutraTrailerVimeoId()) return undefined;
  return process.env.FILM_YOGA_SUTRA_TRAILER_URL?.trim() || undefined;
}

export function yogaSutraTrailer(): YogaSutraTrailerConfig | undefined {
  const vimeoId = yogaSutraTrailerVimeoId();
  if (vimeoId) return { type: "vimeo", vimeoId };

  const url = process.env.FILM_YOGA_SUTRA_TRAILER_URL?.trim();
  if (url) return { type: "video", url };

  return undefined;
}

/** Server-only — never expose in client bundles. */
export function yogaSutraStreamUrl(): string | undefined {
  return process.env.FILM_YOGA_SUTRA_BLOSSOM_URL?.trim() || undefined;
}

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function yogaSutraBuySats(): number {
  return parsePositiveInt(
    process.env.FILM_YOGA_SUTRA_BUY_SATS ?? process.env.FILM_YOGA_SUTRA_SATS,
    DEFAULT_YOGA_SUTRA_BUY_SATS
  );
}

export function yogaSutraRentSats(): number {
  return parsePositiveInt(
    process.env.FILM_YOGA_SUTRA_RENT_SATS,
    DEFAULT_YOGA_SUTRA_RENT_SATS
  );
}

export function yogaSutraBuyPriceCents(): number {
  return parsePositiveInt(
    process.env.FILM_YOGA_SUTRA_BUY_STRIPE_PRICE_CENTS ??
      process.env.FILM_YOGA_SUTRA_STRIPE_PRICE_CENTS,
    DEFAULT_YOGA_SUTRA_BUY_PRICE_CENTS
  );
}

export function yogaSutraRentPriceCents(): number {
  return parsePositiveInt(
    process.env.FILM_YOGA_SUTRA_RENT_STRIPE_PRICE_CENTS,
    DEFAULT_YOGA_SUTRA_RENT_PRICE_CENTS
  );
}

export function yogaSutraTierSats(tier: FilmPurchaseTier): number {
  return tier === "buy" ? yogaSutraBuySats() : yogaSutraRentSats();
}

export function yogaSutraTierPriceCents(tier: FilmPurchaseTier): number {
  return tier === "buy" ? yogaSutraBuyPriceCents() : yogaSutraRentPriceCents();
}

export function yogaSutraTierConfig(tier: FilmPurchaseTier): YogaSutraTierConfig {
  const cents = yogaSutraTierPriceCents(tier);
  return {
    tier,
    label: tier === "buy" ? "Own + download" : "Stream 48 hours",
    description:
      tier === "buy"
        ? "Permanent access and download"
        : "Stream for 48 hours — no download",
    sats: yogaSutraTierSats(tier),
    cents,
    usd: cents / 100,
  };
}

export function yogaSutraTiers(): YogaSutraTierConfig[] {
  return [yogaSutraTierConfig("buy"), yogaSutraTierConfig("rent")];
}

/** @deprecated Use yogaSutraBuySats */
export function yogaSutraPriceSats(): number {
  return yogaSutraBuySats();
}

/** @deprecated Use yogaSutraBuyPriceCents */
export function yogaSutraPriceCents(): number {
  return yogaSutraBuyPriceCents();
}

/** @deprecated Use yogaSutraTierConfig("buy").usd */
export function yogaSutraPriceUsd(): number {
  return yogaSutraBuyPriceCents() / 100;
}

export function yogaSutraRentExpiresAt(from = Date.now()): string {
  return new Date(from + YOGA_SUTRA_RENT_DURATION_MS).toISOString();
}
