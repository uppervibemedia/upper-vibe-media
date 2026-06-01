/**
 * Safe post-login redirect utility.
 * Validates a returnUrl and falls back to a role-appropriate default.
 */

// All valid registered routes (exact or prefix matches)
const VALID_ROUTE_PREFIXES = [
  "/",
  "/start",
  "/music",
  "/radio",
  "/vibe-room",
  "/account",
  "/my-vibe-library",
  "/my-vibes",
  "/my-vibe-library",
  "/downloads",
  "/song/",
  "/visualizers",
  "/support",
  "/community-guidelines",
  "/categories",
  "/about",
  "/artists",
  "/sessions",
  "/newest-music",
  "/academy",
  "/faq",
  "/settings",
  "/pricing",
  "/membership",
  "/upgrade",
  "/favorites",
  "/discover",
  "/email-list",
];

// Values that should never be used as routes
const INVALID_ROUTE_VALUES = new Set([
  "undefined", "null", "false", "true", "", "/undefined", "/null", "/false",
]);

/**
 * Returns true if `path` is a safe, known route.
 */
export function isSafeRoute(path) {
  if (!path || typeof path !== "string") return false;
  const normalized = path.trim();
  if (!normalized.startsWith("/")) return false;
  if (INVALID_ROUTE_VALUES.has(normalized)) return false;
  // Must start with one of the known prefixes
  return VALID_ROUTE_PREFIXES.some((prefix) =>
    normalized === prefix || normalized.startsWith(prefix)
  );
}

/**
 * Pick the best default route based on user role/tier.
 */
export function defaultRouteForUser(user) {
  if (!user) return "/music";
  if (user.role === "admin") return "/admin";
  const isPlus =
    user.isPlus === true ||
    user.isPremium === true ||
    user.is_plus === true ||
    user.tier === "plus" ||
    user.tier === "premium" ||
    user.subscription_status === "active" ||
    user.subscriptionStatus === "active" ||
    user.stripe_subscription_status === "active";
  if (isPlus) return "/my-vibe-library";
  return "/music";
}

// Storage keys that may hold a returnUrl
const REDIRECT_STORAGE_KEYS = [
  "returnUrl",
  "checkoutReturnUrl",
  "authRedirect",
  "redirectAfterLogin",
  "intendedPath",
];

/**
 * Read any stored redirect from localStorage/sessionStorage,
 * validate it, clear bad values, and return a safe path or null.
 */
export function consumeStoredRedirect() {
  for (const key of REDIRECT_STORAGE_KEYS) {
    for (const storage of [sessionStorage, localStorage]) {
      try {
        const val = storage.getItem(key);
        storage.removeItem(key); // always clear it
        if (val && isSafeRoute(val)) return val;
      } catch (_) {}
    }
  }
  return null;
}

/**
 * Clear all known redirect keys from both storages.
 */
export function clearAllStoredRedirects() {
  for (const key of REDIRECT_STORAGE_KEYS) {
    for (const storage of [sessionStorage, localStorage]) {
      try { storage.removeItem(key); } catch (_) {}
    }
  }
}

/**
 * Determine where to send a user after login.
 * Priority: valid returnUrl param > stored redirect > role default
 */
export function resolvePostLoginRoute(user, returnUrlParam) {
  // 1. Check URL param (e.g. ?next=/vibe-room)
  if (returnUrlParam && isSafeRoute(returnUrlParam)) {
    clearAllStoredRedirects();
    return returnUrlParam;
  }

  // 2. Check stored redirects
  const stored = consumeStoredRedirect();
  if (stored) return stored;

  // 3. Role-based default
  return defaultRouteForUser(user);
}