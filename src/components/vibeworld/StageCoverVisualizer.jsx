import React, { useEffect, useRef } from "react";

/**
 * StageCoverVisualizer — stable 16:9 stage screen with:
 *  - NO cover flickering (cover drawn ONCE to cache, never redrawn)
 *  - Equalizer bars animated separately on a clean layer above
 */

const W = 1024;
const H = 576; // 16:9
const BAR_COUNT = 60;

export { W as CANVAS_W, H as CANVAS_H };

const F = [
  0.73, 1.17, 1.63, 2.09, 2.51, 3.07, 3.43,
  0.89, 1.31, 1.79, 2.23, 2.71, 3.19, 3.59,
  0.97, 1.43, 1.91, 2.47, 2.89, 3.37,
];

// ── Offscreen cache for the static cover layer ────────────────────
let coverCacheCanvas = null;
let coverCacheVideoId = null;

function drawCoverCache(video, imgCache) {
  const cached = document.createElement("canvas");
  cached.width = W;
  cached.height = H;
  const ctx = cached.getContext("2d");

  const coverUrl = video?.thumbnail_url
    || (video?.youtube_video_id
      ? `https://img.youtube.com/vi/${video.youtube_video_id}/maxresdefault.jpg`
      : null);

  // Dark cinematic background
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0, "#060612");
  bgGrad.addColorStop(0.4, "#0a0a20");
  bgGrad.addColorStop(0.7, "#0a0a1c");
  bgGrad.addColorStop(1, "#080818");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Blurred backdrop (static alpha)
  if (coverUrl) {
    const cachedImg = imgCache[coverUrl];
    if (cachedImg?.complete && cachedImg.naturalWidth > 0) {
      ctx.save();
      ctx.globalAlpha = 0.15;
      ctx.filter = "blur(24px) brightness(0.3)";
      ctx.drawImage(cachedImg, 0, 0, W, H);
      ctx.filter = "none";
      ctx.restore();
    }
  }

  // Main artwork frame
  const framePadX = 50;
  const framePadY = 90;
  const frameW = W - framePadX * 2;
  const frameH = H - framePadY * 2 + 50;
  const frameX = framePadX;
  const frameY = 40;
  const frameCX = W / 2;

  // Static glow aura behind art
  const glowGrad = ctx.createRadialGradient(frameCX, frameY + frameH / 2, frameH * 0.15, frameCX, frameY + frameH / 2, frameH * 0.7);
  glowGrad.addColorStop(0, "rgba(155,126,255,0.04)");
  glowGrad.addColorStop(0.5, "rgba(0,180,220,0.02)");
  glowGrad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glowGrad;
  ctx.fillRect(frameX - 30, frameY - 30, frameW + 60, frameH + 60);

  // Cover art
  if (coverUrl) {
    const cachedImg = imgCache[coverUrl];
    if (cachedImg?.complete && cachedImg.naturalWidth > 0) {
      ctx.save();
      roundRect(ctx, frameX, frameY, frameW, frameH, 10);
      ctx.clip();
      const imgW = cachedImg.naturalWidth;
      const imgH = cachedImg.naturalHeight;
      const frameRatio = frameW / frameH;
      const imgRatio = imgW / imgH;
      let sx = 0, sy = 0, sw = imgW, sh = imgH;
      if (imgRatio > frameRatio) {
        sw = imgH * frameRatio;
        sx = (imgW - sw) / 2;
      } else {
        sh = imgW / frameRatio;
        sy = (imgH - sh) / 2;
      }
      ctx.drawImage(cachedImg, sx, sy, sw, sh, frameX, frameY, frameW, frameH);
      ctx.restore();
    } else {
      ctx.fillStyle = "#1a1a38";
      roundRect(ctx, frameX, frameY, frameW, frameH, 10);
      ctx.fill();
    }
  } else {
    ctx.fillStyle = "#1a1a38";
    roundRect(ctx, frameX, frameY, frameW, frameH, 10);
    ctx.fill();
  }

  // Static vignette
  const vigGrad = ctx.createRadialGradient(frameCX, frameY + frameH / 2, frameW * 0.32, frameCX, frameY + frameH / 2, frameW * 0.7);
  vigGrad.addColorStop(0, "rgba(0,0,0,0)");
  vigGrad.addColorStop(1, "rgba(0,0,0,0.25)");
  ctx.fillStyle = vigGrad;
  ctx.fillRect(frameX, frameY, frameW, frameH);

  // Neon border
  ctx.strokeStyle = "rgba(155,126,255,0.16)";
  ctx.lineWidth = 2;
  roundRect(ctx, frameX - 2, frameY - 2, frameW + 4, frameH + 4, 12);
  ctx.stroke();
  ctx.strokeStyle = "rgba(0,190,220,0.08)";
  ctx.lineWidth = 1;
  roundRect(ctx, frameX - 10, frameY - 10, frameW + 20, frameH + 20, 16);
  ctx.stroke();

  // Title text
  const badgeY = frameY + frameH + 12;
  ctx.font = "bold 9px 'Inter', sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(0,220,255,0.35)";
  ctx.fillText("NOW SHOWING", frameCX, badgeY);

  const title = video?.title || "";
  if (title) {
    const maxLen = 48;
    const displayTitle = title.length > maxLen ? title.slice(0, maxLen) + "\u2026" : title;
    ctx.font = "bold 14px 'Syne', sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(displayTitle, frameCX, badgeY + 18);
    ctx.font = "9px 'Inter', sans-serif";
    ctx.fillStyle = "rgba(180,160,240,0.45)";
    ctx.fillText("Upper Vibe Media", frameCX, badgeY + 34);
  }

  // Bottom accent line
  const accentY = frameY + frameH + 50;
  const lg = ctx.createLinearGradient(0, accentY, W, accentY);
  lg.addColorStop(0, "transparent");
  lg.addColorStop(0.25, "rgba(155,126,255,0.08)");
  lg.addColorStop(0.5, "rgba(0,220,255,0.12)");
  lg.addColorStop(0.75, "rgba(155,126,255,0.08)");
  lg.addColorStop(1, "transparent");
  ctx.fillStyle = lg;
  ctx.fillRect(0, accentY, W, 2);

  // Watermark
  ctx.font = "8px 'Inter', sans-serif";
  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(255,255,255,0.02)";
  ctx.fillText("UPPER VIBE MEDIA", W - 14, H - 4);

  return cached;
}

function drawEqualizerBars(ctx, t, audioBeat, cachedCover) {
  // Draw cached cover first (fills entire canvas — no clearRect needed, no blank frame)
  if (cachedCover) {
    ctx.drawImage(cachedCover, 0, 0);
  } else {
    // Only clear if no cover — draw dark background
    ctx.fillStyle = "#060612";
    ctx.fillRect(0, 0, W, H);
  }

  const rawBeat = audioBeat > 0.01 ? audioBeat : 0;
  const beat = Math.min(0.35, rawBeat);

  const eqBottom = H - 10;
  const eqH = H * 0.5;
  const barGap = 2;
  const barW = (W - 32) / BAR_COUNT - barGap;
  const barX0 = 16;

  for (let i = 0; i < BAR_COUNT; i++) {
    const ratio = i / (BAR_COUNT - 1);
    const fi = i % F.length;
    const f1 = F[fi];
    const f2 = F[(fi + 7) % F.length];
    const f3 = F[(fi + 13) % F.length];
    const phi = i * 0.173 * Math.PI;

    const w1 = Math.sin(t * f1 + phi) * 0.5 + 0.5;
    const w2 = Math.sin(t * f2 + phi * 3.7) * 0.5 + 0.5;
    const w3 = Math.cos(t * f3 + phi * 7.1) * 0.5 + 0.5;
    const simulated = w1 * 0.4 + w2 * 0.28 + w3 * 0.17;

    const bass = ratio < 0.25 ? Math.pow(1 - ratio / 0.25, 1.8) : 0;
    const mid = ratio >= 0.18 && ratio < 0.65 ? 1 - Math.abs(ratio - 0.4) / 0.28 : 0;
    const treble = ratio >= 0.55 ? Math.pow((ratio - 0.55) / 0.45, 0.6) : 0;
    const zoneBoost = Math.max(0.05, bass * 0.8 + mid * 0.6 + treble * 0.45);

    const audioDriven = beat * zoneBoost * 0.9;
    // Higher baseline when no audio — bars always have visible motion
    const energy = rawBeat > 0.01 ? audioDriven * 0.75 + simulated * 0.25 : simulated * 0.45;
    const finalEnergy = energy * (0.55 + zoneBoost * 0.45);
    const bh = Math.max(3, finalEnergy * eqH);
    const by = eqBottom - bh;
    const bx = barX0 + i * (barW + barGap);

    const r = ratio < 0.3 ? Math.round(155 - ratio * 180) : ratio < 0.65 ? 0 : Math.round(ratio * 180);
    const g = ratio < 0.3 ? Math.round(126 + ratio * 100) : ratio < 0.65 ? Math.round(180 - (ratio - 0.3) * 200) : Math.round(100 + (ratio - 0.65) * 80);
    const b = ratio < 0.3 ? Math.round(255 - ratio * 30) : ratio < 0.65 ? Math.round(230 + (ratio - 0.3) * 50) : Math.round(248 + (ratio - 0.65) * 20);

    const baseAlpha = 0.3 + finalEnergy * 0.35;
    const barGrad = ctx.createLinearGradient(0, by, 0, eqBottom);
    barGrad.addColorStop(0, `rgba(${r},${g},${b},${baseAlpha})`);
    barGrad.addColorStop(0.3, `rgba(${r},${g},${b},${0.08 + finalEnergy * 0.18})`);
    barGrad.addColorStop(1, `rgba(${r},${g},${b},0.01)`);
    ctx.fillStyle = barGrad;
    ctx.fillRect(bx, by, Math.max(2, barW), bh);

    // Soft glow on taller bars
    if (bh > eqH * 0.3) {
      const glowStrength = Math.min(1, (bh / eqH - 0.3) / 0.7);
      ctx.shadowColor = `rgba(${r},${g},${b},${0.12 * glowStrength})`;
      ctx.shadowBlur = 3 + glowStrength * 4;
      ctx.fillStyle = `rgba(${r},${g},${b},${0.02 * glowStrength})`;
      ctx.fillRect(bx - 1, by, Math.max(2, barW) + 2, 2);
      ctx.shadowBlur = 0;
    }
  }
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

  // Preload thumbnail and rebuild cover cache when video changes
  useEffect(() => {
    const id = video?.youtube_video_id || video?.title || null;
    if (id && id !== prevVideoIdRef.current) {
      prevVideoIdRef.current = id;
      coverCacheVideoId = null; // Force cache rebuild
      const url = video?.thumbnail_url
        || (video?.youtube_video_id
          ? `https://img.youtube.com/vi/${video.youtube_video_id}/maxresdefault.jpg`
          : null);
      if (url) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = url;
        img.onload = () => {
          imgCacheRef.current[url] = img;
          coverCacheVideoId = null; // Rebuild with loaded image
        };
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
      const curVideo = videoRef.current || {};
      const curVideoId = curVideo.youtube_video_id || curVideo.title || "";

      // Rebuild cover cache only when video changes
      if (!coverCacheCanvas || coverCacheVideoId !== curVideoId) {
        coverCacheCanvas = drawCoverCache(curVideo, imgCacheRef.current);
        coverCacheVideoId = curVideoId;
      }

      const audioBeat = audioRef.current?.current ?? 0;
      drawEqualizerBars(ctx, t, audioBeat, coverCacheCanvas);

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