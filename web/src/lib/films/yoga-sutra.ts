export const YOGA_SUTRA_FILM_ID = "yoga-sutra" as const;
export const YOGA_SUTRA_SLUG = "yoga-sutra";

export const DEFAULT_YOGA_SUTRA_SATS = 100_000;
export const DEFAULT_YOGA_SUTRA_PRICE_CENTS = 1499;

export function yogaSutraTrailerUrl(): string | undefined {
  return process.env.FILM_YOGA_SUTRA_TRAILER_URL?.trim() || undefined;
}

/** Server-only — never expose in client bundles. */
export function yogaSutraStreamUrl(): string | undefined {
  return process.env.FILM_YOGA_SUTRA_BLOSSOM_URL?.trim() || undefined;
}

export function yogaSutraPriceSats(): number {
  const raw = process.env.FILM_YOGA_SUTRA_SATS;
  if (!raw) return DEFAULT_YOGA_SUTRA_SATS;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_YOGA_SUTRA_SATS;
}

export function yogaSutraPriceCents(): number {
  const raw = process.env.FILM_YOGA_SUTRA_STRIPE_PRICE_CENTS;
  if (!raw) return DEFAULT_YOGA_SUTRA_PRICE_CENTS;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_YOGA_SUTRA_PRICE_CENTS;
}

export function yogaSutraPriceUsd(): number {
  return yogaSutraPriceCents() / 100;
}
