/**
 * ogMeta — Dynamic Open Graph meta tag endpoint
 * 
 * Social crawlers (Twitter, Facebook, iMessage, Discord, Slack, etc.) call this
 * endpoint to get pre-rendered HTML with correct OG tags.
 * 
 * Usage: /api/og?type=track&id=<trackId>
 *             /api/og?type=viberoom
 * 
 * Returns a minimal HTML shell with all OG/Twitter Card meta tags filled in.
 * Regular browsers never call this — they get the React SPA as normal.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const SITE_NAME    = "Upper Vibe Media";
const SITE_URL     = "https://uppervibemedia.com";
const BRAND_COLOR  = "#00E5FF";
const DEFAULT_IMG  = "https://media.base44.com/images/public/69cd68afb7fe90ae92757154/10c561c0c_ChatGPTImageApr1202611_53_51AM.png";

// ── Cloudinary OG image generation ──────────────────────────────────────────
// We use Cloudinary's URL-based transformations to generate branded cards on the fly.
// If no Cloudinary is set up, we fall back to the track's own cover art or default.
function buildOgImageUrl({ coverUrl, title, artist, type }) {
  // If track has cover art, use it directly (most social platforms will show it well)
  if (coverUrl && coverUrl.startsWith("https://")) return coverUrl;
  return DEFAULT_IMG;
}

// ── HTML shell with OG tags ──────────────────────────────────────────────────
function buildHtml({ title, description, imageUrl, pageUrl, type }) {
  const safeTitle  = escapeHtml(title);
  const safeDesc   = escapeHtml(description);
  const safeImg    = escapeHtml(imageUrl);
  const safeUrl    = escapeHtml(pageUrl);
  // Always use summary_large_image for tracks so Facebook/X shows the big artwork card
  const twitterCard = type === "track" ? "summary_large_image" : (imageUrl !== DEFAULT_IMG ? "summary_large_image" : "summary");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeTitle}</title>
  <meta name="description" content="${safeDesc}" />

  <!-- Open Graph -->
  <meta property="og:type"        content="${type === "track" ? "music.song" : "website"}" />
  <meta property="og:site_name"   content="${SITE_NAME}" />
  <meta property="og:title"       content="${safeTitle}" />
  <meta property="og:description" content="${safeDesc}" />
  <meta property="og:url"         content="${safeUrl}" />
  <meta property="og:image"       content="${safeImg}" />
  <meta property="og:image:width"  content="1200" />
  <meta property="og:image:height" content="630" />

  <!-- Twitter / X Card -->
  <meta name="twitter:card"        content="${twitterCard}" />
  <meta name="twitter:site"        content="@uppervibemedia" />
  <meta name="twitter:title"       content="${safeTitle}" />
  <meta name="twitter:description" content="${safeDesc}" />
  <meta name="twitter:image"       content="${safeImg}" />

  <!-- iMessage / Apple -->
  <meta property="og:image:secure_url" content="${safeImg}" />

  <!-- Redirect real browsers to the SPA -->
  <meta http-equiv="refresh" content="0; url=${safeUrl}" />
  <script>window.location.replace("${safeUrl}")</script>
</head>
<body>
  <p>Redirecting to <a href="${safeUrl}">${safeTitle}</a>…</p>
</body>
</html>`;
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

Deno.serve(async (req) => {
  // CORS for crawler pre-flight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
      },
    });
  }

  try {
    const url    = new URL(req.url);
    let type     = url.searchParams.get("type") || "";
    let id       = url.searchParams.get("id")   || "";

    // Also accept POST body params (used by test runner and some integrations)
    if (req.method === "POST") {
      try {
        const body = await req.json();
        if (!type && body.type) type = body.type;
        if (!id   && body.id)   id   = body.id;
      } catch {}
    }

    type = type || "default";

    const base44 = createClientFromRequest(req);

    // ── Track page ───────────────────────────────────────────────────────────
    if (type === "track" && id) {
      const tracks = await base44.asServiceRole.entities.Track.filter({ id }, "-created_date", 1);
      const track  = tracks[0];

      if (!track) {
        return buildDefaultResponse();
      }

      const artist      = track.artist_display || "Upper Vibe Media";
      const pageTitle   = `${track.title} by ${artist}`;
      const description = `Listening live on Upper Vibe Media`;

      const imageUrl = buildOgImageUrl({
        coverUrl: track.cover_url,
        title:    track.title,
        artist,
        type:     "track",
      });

      const html = buildHtml({
        title:       pageTitle,
        description,
        imageUrl,
        pageUrl:     `${SITE_URL}/song/${id}`,
        type:        "track",
      });

      console.log(`[ogMeta] track | id: ${id} | title: ${track.title} | img: ${imageUrl.substring(0, 60)}`);

      return new Response(html, {
        headers: {
          "Content-Type":  "text/html; charset=utf-8",
          "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
        },
      });
    }

    // ── Radio page (generic — no specific song) ──────────────────────────────
    if (type === "radio") {
      const html = buildHtml({
        title:       `Upper Vibe Radio — Live Now | ${SITE_NAME}`,
        description: "432 Hz high-vibe music streaming live. Listening live on Upper Vibe Media.",
        imageUrl:    DEFAULT_IMG,
        pageUrl:     `${SITE_URL}/radio`,
        type:        "website",
      });
      return new Response(html, {
        headers: {
          "Content-Type":  "text/html; charset=utf-8",
          "Cache-Control": "public, max-age=300",
        },
      });
    }

    // ── Vibe Room page ───────────────────────────────────────────────────────
    if (type === "viberoom") {
      const html = buildHtml({
        title:       `Vibe Room — Live Community Chat | ${SITE_NAME}`,
        description: "Join the Upper Vibe Media community. Stream music together, share reactions, and raise the frequency in real time.",
        imageUrl:    DEFAULT_IMG,
        pageUrl:     `${SITE_URL}/vibe-room`,
        type:        "website",
      });

      return new Response(html, {
        headers: {
          "Content-Type":  "text/html; charset=utf-8",
          "Cache-Control": "public, max-age=1800",
        },
      });
    }

    // ── Default fallback ─────────────────────────────────────────────────────
    return buildDefaultResponse();

  } catch (error) {
    console.error("[ogMeta] error:", error.message);
    return buildDefaultResponse();
  }
});

function buildDefaultResponse() {
  const html = buildHtml({
    title:       `Upper Vibe Media — Stream the Frequency`,
    description: "Premium high-vibration music. 432 Hz remastered tracks, exclusive drops, and a community built on elevation.",
    imageUrl:    DEFAULT_IMG,
    pageUrl:     "https://uppervibemedia.com",
    type:        "website",
  });
  return new Response(html, {
    headers: {
      "Content-Type":  "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}