/**
 * shareSong — Dedicated handler for share.uppervibemedia.com/song/<id>
 *
 * This function is the entry point when the share subdomain receives a request.
 * It fetches track data and returns server-rendered OG HTML for social crawlers,
 * then redirects real browsers to the canonical song page on uppervibemedia.com.
 *
 * Route: share.uppervibemedia.com/song/{trackId}
 *   → Serves OG HTML to bots (Facebook, iMessage, Twitter, Discord, etc.)
 *   → Redirects browsers to https://uppervibemedia.com/song/{trackId}
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const SITE_NAME   = "Upper Vibe Media";
const SITE_URL    = "https://uppervibemedia.com";
const DEFAULT_IMG = "https://media.base44.com/images/public/69cd68afb7fe90ae92757154/10c561c0c_ChatGPTImageApr1202611_53_51AM.png";

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildOgImageUrl(coverUrl) {
  if (!coverUrl) return DEFAULT_IMG;
  if (coverUrl.startsWith("https://")) return coverUrl;
  if (coverUrl.startsWith("http://")) return coverUrl.replace("http://", "https://");
  return DEFAULT_IMG;
}

function buildSongHtml({ title, artist, description, imageUrl, pageUrl }) {
  const safeTitle  = escapeHtml(title);
  const safeArtist = escapeHtml(artist);
  const safeDesc   = escapeHtml(description);
  const safeImg    = escapeHtml(imageUrl);
  const safeUrl    = escapeHtml(pageUrl);

  return `<!DOCTYPE html>
<html lang="en" prefix="og: https://ogp.me/ns#">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeTitle} — Upper Vibe Media</title>
  <meta name="description" content="${safeDesc}" />

  <!-- ── Open Graph (Facebook, iMessage, WhatsApp, Messenger) ── -->
  <meta property="og:type"             content="music.song" />
  <meta property="og:site_name"        content="${escapeHtml(SITE_NAME)}" />
  <meta property="og:title"            content="${safeTitle}" />
  <meta property="og:description"      content="${safeDesc}" />
  <meta property="og:url"              content="${safeUrl}" />
  <meta property="og:image"            content="${safeImg}" />
  <meta property="og:image:secure_url" content="${safeImg}" />
  <meta property="og:image:width"      content="1200" />
  <meta property="og:image:height"     content="630" />
  <meta property="og:image:type"       content="image/jpeg" />

  <!-- ── Twitter / X Card ── -->
  <meta name="twitter:card"        content="summary_large_image" />
  <meta name="twitter:site"        content="@uppervibemedia" />
  <meta name="twitter:title"       content="${safeTitle}" />
  <meta name="twitter:description" content="${safeDesc}" />
  <meta name="twitter:image"       content="${safeImg}" />

  <!-- ── Canonical — always points to main domain ── -->
  <link rel="canonical" href="${safeUrl}" />

  <!-- ── Browser redirect — real users go to the SPA ── -->
  <meta http-equiv="refresh" content="0; url=${safeUrl}" />
  <script>
    (function() { try { window.location.replace("${safeUrl}"); } catch(e) {} })();
  </script>
</head>
<body style="margin:0;background:#04040e;color:#fff;font-family:system-ui,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:1rem;">
  <div style="max-width:480px;text-align:center;">
    <img src="${safeImg}" alt="${safeTitle}" style="width:200px;height:200px;border-radius:16px;object-fit:cover;margin-bottom:1.5rem;box-shadow:0 8px 40px rgba(0,0,0,0.6);" onerror="this.style.display='none'" />
    <h1 style="font-size:1.5rem;font-weight:900;margin:0 0 0.5rem;">${safeTitle}</h1>
    <p style="color:rgba(255,255,255,0.5);margin:0 0 1.5rem;">${safeArtist}</p>
    <a href="${safeUrl}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#00A0DC,#00D4EE);color:#000;border-radius:10px;font-weight:900;font-size:0.95rem;text-decoration:none;">
      🎵 Listen on Upper Vibe Media
    </a>
  </div>
</body>
</html>`;
}

function buildNotFoundHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Song Not Found | Upper Vibe Media</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="refresh" content="3; url=${escapeHtml(SITE_URL)}/music" />
</head>
<body style="margin:0;background:#04040e;color:#fff;font-family:system-ui,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;text-align:center;padding:1rem;">
  <div style="max-width:400px;">
    <p style="font-size:3rem;margin-bottom:1rem;">🎵</p>
    <h1 style="font-size:1.5rem;margin-bottom:0.5rem;">Song Not Found</h1>
    <p style="color:rgba(255,255,255,0.4);margin-bottom:2rem;">This track may have been removed or the link is incorrect.</p>
    <a href="${escapeHtml(SITE_URL)}/music" style="display:inline-block;padding:12px 28px;background:#00A0DC;color:#000;border-radius:8px;font-weight:900;text-decoration:none;">
      ← Browse All Music
    </a>
  </div>
</body>
</html>`;
}

Deno.serve(async (req) => {
  // CORS for social crawler pre-flight checks
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
      },
    });
  }

  try {
    const url = new URL(req.url);
    const host = req.headers.get("host") || "";

    console.log(`[shareSong] ${req.method} ${url.pathname} host=${host}`);

    // Extract song ID from path: /song/<id> or /<id>
    let trackId = null;
    const songMatch = url.pathname.match(/\/song\/([a-zA-Z0-9]+)/);
    if (songMatch) {
      trackId = songMatch[1];
    } else {
      // Also handle bare /<id> path (in case share subdomain strips /song prefix)
      const bareMatch = url.pathname.match(/^\/([a-zA-Z0-9]{20,})\/?$/);
      if (bareMatch) trackId = bareMatch[1];
    }

    // Also accept ?id= query param as fallback
    if (!trackId) trackId = url.searchParams.get("id");

    if (!trackId) {
      console.log("[shareSong] no track ID found, redirecting to home");
      return Response.redirect(SITE_URL, 302);
    }

    console.log(`[shareSong] fetching track id=${trackId}`);

    const base44 = createClientFromRequest(req);
    const tracks = await base44.asServiceRole.entities.Track.filter({ id: trackId }, "-created_date", 1);
    const track  = tracks[0];

    if (!track) {
      console.warn(`[shareSong] track not found: ${trackId}`);
      return new Response(buildNotFoundHtml(), {
        status: 404,
        headers: {
          "Content-Type":  "text/html; charset=utf-8",
          "Cache-Control": "no-store",
        },
      });
    }

    const artist      = track.artist_display || "Upper Vibe Media";
    const title       = `${track.title} by ${artist}`;
    const description = `🎵 Listen to "${track.title}" on Upper Vibe Media — 432 Hz high-vibe music. Stream free.`;
    const imageUrl    = buildOgImageUrl(track.cover_url);
    const pageUrl     = `${SITE_URL}/song/${trackId}`;

    console.log(`[shareSong] ✓ serving OG HTML for "${track.title}" → ${pageUrl}`);

    return new Response(buildSongHtml({ title, artist, description, imageUrl, pageUrl }), {
      status: 200,
      headers: {
        "Content-Type":  "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
        // Allow FB crawler
        "Access-Control-Allow-Origin": "*",
      },
    });

  } catch (error) {
    console.error("[shareSong] error:", error.message, error.stack);
    return Response.redirect(SITE_URL, 302);
  }
});