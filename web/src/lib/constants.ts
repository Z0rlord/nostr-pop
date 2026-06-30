export const RELAY_URL = "wss://relay.dojopop.live";

/** Fan-out targets so Yakihonne, Primal, and other clients index member uploads. */
export const PUBLISH_RELAYS = [
  RELAY_URL,
  "wss://nostr-01.yakihonne.com",
  "wss://relay.primal.net",
  "wss://relay.damus.io",
  "wss://nos.lol",
] as const;
export const BLOSSOM_URL =
  process.env.NEXT_PUBLIC_BLOSSOM_URL?.replace(/\/$/, "") ||
  "https://blossom.dojopop.live";

/** CDN origin for media delivery (same blobs, Cloudflare-cached). */
export const CDN_URL =
  process.env.NEXT_PUBLIC_CDN_URL?.replace(/\/$/, "") || BLOSSOM_URL;
export const YAKIHONNE_FEED =
  "https://yakihonne.com/explore?kinds=22&search=dojopop";
export const MEMBERSHIP_PRICE_USD = 9.99;
export const MEMBERSHIP_PRICE_CENTS = 999;
export const DEFAULT_MEMBERSHIP_SATS = 10000;

/** Required on every DojoPop practice video event. */
export const PRACTICE_HASHTAGS = ["dojopop", "proofofpractice"] as const;

export const PRIMAL_DOWNLOAD_URL = "https://primal.net/downloads";
export const PRIMAL_IOS_URL = "https://apps.apple.com/app/primal/id1673134518";
export const PRIMAL_ANDROID_URL =
  "https://play.google.com/store/apps/details?id=net.primal.android.primal";

export function appUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "http://localhost:3001"
  );
}
