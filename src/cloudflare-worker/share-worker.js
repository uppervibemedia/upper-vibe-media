/**
 * Cloudflare Worker — uppervibemedia-og
 *
 * Route: uppervibemedia.com/song/*
 *        www.uppervibemedia.com/song/*
 *
 * Strategy: For ALL requests to /song/:id, fetch the track from Base44 API,
 * inject correct OG tags into the response HTML, then pass through to the SPA.
 *
 * For crawlers: return a lightweight OG-only HTML page directly (no JS needed).
 * For humans: fetch the real SPA page, inject OG tags into the <head>, return it.
 *
 * This guarantees Facebook/Twitter always see the correct OG tags regardless
 * of how their crawler identifies itself.
 *
 * DEPLOY: Cloudflare Dashboard → Workers & Pages → uppervibemedia-og → Edit Code
 *         Select All → Paste → Save & Deploy
 *
 * TEST:
 *   curl -s -A "facebookexternalhit/1.1" https://uppervibemedia.com/song/6a21ab8709130974a068aff2 | grep og:title
 *   → should show: Dopamine Dealer | Upper Vibe Media
 */

const APP_ID      = "69cd68afb7fe90ae92757154";
const MAIN_SITE   = "https://uppervibemedia.com";
const SITE_NAME   = "Upper Vibe Media";
const DEFAULT_IMG = "https://media.base44.com/images/public/69cd68afb7fe90ae92757154/10c561c0c_ChatGPTImageApr1202611_53_51AM.png";
// Dopamine Dealer cover (pre-resolved from media.base44.com, avoids redirect)
const DOPAMINE_DEALER_IMG = "https://media.base44.com/images/public/69cd68afb7fe90ae92757154/8dd2a0b82_ChatGPTImageJun3202611_32_40PM.png";
const BASE44_API  = `https://base44.app/api/apps/${APP_ID}/entities/Track`;

// Known social crawlers — we serve them pure OG HTML with no JS redirect
const BOT_FRAGMENTS = [
  "facebookexternalhit", "facebot", "facebookcatalog",
  "twitterbot", "linkedinbot", "slackbot", "discordbot",
  "telegrambot", "whatsapp", "applebot", "googlebot",
  "bingbot", "pinterest", "snapchat", "vkshare",
  "curl/", "python-requests", "go-http-client",
];

function isCrawler(ua) {
  const l = (ua || "").toLowerCase();
  return BOT_FRAGMENTS.some(f => l.includes(f));
}

async function fetchTrack(songId) {
  const res = await fetch(`${BASE44_API}/${songId}`, {
    headers: { "Accept": "application/json", "User-Agent": "uppervibemedia-og-worker/4.0" },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`api_${res.status}`);
  const t = await res.json();
  if (!t?.id) throw new Error("not_found");
  return t;
}

function esc(s) {
  return String(s || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

// Pure OG HTML page — served to crawlers only
function buildCrawlerHtml(title, desc, img, pageUrl) {
  const t = esc(title), d = esc(desc), i = esc(img), u = esc(pageUrl);
  return `<!DOCTYPE html>
<html lang="en" prefix="og: https://ogp.me/ns#">
<head>
  <meta charset="UTF-8"/>
  <title>${t}</title>
  <meta name="description" content="${d}"/>
  <meta property="og:type" content="music.song"/>
  <meta property="og:site_name" content="${esc(SITE_NAME)}"/>
  <meta property="og:title" content="${t}"/>
  <meta property="og:description" content="${d}"/>
  <meta property="og:url" content="${u}"/>
  <meta property="og:image" content="${i}"/>
  <meta property="og:image:secure_url" content="${i}"/>
  <meta property="og:image:width" content="1200"/>
  <meta property="og:image:height" content="630"/>
  <meta property="og:image:type" content="image/jpeg"/>
  <meta name="twitter:card" content="summary_large_image"/>
  <meta name="twitter:site" content="@uppervibemedia"/>
  <meta name="twitter:title" content="${t}"/>
  <meta name="twitter:description" content="${d}"/>
  <meta name="twitter:image" content="${i}"/>
  <link rel="canonical" href="${u}"/>
</head>
<body style="margin:0;background:#04040e;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center;">
  <div style="padding:2rem;max-width:480px;">
    <p style="font-size:1.8rem;margin-bottom:1rem;">🎧</p>
    <h1 style="font-size:1.25rem;font-weight:900;margin-bottom:0.5rem;">${t}</h1>
    <p style="color:rgba(255,255,255,0.5);margin-bottom:1.5rem;">${d}</p>
    <a href="${u}" style="padding:14px 32px;background:linear-gradient(135deg,#00B8D4,#00E5FF);color:#000;border-radius:10px;font-weight:900;font-size:15px;text-decoration:none;">
      Listen on Upper Vibe Media →
    </a>
  </div>
</body>
</html>`;
}

// Inject OG tags into a real SPA HTML response — for human users
function injectOgTags(html, title, desc, img, pageUrl) {
  const t = esc(title), d = esc(desc), i = esc(img), u = esc(pageUrl);
  const ogTags = `
  <meta property="og:type" content="music.song"/>
  <meta property="og:site_name" content="${esc(SITE_NAME)}"/>
  <meta property="og:title" content="${t}"/>
  <meta property="og:description" content="${d}"/>
  <meta property="og:url" content="${u}"/>
  <meta property="og:image" content="${i}"/>
  <meta property="og:image:secure_url" content="${i}"/>
  <meta property="og:image:width" content="1200"/>
  <meta property="og:image:height" content="630"/>
  <meta property="og:image:type" content="image/jpeg"/>
  <meta name="twitter:card" content="summary_large_image"/>
  <meta name="twitter:site" content="@uppervibemedia"/>
  <meta name="twitter:title" content="${t}"/>
  <meta name="twitter:description" content="${d}"/>
  <meta name="twitter:image" content="${i}"/>`;

  // Replace the generic title tag
  let result = html.replace(/<title>[^<]*<\/title>/i, `<title>${t}</title>`);
  // Inject OG tags right after <head>
  result = result.replace(/<head>/i, `<head>${ogTags}`);
  return result;
}

export default {
  async fetch(request) {
    const url = new URL(request.url);

    // Only intercept /song/:id
    const match = url.pathname.match(/^\/song\/([a-zA-Z0-9]+)$/);
    if (!match) {
      return fetch(request);
    }

    // Prevent infinite loop: if the worker already processed this request, pass through
    if (request.headers.get("X-OG-Worker-Processed")) {
      return fetch(request);
    }

    const songId  = match[1];
    const pageUrl = `${MAIN_SITE}/song/${songId}`;
    const ua      = request.headers.get("User-Agent") || "";
    const crawler = isCrawler(ua);

    console.log(`[og] ${crawler ? "CRAWLER" : "human"} | UA: ${ua.slice(0,80)} | song/${songId}`);

    // Fetch track data from Base44 (public endpoint, no auth required)
    let track = null;
    try {
      track = await fetchTrack(songId);
      console.log(`[og] track: "${track.title}" | cover: ${(track.cover_url||"").slice(0,80)}`);
    } catch (e) {
      console.error(`[og] track fetch failed: ${e.message}`);
    }

    const title = track ? `${track.title} | ${SITE_NAME}` : SITE_NAME;
    const desc  = track ? `Listen to ${track.title} on Upper Vibe Media.` : "Premium 432 Hz music on Upper Vibe Media.";
    // Rewrite base44.app file URLs → media.base44.com (avoids a redirect Facebook may not follow)
    let rawImg = (track?.cover_url?.startsWith("https://")) ? track.cover_url : DEFAULT_IMG;
    const img = rawImg.replace(
      "https://base44.app/api/apps/" + APP_ID + "/files/mp/public/" + APP_ID + "/",
      "https://media.base44.com/images/public/" + APP_ID + "/"
    );

    // For crawlers: return pure OG HTML — no JS, no SPA, just what Facebook needs
    if (crawler) {
      return new Response(buildCrawlerHtml(title, desc, img, pageUrl), {
        status: 200,
        headers: {
          "Content-Type":  "text/html; charset=utf-8",
          "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
          "Vary":          "User-Agent",
          "X-OG-Worker":  "crawler",
        },
      });
    }

    // For humans: fetch the real SPA, inject OG tags into it so iMessage/iOS share also works
    try {
      // Add a header to prevent infinite worker loop
      const modifiedRequest = new Request(request, {
        headers: { ...Object.fromEntries(request.headers), "X-OG-Worker-Processed": "1" },
      });
      const spaResponse = await fetch(modifiedRequest);
      const spaHtml = await spaResponse.text();
      const injected = injectOgTags(spaHtml, title, desc, img, pageUrl);
      return new Response(injected, {
        status: spaResponse.status,
        headers: {
          "Content-Type":  "text/html; charset=utf-8",
          "Cache-Control": "public, max-age=60",
          "Vary":          "User-Agent",
          "X-OG-Worker":  "human",
        },
      });
    } catch (e) {
      // If SPA fetch fails, just pass through normally
      console.error(`[og] SPA fetch failed: ${e.message}`);
      return fetch(request);
    }
  },
};