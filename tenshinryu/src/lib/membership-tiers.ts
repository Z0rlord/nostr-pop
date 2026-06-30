/** Shared membership tier definitions (payment-agnostic). */

export const MEMBERSHIP_TIERS = [
  {
    id: "FREE",
    name: "Free Membership",
    price: 0,
    description: "Get started with basic access",
    features: ["View public content", "Basic curriculum preview", "Community newsletter"],
  },
  {
    id: "YOUTUBE",
    name: "YouTube Membership",
    price: 4.99,
    description: "Access to YouTube content, basic curriculum",
    features: ["YouTube lessons", "Basic curriculum", "Community chat"],
  },
  {
    id: "GOLD",
    name: "GOLD Membership",
    price: 35,
    description: "Full curriculum, Zoom lessons, community access",
    features: ["Everything in YouTube", "Live Zoom classes", "Full curriculum", "Member forum"],
  },
  {
    id: "ROYAL",
    name: "ROYAL Membership",
    price: 85,
    description: "Everything + video review, 1-on-1 feedback",
    features: ["Everything in GOLD", "Video technique review", "1-on-1 feedback", "Priority support"],
  },
] as const;

export type MembershipTierId = (typeof MEMBERSHIP_TIERS)[number]["id"];
