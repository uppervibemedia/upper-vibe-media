import React, { useEffect, useRef } from "react";

/**
 * StageCoverVisualizer — 16:9 cinematic stage screen with:
 *  - Blurred backdrop from cover art (never stretched 3000x3000)
 *  - Centered 16:9 inner frame for video thumbnail or album art
 *  - Animated audio equalizer bars at the bottom
 *  - Dark purple/blue gradient background
 *  - Particles, glow, and ambient motion
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
  bgGrad.addColorStop(0, "#08081e");
  bgGrad.addColorStop(0.4, "#0d0d2a");
  bgGrad.addColorStop(0.7, "#0a0a22");
  bgGrad.addColorStop(1, "#060618");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // ── Blurred backdrop from cover art (fills entire canvas, heavily blurred) ──
  if (coverUrl) {
    const cached = imgCache[coverUrl];
    if (cached?.complete && cached.naturalWidth > 0) {
      ctx.save();
      ctx.globalAlpha = 0.12 + beat * 0.06;
      ctx.filter = "blur(40px) brightness(0.3)";
      // Draw cover art covering full canvas — it will be soft blur, never sharp square
      ctx.drawImage(cached, 0, 0, W, H);
      ctx.filter = "none";
      ctx.restore();
    }
  }

  // ── Inner 16:9 frame — where the video/artwork lives ──────────────────────
  const frameW = W * 0.78;
  const frameH = frameW / (16 / 9);
  const frameX = (W - frameW) / 2;
  const frameY = (H - frameH) * 0.32; // slight top bias for title below
  const frameCX = W / 2;
  const frameCY = frameY + frameH / 2;

  // ── Glow aura behind frame ────────────────────────────────────────────────
  const glowRadius = Math.max(frameW, frameH) * 0.5;
  const glowGrad = ctx.createRadialGradient(frameCX, frameCY, frameH * 0.15, frameCX, frameCY, glowRadius);
  glowGrad.addColorStop(0, `rgba(155,126,255,${0.05 + beat * 0.15})`);
  glowGrad.addColorStop(0.5, `rgba(0,180,220,${0.03 + beat * 0.08})`);
  glowGrad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glowGrad;
  ctx.fillRect(frameX - 60, frameY - 60, frameW + 120, frameH + 120);

  // ── Small floating particles around the frame ─────────────────────────────
  for (let i = 0; i < 30; i++) {
    const a = (i / 30) * Math.PI * 2 + t * 0.18;
    const r = frameW * 0.52 + Math.sin(t * 1.2 + i * 0.5) * 25;
    const px = frameCX + Math.cos(a) * r;
    const py = frameCY + Math.sin(a) * r * 0.55;
    const ps = 1.0 + Math.sin(t * 2.0 + i) * 0.8;
    const hue = i % 3 === 0 ? "155,126,255" : "0,190,220";
    const pa = 0.08 + beat * 0.14 + Math.sin(t * 1.3 + i * 0.7) * 0.04;
    ctx.beginPath();
    ctx.arc(px, py, ps, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${hue},${pa})`;
    ctx.fill();
  }

  // ── Draw cover art inside the 16:9 frame ──────────────────────────────────
  if (coverUrl) {
    const cached = imgCache[coverUrl];
    if (cached?.complete && cached.naturalWidth > 0) {
      const imgW = cached.naturalWidth;
      const imgH = cached.naturalHeight;
      const imgRatio = imgW / imgH;
      const frameRatio = frameW / frameH;

      let sx = 0, sy = 0, sw = imgW, sh = imgH;
      if (imgRatio > frameRatio) {
        // Image wider than 16:9 — crop sides
        const displayW = imgH * frameRatio;
        sx = (imgW - displayW) / 2;
        sw = displayW;
      } else if (imgRatio < frameRatio) {
        // Image taller than 16:9 — crop top/bottom
        const displayH = imgW / frameRatio;
        sy = (imgH - displayH) / 2;
        sh = displayH;
      }
      // Otherwise perfect 16:9, draw as-is

      ctx.save();
      // Rounded rect clip for inner frame
      roundRect(ctx, frameX, frameY, frameW, frameH, 8);
      ctx.clip();
      // Darken slightly so overlays pop
      ctx.globalAlpha = 0.85;
      ctx.drawImage(cached, sx, sy, sw, sh, frameX, frameY, frameW, frameH);
      ctx.globalAlpha = 1;
      ctx.restore();
    } else {
      // Not yet loaded — preload
      if (!cached) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = coverUrl;
        imgCache[coverUrl] = img;
      }
      // Placeholder inside frame
      ctx.fillStyle = "#1a1a38";
      roundRect(ctx, frameX, frameY, frameW, frameH, 8);
      ctx.fill();
      ctx.fillStyle = "rgba(180,160,255,0.12)";
      ctx.font = "42px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("♫", frameCX, frameCY);
    }
  } else {
    // No cover at all — dark frame with note icon
    ctx.fillStyle = "#1a1a38";
    roundRect(ctx, frameX, frameY, frameW, frameH, 8);
    ctx.fill();
    ctx.fillStyle = "rgba(180,160,255,0.12)";
    ctx.font = "42px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("♫", frameCX, frameCY);
  }

  // ── Subtle vignette over the frame ────────────────────────────────────────
  const vignetteGrad = ctx.createRadialGradient(frameCX, frameCY, frameW * 0.35, frameCX, frameCY, frameW * 0.75);
  vignetteGrad.addColorStop(0, "rgba(0,0,0,0)");
  vignetteGrad.addColorStop(1, "rgba(0,0,0,0.25)");
  ctx.fillStyle = vignetteGrad;
  ctx.fillRect(frameX, frameY, frameW, frameH);

  // ── Neon frame border ──────────────────────────────────────────────────────
  ctx.strokeStyle = `rgba(155,126,255,${0.25 + beat * 0.35})`;
  ctx.lineWidth = 2;
  roundRect(ctx, frameX - 2, frameY - 2, frameW + 4, frameH + 4, 10);
  ctx.stroke();

  ctx.strokeStyle = `rgba(0,190,220,${0.12 + beat * 0.2})`;
  ctx.lineWidth = 1;
  roundRect(ctx, frameX - 8, frameY - 8, frameW + 16, frameH + 16, 14);
  ctx.stroke();

  // ── "NOW SHOWING" badge above frame ────────────────────────────────────────
  ctx.font = "bold 9px 'Inter', sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(0,220,255,0.45)";
  ctx.fillText("NOW SHOWING", frameCX, frameY - 14);

  // ── Title below frame ──────────────────────────────────────────────────────
  if (title) {
    const titleY = frameY + frameH + 18;
    const maxLen = 44;
    const displayTitle = title.length > maxLen ? title.slice(0, maxLen) + "…" : title;
    ctx.font = "bold 14px 'Syne', sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(displayTitle, frameCX, titleY);

    ctx.font = "10px 'Inter', sans-serif";
    ctx.fillStyle = "rgba(180,160,240,0.6)";
    ctx.fillText("Upper Vibe Media", frameCX, titleY + 16);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // AUDIO EQUALIZER BARS — bottom overlay
  // ═══════════════════════════════════════════════════════════════════════════
  const eqH = 46;
  const eqY = H - eqH - 8;
  const barCount = 64;
  const barGap = 1.5;
  const barW = (W - 20) / barCount - barGap;
  const barX0 = 10;

  for (let i = 0; i < barCount; i++) {
    const ratio = i / (barCount - 1);

    // Frequency zone simulation — bass on left, mids in center, treble on right
    const bass = ratio < 0.22 ? Math.pow(1 - ratio / 0.22, 1.5) : 0;
    const mid = ratio >= 0.15 && ratio < 0.70
      ? 1 - Math.abs(ratio - 0.4) / 0.3
      : 0;
    const treble = ratio >= 0.60
      ? Math.pow((ratio - 0.6) / 0.4, 0.7)
      : 0;
    const zoneBoost = Math.max(0, bass * 0.85 + mid * 0.65 + treble * 0.5);

    // Per-bar wave oscillation
    const wave1 = Math.sin(t * 3.0 + i * 0.16) * 0.5 + 0.5;
    const wave2 = Math.sin(t * 5.5 + i * 0.28) * 0.5 + 0.5;

    // Blend audio-driven energy with simulated pulse
    const audioDriven = beat * (0.5 + zoneBoost * 0.5);
    const simulated = wave1 * 0.22 + wave2 * 0.12;
    const energy = audioBeat > 0.02
      ? audioDriven * 0.78 + simulated * 0.22
      : simulated * 0.35;

    const bh = Math.max(2.5, energy * eqH);
    const bx = barX0 + i * (barW + barGap);
    const by = eqY + eqH - bh;

    // Gradient: purple → cyan → purple across the bars
    const r = Math.round(ratio < 0.5 ? 155 - ratio * 155 : 0);
    const g = Math.round(ratio < 0.5 ? 126 + ratio * 64 : 190 - (ratio - 0.5) * 190);
    const b2 = Math.round(ratio < 0.5 ? 255 - ratio * 35 : 220 + (ratio - 0.5) * 35);
    const ba = 0.3 + energy * 0.45;

    const barGrad = ctx.createLinearGradient(0, by, 0, eqY + eqH);
    barGrad.addColorStop(0, `rgba(${r},${g},${b2},${ba})`);
    barGrad.addColorStop(0.5, `rgba(${r},${g},${b2},${0.1 + energy * 0.2})`);
    barGrad.addColorStop(1, `rgba(${r},${g},${b2},0.02)`);

    ctx.fillStyle = barGrad;
    ctx.fillRect(bx, by, Math.max(1.6, barW), bh);
  }

  // ── Bottom accent line ─────────────────────────────────────────────────────
  const accentY = eqY + eqH + 2;
  if (accentY < H) {
    const lg = ctx.createLinearGradient(0, accentY, W, accentY);
    lg.addColorStop(0, "transparent");
    lg.addColorStop(0.25, "rgba(155,126,255,0.15)");
    lg.addColorStop(0.5, "rgba(0,220,255,0.25)");
    lg.addColorStop(0.75, "rgba(155,126,255,0.15)");
    lg.addColorStop(1, "transparent");
    ctx.fillStyle = lg;
    ctx.fillRect(0, accentY, W, 2);
  }

  // ── Watermark ──────────────────────────────────────────────────────────────
  ctx.font = "8px 'Inter', sans-serif";
  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(255,255,255,0.04)";
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

  // Preload next video thumbnail
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

    const videoRef = { current: video };

    const animate = () => {
      const t = performance.now() * 0.001 - startTimeRef.current;
      const audioBeat = audioRef.current?.current ?? 0;
      drawFrame(ctx, videoRef.current || {}, imgCacheRef.current, t, audioBeat);
      animRef.current = requestAnimationFrame(animate);
    };

    // Update video ref from prop without restarting animation
    const intervalId = setInterval(() => {
      videoRef.current = video;
    }, 500);

    animRef.current = requestAnimationFrame(animate);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      clearInterval(intervalId);
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