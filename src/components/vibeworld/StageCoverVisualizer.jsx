import React, { useEffect, useRef } from "react";

/**
 * StageCoverVisualizer — 16:9 stage screen with:
 *  - Blurred cover art backdrop (never stretched)
 *  - Centered cover art in 16:9 frame
 *  - Song title + "NOW SHOWING" badge
 *  - Tall audio-reactive equalizer bars spanning most of the screen
 *  - Renders to offscreen canvas for Three.js texture
 */

const W = 1024;
const H = 576; // 16:9

export { W as CANVAS_W, H as CANVAS_H };

function drawFrame(ctx, video, imgCache, t, audioBeat) {
  const coverUrl = video?.thumbnail_url
    || (video?.youtube_video_id
      ? `https://img.youtube.com/vi/${video.youtube_video_id}/maxresdefault.jpg`
      : null);
  const title = video?.title || "";

  // ── Audio-reactive beat ──────────────────────────────────────────────────
  const beat = audioBeat > 0.01
    ? 0.08 + audioBeat * 0.55
    : 0.08 + Math.sin(t * 2.2) * 0.04 + Math.sin(t * 3.5) * 0.03;

  // ── Dark cinematic gradient background ───────────────────────────────────
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0, "#060612");
  bgGrad.addColorStop(0.4, "#0a0a20");
  bgGrad.addColorStop(0.7, "#0a0a1c");
  bgGrad.addColorStop(1, "#080818");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // ── Blurred backdrop from cover art ──────────────────────────────────────
  if (coverUrl) {
    const cached = imgCache[coverUrl];
    if (cached?.complete && cached.naturalWidth > 0) {
      ctx.save();
      ctx.globalAlpha = 0.15 + beat * 0.06;
      ctx.filter = "blur(36px) brightness(0.35)";
      ctx.drawImage(cached, 0, 0, W, H);
      ctx.filter = "none";
      ctx.restore();
    } else if (!cached) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = coverUrl;
      imgCache[coverUrl] = img;
    }
  }

  // ── Center glow ──────────────────────────────────────────────────────────
  const glowGrad = ctx.createRadialGradient(W / 2, H * 0.4, H * 0.04, W / 2, H * 0.55, H * 0.75);
  glowGrad.addColorStop(0, `rgba(155,126,255,${0.04 + beat * 0.1})`);
  glowGrad.addColorStop(0.5, `rgba(0,180,220,${0.02 + beat * 0.06})`);
  glowGrad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glowGrad;
  ctx.fillRect(0, 0, W, H);

  // ── Cover art in a small centered frame at top ──────────────────────────
  const artSize = 140;
  const artX = (W - artSize) / 2;
  const artY = 30;

  if (coverUrl) {
    const cached = imgCache[coverUrl];
    if (cached?.complete && cached.naturalWidth > 0) {
      // Rounded rect clip
      roundRect(ctx, artX, artY, artSize, artSize, 10);
      ctx.save();
      ctx.clip();
      ctx.drawImage(cached, artX, artY, artSize, artSize);
      ctx.restore();

      // Neon border around art
      ctx.strokeStyle = `rgba(155,126,255,${0.2 + beat * 0.3})`;
      ctx.lineWidth = 2;
      roundRect(ctx, artX, artY, artSize, artSize, 10);
      ctx.stroke();
    } else {
      // Placeholder square
      ctx.fillStyle = "#1a1a38";
      roundRect(ctx, artX, artY, artSize, artSize, 10);
      ctx.fill();
    }
  } else {
    ctx.fillStyle = "#1a1a38";
    roundRect(ctx, artX, artY, artSize, artSize, 10);
    ctx.fill();
    ctx.fillStyle = "rgba(180,160,255,0.12)";
    ctx.font = "32px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("♫", artX + artSize / 2, artY + artSize / 2);
  }

  // ── "NOW SHOWING" badge above title ─────────────────────────────────────
  ctx.font = "bold 9px 'Inter', sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = `rgba(0,220,255,${0.35 + beat * 0.3})`;
  ctx.fillText("NOW SHOWING", W / 2, artY + artSize + 24);

  // ── Song title ──────────────────────────────────────────────────────────
  if (title) {
    const maxLen = 48;
    const displayTitle = title.length > maxLen ? title.slice(0, maxLen) + "…" : title;
    ctx.font = "bold 14px 'Syne', sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(displayTitle, W / 2, artY + artSize + 44);

    ctx.font = "9px 'Inter', sans-serif";
    ctx.fillStyle = "rgba(180,160,240,0.5)";
    ctx.fillText("Upper Vibe Media", W / 2, artY + artSize + 60);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // AUDIO EQUALIZER BARS — big, spanning most of the lower screen
  // ═══════════════════════════════════════════════════════════════════════════
  const eqTop = artY + artSize + 80;
  const eqBottom = H - 16;
  const eqH = eqBottom - eqTop;
  const barCount = 64;
  const barGap = 2;
  const barW = (W - 32) / barCount - barGap;
  const barX0 = 16;

  for (let i = 0; i < barCount; i++) {
    const ratio = i / (barCount - 1);

    // Frequency zones
    const bass = ratio < 0.22 ? Math.pow(1 - ratio / 0.22, 1.5) : 0;
    const mid = ratio >= 0.15 && ratio < 0.70
      ? 1 - Math.abs(ratio - 0.4) / 0.3
      : 0;
    const treble = ratio >= 0.60
      ? Math.pow((ratio - 0.6) / 0.4, 0.7)
      : 0;
    const zoneBoost = Math.max(0, bass * 0.85 + mid * 0.65 + treble * 0.5);

    // Wave oscillation
    const wave1 = Math.sin(t * 3.0 + i * 0.16) * 0.5 + 0.5;
    const wave2 = Math.sin(t * 5.5 + i * 0.28) * 0.5 + 0.5;

    const audioDriven = beat * (0.5 + zoneBoost * 0.5);
    const simulated = wave1 * 0.22 + wave2 * 0.12;
    const energy = audioBeat > 0.02
      ? audioDriven * 0.78 + simulated * 0.22
      : simulated * 0.4;

    const bh = Math.max(4, energy * eqH);
    const bx = barX0 + i * (barW + barGap);
    const by = eqBottom - bh;

    const r = Math.round(ratio < 0.5 ? 155 - ratio * 155 : 0);
    const g = Math.round(ratio < 0.5 ? 126 + ratio * 64 : 190 - (ratio - 0.5) * 190);
    const b2 = Math.round(ratio < 0.5 ? 255 - ratio * 35 : 220 + (ratio - 0.5) * 35);
    const ba = 0.35 + energy * 0.4;

    const barGrad = ctx.createLinearGradient(0, by, 0, eqBottom);
    barGrad.addColorStop(0, `rgba(${r},${g},${b2},${ba})`);
    barGrad.addColorStop(0.4, `rgba(${r},${g},${b2},${0.1 + energy * 0.18})`);
    barGrad.addColorStop(1, `rgba(${r},${g},${b2},0.02)`);

    ctx.fillStyle = barGrad;
    ctx.fillRect(bx, by, Math.max(2, barW), bh);
  }

  // ── Bottom accent line ─────────────────────────────────────────────────────
  const accentY = eqBottom + 4;
  const lg = ctx.createLinearGradient(0, accentY, W, accentY);
  lg.addColorStop(0, "transparent");
  lg.addColorStop(0.25, `rgba(155,126,255,${0.1 + beat * 0.12})`);
  lg.addColorStop(0.5, `rgba(0,220,255,${0.15 + beat * 0.15})`);
  lg.addColorStop(0.75, `rgba(155,126,255,${0.1 + beat * 0.12})`);
  lg.addColorStop(1, "transparent");
  ctx.fillStyle = lg;
  ctx.fillRect(0, accentY, W, 2);

  // ── Watermark ──────────────────────────────────────────────────────────────
  ctx.font = "8px 'Inter', sans-serif";
  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(255,255,255,0.03)";
  ctx.fillText("UPPER VIBE MEDIA", W - 14, H - 4);
}

function roundRect(ctx, x, y, w, h, r) {
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

export default function StageCoverVisualizer({ onReady, video, audioIntensityRef }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const imgCacheRef = useRef({});
  const startTimeRef = useRef(0);
  const prevVideoIdRef = useRef(null);
  const onReadyCalledRef = useRef(false);
  const audioRef = useRef(audioIntensityRef);
  audioRef.current = audioIntensityRef;
  const videoRef = useRef(video);
  videoRef.current = video;

  // Preload next thumbnail
  useEffect(() => {
    const id = video?.youtube_video_id || video?.title || null;
    if (id && id !== prevVideoIdRef.current) {
      prevVideoIdRef.current = id;
      const url = video?.thumbnail_url
        || (video?.youtube_video_id
          ? `https://img.youtube.com/vi/${video.youtube_video_id}/maxresdefault.jpg`
          : null);
      if (url && !imgCacheRef.current[url]) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = url;
        imgCacheRef.current[url] = img;
      }
    }
  }, [video?.youtube_video_id, video?.title, video?.thumbnail_url]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = W;
    canvas.height = H;

    if (onReady && !onReadyCalledRef.current) {
      onReadyCalledRef.current = true;
      onReady(canvas);
    }

    startTimeRef.current = performance.now() * 0.001;

    const animate = () => {
      const t = performance.now() * 0.001 - startTimeRef.current;
      const audioBeat = audioRef.current?.current ?? 0;
      drawFrame(ctx, videoRef.current || {}, imgCacheRef.current, t, audioBeat);
      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
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