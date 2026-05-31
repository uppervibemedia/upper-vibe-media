/**
 * Tier access utility for Upper Vibe
 *
 * Tiers: "free" < "supporter" < "premium" (internally) / "plus" (public-facing)
 *
 * Rules:
 * - "plus" and "premium" are the same tier — Plus is the public-facing name
 * - Premium always inherits supporter access
 * - tier_access is an array like ["free"], ["supporter", "premium"], ["premium"], etc.
 * - For legacy content using min_tier string, we convert on the fly
 */

export const TIERS = ["free", "supporter", "premium"];

/**
 * Normalize user tier: treat "plus" as "premium" for access checks.
 * The DB may store tier as "plus" (new) or "premium" (legacy) — both grant premium access.
 */
export function normalizeUserTier(tier) {
  if (tier === "plus") return "premium";
  return tier || "free";
}

/**
 * Shared Plus access check — use this everywhere instead of checking individual fields.
 * Returns true if the user has an active Plus/Premium subscription via any known field.
 */
export function hasPlusAccess(user) {
  if (!user) return false;
  return (
    user.isPlus === true ||
    user.isPremium === true ||
    user.is_plus === true ||
    user.tier === "plus" ||
    user.tier === "premium" ||
    user.role === "plus" ||
    user.role === "premium" ||
    user.role === "admin" ||
    user.plan === "plus" ||
    user.plan === "premium" ||
    user.subscription_status === "active" ||
    user.stripe_subscription_status === "active" ||
    user.subscriptionStatus === "active"
  );
}

/**
 * Convert legacy min_tier string to tier_access array.
 * "free"      → ["free", "supporter", "premium"]
 * "supporter" → ["supporter", "premium"]
 * "premium"   → ["premium"]
 */
export function minTierToAccess(minTier) {
  const idx = TIERS.indexOf(minTier);
  if (idx === -1) return ["free", "supporter", "premium"];
  return TIERS.slice(idx);
}

/**
 * Get the effective tier_access array from a content item.
 * Supports both new tier_access[] and legacy min_tier string.
 * Also enforces: if supporter is in array, premium is always included.
 */
export function getEffectiveAccess(item) {
  let access = item?.tier_access;

  // Fall back to legacy min_tier
  if (!access || !Array.isArray(access) || access.length === 0) {
    access = minTierToAccess(item?.min_tier || "free");
  }

  // Premium always inherits supporter access
  if (access.includes("supporter") && !access.includes("premium")) {
    access = [...access, "premium"];
  }

  return access;
}

/**
 * Check if a user tier can access a content item.
 * Normalizes "plus" → "premium" so new DB field works with existing content gates.
 * @param {string} userTier - "free" | "supporter" | "premium" | "plus"
 * @param {object} item - content item with tier_access or min_tier
 */
export function canAccess(userTier, item) {
  const access = getEffectiveAccess(item);
  return access.includes(normalizeUserTier(userTier) || "free");
}

/**
 * Get the display badge info for a content item.
 * Shows the most restrictive tier label that applies.
 */
export function getAccessBadge(item) {
  const access = getEffectiveAccess(item);

  if (access.includes("free")) {
    return { label: "Free", color: "bg-muted/60 text-muted-foreground border-border/40" };
  }
  if (access.includes("supporter") && access.includes("premium")) {
    return { label: "Supporter+", color: "bg-purple-500/10 text-purple-400 border-purple-500/20" };
  }
  if (access.includes("supporter")) {
    return { label: "Supporter", color: "bg-purple-500/10 text-purple-400 border-purple-500/20" };
  }
  return { label: "Premium", color: "bg-primary/10 text-primary border-primary/20" };
}

/**
 * All selectable tier access options for the admin UI.
 */
export const TIER_ACCESS_OPTIONS = [
  { value: "free", label: "Free", description: "Everyone can access" },
  { value: "supporter", label: "Supporter", description: "Supporter & Premium" },
  { value: "premium", label: "Premium Only", description: "Premium members only" },
  { value: "supporter+premium", label: "Supporter + Premium", description: "Both paid tiers" },
];

/**
 * Convert the admin UI preset value to a tier_access array.
 */
export function presetToAccess(preset) {
  switch (preset) {
    case "free": return ["free"];
    case "supporter": return ["supporter", "premium"];
    case "premium": return ["premium"];
    case "supporter+premium": return ["supporter", "premium"];
    default: return ["free"];
  }
}

/**
 * Convert a tier_access array back to the closest admin UI preset.
 */
export function accessToPreset(access) {
  if (!access || access.includes("free")) return "free";
  if (access.includes("supporter") && access.includes("premium")) return "supporter+premium";
  if (access.includes("supporter")) return "supporter";
  if (access.includes("premium")) return "premium";
  return "free";
}