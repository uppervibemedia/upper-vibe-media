/**
 * Tier access utility for Upper Vibe
 *
 * Tiers: "free" < "supporter" < "premium"
 *
 * Rules:
 * - Premium always inherits supporter access
 * - tier_access is an array like ["free"], ["supporter", "premium"], ["premium"], etc.
 * - For legacy content using min_tier string, we convert on the fly
 */

export const TIERS = ["free", "supporter", "premium"];

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
 * @param {string} userTier - "free" | "supporter" | "premium"
 * @param {object} item - content item with tier_access or min_tier
 */
export function canAccess(userTier, item) {
  const access = getEffectiveAccess(item);
  return access.includes(userTier || "free");
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