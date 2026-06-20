import React, { useEffect, useRef } from "react";

/**
 * StageCoverVisualizer — animated looping song cover art for the 3D stage screen.
 *
 * Draws:
 *  - Zooming/pulsing cover art
 *  - Neon purple/cyan frame
 *  - Glow pulse (synced to audio intensity if available)
 *  - Light ray particles behind cover
 *  - Equalizer waveform bars
 *  - Song title + artist name
 *  - "NOW SHOWING" badge
 */

const CANVAS_W = 1024;
const CANVAS_H = 512;

export { CANVAS_W, CANVAS_H };

// ═══════════════════════════════════════════════════════════════════════════
// Rounded rect helper
// ═══════════════════════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════════════════════
// Placeholder cover (no image available)
// ═══════════════════════════════════════════════════════════════════════════
function drawPlaceholderCover(ctx, x, y, size) {
  ctx.fillStyle = "#1A1A3A";
  roundedRect(ctx, x, y, size, size, 12);
  ctx.fill();

  // Music note
  ctx.fillStyle = "rgba(200,180,255,0.18)";
  ctx.font = `${size * 0.35}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("♫", x + size / 2, y + size / 2);
}

// ═══════════════════════════════════════════════════════════════════════════
// Single frame render
// ═══════════════════════════════════════════════════════════════════════════
function drawFrame(ctx, w, h, track, imgCache, t, audioBeat) {
  // ── Background ──────────────────────────────────────────────────────────
  const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
  bgGrad.addColorStop(0, "#06061a");
  bgGrad.addColorStop(0.5, "#0e0e28");
  bgGrad.addColorStop(1, "#080818");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  const coverUrl = track?.cover_url || null;
  const title = track?.title || "Upper Vibe Media";
  const artist = track?.artist_display || track?.artist || "";

  // Beat pulse (0.15 - 0.7 range) — audio-driven or simulated
  const beat = Math.max(0.12, audioBeat || (0.15 + Math.sin(t * 2.5) * 0.08));

  // ── Cover dimensions (left side) ────────────────────────────────────────
  const coverSize = 280;
  const coverCX = w / 4;
  const coverCY = h / 2;
  const coverX = coverCX - coverSize / 2;
  const coverY = coverCY - coverSize / 2;

  // Zoom animation
  const zoom = 1 + Math.sin(t * 0.7) * 0.04 + beat * 0.03;
  const zs = coverSize * zoom;
  const zx = coverX - (zs - coverSize) / 2;
  const zy = coverY - (zs - coverSize) / 2;

  // ── Light ray particles behind cover ────────────────────────────────────
  const rayCount = 16;
  for (let i = 0; i < rayCount; i++) {
    const angle = (i / rayCount) * Math.PI * 2 + t * 0.3;
    const dist = coverSize * 0.55 + Math.sin(t * 1.4 + i * 0.7) * 30;
    const rx = coverCX + Math.cos(angle) * dist;
    const ry = coverCY + Math.sin(angle) * dist;
    const particleSize = 2 + Math.sin(t * 2 + i) * 1.5;

    const alpha = 0.15 + beat * 0.2 + Math.sin(t * 1.5 + i) * 0.08;
    const hue = i % 3 === 0 ? "155,126,255" : "0,200,220";

    ctx.beginPath();
    ctx.arc(rx, ry, particleSize, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${hue},${alpha})`;
    ctx.fill();
  }

  // ── Glow behind cover ───────────────────────────────────────────────────
  const glowAlpha = 0.12 + beat * 0.28;
  const glowGrad = ctx.createRadialGradient(
    coverCX, coverCY, coverSize * 0.3,
    coverCX, coverCY, coverSize * 0.8,
  );
  glowGrad.addColorStop(0, `rgba(155,126,255,${glowAlpha})`);
  glowGrad.addColorStop(0.5, `rgba(0,200,220,${glowAlpha * 0.4})`);
  glowGrad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glowGrad;
  ctx.fillRect(coverX - 100, coverY - 100, coverSize + 200, coverSize + 200);

  // ── Cover image ─────────────────────────────────────────────────────────
  if (coverUrl) {
    const cached = imgCache[coverUrl];
    if (cached && cached.complete && cached.naturalWidth > 0) {
      ctx.save();
      roundedRect(ctx, zx, zy, zs, zs, 12);
      ctx.clip();
      ctx.drawImage(cached, zx, zy, zs, zs);
      ctx.restore();
    } else if (!cached) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = coverUrl;
      imgCache[coverUrl] = img;
      drawPlaceholderCover(ctx, zx, zy, zs);
    } else {
      drawPlaceholderCover(ctx, zx, zy, zs);
    }
  } else {
    drawPlaceholderCover(ctx, zx, zy, zs);
  }

  // ── Neon frame (inner) ──────────────────────────────────────────────────
  ctx.strokeStyle = `rgba(155,126,255,${0.45 + beat * 0.4})`;
  ctx.lineWidth = 3;
  roundedRect(ctx, zx - 2, zy - 2, zs + 4, zs + 4, 14);
  ctx.stroke();

  // ── Outer glow ring ─────────────────────────────────────────────────────
  ctx.strokeStyle = `rgba(0,200,220,${0.25 + beat * 0.35})`;
  ctx.lineWidth = 1.5;
  roundedRect(ctx, zx - 8, zy - 8, zs + 16, zs + 16, 18);
  ctx.stroke();

  // ── Info text (right side) ──────────────────────────────────────────────
  const textX = w / 2 + 30;

  // "NOW SHOWING" badge
  ctx.font = "bold 13px 'Inter', sans-serif";
  ctx.textAlign = "left";
  ctx.fillStyle = "#00E5FF";
  ctx.fillText("NOW SHOWING", textX, h / 2 - 55);

  // Song title (truncate if too long)
  const maxTitleLen = 28;
  const displayTitle = title.length > maxTitleLen ? title.slice(0, maxTitleLen) + "…" : title;
  ctx.font = "bold 22px 'Syne', sans-serif";
  ctx.fillStyle = "#FFFFFF";
  ctx.fillText(displayTitle, textX, h / 2 - 15);

  // Artist name
  if (artist) {
    ctx.font = "15px 'Inter', sans-serif";
    ctx.fillStyle = "rgba(200,180,255,0.8)";
    ctx.fillText(artist, textX, h / 2 + 15);
  }

  // ── Equalizer / waveform bars ───────────────────────────────────────────
  const barCount = 24;
  const barAreaX = textX;
  const barAreaY = h / 2 + 50;
  const barMaxHeight = 35;
  const barTotalW = 280;
  const barGap = 3;
  const barW = (barTotalW - barGap * (barCount - 1)) / barCount;

  for (let i = 0; i < barCount; i++) {
    // Simulated frequency per bar position + beat
    const freq = Math.sin(t * 3.5 + i * 0.35) * 0.5 + 0.5;
    const barH = (freq * 0.65 + beat * 0.35) * barMaxHeight;

    const bx = barAreaX + i * (barW + barGap);
    const by = barAreaY - barH;

    // Gradient from purple (left) to cyan (right)
    const ratio = i / (barCount - 1);
    const r = Math.round(155 - ratio * 155);
    const g = Math.round(126 + ratio * 74);
    const b = Math.round(255 - ratio * 35);
    const barAlpha = 0.45 + freq * 0.45;

    const barGrad = ctx.createLinearGradient(0, by, 0, barAreaY);
    barGrad.addColorStop(0, `rgba(${r},${g},${b},${barAlpha})`);
    barGrad.addColorStop(1, `rgba(${r},${g},${b},0.1)`);

    ctx.fillStyle = barGrad;
    roundedRect(ctx, bx, Math.max(by, barAreaY - barMaxHeight), barW, Math.max(2, barH), 2);
    ctx.fill();
  }

  // ── "FEATURED" label strip ──────────────────────────────────────────────
  ctx.font = "bold 10px 'Inter', sans-serif";
  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(255,255,255,0.2)";
  ctx.fillText("FEATURED VIDEO", textX, barAreaY + 24);

  // ── Bottom accent bar ───────────────────────────────────────────────────
  const accentGrad = ctx.createLinearGradient(0, h - 4, w, h - 4);
  accentGrad.addColorStop(0, "transparent");
  accentGrad.addColorStop(0.3, "rgba(155,126,255,0.3)");
  accentGrad.addColorStop(0.5, "rgba(0,229,255,0.4)");
  accentGrad.addColorStop(0.7, "rgba(155,126,255,0.3)");
  accentGrad.addColorStop(1, "transparent");
  ctx.fillStyle = accentGrad;
  ctx.fillRect(0, h - 4, w, 3);

  // ── Branding watermark ──────────────────────────────────────────────────
  ctx.font = "11px 'Inter', sans-serif";
  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fillText("UPPER VIBE MEDIA", w - 20, h - 14);
}

// ═══════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════

export default function StageCoverVisualizer({ onReady, currentTrack, audioIntensityRef }) {
  const canvasRef = useRef(null);
  const startedRef = useRef(false);
  const animRef = useRef(null);
  const imgCacheRef = useRef({});
  const startTimeRef = useRef(0);

  // Live refs so animation loop reads latest prop values
  const trackRef = useRef(currentTrack);
  trackRef.current = currentTrack;
  const audioRef = useRef(audioIntensityRef);
  audioRef.current = audioIntensityRef;

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
      const track = trackRef.current || {};
      const audioBeat = audioRef.current?.current ?? 0;

      drawFrame(ctx, CANVAS_W, CANVAS_H, track, imgCacheRef.current, t, audioBeat);
      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      startedRef.current = false;
    };
  }, [onReady]);

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