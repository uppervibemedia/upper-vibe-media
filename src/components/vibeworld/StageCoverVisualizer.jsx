import React, { useEffect, useRef } from "react";

/**
 * StageCoverVisualizer — large centered cover art with atmospheric motion
 * for the Main Music Stage screen. Reacts to audio intensity when available.
 */

const W = 1024;
const H = 512;

export { W as CANVAS_W, H as CANVAS_H };

// ── Helpers ──────────────────────────────────────────────────────────────

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

// ═════════════════════════════════════════════════════════════════════════
// Single frame draw
// ═════════════════════════════════════════════════════════════════════════

function drawFrame(ctx, video, imgCache, t, audioBeat, dissolve) {
  const coverUrl = video?.thumbnail_url
    || (video?.youtube_video_id
      ? `https://img.youtube.com/vi/${video.youtube_video_id}/hqdefault.jpg`
      : null);
  const title = video?.title || "Upper Vibe Media";

  // Audio-reactive or simulated beat (0.1 → 0.7)
  const beat = audioBeat > 0.01
    ? 0.1 + audioBeat * 0.65
    : 0.12 + Math.sin(t * 2.3) * 0.06 + Math.sin(t * 3.5) * 0.04;

  // ── Background — dark gradient ──────────────────────────────────────────
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#060618");
  bg.addColorStop(0.5, "#0c0c28");
  bg.addColorStop(1, "#080820");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // ── Subtle blurred cover backdrop ───────────────────────────────────────
  if (coverUrl) {
    const cached = imgCache[coverUrl];
    if (cached?.complete && cached.naturalWidth > 0) {
      ctx.save();
      ctx.globalAlpha = 0.12 + beat * 0.06;
      ctx.filter = "blur(20px) brightness(0.5)";
      // Draw large behind center
      const bw = W * 0.9, bh = H * 0.9, bx = (W - bw) / 2, by = (H - bh) / 2;
      ctx.drawImage(cached, bx, by, bw, bh);
      ctx.filter = "none";
      ctx.restore();
    }
  }

  // ── Cover art size (65% of canvas height) ──────────────────────────────
  const coverH = Math.round(H * 0.65);
  const coverW = coverH; // square
  const coverCX = W / 2;
  const coverCY = H * 0.37;
  const coverX = coverCX - coverW / 2;
  const coverY = coverCY - coverH / 2;

  // Smooth zoom pulse (1.0 → 1.04)
  const zoom = 1 + Math.sin(t * 0.55) * 0.015 + beat * 0.025;
  const zw = coverW * zoom;
  const zh = coverH * zoom;
  const zx = coverCX - zw / 2;
  const zy = coverCY - zh / 2;

  // ── Particles behind cover ─────────────────────────────────────────────
  const ptCount = 40;
  for (let i = 0; i < ptCount; i++) {
    const a = (i / ptCount) * Math.PI * 2 + t * 0.2;
    const r = coverH * 0.58 + Math.sin(t * 1.2 + i * 0.5) * 30;
    const px = coverCX + Math.cos(a) * r;
    const py = coverCY + Math.sin(a) * r * 0.7;
    const ps = 1.5 + Math.sin(t * 2.4 + i) * 1;
    const hue = i % 3 === 0 ? "155,126,255" : "0,200,220";
    const pa = (0.12 + beat * 0.18 + Math.sin(t * 1.3 + i * 0.6) * 0.06) * dissolve;
    ctx.beginPath();
    ctx.arc(px, py, ps, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${hue},${pa})`;
    ctx.fill();
  }

  // ── Outer glow aura ────────────────────────────────────────────────────
  const auraR = coverH * 0.72;
  const auraGrad = ctx.createRadialGradient(coverCX, coverCY, coverH * 0.28, coverCX, coverCY, auraR);
  auraGrad.addColorStop(0, `rgba(155,126,255,${(0.08 + beat * 0.22) * dissolve})`);
  auraGrad.addColorStop(0.4, `rgba(0,200,220,${(0.04 + beat * 0.12) * dissolve})`);
  auraGrad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = auraGrad;
  ctx.fillRect(zx - 60, zy - 60, zw + 120, zh + 120);

  // ── Cover image ────────────────────────────────────────────────────────
  if (coverUrl) {
    const cached = imgCache[coverUrl];
    if (cached?.complete && cached.naturalWidth > 0) {
      ctx.save();
      roundedRect(ctx, zx - 3, zy - 3, zw + 6, zh + 6, 14);
      ctx.clip();
      ctx.drawImage(cached, zx, zy, zw, zh);
      ctx.restore();
    } else {
      if (!cached) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = coverUrl;
        imgCache[coverUrl] = img;
      }
      // Placeholder while loading
      ctx.fillStyle = "#1A1A3A";
      roundedRect(ctx, zx, zy, zw, zh, 12);
      ctx.fill();
      ctx.fillStyle = "rgba(200,180,255,0.15)";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `${coverH * 0.2}px sans-serif`;
      ctx.fillText("♫", coverCX, coverCY);
    }
  } else {
    ctx.fillStyle = "#1A1A3A";
    roundedRect(ctx, zx, zy, zw, zh, 12);
    ctx.fill();
    ctx.fillStyle = "rgba(200,180,255,0.15)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `${coverH * 0.2}px sans-serif`;
    ctx.fillText("♫", coverCX, coverCY);
  }

  // ── Neon frame ─────────────────────────────────────────────────────────
  ctx.save();
  ctx.globalAlpha = dissolve;
  ctx.strokeStyle = `rgba(155,126,255,${0.35 + beat * 0.4})`;
  ctx.lineWidth = 2.5;
  roundedRect(ctx, zx - 4, zy - 4, zw + 8, zh + 8, 14);
  ctx.stroke();
  ctx.strokeStyle = `rgba(0,200,220,${0.2 + beat * 0.3})`;
  ctx.lineWidth = 1;
  roundedRect(ctx, zx - 12, zy - 12, zw + 24, zh + 24, 20);
  ctx.stroke();
  ctx.restore();

  // ── "NOW PLAYING" badge ────────────────────────────────────────────────
  const badgeY = zy + zh + 18;
  ctx.save();
  ctx.globalAlpha = dissolve;
  ctx.font = "bold 10px 'Inter', sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(0,229,255,0.6)";
  ctx.fillText("NOW PLAYING", coverCX, badgeY);
  ctx.restore();

  // ── Title ──────────────────────────────────────────────────────────────
  const titleY = badgeY + 20;
  ctx.save();
  ctx.globalAlpha = dissolve;
  const maxLen = 36;
  const displayTitle = title.length > maxLen ? title.slice(0, maxLen) + "…" : title;
  ctx.font = "bold 18px 'Syne', sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = "#FFFFFF";
  ctx.fillText(displayTitle, coverCX, titleY);
  ctx.restore();

  // ── Artist / brand line ────────────────────────────────────────────────
  const artistY = titleY + 18;
  ctx.save();
  ctx.globalAlpha = dissolve * 0.7;
  ctx.font = "13px 'Inter', sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(200,180,255,0.7)";
  ctx.fillText("Upper Vibe Media", coverCX, artistY);
  ctx.restore();

  // ── Equalizer at bottom ────────────────────────────────────────────────
  const eqY = artistY + 32;
  const eqH = H - eqY - 14;
  if (eqH > 10) {
    const barCount = 48;
    const barW = (W - 40) / barCount - 2;
    const barX0 = 20;

    for (let i = 0; i < barCount; i++) {
      const freq = Math.sin(t * 3.8 + i * 0.28) * 0.5 + 0.5;
      const bh = Math.max(3, (freq * 0.5 + beat * 0.5) * eqH);

      const bx = barX0 + i * (barW + 2);
      const by = eqY + eqH - bh;

      const ratio = i / (barCount - 1);
      const r = Math.round(155 - ratio * 155);
      const g = Math.round(126 + ratio * 94);
      const b = Math.round(255 - ratio * 35);
      const ba = 0.3 + freq * 0.5;

      const barGrad = ctx.createLinearGradient(0, by, 0, eqY + eqH);
      barGrad.addColorStop(0, `rgba(${r},${g},${b},${ba})`);
      barGrad.addColorStop(1, `rgba(${r},${g},${b},0.06)`);

      ctx.fillStyle = barGrad;
      ctx.fillRect(bx, by, barW, bh);
    }
  }

  // ── Bottom accent line ─────────────────────────────────────────────────
  const lineY = eqY + eqH + 4;
  if (lineY < H) {
    const lg = ctx.createLinearGradient(0, lineY, W, lineY);
    lg.addColorStop(0, "transparent");
    lg.addColorStop(0.3, "rgba(155,126,255,0.25)");
    lg.addColorStop(0.5, "rgba(0,229,255,0.35)");
    lg.addColorStop(0.7, "rgba(155,126,255,0.25)");
    lg.addColorStop(1, "transparent");
    ctx.fillStyle = lg;
    ctx.fillRect(0, lineY, W, 2);
  }

  // ── Light ray sweeps ───────────────────────────────────────────────────
  for (let i = 0; i < 3; i++) {
    const rayAngle = t * 0.15 + (i * Math.PI * 2) / 3;
    const rayGrad = ctx.createLinearGradient(
      coverCX, coverCY,
      coverCX + Math.cos(rayAngle) * coverH,
      coverCY + Math.sin(rayAngle) * coverH,
    );
    rayGrad.addColorStop(0, `rgba(155,126,255,${0.03 + beat * 0.05})`);
    rayGrad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = rayGrad;
    ctx.fillRect(0, 0, W, H);
  }

  // ── Brand watermark ────────────────────────────────────────────────────
  ctx.font = "10px 'Inter', sans-serif";
  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  ctx.fillText("UPPER VIBE MEDIA", W - 18, H - 8);
}

// ═════════════════════════════════════════════════════════════════════════
// Component
// ═════════════════════════════════════════════════════════════════════════

export default function StageCoverVisualizer({ onReady, video, audioIntensityRef }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const imgCacheRef = useRef({});
  const startTimeRef = useRef(0);

  // Dissolve: 0→1 over ~1s on video change, stays at 1 otherwise
  const dissolveRef = useRef(1);
  const dissolveTargetRef = useRef(1);
  const dissolveStartRef = useRef(0);
  const prevVideoIdRef = useRef(null);

  // Live refs
  const videoRef = useRef(video);
  videoRef.current = video;
  const audioRef = useRef(audioIntensityRef);
  audioRef.current = audioIntensityRef;

  // Trigger dissolve on video change
  useEffect(() => {
    const newId = video?.youtube_video_id || video?.title || null;
    if (newId && prevVideoIdRef.current && newId !== prevVideoIdRef.current) {
      dissolveTargetRef.current = 0;
      dissolveStartRef.current = performance.now();
    }
    prevVideoIdRef.current = newId;
  }, [video?.youtube_video_id, video?.title]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = W;
    canvas.height = H;
    if (onReady) onReady(canvas);
    startTimeRef.current = performance.now() * 0.001;

    const animate = () => {
      const now = performance.now();
      const t = now * 0.001 - startTimeRef.current;

      // Smooth dissolve (0 → 1 over 600ms)
      if (dissolveRef.current < 1) {
        const elapsed = (now - dissolveStartRef.current) / 600;
        dissolveRef.current = Math.min(1, dissolveRef.current + (1 - dissolveRef.current) * 0.15); // ease out
        if (elapsed > 0.55) dissolveRef.current = Math.min(1, dissolveRef.current + 0.06);
        if (dissolveRef.current >= 0.999) dissolveRef.current = 1;
      }

      const audioBeat = audioRef.current?.current ?? 0;

      drawFrame(ctx, videoRef.current || {}, imgCacheRef.current, t, audioBeat, dissolveRef.current);
      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [onReady]);

  return (
    <canvas
      ref={canvasRef}
      width={W}
      height={H}
      style={{ position: "fixed", left: "-9999px", top: 0, pointerEvents: "none", opacity: 0 }}
    />
  );
}