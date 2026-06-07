/**
 * Cloudflare Worker — uppervibemedia-og
 *
 * Route: uppervibemedia.com/song/*
 *        www.uppervibemedia.com/song/*
 *
 * HOW IT WORKS:
 *   Crawlers (Facebook, Twitter/X, Discord, Slack, WhatsApp, iMessage…)
 *     → Worker fetches real track data from Base44 API
 *     → Returns server-rendered HTML with song-specific OG + Twitter tags
 *
 *   Real human users:
 *     → Worker passes request straight through to Base44 SPA
 *     → Zero change to user experience
 *
 * DEPLOY:
 *   1. Cloudflare Dashboard → Workers & Pages → uppervibemedia-og → Edit code
 *   2. Paste this entire file → Save & Deploy
 *   3. Confirm routes exist: uppervibemedia.com/song/* and www.uppervibemedia.com/song/*
 *
 * TEST (must see og:title with song name, NOT generic):
 *   curl -sI -A "facebookexternalhit/1.1" https://uppervibemedia.com/song/6a21ab8709130974a068aff2 | grep -i content-type
 *   curl -s  -A "facebookexternalhit/1.1" https://uppervibemedia.com/song/6a21ab8709130974a068aff2 | grep "og:title"
 *
 * Then use Facebook Sharing Debugger → Scrape Again:
 *   https://developers.facebook.com/tools/debug/
 */

const APP_ID      = "69cd68afb7fe90ae92757154";
const MAIN_SITE   = "https://uppervibemedia.com";
const SITE_NAME   = "Upper Vibe Media";
const DEFAULT_IMG = "https://media.base44.com/images/public/69cd68afb7fe90ae92757154/10c561c0c_ChatGPTImageApr1202611_53_51AM.png";

// Base44 REST API — Track RLS is read=true (public, no auth required)
const BASE44_API = `https://base44.app/api/apps/${APP_ID}/entities/Track`;

// ─── Crawler detection ────────────────────────────────────────────────────────
// Covers: Facebook, Twitter/X, LinkedIn, Slack, Discord, Telegram,
//         WhatsApp, Apple/iMessage, Googlebot, Bingbot, Pinterest, Snapchat
const BOT_UA_FRAGMENTS = [
  "facebookexternalhit",
  "facebookcatalog",
  "facebot",
  "twitterbot",
  "linkedinbot",
  "slackbot",
  "slack-imgproxy",
  "discordbot",
  "telegrambot",
  "whatsapp",
  "applebot",
  "imessagebotuser",
  "googlebot",
  "bingbot",
  "pinterest",
  "snapchat",
  "vkshare",
  "w3c_validator",
  "curl/",
  "python-requests",
  "axios/",
  "go-http-client",
  "okhttp",
];

function isCrawler(ua) {
  if (!ua) return false;
  const lower = ua.toLowerCase();
  return BOT_UA_FRAGMENTS.some((f) => lower.includes(f));
}

// ─── Fetch track from Base44 ──────────────────────────────────────────────────
async function fetchTrack(songId) {
  const res = await fetch(`${BASE44_API}/${encodeURIComponent(songId)}`, {
    headers: {
      "Accept":     "application/json",
      "User-Agent": "uppervibemedia-og-worker/3.0",
    },
    signal: AbortSignal.timeout(6000),
  });
  if (res.status === 404) throw new Error("not_found");
  if (!res.ok) throw new Error(`api_error_${res.status}`);
  const track = await res.json();
  if (!track || !track.id) throw new Error("not_found");
  return track;
}

// ─── HTML escape ──────────────────────────────────────────────────────────────
function esc(s) {
  if (!s) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ─── Build OG HTML for crawlers ───────────────────────────────────────────────
function buildOgHtml(title, description, imageUrl, pageUrl) {
  const t = esc(title);
  const d = esc(description);
  const i = esc(imageUrl);
  const u = esc(pageUrl);

  return `<!DOCTYPE html>
<html lang="en" prefix="og: https://ogp.me/ns#">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${t}</title>
  <meta name="description" content="${d}" />

  <!-- Open Graph — Facebook, iMessage, Discord, Slack, LinkedIn, WhatsApp -->
  <meta property="og:type"             content="music.song" />
  <meta property="og:site_name"        content="${esc(SITE_NAME)}" />
  <meta property="og:title"            content="${t}" />
  <meta property="og:description"      content="${d}" />
  <meta property="og:url"              content="${u}" />
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

  <link rel="canonical" href="${u}" />
</head>
<body style="margin:0;background:#04040e;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center;">
  <div style="padding:2rem;max-width:480px;">
    <p style="font-size:1.8rem;margin-bottom:1rem;">🎧</p>
    <h1 style="margin:0 0 0.5rem;font-size:1.25rem;font-weight:900;">${t}</h1>
    <a href="${u}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#00B8D4,#00E5FF);color:#000;border-radius:10px;font-weight:900;font-size:15px;text-decoration:none;letter-spacing:0.04em;">
      Listen on Upper Vibe Media →
    </a>
  </div>
</body>
</html>`;
}

// ─── Main handler ─────────────────────────────────────────────────────────────
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const ua  = request.headers.get("User-Agent") || "";

    // Only act on /song/:id — everything else passes through unchanged
    const match = url.pathname.match(/^\/song\/([a-zA-Z0-9]+)$/);
    if (!match) {
      return fetch(request);
    }

    const songId  = match[1];
    const pageUrl = `${MAIN_SITE}/song/${songId}`;

    // Real humans → pass through to Base44 SPA (no change to their experience)
    if (!isCrawler(ua)) {
      return fetch(request);
    }

    // Crawlers → serve server-rendered OG HTML
    console.log(`[og-worker] crawler detected | UA: ${ua.substring(0, 80)} | song/${songId}`);

    try {
      const track = await fetchTrack(songId);

      const title       = `${track.title} | ${SITE_NAME}`;
      const description = `Listen to ${track.title} on Upper Vibe Media.`;
      const imageUrl    = (track.cover_url && track.cover_url.startsWith("https://"))
                            ? track.cover_url
                            : DEFAULT_IMG;

      console.log(`[og-worker] ✓ "${track.title}" | img: ${imageUrl.substring(0, 80)}`);

      return new Response(buildOgHtml(title, description, imageUrl, pageUrl), {
        status: 200,
        headers: {
          "Content-Type":  "text/html; charset=utf-8",
          "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
          "Vary":          "User-Agent",
        },
      });

    } catch (err) {
      console.error(`[og-worker] fetch failed for song/${songId}:`, err.message);

      // Fallback: still return OG HTML (generic) rather than the SPA
      const fallback = buildOgHtml(
        `${SITE_NAME} — Stream the Frequency`,
        "Premium 432 Hz high-vibration music. Stream free on Upper Vibe Media.",
        DEFAULT_IMG,
        pageUrl
      );
      return new Response(fallback, {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
      });
    }
  },
};