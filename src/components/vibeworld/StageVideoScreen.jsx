import React, { useEffect, useRef } from "react";

/**
 * StageVideoScreen — shared/public rotating video showcase for the Main Music Stage.
 *
 * Rules:
 *  - Always-on canvas rendering for the Three.js stage screen texture
 *  - Shows Upper Vibe Media YouTube video thumbnails + titles
 *  - Everyone sees the same public content
 *  - NO abstract beat-reactive visuals (that's the Visualizer Dome)
 */

const CANVAS_W = 1024;
const CANVAS_H = 512;
const BRANDING = "UPPER VIBE MEDIA";

export { CANVAS_W, CANVAS_H };

// ── Draw a single frame ────────────────────────────────────────────────────
function drawFrame(ctx, w, h, video, imgCache, t) {
  // Deep dark gradient background
  const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
  bgGrad.addColorStop(0, "#06061a");
  bgGrad.addColorStop(0.5, "#0e0e28");
  bgGrad.addColorStop(1, "#080818");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  if (!video) {
    // No video — show branding only
    ctx.font = "bold 28px 'Syne', sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(200,180,255,0.25)";
    ctx.fillText(BRANDING, w / 2, h / 2);
    ctx.font = "14px 'Inter', sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.fillText("Loading featured videos...", w / 2, h / 2 + 36);
    return;
  }

  const { title, thumbnail_url } = video;

  // ── Thumbnail ──────────────────────────────────────────────────────────
  const thumbW = Math.min(480, w * 0.55);
  const thumbH = thumbW * 0.5625; // 16:9
  const thumbX = w / 2 - thumbW / 2;
  const thumbY = (h - thumbH) / 2 - 20;

  // Draw thumbnail placeholder / loaded image
  if (thumbnail_url) {
    const cached = imgCache[thumbnail_url];
    if (cached && cached.complete && cached.naturalWidth > 0) {
      // Draw loaded thumbnail
      ctx.save();
      roundedRect(ctx, thumbX, thumbY, thumbW, thumbH, 8);
      ctx.clip();
      ctx.drawImage(cached, thumbX, thumbY, thumbW, thumbH);

      // Subtle vignette overlay on thumbnail
      const vignetteGrad = ctx.createRadialGradient(w / 2, thumbY + thumbH / 2, thumbW * 0.4, w / 2, thumbY + thumbH / 2, thumbW * 0.75);
      vignetteGrad.addColorStop(0, "transparent");
      vignetteGrad.addColorStop(1, "rgba(6,6,26,0.5)");
      ctx.fillStyle = vignetteGrad;
      ctx.fillRect(thumbX, thumbY, thumbW, thumbH);
      ctx.restore();
    } else if (!cached) {
      // Load image
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = thumbnail_url;
      imgCache[thumbnail_url] = img;
    }
  }

  // Thumbnail border glow (always visible)
  ctx.strokeStyle = "rgba(120,100,220,0.3)";
  ctx.lineWidth = 2;
  roundedRect(ctx, thumbX - 2, thumbY - 2, thumbW + 4, thumbH + 4, 9);
  ctx.stroke();

  // Outer glow ring (pulsing)
  const pulse = Math.sin(t * 0.5) * 0.15 + 0.35;
  ctx.strokeStyle = `rgba(155,126,255,${pulse})`;
  ctx.lineWidth = 1;
  roundedRect(ctx, thumbX - 6, thumbY - 6, thumbW + 12, thumbH + 12, 12);
  ctx.stroke();

  // ── Play icon overlay (center of thumbnail) ────────────────────────────
  const playCX = w / 2;
  const playCY = thumbY + thumbH / 2;
  const playR = 28 + Math.sin(t * 1.2) * 3;

  // Semi-transparent circle behind play icon
  ctx.beginPath();
  ctx.arc(playCX, playCY, playR, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fill();
  ctx.strokeStyle = "rgba(200,170,255,0.5)";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Play triangle
  ctx.beginPath();
  ctx.moveTo(playCX - 8, playCY - 12);
  ctx.lineTo(playCX - 8, playCY + 12);
  ctx.lineTo(playCX + 14, playCY);
  ctx.closePath();
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.fill();

  // ── Title ──────────────────────────────────────────────────────────────
  const titleY = thumbY + thumbH + 28;
  ctx.font = "bold 18px 'Syne', 'Inter', sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.fillText(title || "Upper Vibe Media", w / 2, titleY);

  // ── "NOW SHOWING" badge ────────────────────────────────────────────────
  ctx.font = "bold 11px 'Inter', sans-serif";
  ctx.fillStyle = "rgba(0,229,255,0.7)";
  ctx.fillText("NOW SHOWING", w / 2, thumbY - 16);

  // ── Branding watermark ─────────────────────────────────────────────────
  ctx.font = "12px 'Inter', sans-serif";
  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(255,255,255,0.1)";
  ctx.fillText(BRANDING, w - 24, h - 16);

  // ── Bottom edge accent bar ─────────────────────────────────────────────
  const accentGrad = ctx.createLinearGradient(0, h - 4, w, h - 4);
  accentGrad.addColorStop(0, "transparent");
  accentGrad.addColorStop(0.3, "rgba(155,126,255,0.3)");
  accentGrad.addColorStop(0.5, "rgba(0,229,255,0.4)");
  accentGrad.addColorStop(0.7, "rgba(155,126,255,0.3)");
  accentGrad.addColorStop(1, "transparent");
  ctx.fillStyle = accentGrad;
  ctx.fillRect(0, h - 4, w, 3);
}

function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ═══════════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════════

export default function StageVideoScreen({ videos, currentIndex, onReady }) {
  const canvasRef = useRef(null);
  const startedRef = useRef(false);
  const animRef = useRef(null);
  const idxRef = useRef(currentIndex);
  idxRef.current = currentIndex;
  const videosRef = useRef(videos);
  videosRef.current = videos;
  const imgCacheRef = useRef({});
  const startTimeRef = useRef(0);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;

    if (onReady) onReady(canvas);

    startTimeRef.current = performance.now() * 0.001;

    const animate = () => {
      const t = (performance.now() * 0.001) - startTimeRef.current;
      const videos = videosRef.current;
      const idx = Math.min(idxRef.current, Math.max(0, (videos?.length || 1) - 1));
      const video = videos?.[idx] || null;

      drawFrame(ctx, CANVAS_W, CANVAS_H, video, imgCacheRef.current, t);
      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      startedRef.current = false;
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_W}
      height={CANVAS_H}
      style={{
        position: "fixed",
        left: "-9999px",
        top: 0,
        pointerEvents: "none",
        opacity: 0,
      }}
    />
  );
}