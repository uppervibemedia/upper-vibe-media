import React, { useRef, useEffect, useCallback } from "react";
import { usePlayer, getGlobalAnalyser } from "../../context/PlayerContext";

// ─── Single RAF loop ID — prevents stacking animation loops ───────────────
let _globalRafId = null;

export default function RadioVisualizer({ isPlaying }) {
  const canvasRef     = useRef(null);
  const rafRef        = useRef(null);
  const analyserRef   = useRef(null);
  const { audioRef }  = usePlayer();

  // ── Draw active (real audio data) ───────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const an     = analyserRef.current;
    if (!canvas || !an) return;

    const ctx    = canvas.getContext("2d");
    const rect   = canvas.getBoundingClientRect();
    const W      = rect.width  || canvas.width;
    const H      = rect.height || canvas.height;
    const bufLen = an.frequencyBinCount;
    const data   = new Uint8Array(bufLen);
    an.getByteFrequencyData(data);

    ctx.clearRect(0, 0, W, H);

    const avgFreq = data.reduce((s, v) => s + v, 0) / bufLen;
    const pulse   = avgFreq / 255;
    const cx      = W / 2;
    const cy      = H / 2;
    const baseR   = Math.min(W, H) * 0.28;

    // Subtle background radial gradient
    const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, baseR * 1.8);
    bgGrad.addColorStop(0, `rgba(0,200,220,${0.03 + pulse * 0.04})`);
    bgGrad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Circular frequency bars
    const barCount = 80;
    const step     = Math.floor(bufLen / barCount);
    for (let i = 0; i < barCount; i++) {
      const value  = data[i * step] / 255;
      const barH   = value * baseR * 0.85 + 2;
      const angle  = (i / barCount) * Math.PI * 2 - Math.PI / 2;
      const innerR = baseR + 2;
      const outerR = innerR + barH;

      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * innerR, cy + Math.sin(angle) * innerR);
      ctx.lineTo(cx + Math.cos(angle) * outerR, cy + Math.sin(angle) * outerR);
      ctx.strokeStyle = `hsla(${185 + value * 80}, 100%, 60%, ${0.4 + value * 0.6})`;
      ctx.lineWidth   = (W / barCount) * 0.55;
      ctx.lineCap     = "round";
      ctx.stroke();
    }

    // Inner waveform ring
    const waveData = new Uint8Array(an.frequencyBinCount);
    an.getByteTimeDomainData(waveData);
    ctx.beginPath();
    for (let i = 0; i < waveData.length; i++) {
      const norm  = (waveData[i] / 128.0) - 1;
      const r     = baseR * (0.6 + norm * 0.12);
      const angle = (i / waveData.length) * Math.PI * 2 - Math.PI / 2;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = `rgba(0,220,255,${0.15 + pulse * 0.25})`;
    ctx.lineWidth   = 1.5;
    ctx.stroke();

    // Pulsing centre dot
    const dotR    = 6 + pulse * 10;
    const dotGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, dotR * 3);
    dotGrad.addColorStop(0,   `rgba(0,220,255,${0.7 + pulse * 0.3})`);
    dotGrad.addColorStop(0.4, `rgba(0,180,220,${0.2 + pulse * 0.2})`);
    dotGrad.addColorStop(1,   "rgba(0,0,0,0)");
    ctx.beginPath();
    ctx.arc(cx, cy, dotR, 0, Math.PI * 2);
    ctx.fillStyle = dotGrad;
    ctx.fill();

    rafRef.current = requestAnimationFrame(draw);
  }, []);

  // ── Draw idle (no audio data) ────────────────────────────────────────────
  const drawIdle = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx  = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const W    = rect.width  || canvas.width;
    const H    = rect.height || canvas.height;
    const cx   = W / 2;
    const cy   = H / 2;
    const baseR = Math.min(W, H) * 0.28;
    const t    = Date.now() / 1000;

    ctx.clearRect(0, 0, W, H);

    for (let i = 0; i < 80; i++) {
      const angle = (i / 80) * Math.PI * 2 - Math.PI / 2;
      const wave  = Math.sin(angle * 3 + t * 1.2) * 0.5 + 0.5;
      const barH  = wave * baseR * 0.12 + 3;
      const inner = baseR + 2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
      ctx.lineTo(cx + Math.cos(angle) * (inner + barH), cy + Math.sin(angle) * (inner + barH));
      ctx.strokeStyle = "rgba(0,200,220,0.18)";
      ctx.lineWidth   = 2.5;
      ctx.lineCap     = "round";
      ctx.stroke();
    }

    const dotPulse = Math.sin(t * 1.5) * 0.3 + 0.7;
    ctx.beginPath();
    ctx.arc(cx, cy, 6 * dotPulse, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(0,200,220,${0.3 * dotPulse})`;
    ctx.fill();

    rafRef.current = requestAnimationFrame(drawIdle);
  }, []);

  // ── Stop the current RAF loop ────────────────────────────────────────────
  const stopLoop = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      console.log("[RadioVisualizer] ⏹ Animation loop stopped");
    }
  }, []);

  // ── Register this canvas as the PiP visual source ───────────────────────
  useEffect(() => {
    if (window._uvSetPiPVisual) window._uvSetPiPVisual(canvasRef.current);
    return () => {
      if (window._uvSetPiPVisual) window._uvSetPiPVisual(null);
    };
  }, []);

  // ── Start / switch animation loop when isPlaying changes ────────────────
  useEffect(() => {
    stopLoop();

    if (isPlaying && audioRef?.current) {
      // Reuse the global analyser — never create a second AudioContext
      const an = getGlobalAnalyser(audioRef.current);
      if (an) {
        analyserRef.current = an;
        console.log("[RadioVisualizer] ▶️ Starting active animation loop");
        draw();
        return;
      }
    }

    // Idle animation
    analyserRef.current = null;
    console.log("[RadioVisualizer] 💤 Starting idle animation loop");
    drawIdle();

    return stopLoop;
  }, [isPlaying, audioRef, draw, drawIdle, stopLoop]);

  // ── Resize canvas to match container — DPR-aware, never 0×0 ────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const syncSize = () => {
      const rect = canvas.getBoundingClientRect();
      const w    = rect.width;
      const h    = rect.height;
      if (w === 0 || h === 0) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width  = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      const ctx = canvas.getContext("2d");
      ctx.scale(dpr, dpr);
    };

    syncSize();
    const ro = new ResizeObserver(syncSize);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  return (
    // Outer wrapper: responsive square-ish box, clipped, border-radius respected
    <div
      style={{
        position:     "relative",
        width:        "100%",
        paddingTop:   "min(56.25%, 260px)",
        overflow:     "hidden",
        borderRadius: "inherit",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          inset:    0,
          width:    "100%",
          height:   "100%",
          display:  "block",
        }}
      />
    </div>
  );
}