export const RELAY_URL = "wss://relay.dojopop.live";
export const YAKIHONNE_FEED =
  "https://yakihonne.com/explore?kinds=34567&search=dojopop";
export const MEMBERSHIP_PRICE_USD = 0.99;
export const MEMBERSHIP_PRICE_CENTS = 99;
export const DEFAULT_MEMBERSHIP_SATS = 1000;

export function appUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "http://localhost:3001"
  );
}
