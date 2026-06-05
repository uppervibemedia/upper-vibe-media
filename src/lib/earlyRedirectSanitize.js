/**
 * Early redirect sanitizer — must be imported BEFORE app-params.js runs.
 * Cleans up any bad stored redirect values that would cause post-login 404s.
 *
 * This module has NO imports so it runs immediately when evaluated.
 */

const VALID_PREFIXES = [
  "/start", "/music", "/radio", "/account",
  "/my-vibe-library", "/my-vibes", "/downloads", "/song/", "/visualizers",
  "/support", "/categories", "/about", "/artists",
  "/sessions", "/newest-music", "/academy", "/faq", "/settings",
  "/membership", "/upgrade",
  "/email-list", "/my-feed", "/personal-feed",
  "/terms", "/privacy", "/dmca", "/refunds", "/contact",
  "/forgot-password", "/login", "/register", "/reset-password",
  "/payment-success", "/payment-cancelled",
  "/vibe-check", "/admin",
];
const INVALID = new Set(["undefined", "null", "false", "", "/undefined", "/null", "/false"]);

function isPathSafe(pathname) {
  if (!pathname || typeof pathname !== "string") return false;
  const p = pathname.trim();
  if (INVALID.has(p)) return false;
  if (p === "/") return true;
  if (p.includes("http") || p.includes("//")) return false;
  if (/\.(mp3|mp4|m4a|wav|ogg|flac|jpg|jpeg|png|gif|webp|pdf)$/i.test(p)) return false;
  return VALID_PREFIXES.some((prefix) =>
    p === prefix || p.startsWith(prefix + "/") || p.startsWith(prefix + "?")
  );
}

function extractPathname(url) {
  if (!url) return url;
  try { return new URL(url).pathname; } catch { return url; }
}

// Run immediately (this file has no async code, no imports)
try {
  if (typeof window !== "undefined" && window.localStorage) {
    // 1. Sanitize base44_from_url BEFORE app-params.js can read/use it
    //    Note: app-params.js may overwrite this from the current URL's from_url param,
    //    but if there's a stale bad value, this clears it first.
    const fromUrl = localStorage.getItem("base44_from_url");
    if (fromUrl) {
      const pathname = extractPathname(fromUrl);
      if (!isPathSafe(pathname)) {
        console.log("[UVM early] Removing unsafe base44_from_url:", fromUrl, "→ pathname:", pathname);
        localStorage.removeItem("base44_from_url");
      }
    }

    // 2. Also sanitize any other stored redirect keys
    const REDIRECT_KEYS = [
      "returnUrl", "checkoutReturnUrl", "authRedirect",
      "redirectAfterLogin", "intendedPath", "lastPath", "from", "navigateAfterLogin",
    ];
    for (const key of REDIRECT_KEYS) {
      for (const storage of [localStorage, sessionStorage]) {
        try {
          const val = storage.getItem(key);
          if (val) {
            const pathname = extractPathname(val);
            if (!isPathSafe(pathname)) {
              console.log("[UVM early] Removing unsafe", key, ":", val);
              storage.removeItem(key);
            }
          }
        } catch {}
      }
    }
  }
} catch (e) {
  // Never block app from loading
  console.warn("[UVM early] Redirect sanitization error:", e);
}