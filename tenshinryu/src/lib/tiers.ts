import { MEMBERSHIP_TIERS } from "./membership-tiers";

// Tier hierarchy (higher index = more access)
const TIER_HIERARCHY = ["FREE", "YOUTUBE", "GOLD", "ROYAL"];

/**
 * Check if a user has access to a feature based on their tier
 * @param userTier - The user's current membership tier
 * @param requiredTier - The minimum tier required for the feature
 * @returns boolean
 */
export function hasTierAccess(userTier: string, requiredTier: string): boolean {
  const userIndex = TIER_HIERARCHY.indexOf(userTier);
  const requiredIndex = TIER_HIERARCHY.indexOf(requiredTier);
  
  if (userIndex === -1 || requiredIndex === -1) {
    return false;
  }
  
  return userIndex >= requiredIndex;
}

/**
 * Get the user's tier info
 */
export function getTierInfo(tierId: string) {
  return MEMBERSHIP_TIERS.find(t => t.id === tierId) || MEMBERSHIP_TIERS[0];
}

/**
 * Check if user has an active subscription (not cancelled or past due)
 */
export function hasActiveMembership(status: string | null): boolean {
  return status === "active" || status === "canceling";
}

/**
 * Middleware helper: Check if route requires specific tier
 * Returns null if access granted, or redirect URL if denied
 */
export function checkTierAccess(
  userTier: string,
  userStatus: string,
  routeRequiredTier: string,
  routeForPaidOnly: boolean = false
): string | null {
  // Check if membership is active
  if (routeForPaidOnly && !hasActiveMembership(userStatus)) {
    return "/payments";
  }
  
  // Check tier level
  if (!hasTierAccess(userTier, routeRequiredTier)) {
    return "/payments";
  }
  
  return null;
}

// Feature access map - define what each tier can access
export const FEATURE_ACCESS = {
  // Public content (FREE+)
  "view:public_content": "FREE",
  "view:basic_curriculum": "FREE",
  "access:newsletter": "FREE",
  
  // YouTube content (YOUTUBE+)
  "view:youtube_lessons": "YOUTUBE",
  "access:community_chat": "YOUTUBE",
  "view:full_curriculum": "YOUTUBE",
  
  // Live classes (GOLD+)
  "access:zoom_classes": "GOLD",
  "access:member_forum": "GOLD",
  "submit:videos": "GOLD",
  
  // Premium features (ROYAL)
  "access:video_review": "ROYAL",
  "access:1on1_feedback": "ROYAL",
  "access:priority_support": "ROYAL",
} as const;

export type FeatureKey = keyof typeof FEATURE_ACCESS;

/**
 * Check if user can access a specific feature
 */
export function canAccessFeature(userTier: string, feature: FeatureKey): boolean {
  const requiredTier = FEATURE_ACCESS[feature];
  return hasTierAccess(userTier, requiredTier);
}
