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
  "/vibe-check",
  "/vibe-room",
  "/account",
  "/my-vibe-library",
  "/my-vibes",
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
  "/membership",
  "/upgrade",
  "/email-list",
  "/forgot-password",
  "/payment-success",
  "/payment-cancelled",
  "/terms",
  "/privacy",
  "/dmca",
  "/refunds",
  "/contact",
  "/admin",
];

// Values that should never be used as routes
const INVALID_ROUTE_VALUES = new Set([
  "undefined", "null", "false", "true", "", "/undefined", "/null", "/false",
  "undefined/", "null/",
]);

/**
 * Returns true if `path` is a safe, known route.
 */
export function isSafeRoute(path) {
  if (!path || typeof path !== "string") return false;
  const normalized = path.trim();
  if (!normalized.startsWith("/")) return false;
  if (INVALID_ROUTE_VALUES.has(normalized)) return false;
  // Reject external URLs disguised as paths
  if (normalized.includes("http") || normalized.includes("//")) return false;
  // Reject raw media/audio file paths
  if (/\.(mp3|mp4|m4a|wav|ogg|flac|jpg|jpeg|png|gif|webp|pdf)$/i.test(normalized)) return false;
  // Must match one of the known prefixes
  return VALID_ROUTE_PREFIXES.some((prefix) => {
    if (prefix === "/") return normalized === "/"; // exact match only for root
    return normalized === prefix || normalized.startsWith(prefix + "/") || normalized.startsWith(prefix + "?");
  });
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
    user.role === "plus" ||
    user.role === "premium" ||
    user.plan === "plus" ||
    user.plan === "premium" ||
    user.subscription_status === "active" ||
    user.subscriptionStatus === "active" ||
    user.stripe_subscription_status === "active";
  if (isPlus) return "/my-vibe-library";
  return "/music";
}

// All storage keys that may hold a returnUrl / redirect value
const REDIRECT_STORAGE_KEYS = [
  "returnUrl",
  "checkoutReturnUrl",
  "authRedirect",
  "redirectAfterLogin",
  "intendedPath",
  "lastPath",
  "from",
  "navigateAfterLogin",
];

// The base44 platform key that stores from_url (set by app-params.js)
const BASE44_FROM_URL_KEY = "base44_from_url";

/**
 * Sanitize the base44_from_url localStorage value.
 * If it holds an invalid/unsafe URL, remove it so the platform
 * doesn't redirect to a 404 after login.
 */
export function sanitizePlatformFromUrl() {
  try {
    const raw = localStorage.getItem(BASE44_FROM_URL_KEY);
    if (!raw) return;

    // Parse out just the pathname from the stored URL (may be a full URL)
    let pathname = raw;
    try {
      const parsed = new URL(raw);
      pathname = parsed.pathname;
    } catch {
      // Not a full URL — treat as path
      pathname = raw;
    }

    console.log("[safeRedirect] base44_from_url raw:", raw, "→ pathname:", pathname);

    if (!isSafeRoute(pathname)) {
      console.log("[safeRedirect] base44_from_url is UNSAFE — removing it");
      localStorage.removeItem(BASE44_FROM_URL_KEY);
    } else {
      console.log("[safeRedirect] base44_from_url is safe:", pathname);
    }
  } catch (_) {}
}

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
  // Also sanitize the platform's own from_url
  sanitizePlatformFromUrl();
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