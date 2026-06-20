import React, { useEffect, useRef } from "react";

/**
 * StageCoverVisualizer — slim 16:9 stage screen with:
 *  - Dark cinematic gradient background
 *  - Animated audio equalizer bars (bass → treble)
 *  - Subtle glowing accent line
 *  - No cover art — clean equalizer-only look
 *  - Renders to offscreen canvas for Three.js texture
 */

const W = 1024;
const H = 576; // 16:9

export { W as CANVAS_W, H as CANVAS_H };

function drawFrame(ctx, t, audioBeat) {
  // ── Audio-reactive energy ─────────────────────────────────────────────────
  const beat = audioBeat > 0.01
    ? 0.08 + audioBeat * 0.55
    : 0.08 + Math.sin(t * 2.2) * 0.04 + Math.sin(t * 3.5) * 0.03;

  // ── Dark cinematic gradient background ───────────────────────────────────
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0, "#060612");
  bgGrad.addColorStop(0.5, "#0a0a20");
  bgGrad.addColorStop(1, "#080818");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // ── Center stage label ────────────────────────────────────────────────────
  ctx.font = "bold 12px 'Syne', sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = `rgba(160,130,255,${0.18 + beat * 0.25})`;
  ctx.fillText("UPPER VIBE STAGE", W / 2, H * 0.28);

  // ── Subtle center glow ─────────────────────────────────────────────────────
  const glowGrad = ctx.createRadialGradient(W / 2, H * 0.55, H * 0.05, W / 2, H * 0.55, H * 0.8);
  glowGrad.addColorStop(0, `rgba(155,126,255,${0.04 + beat * 0.1})`);
  glowGrad.addColorStop(0.5, `rgba(0,180,220,${0.02 + beat * 0.06})`);
  glowGrad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glowGrad;
  ctx.fillRect(0, 0, W, H);

  // ═══════════════════════════════════════════════════════════════════════════
  // AUDIO EQUALIZER BARS
  // ═══════════════════════════════════════════════════════════════════════════
  const eqH = 140;
  const eqY = H * 0.58;
  const barCount = 64;
  const barGap = 2;
  const barW = (W - 40) / barCount - barGap;
  const barX0 = 20;

  for (let i = 0; i < barCount; i++) {
    const ratio = i / (barCount - 1);

    // Frequency zone simulation
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

    // Blend audio-driven energy with simulated pulse
    const audioDriven = beat * (0.5 + zoneBoost * 0.5);
    const simulated = wave1 * 0.22 + wave2 * 0.12;
    const energy = audioBeat > 0.02
      ? audioDriven * 0.78 + simulated * 0.22
      : simulated * 0.4;

    const bh = Math.max(3, energy * eqH);
    const bx = barX0 + i * (barW + barGap);
    const by = eqY + eqH - bh;

    // Gradient: purple → cyan → purple
    const r = Math.round(ratio < 0.5 ? 155 - ratio * 155 : 0);
    const g = Math.round(ratio < 0.5 ? 126 + ratio * 64 : 190 - (ratio - 0.5) * 190);
    const b2 = Math.round(ratio < 0.5 ? 255 - ratio * 35 : 220 + (ratio - 0.5) * 35);
    const ba = 0.35 + energy * 0.4;

    const barGrad = ctx.createLinearGradient(0, by, 0, eqY + eqH);
    barGrad.addColorStop(0, `rgba(${r},${g},${b2},${ba})`);
    barGrad.addColorStop(0.5, `rgba(${r},${g},${b2},${0.12 + energy * 0.2})`);
    barGrad.addColorStop(1, `rgba(${r},${g},${b2},0.02)`);

    ctx.fillStyle = barGrad;
    ctx.fillRect(bx, by, Math.max(1.8, barW), bh);
  }

  // ── Bottom accent line ─────────────────────────────────────────────────────
  const accentY = eqY + eqH + 6;
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

export default function StageCoverVisualizer({ onReady, audioIntensityRef }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const startTimeRef = useRef(0);
  const onReadyCalledRef = useRef(false);
  const audioRef = useRef(audioIntensityRef);
  audioRef.current = audioIntensityRef;

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
      drawFrame(ctx, t, audioBeat);
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