/**
 * Cloudflare Worker — uppervibemedia.com
 *
 * ═══════════════════════════════════════════════════════════════
 * SETUP INSTRUCTIONS
 * ═══════════════════════════════════════════════════════════════
 *
 * This worker sits in front of uppervibemedia.com and intercepts
 * crawler requests to /song/:id to serve server-rendered OG meta tags.
 * All other requests (real users, all other pages) pass through to the
 * Base44 SPA unchanged.
 *
 * Step 1 — Create the Worker:
 *   1. Go to https://dash.cloudflare.com → Workers & Pages
 *   2. Click "Create" → "Create Worker"
 *   3. Name it: uppervibemedia-og
 *   4. Replace the default code with this entire file
 *   5. Click "Save & Deploy"
 *
 * Step 2 — Add a Route (NOT a Custom Domain):
 *   Option A — Via Dashboard:
 *     1. Go to your Cloudflare zone for uppervibemedia.com
 *     2. Workers Routes → Add Route
 *     3. Route: uppervibemedia.com/song/*
 *     4. Worker: uppervibemedia-og
 *     5. Save
 *
 *   Option B — Via wrangler.toml (see wrangler.toml):
 *     Run: npx wrangler deploy
 *
 * Step 3 — Test:
 *   Real user:  curl https://uppervibemedia.com/song/6a21ab8709130974a068aff2
 *               → Should return normal SPA HTML (pass-through)
 *
 *   Crawler:    curl -A "facebookexternalhit/1.1" https://uppervibemedia.com/song/6a21ab8709130974a068aff2
 *               → Should return OG HTML with Dopamine Dealer cover art
 *
 *   Facebook Sharing Debugger:
 *     https://developers.facebook.com/tools/debug/
 *     Paste: https://uppervibemedia.com/song/6a21ab8709130974a068aff2
 *     Click "Scrape Again"
 *
 * ═══════════════════════════════════════════════════════════════
 * HOW IT WORKS
 * ═══════════════════════════════════════════════════════════════
 *
 * Social crawlers (Facebook, iMessage, X, Discord, Slack, WhatsApp…):
 *   → Worker fetches track data from Base44 REST API
 *   → Returns server-rendered HTML with REAL song OG tags
 *   → Facebook preview card shows actual artwork + song title + artist
 *   → og:url = https://uppervibemedia.com/song/{id}  (canonical, no redirect)
 *
 * Real human users:
 *   → Worker passes the request straight through to the Base44 SPA
 *   → Zero impact on user experience, no redirect, no delay
 *
 * ═══════════════════════════════════════════════════════════════
 */

const APP_ID      = "69cd68afb7fe90ae92757154";
const MAIN_SITE   = "https://uppervibemedia.com";
const SITE_NAME   = "Upper Vibe Media";
const DEFAULT_IMG = "https://media.base44.com/images/public/69cd68afb7fe90ae92757154/10c561c0c_ChatGPTImageApr1202611_53_51AM.png";

// Base44 REST API — Track entity has RLS read=true so no auth required
const BASE44_API = `https://base44.app/api/apps/${APP_ID}/entities/Track`;

// ─── Crawler Bot Detection ────────────────────────────────────────────────────
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

// ─── Fetch Track from Base44 ──────────────────────────────────────────────────
async function fetchTrack(songId) {
  const res = await fetch(`${BASE44_API}/${encodeURIComponent(songId)}`, {
    headers: {
      "Accept": "application/json",
      "User-Agent": "uppervibemedia.com OG-Worker/2.0",
    },
    signal: AbortSignal.timeout(6000),
  });
  if (res.status === 404) throw new Error("not_found");
  if (!res.ok) throw new Error(`base44_error_${res.status}`);
  const track = await res.json();
  if (!track || !track.id) throw new Error("not_found");
  return track;
}

// ─── HTML Escape ──────────────────────────────────────────────────────────────
function esc(s) {
  if (!s) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ─── Build OG HTML ────────────────────────────────────────────────────────────
function buildOgHtml({ title, description, imageUrl, pageUrl }) {
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

  <!-- Open Graph — Facebook, iMessage, Discord, Slack, LinkedIn -->
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

  <!-- Redirect crawlers that load this page in a browser to the SPA -->
  <script>(function(){
    var ua = navigator.userAgent.toLowerCase();
    var bots = ["facebookexternalhit","twitterbot","linkedinbot","slackbot","discordbot","googlebot"];
    var isBot = bots.some(function(b){return ua.indexOf(b)>-1;});
    if(!isBot) window.location.replace("${u}");
  })();</script>
</head>
<body style="margin:0;background:#04040e;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center;">
  <div style="padding:2rem;max-width:480px;">
    <p style="font-size:1.8rem;margin-bottom:1rem;">🎧</p>
    <h1 style="margin:0 0 0.5rem;font-size:1.25rem;font-weight:900;">${t}</h1>
    <p style="color:rgba(255,255,255,0.5);font-size:13px;margin-bottom:1.5rem;">${d}</p>
    <a href="${u}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#00B8D4,#00E5FF);color:#000;border-radius:10px;font-weight:900;font-size:15px;text-decoration:none;letter-spacing:0.04em;">
      Listen on Upper Vibe Media →
    </a>
  </div>
</body>
</html>`;
}

// ─── Fallback OG HTML (when track fetch fails) ────────────────────────────────
function buildFallbackOgHtml(songId) {
  return buildOgHtml({
    title:       `Upper Vibe Media — Stream the Frequency`,
    description: `Premium high-vibration music. 432 Hz remastered tracks — listen free.`,
    imageUrl:    DEFAULT_IMG,
    pageUrl:     `${MAIN_SITE}/song/${songId}`,
  });
}

// ─── Main Handler ─────────────────────────────────────────────────────────────
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const ua  = request.headers.get("User-Agent") || "";

    // Only intercept /song/:id paths
    const match = url.pathname.match(/^\/song\/([a-zA-Z0-9]+)$/);

    // Everything else (all other pages, assets, etc.) → pass through to Base44 SPA
    if (!match) {
      return fetch(request);
    }

    const songId  = match[1];
    const pageUrl = `${MAIN_SITE}/song/${songId}`;

    // Real humans → pass through to the SPA (they get the React app normally)
    if (!isCrawler(ua)) {
      return fetch(request);
    }

    // ── Crawlers → serve server-rendered OG HTML ──────────────────────────────
    console.log(`[og-worker] crawler: ${ua.substring(0, 80)} | song/${songId}`);

    try {
      const track = await fetchTrack(songId);

      const artist      = track.artist_display || SITE_NAME;
      const title       = `${track.title} by ${artist} | ${SITE_NAME}`;
      const description = `Stream "${track.title}" on Upper Vibe Media. 432 Hz high-vibe music — listen free.`;
      const imageUrl    = (track.cover_url && track.cover_url.startsWith("https://"))
                            ? track.cover_url
                            : DEFAULT_IMG;

      console.log(`[og-worker] ✓ "${track.title}" by ${artist} | img: ${imageUrl.substring(0, 70)}`);

      return new Response(buildOgHtml({ title, description, imageUrl, pageUrl }), {
        status: 200,
        headers: {
          "Content-Type":  "text/html; charset=utf-8",
          "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
          "Vary":          "User-Agent",
        },
      });

    } catch (err) {
      console.error(`[og-worker] error for song/${songId}:`, err.message);
      const status = err.message === "not_found" ? 404 : 200;
      return new Response(buildFallbackOgHtml(songId), {
        status,
        headers: {
          "Content-Type":  "text/html; charset=utf-8",
          "Cache-Control": "no-store",
        },
      });
    }
  },
};