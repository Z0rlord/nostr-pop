import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Prisma BeltRank enum → display label */
export function formatBeltRank(rank: string): string {
  if (!rank) return "";
  if (rank.toLowerCase().includes("belt")) return rank;
  const label = rank
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
  return `${label} Belt`;
}

/** Prisma NONE tier → FREE for UI/stripe tier map */
export function normalizeMembershipTier(tier?: string | null): string {
  if (!tier || tier === "NONE") return "FREE";
  return tier;
}
