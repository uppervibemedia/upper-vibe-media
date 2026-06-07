/**
 * Cloudflare Worker — share.uppervibemedia.com
 *
 * ═══════════════════════════════════════════════════════════════
 * SETUP INSTRUCTIONS (5 minutes)
 * ═══════════════════════════════════════════════════════════════
 *
 * Prerequisites:
 *   - uppervibemedia.com DNS must be on Cloudflare (not just a CNAME proxy)
 *   - A free Cloudflare account
 *
 * Step 1 — Create the Worker:
 *   1. Go to https://dash.cloudflare.com → Workers & Pages
 *   2. Click "Create" → "Create Worker"
 *   3. Name it: share-uppervibemedia
 *   4. Replace the default code with this entire file
 *   5. Click "Save & Deploy"
 *
 * Step 2 — Add the Custom Domain:
 *   1. Open your new worker → Settings → Triggers (or "Domains & Routes")
 *   2. Under "Custom Domains" click "Add Custom Domain"
 *   3. Enter: share.uppervibemedia.com
 *   4. Cloudflare will automatically create a DNS record & SSL cert
 *
 * That's it! Test by visiting:
 *   https://share.uppervibemedia.com/song/6a21ab8709130974a068aff2
 *
 * ═══════════════════════════════════════════════════════════════
 * HOW IT WORKS
 * ═══════════════════════════════════════════════════════════════
 *
 * Social crawlers (Facebook, iMessage, X, Discord, Slack, etc.):
 *   → Worker fetches track data from Base44 REST API
 *   → Returns server-rendered HTML with REAL song OG tags
 *   → Facebook preview card shows actual artwork + song title + artist
 *
 * Real human users who click the share link:
 *   → Worker detects non-bot User-Agent
 *   → 302 redirect → https://uppervibemedia.com/song/{songId}
 *   → User lands on the real song page, zero delay
 *
 * ═══════════════════════════════════════════════════════════════
 */

const APP_ID       = "69cd68afb7fe90ae92757154";
const MAIN_SITE    = "https://uppervibemedia.com";
const SHARE_ORIGIN = "https://share.uppervibemedia.com";
const DEFAULT_IMG  = "https://media.base44.com/images/public/69cd68afb7fe90ae92757154/10c561c0c_ChatGPTImageApr1202611_53_51AM.png";
const SITE_NAME    = "Upper Vibe Media";

// Base44 entity REST endpoint — Track has RLS read=true so no auth required
// URL format: /api/apps/{appId}/entities/{Name}/{id}  → returns single track object
const BASE44_REST  = `https://base44.app/api/apps/${APP_ID}/entities/Track`;

// ─── Crawler Bot Detection ──────────────────────────────────────────────────
const BOT_PATTERNS = [
  "facebookexternalhit",
  "facebookcatalog",
  "facebot",
  "linkedinbot",
  "twitterbot",
  "slackbot-linkexpanding",
  "slack-imgproxy",
  "telegrambot",
  "whatsapp",
  "discordbot",
  "imessage",
  "applebot",
  "googlebot",
  "bingbot",
  "pinterest",
  "snapchat",
  "vkshare",
  "w3c_validator",
  "curl/",
  "python-requests",
  "axios/",
  "okhttp",
  "go-http-client",
];

function isCrawler(ua) {
  if (!ua) return false;
  const lower = ua.toLowerCase();
  return BOT_PATTERNS.some((p) => lower.includes(p));
}

// ─── Fetch Track from Base44 REST API ───────────────────────────────────────
async function fetchTrack(songId) {
  // GET /api/apps/{appId}/entities/Track/{id} → returns track object directly
  // Track entity has RLS read=true (public) so no auth token needed
  const url = `${BASE44_REST}/${encodeURIComponent(songId)}`;
  const res = await fetch(url, {
    headers: {
      "Accept": "application/json",
      "User-Agent": "share.uppervibemedia.com CloudflareWorker/1.0",
    },
    signal: AbortSignal.timeout(6000),
  });
  if (res.status === 404) throw new Error("track_not_found");
  if (!res.ok) throw new Error(`Base44 API returned ${res.status}`);
  const track = await res.json();
  if (!track || !track.id) throw new Error("track_not_found");
  return track;
}

// ─── HTML Helpers ────────────────────────────────────────────────────────────
function esc(s) {
  if (!s) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildOgHtml({ title, description, imageUrl, canonicalUrl, redirectUrl }) {
  const t = esc(title);
  const d = esc(description);
  const i = esc(imageUrl);
  const c = esc(canonicalUrl);
  const r = esc(redirectUrl);

  return `<!DOCTYPE html>
<html lang="en" prefix="og: https://ogp.me/ns#">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${t}</title>
  <meta name="description" content="${d}" />

  <!-- Open Graph — Facebook, iMessage, Discord, Slack, LinkedIn -->
  <meta property="og:type"             content="music.song" />
  <meta property="og:site_name"        content="${esc(SITE_NAME)}" />
  <meta property="og:title"            content="${t}" />
  <meta property="og:description"      content="${d}" />
  <meta property="og:url"              content="${c}" />
  <meta property="og:image"            content="${i}" />
  <meta property="og:image:secure_url" content="${i}" />
  <meta property="og:image:width"      content="1200" />
  <meta property="og:image:height"     content="630" />
  <meta property="og:image:type"       content="image/jpeg" />

  <!-- Twitter / X Card -->
  <meta name="twitter:card"        content="summary_large_image" />
  <meta name="twitter:site"        content="@uppervibemedia" />
  <meta name="twitter:title"       content="${t}" />
  <meta name="twitter:description" content="${d}" />
  <meta name="twitter:image"       content="${i}" />

  <link rel="canonical" href="${c}" />

  <!-- Instantly redirect real browsers to the SPA song page -->
  <meta http-equiv="refresh" content="0; url=${r}" />
  <script>(function(){try{window.location.replace("${r}");}catch(e){}})();</script>
</head>
<body style="margin:0;background:#04040e;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center;">
  <div style="padding:2rem;max-width:480px;">
    <p style="font-size:1.8rem;margin-bottom:1rem;">🎧</p>
    <h1 style="margin:0 0 0.5rem;font-size:1.25rem;font-weight:900;">${t}</h1>
    <p style="color:rgba(255,255,255,0.5);font-size:13px;margin-bottom:1.5rem;">${d}</p>
    <a href="${r}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#00B8D4,#00E5FF);color:#000;border-radius:10px;font-weight:900;font-size:15px;text-decoration:none;letter-spacing:0.04em;">
      Listen on Upper Vibe Media →
    </a>
  </div>
</body>
</html>`;
}

function buildFallbackHtml(songId) {
  return buildOgHtml({
    title:        `Upper Vibe Media — Stream the Frequency`,
    description:  `Premium high-vibration music. 432 Hz remastered tracks on Upper Vibe Media.`,
    imageUrl:     DEFAULT_IMG,
    canonicalUrl: `${SHARE_ORIGIN}/song/${songId}`,
    redirectUrl:  `${MAIN_SITE}/song/${songId}`,
  });
}

// ─── Main Handler ─────────────────────────────────────────────────────────────
export default {
  async fetch(request) {
    const url = new URL(request.url);
    const ua  = request.headers.get("User-Agent") || "";

    // Only handle /song/:id — send everything else to main site
    const match = url.pathname.match(/^\/song\/([a-zA-Z0-9]+)$/);
    if (!match) {
      return Response.redirect(`${MAIN_SITE}${url.pathname}${url.search}`, 302);
    }

    const songId      = match[1];
    const redirectUrl = `${MAIN_SITE}/song/${songId}`;

    // Real humans get an instant 302 to the main site
    if (!isCrawler(ua)) {
      return Response.redirect(redirectUrl, 302);
    }

    // ── Crawlers get server-rendered OG HTML ──────────────────────────────
    console.log(`[share-worker] crawler request: ${ua.substring(0, 80)} → song/${songId}`);

    try {
      const track = await fetchTrack(songId);

      const artist      = track.artist_display || SITE_NAME;
      const title       = `${track.title} by ${artist} | ${SITE_NAME}`;
      const description = `Stream "${track.title}" on Upper Vibe Media. 432 Hz high-vibe music — listen free.`;
      // Ensure HTTPS image URL (Base44 CDN links are always https)
      const imageUrl    = (track.cover_url && track.cover_url.startsWith("https://"))
                            ? track.cover_url
                            : DEFAULT_IMG;

      const html = buildOgHtml({
        title,
        description,
        imageUrl,
        canonicalUrl: `${SHARE_ORIGIN}/song/${songId}`,
        redirectUrl,
      });

      console.log(`[share-worker] ✓ served OG for "${track.title}" by ${artist} | img: ${imageUrl.substring(0, 60)}`);

      return new Response(html, {
        status: 200,
        headers: {
          "Content-Type":  "text/html; charset=utf-8",
          // Cache for crawlers: 1hr, revalidate in background for 24hr
          "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
          "Vary":          "User-Agent",
        },
      });

    } catch (err) {
      console.error(`[share-worker] error for song/${songId}:`, err.message);

      const isNotFound = err.message === "track_not_found"
        || err.message.includes("404")
        || err.message.includes("not found");

      if (isNotFound) {
        // 404 page that still has OG fallback so the share doesn't look broken
        return new Response(buildFallbackHtml(songId), {
          status: 404,
          headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
        });
      }

      // Generic error — return fallback OG HTML with site-level branding
      return new Response(buildFallbackHtml(songId), {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
      });
    }
  },
};