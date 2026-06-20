import React, { useEffect, useRef } from "react";

/**
 * StageCoverVisualizer — stable 16:9 stage screen with:
 *  - No flashing, no flickering, no rapid brightness changes
 *  - Subtle blurred backdrop (mostly static)
 *  - Sharp centered artwork filling most of the screen
 *  - Slow neon glow aura (gentle pulse only)
 *  - Tall audio-reactive equalizer bars as the main dynamic element
 *  - Organic bar movement — varied heights, natural feel
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

  // ── Stable audio-reactive beat (clamped, no wild swings) ──────────────
  const rawBeat = audioBeat > 0.01 ? audioBeat : 0;
  // Smooth the beat — cap at 0.35 to prevent flashes
  const beat = Math.min(0.35, rawBeat);

  // ── Static dark cinematic background ───────────────────────────────────
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0, "#060612");
  bgGrad.addColorStop(0.4, "#0a0a20");
  bgGrad.addColorStop(0.7, "#0a0a1c");
  bgGrad.addColorStop(1, "#080818");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // ── Subtle blurred backdrop (low alpha, almost static) ─────────────────
  if (coverUrl) {
    const cached = imgCache[coverUrl];
    if (cached?.complete && cached.naturalWidth > 0) {
      // Very subtle pulse — alpha stays between 0.14-0.18
      const alpha = 0.15 + Math.sin(t * 0.5) * 0.02;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.filter = "blur(24px) brightness(0.3)";
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

  // ── Main artwork frame — fills the center area ────────────────────────
  const framePadX = 50;
  const framePadY = 90;
  const frameW = W - framePadX * 2;
  const frameH = H - framePadY * 2 + 50;
  const frameX = framePadX;
  const frameY = 40;
  const frameCX = W / 2;
  const frameCY = frameY + frameH / 2;

  // ── Soft, slow glow aura behind art ───────────────────────────────────
  const auraPulse = 1 + Math.sin(t * 0.6) * 0.08; // very slow, tiny variation
  const glowGrad = ctx.createRadialGradient(frameCX, frameCY, frameH * 0.15, frameCX, frameCY, frameH * 0.7);
  glowGrad.addColorStop(0, `rgba(155,126,255,${0.04 * auraPulse})`);
  glowGrad.addColorStop(0.5, `rgba(0,180,220,${0.02})`);
  glowGrad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glowGrad;
  ctx.fillRect(frameX - 30, frameY - 30, frameW + 60, frameH + 60);

  // ── Cover art — drawn once, no brightness animation ────────────────────
  if (coverUrl) {
    const cached = imgCache[coverUrl];
    if (cached?.complete && cached.naturalWidth > 0) {
      const imgW = cached.naturalWidth;
      const imgH = cached.naturalHeight;
      const frameRatio = frameW / frameH;

      ctx.save();
      roundRect(ctx, frameX, frameY, frameW, frameH, 10);
      ctx.clip();

      const imgRatio = imgW / imgH;
      let sx = 0, sy = 0, sw = imgW, sh = imgH;
      if (imgRatio > frameRatio) {
        sw = imgH * frameRatio;
        sx = (imgW - sw) / 2;
      } else {
        sh = imgW / frameRatio;
        sy = (imgH - sh) / 2;
      }
      ctx.drawImage(cached, sx, sy, sw, sh, frameX, frameY, frameW, frameH);
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
    ctx.fillStyle = "rgba(180,160,255,0.08)";
    ctx.font = "48px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("\u266B", frameCX, frameCY);
  }

  // ── Static vignette over art ──────────────────────────────────────────
  const vigGrad = ctx.createRadialGradient(frameCX, frameCY, frameW * 0.32, frameCX, frameCY, frameW * 0.7);
  vigGrad.addColorStop(0, "rgba(0,0,0,0)");
  vigGrad.addColorStop(1, "rgba(0,0,0,0.25)");
  ctx.fillStyle = vigGrad;
  ctx.fillRect(frameX, frameY, frameW, frameH);

  // ── Neon border — subtle, slow pulse only ─────────────────────────────
  const borderPulse = 1 + Math.sin(t * 0.7) * 0.06;
  ctx.strokeStyle = `rgba(155,126,255,${0.16 * borderPulse})`;
  ctx.lineWidth = 2;
  roundRect(ctx, frameX - 2, frameY - 2, frameW + 4, frameH + 4, 12);
  ctx.stroke();

  ctx.strokeStyle = `rgba(0,190,220,${0.08})`;
  ctx.lineWidth = 1;
  roundRect(ctx, frameX - 10, frameY - 10, frameW + 20, frameH + 20, 16);
  ctx.stroke();

  // ── "NOW SHOWING" badge — stable text ─────────────────────────────────
  const badgeY = frameY + frameH + 12;
  ctx.font = "bold 9px 'Inter', sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(0,220,255,0.35)";
  ctx.fillText("NOW SHOWING", frameCX, badgeY);

  // ── Song title — stable text ──────────────────────────────────────────
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

  // ════════════════════════════════════════════════════════════════════════
  // EQUALIZER BARS — main dynamic element, tall, varied, smooth
  // ════════════════════════════════════════════════════════════════════════
  const eqBottom = H - 10;
  const eqH = H * 0.5;
  const barCount = 60;
  const barGap = 2;
  const barW = (W - 32) / barCount - barGap;
  const barX0 = 16;

  for (let i = 0; i < barCount; i++) {
    const ratio = i / (barCount - 1);

    // Per-bar unique timing offset — each bar has its own rhythm
    const barPhase = i * 0.13;
    const barFrequency = 2.0 + (i % 7) * 0.35; // different speeds per bar

    // Frequency zones for realistic EQ shape
    const bass = ratio < 0.25 ? Math.pow(1 - ratio / 0.25, 1.8) : 0;
    const mid = ratio >= 0.18 && ratio < 0.65
      ? 1 - Math.abs(ratio - 0.4) / 0.28
      : 0;
    const treble = ratio >= 0.55
      ? Math.pow((ratio - 0.55) / 0.45, 0.6)
      : 0;
    const zoneBoost = Math.max(0.05, bass * 0.8 + mid * 0.6 + treble * 0.45);

    // Natural wave oscillation — multiple sine waves at different speeds
    const w1 = Math.sin(t * barFrequency + barPhase) * 0.5 + 0.5;
    const w2 = Math.sin(t * 1.8 + barPhase * 1.7) * 0.5 + 0.5;
    const w3 = Math.cos(t * 2.7 + barPhase * 2.3) * 0.5 + 0.5;

    // Combine real audio with simulated waves
    const simulated = w1 * 0.3 + w2 * 0.18 + w3 * 0.12;
    const audioDriven = beat * zoneBoost * 0.9;

    // When audio is playing, blend real audio with simulated waves
    // When silent, bars are nearly static (0.04 multiplier eliminates flicker)
    const energy = rawBeat > 0.01
      ? audioDriven * 0.75 + simulated * 0.25
      : simulated * 0.04;

    // Some bars naturally taller via zone boost
    const finalEnergy = energy * (0.55 + zoneBoost * 0.45);

    const bh = Math.max(3, finalEnergy * eqH);
    const by = eqBottom - bh;
    const bx = barX0 + i * (barW + barGap);

    // Color gradient: purple → cyan → blue → magenta
    const r = ratio < 0.3
      ? Math.round(155 - ratio * 180)
      : ratio < 0.65 ? 0 : Math.round(ratio * 180);
    const g = ratio < 0.3
      ? Math.round(126 + ratio * 100)
      : ratio < 0.65 ? Math.round(180 - (ratio - 0.3) * 200) : Math.round(100 + (ratio - 0.65) * 80);
    const b = ratio < 0.3
      ? Math.round(255 - ratio * 30)
      : ratio < 0.65 ? Math.round(230 + (ratio - 0.3) * 50) : Math.round(248 + (ratio - 0.65) * 20);

    const baseAlpha = 0.3 + finalEnergy * 0.35;

    // Bar gradient — bright at top, fading down
    const barGrad = ctx.createLinearGradient(0, by, 0, eqBottom);
    barGrad.addColorStop(0, `rgba(${r},${g},${b},${baseAlpha})`);
    barGrad.addColorStop(0.3, `rgba(${r},${g},${b},${0.08 + finalEnergy * 0.18})`);
    barGrad.addColorStop(1, `rgba(${r},${g},${b},0.01)`);

    ctx.fillStyle = barGrad;
    ctx.fillRect(bx, by, Math.max(2, barW), bh);

    // Soft glow on taller bars (only when bar is above 30% of max height)
    if (bh > eqH * 0.3) {
      const glowStrength = Math.min(1, (bh / eqH - 0.3) / 0.7);
      ctx.shadowColor = `rgba(${r},${g},${b},${0.15 * glowStrength})`;
      ctx.shadowBlur = 4 + glowStrength * 6;
      ctx.fillStyle = `rgba(${r},${g},${b},${0.03 * glowStrength})`;
      ctx.fillRect(bx - 1, by, Math.max(2, barW) + 2, 3);
      ctx.shadowBlur = 0;
    }
  }

  // ── Bottom accent line — subtle glow ──────────────────────────────────
  const accentY = eqBottom + 4;
  const lg = ctx.createLinearGradient(0, accentY, W, accentY);
  lg.addColorStop(0, "transparent");
  lg.addColorStop(0.25, `rgba(155,126,255,0.08)`);
  lg.addColorStop(0.5, `rgba(0,220,255,0.12)`);
  lg.addColorStop(0.75, `rgba(155,126,255,0.08)`);
  lg.addColorStop(1, "transparent");
  ctx.fillStyle = lg;
  ctx.fillRect(0, accentY, W, 2);

  // ── Watermark ───────────────────────────────────────────────────────────
  ctx.font = "8px 'Inter', sans-serif";
  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(255,255,255,0.02)";
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

  // Preload next thumbnail when video changes
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