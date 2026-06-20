import React, { useEffect, useRef } from "react";

/**
 * StageCoverVisualizer — cinematic 16:9 stage screen with video frame,
 * audio-reactive glow, and animated equalizer bars.
 * Renders to an offscreen canvas used as a Three.js texture.
 */

const W = 1024;
const H = 576; // 16:9

export { W as CANVAS_W, H as CANVAS_H };

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

function drawFrame(ctx, video, imgCache, t, audioBeat) {
  // Use maxresdefault for 16:9 thumbnails (falls back to hqdefault)
  const coverUrl = video?.thumbnail_url
    || (video?.youtube_video_id
      ? `https://img.youtube.com/vi/${video.youtube_video_id}/maxresdefault.jpg`
      : null);
  const title = video?.title || "";

  // ── Audio-reactive beat (0.08 → 0.65) ─────────────────────────────────
  const beat = audioBeat > 0.01
    ? 0.08 + audioBeat * 0.6
    : 0.1 + Math.sin(t * 2.1) * 0.04 + Math.sin(t * 3.3) * 0.03;

  // ── Background gradient ────────────────────────────────────────────────
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#060618");
  bg.addColorStop(0.5, "#0c0c28");
  bg.addColorStop(1, "#08081c");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // ── Subtle blurred cover backdrop ──────────────────────────────────────
  if (coverUrl) {
    const cached = imgCache[coverUrl];
    if (cached?.complete && cached.naturalWidth > 0) {
      ctx.save();
      ctx.globalAlpha = 0.1 + beat * 0.05;
      ctx.filter = "blur(30px) brightness(0.35)";
      ctx.drawImage(cached, 0, 0, W, H);
      ctx.filter = "none";
      ctx.restore();
    }
  }

  // ── Video frame area (16:9 inner frame) ───────────────────────────────
  const frameW = W * 0.82;
  const frameH = frameW / (16 / 9);
  const frameX = (W - frameW) / 2;
  const frameY = (H - frameH) * 0.38; // slightly above center for text below
  const frameCX = W / 2;
  const frameCY = frameY + frameH / 2;

  // ── Glow behind frame ─────────────────────────────────────────────────
  const glowR = Math.max(frameW, frameH) * 0.55;
  const glowGrad = ctx.createRadialGradient(frameCX, frameCY, frameH * 0.2, frameCX, frameCY, glowR);
  glowGrad.addColorStop(0, `rgba(155,126,255,${0.06 + beat * 0.18})`);
  glowGrad.addColorStop(0.5, `rgba(0,200,220,${0.03 + beat * 0.1})`);
  glowGrad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glowGrad;
  ctx.fillRect(frameX - 80, frameY - 80, frameW + 160, frameH + 160);

  // ── Floating particles ─────────────────────────────────────────────────
  const ptCount = 36;
  for (let i = 0; i < ptCount; i++) {
    const a = (i / ptCount) * Math.PI * 2 + t * 0.18;
    const r = frameW * 0.55 + Math.sin(t * 1.1 + i * 0.5) * 40;
    const px = frameCX + Math.cos(a) * r;
    const py = frameCY + Math.sin(a) * r * 0.6;
    const ps = 1.3 + Math.sin(t * 2.2 + i) * 0.9;
    const hue = i % 3 === 0 ? "155,126,255" : "0,200,220";
    const pa = 0.1 + beat * 0.16 + Math.sin(t * 1.2 + i * 0.6) * 0.05;
    ctx.beginPath();
    ctx.arc(px, py, ps, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${hue},${pa})`;
    ctx.fill();
  }

  // ── Light ray sweeps ──────────────────────────────────────────────────
  for (let i = 0; i < 3; i++) {
    const rayA = t * 0.12 + (i * Math.PI * 2) / 3;
    const rayGrad = ctx.createLinearGradient(
      frameCX, frameCY,
      frameCX + Math.cos(rayA) * frameW * 0.7,
      frameCY + Math.sin(rayA) * frameH * 0.7,
    );
    rayGrad.addColorStop(0, `rgba(155,126,255,${0.02 + beat * 0.04})`);
    rayGrad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = rayGrad;
    ctx.fillRect(0, 0, W, H);
  }

  // ── Draw video frame content ──────────────────────────────────────────
  if (coverUrl) {
    const cached = imgCache[coverUrl];
    if (cached?.complete && cached.naturalWidth > 0) {
      // Draw image to fill the 16:9 frame (letterbox if needed)
      const imgW = cached.naturalWidth;
      const imgH = cached.naturalHeight;
      const imgRatio = imgW / imgH;
      const frameRatio = frameW / frameH;

      let sx = 0, sy = 0, sw = imgW, sh = imgH;
      if (imgRatio > frameRatio) {
        // Image wider — letterbox vertically
        const displayW = imgH * frameRatio;
        sx = (imgW - displayW) / 2;
        sw = displayW;
      } else if (imgRatio < frameRatio) {
        // Image taller — letterbox horizontally
        const displayH = imgW / frameRatio;
        sy = (imgH - displayH) / 2;
        sh = displayH;
      }

      ctx.save();
      roundedRect(ctx, frameX, frameY, frameW, frameH, 8);
      ctx.clip();
      ctx.drawImage(cached, sx, sy, sw, sh, frameX, frameY, frameW, frameH);
      ctx.restore();
    } else {
      if (!cached) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = coverUrl;
        imgCache[coverUrl] = img;
      }
      // Placeholder
      ctx.fillStyle = "#1A1A3A";
      roundedRect(ctx, frameX, frameY, frameW, frameH, 8);
      ctx.fill();
      ctx.fillStyle = "rgba(200,180,255,0.15)";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "48px sans-serif";
      ctx.fillText("♫", frameCX, frameCY);
    }
  } else {
    ctx.fillStyle = "#1A1A3A";
    roundedRect(ctx, frameX, frameY, frameW, frameH, 8);
    ctx.fill();
    ctx.fillStyle = "rgba(200,180,255,0.15)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "48px sans-serif";
    ctx.fillText("♫", frameCX, frameCY);
  }

  // ── Neon frame border ─────────────────────────────────────────────────
  ctx.strokeStyle = `rgba(155,126,255,${0.3 + beat * 0.45})`;
  ctx.lineWidth = 2;
  roundedRect(ctx, frameX - 3, frameY - 3, frameW + 6, frameH + 6, 10);
  ctx.stroke();

  ctx.strokeStyle = `rgba(0,200,220,${0.15 + beat * 0.3})`;
  ctx.lineWidth = 1;
  roundedRect(ctx, frameX - 10, frameY - 10, frameW + 20, frameH + 20, 16);
  ctx.stroke();

  // ── "NOW SHOWING" badge above frame ───────────────────────────────────
  ctx.font = "bold 9px 'Inter', sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(0,229,255,0.55)";
  ctx.fillText("NOW SHOWING", frameCX, frameY - 16);

  // ── Title below frame ─────────────────────────────────────────────────
  if (title) {
    const titleY = frameY + frameH + 22;
    const maxLen = 42;
    const displayTitle = title.length > maxLen ? title.slice(0, maxLen) + "…" : title;
    ctx.font = "bold 16px 'Syne', sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(displayTitle, frameCX, titleY);

    ctx.font = "11px 'Inter', sans-serif";
    ctx.fillStyle = "rgba(200,180,255,0.7)";
    ctx.fillText("Upper Vibe Media", frameCX, titleY + 18);
  }

  // ── Audio-reactive equalizer — bottom overlay ─────────────────────────
  const eqH = 38;
  const eqY = H - eqH - 6;
  const barCount = 64;
  const barW = (W - 20) / barCount - 1.5;
  const barX0 = 10;

  for (let i = 0; i < barCount; i++) {
    // Each bar gets its own frequency-like value that scales with audioBeat
    // Lower bars (bass) on left, higher bars (treble) on right
    const ratio = i / (barCount - 1);

    // Simulated frequency distribution — bass on left, mids in middle, treble on right
    const bassZone = ratio < 0.2 ? (1 - ratio / 0.2) : 0;
    const midZone = ratio >= 0.15 && ratio < 0.65
      ? 1 - Math.abs(ratio - 0.4) / 0.3
      : 0;
    const trebleZone = ratio >= 0.6
      ? (ratio - 0.6) / 0.4
      : 0;
    const zoneBoost = Math.max(0, bassZone * 0.9 + midZone * 0.75 + trebleZone * 0.55);

    // Dynamic per-bar oscillation with phase offset for wave effect
    const wavePhase = t * 2.8 + i * 0.18;
    const wave = Math.sin(wavePhase) * 0.5 + 0.5;

    // Second wave for complexity
    const wave2 = Math.sin(t * 5.1 + i * 0.31) * 0.5 + 0.5;

    // Combine audio beat with per-bar variation
    const audioDriven = beat * (0.55 + zoneBoost * 0.45);
    const simulated = wave * 0.25 + wave2 * 0.15;

    // Blend audio-driven and simulated — audio dominates when music plays
    const energy = audioBeat > 0.02
      ? audioDriven * 0.75 + simulated * 0.25
      : simulated * 0.3;

    const bh = Math.max(2.5, energy * eqH);

    const bx = barX0 + i * (barW + 1.5);
    const by = eqY + eqH - bh;

    // Color gradient: purple on left → cyan/blue in middle → purple on right
    const r = Math.round(ratio < 0.5 ? 155 - ratio * 155 * 2 : 0);
    const g = Math.round(ratio < 0.5 ? 126 - ratio * 26 : 180 - (1 - ratio) * 180);
    const b2 = Math.round(ratio < 0.5 ? 255 - ratio * 35 : 200 + (1 - ratio) * 55);
    const ba = 0.32 + energy * 0.5;

    const barGrad = ctx.createLinearGradient(0, by, 0, eqY + eqH);
    barGrad.addColorStop(0, `rgba(${r},${g},${b2},${ba})`);
    barGrad.addColorStop(0.6, `rgba(${r},${g},${b2},${0.12 + energy * 0.25})`);
    barGrad.addColorStop(1, `rgba(${r},${g},${b2},0.03)`);

    ctx.fillStyle = barGrad;
    ctx.fillRect(bx, by, Math.max(1.8, barW), bh);
  }

  // ── Bottom accent line ────────────────────────────────────────────────
  const accentY = eqY + eqH + 3;
  if (accentY < H) {
    const lg = ctx.createLinearGradient(0, accentY, W, accentY);
    lg.addColorStop(0, "transparent");
    lg.addColorStop(0.3, "rgba(155,126,255,0.2)");
    lg.addColorStop(0.5, "rgba(0,229,255,0.3)");
    lg.addColorStop(0.7, "rgba(155,126,255,0.2)");
    lg.addColorStop(1, "transparent");
    ctx.fillStyle = lg;
    ctx.fillRect(0, accentY, W, 2);
  }

  // ── Brand watermark ───────────────────────────────────────────────────
  ctx.font = "9px 'Inter', sans-serif";
  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(255,255,255,0.05)";
  ctx.fillText("UPPER VIBE MEDIA", W - 16, H - 6);
}

export default function StageCoverVisualizer({ onReady, video, audioIntensityRef }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const imgCacheRef = useRef({});
  const startTimeRef = useRef(0);
  const prevVideoIdRef = useRef(null);
  const onReadyCalledRef = useRef(false);

  const videoRef = useRef(video);
  videoRef.current = video;
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