/**
 * ogMeta — Dynamic Open Graph meta tag endpoint
 *
 * Handles two use-cases:
 *  1. /api/ogMeta?type=track&id=<trackId>  — internal app usage
 *  2. share.uppervibemedia.com/song/<id>   — share subdomain, direct path routing
 *
 * Social crawlers (Facebook, iMessage, Twitter/X, Discord, Slack, etc.) call this
 * endpoint to get pre-rendered HTML with correct OG tags.
 * Real browsers are immediately redirected to the canonical SPA URL.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const SITE_NAME   = "Upper Vibe Media";
const SITE_URL    = "https://uppervibemedia.com";
const BRAND_COLOR = "#00E5FF";
const DEFAULT_IMG = "https://media.base44.com/images/public/69cd68afb7fe90ae92757154/10c561c0c_ChatGPTImageApr1202611_53_51AM.png";

function buildOgImageUrl(coverUrl) {
  if (!coverUrl) return DEFAULT_IMG;
  if (coverUrl.startsWith("https://")) return coverUrl;
  if (coverUrl.startsWith("http://")) return coverUrl.replace("http://", "https://");
  return DEFAULT_IMG;
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildHtml({ title, description, imageUrl, pageUrl, type, humanRedirectUrl }) {
  const safeTitle    = escapeHtml(title);
  const safeDesc     = escapeHtml(description);
  const safeImg      = escapeHtml(imageUrl);
  const safeUrl      = escapeHtml(pageUrl);
  // Where humans actually go — defaults to pageUrl
  const safeRedirect = escapeHtml(humanRedirectUrl || pageUrl);
  const twitterCard  = type === "track" ? "summary_large_image" : (imageUrl !== DEFAULT_IMG ? "summary_large_image" : "summary");
  const ogType       = type === "track" ? "music.song" : "website";

  return `<!DOCTYPE html>
<html lang="en" prefix="og: https://ogp.me/ns#">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeTitle}</title>
  <meta name="description" content="${safeDesc}" />

  <!-- Open Graph / Facebook / iMessage -->
  <meta property="og:type"              content="${ogType}" />
  <meta property="og:site_name"         content="${SITE_NAME}" />
  <meta property="og:title"             content="${safeTitle}" />
  <meta property="og:description"       content="${safeDesc}" />
  <meta property="og:url"               content="${safeUrl}" />
  <meta property="og:image"             content="${safeImg}" />
  <meta property="og:image:secure_url"  content="${safeImg}" />
  <meta property="og:image:width"       content="1200" />
  <meta property="og:image:height"      content="630" />
  <meta property="og:image:type"        content="image/jpeg" />

  <!-- Twitter / X Card -->
  <meta name="twitter:card"        content="${twitterCard}" />
  <meta name="twitter:site"        content="@uppervibemedia" />
  <meta name="twitter:title"       content="${safeTitle}" />
  <meta name="twitter:description" content="${safeDesc}" />
  <meta name="twitter:image"       content="${safeImg}" />

  <!-- Canonical -->
  <link rel="canonical" href="${safeUrl}" />

  <!-- Redirect real browsers to the SPA song page -->
  <meta http-equiv="refresh" content="0; url=${safeRedirect}" />
  <script>
    (function() {
      try { window.location.replace("${safeRedirect}"); } catch(e) {}
    })();
  </script>
</head>
<body style="margin:0;background:#04040e;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center;">
  <div style="padding:2rem;max-width:480px;">
    <p style="margin-bottom:1.5rem;font-size:1.8rem;">🎧</p>
    <h1 style="margin:0 0 0.5rem;font-size:1.25rem;font-weight:900;">${safeTitle}</h1>
    <p style="color:rgba(255,255,255,0.5);font-size:13px;margin-bottom:1.5rem;">${safeDesc}</p>
    <a href="${safeRedirect}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#00B8D4,#00E5FF);color:#000;border-radius:10px;font-weight:900;font-size:15px;text-decoration:none;letter-spacing:0.04em;">
      Listen on Upper Vibe Media →
    </a>
  </div>
</body>
</html>`;
}

function buildNotFoundHtml() {
  const safeUrl = escapeHtml(SITE_URL);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Song Not Found | Upper Vibe Media</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;background:#04040e;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center;">
  <div style="padding:2rem;max-width:400px;">
    <p style="font-size:2rem;margin-bottom:1rem;">🎵</p>
    <h1 style="font-size:1.5rem;margin-bottom:0.5rem;">Song Not Found</h1>
    <p style="color:rgba(255,255,255,0.4);margin-bottom:2rem;">This track may have been removed or the link is incorrect.</p>
    <a href="${safeUrl}" style="display:inline-block;padding:12px 28px;background:#00A0DC;color:#000;border-radius:8px;font-weight:900;text-decoration:none;">
      ← Back to Upper Vibe Media
    </a>
  </div>
</body>
</html>`;
}

/**
 * Parse the track ID from various URL patterns:
 *   - /song/6a21ab8709130974a068aff2
 *   - /api/ogMeta?type=track&id=6a21ab8709130974a068aff2
 *   - ?type=track&id=6a21ab8709130974a068aff2
 */
function parseRequest(url, body) {
  const params  = url.searchParams;
  let type = params.get("type") || body?.type || "";
  let id   = params.get("id")   || body?.id   || "";

  // Path-based: /song/<id>  (share subdomain routes)
  if (!id) {
    const m = url.pathname.match(/\/song\/([a-zA-Z0-9]+)/);
    if (m) { type = "track"; id = m[1]; }
  }
  // Path-based: /share/<id>  (canonical share URL)
  if (!id) {
    const m = url.pathname.match(/\/share\/([a-zA-Z0-9]+)/);
    if (m) { type = "track"; id = m[1]; }
  }
  // Path-based: /ogMeta/<id>
  if (!id) {
    const m = url.pathname.match(/\/ogMeta\/([a-zA-Z0-9]+)/);
    if (m) { type = "track"; id = m[1]; }
  }

  return { type: type || "default", id };
}

Deno.serve(async (req) => {
  // CORS pre-flight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST",
      },
    });
  }

  try {
    const url  = new URL(req.url);
    let body   = null;
    if (req.method === "POST") {
      try { body = await req.json(); } catch {}
    }

    const { type, id } = parseRequest(url, body);

    console.log(`[ogMeta] type=${type} id=${id} path=${url.pathname} host=${req.headers.get("host")}`);

    const base44 = createClientFromRequest(req);

    // ── Track / Song ─────────────────────────────────────────────────────────
    if (type === "track" && id) {
      const tracks = await base44.asServiceRole.entities.Track.filter({ id }, "-created_date", 1);
      const track  = tracks[0];

      if (!track) {
        console.warn(`[ogMeta] track not found: ${id}`);
        return new Response(buildNotFoundHtml(), {
          status: 404,
          headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
        });
      }

      const pageTitle        = `${track.title} | Upper Vibe Media`;
      const description      = `Listen to ${track.title} on Upper Vibe Media.`;
      const imageUrl         = buildOgImageUrl(track.cover_url);
      const pageUrl          = `${SITE_URL}/song/${id}`;
      const humanRedirectUrl = `${SITE_URL}/song/${id}`;

      console.log(`[ogMeta] ✓ track | "${track.title}" | img: ${imageUrl.substring(0, 80)}`);

      return new Response(buildHtml({ title: pageTitle, description, imageUrl, pageUrl, type: "track", humanRedirectUrl }), {
        headers: {
          "Content-Type":  "text/html; charset=utf-8",
          "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
        },
      });
    }

    // ── /start ───────────────────────────────────────────────────────────────
    if (type === "start") {
      return new Response(buildHtml({
        title:       `Start Listening | ${SITE_NAME}`,
        description: "Stream free 432 Hz high-vibe music, visualizers, and live radio on Upper Vibe Media.",
        imageUrl:    DEFAULT_IMG,
        pageUrl:     `${SITE_URL}/start`,
        type:        "website",
      }), { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
    }

    // ── Radio ────────────────────────────────────────────────────────────────
    if (type === "radio") {
      return new Response(buildHtml({
        title:       `Upper Vibe Radio — Live Now | ${SITE_NAME}`,
        description: "432 Hz high-vibe music streaming live. Listen on Upper Vibe Media.",
        imageUrl:    DEFAULT_IMG,
        pageUrl:     `${SITE_URL}/radio`,
        type:        "website",
      }), { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=300" } });
    }

    // ── Vibe Room ────────────────────────────────────────────────────────────
    if (type === "viberoom") {
      return new Response(buildHtml({
        title:       `Vibe Room — Live Community Chat | ${SITE_NAME}`,
        description: "Join the Upper Vibe Media community. Stream music together and raise the frequency.",
        imageUrl:    DEFAULT_IMG,
        pageUrl:     `${SITE_URL}/vibe-room`,
        type:        "website",
      }), { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=1800" } });
    }

    // ── Default fallback ─────────────────────────────────────────────────────
    return buildDefaultResponse();

  } catch (error) {
    console.error("[ogMeta] error:", error.message, error.stack);
    return buildDefaultResponse();
  }
});

function buildDefaultResponse() {
  return new Response(buildHtml({
    title:       `Upper Vibe Media — Stream the Frequency`,
    description: "Premium high-vibration music. 432 Hz remastered tracks, exclusive drops, and a community built on elevation.",
    imageUrl:    DEFAULT_IMG,
    pageUrl:     SITE_URL,
    type:        "website",
  }), {
    headers: {
      "Content-Type":  "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}