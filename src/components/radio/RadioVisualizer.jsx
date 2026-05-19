import React, { useRef, useEffect, useCallback } from "react";
import { usePlayer } from "../../context/PlayerContext";

// Singleton Web Audio context + analyser so we don't recreate on each render
let audioCtx = null;
let analyser = null;
let sourceNode = null;
let connectedAudio = null;

function getAnalyser(audioElement) {
  if (!audioElement) return null;

  // If already connected to this element, just return the existing analyser
  if (connectedAudio === audioElement && analyser) return analyser;

  // Create or resume context
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    window._uvAudioCtx = audioCtx;
  }
  if (audioCtx.state === "suspended" || audioCtx.state === "interrupted") {
    audioCtx.resume();
  }

  // Disconnect previous source
  if (sourceNode) {
    try { sourceNode.disconnect(); } catch {}
  }

  try {
    sourceNode = audioCtx.createMediaElementSource(audioElement);
  } catch {
    // Already connected — reuse
    if (analyser) return analyser;
    return null;
  }

  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 256;
  analyser.smoothingTimeConstant = 0.82;

  sourceNode.connect(analyser);
  analyser.connect(audioCtx.destination);
  connectedAudio = audioElement;

  return analyser;
}

export default function RadioVisualizer({ isPlaying }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const analyserRef = useRef(null);
  const { audioRef } = usePlayer();

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const an = analyserRef.current;
    if (!canvas || !an) return;

    const ctx = canvas.getContext("2d");
    const W = canvas.width;
    const H = canvas.height;
    const bufLen = an.frequencyBinCount;
    const data = new Uint8Array(bufLen);
    an.getByteFrequencyData(data);

    ctx.clearRect(0, 0, W, H);

    // --- Outer glow ring ---
    const avgFreq = data.reduce((s, v) => s + v, 0) / bufLen;
    const pulse = avgFreq / 255;
    const cx = W / 2;
    const cy = H / 2;
    const baseR = Math.min(W, H) * 0.28;

    // Subtle background radial gradient
    const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, baseR * 1.8);
    bgGrad.addColorStop(0, `rgba(0,200,220,${0.03 + pulse * 0.04})`);
    bgGrad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // --- Circular bars ---
    const barCount = 80;
    const step = Math.floor(bufLen / barCount);

    for (let i = 0; i < barCount; i++) {
      const value = data[i * step] / 255;
      const barH = value * baseR * 0.85 + 2;
      const angle = (i / barCount) * Math.PI * 2 - Math.PI / 2;

      const innerR = baseR + 2;
      const outerR = innerR + barH;

      const x1 = cx + Math.cos(angle) * innerR;
      const y1 = cy + Math.sin(angle) * innerR;
      const x2 = cx + Math.cos(angle) * outerR;
      const y2 = cy + Math.sin(angle) * outerR;

      // Colour gradient: cyan → purple based on frequency amplitude
      const hue = 185 + value * 80;
      const alpha = 0.4 + value * 0.6;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = `hsla(${hue}, 100%, 60%, ${alpha})`;
      ctx.lineWidth = (W / barCount) * 0.55;
      ctx.lineCap = "round";
      ctx.stroke();
    }

    // --- Inner waveform ring ---
    const waveData = new Uint8Array(an.frequencyBinCount);
    an.getByteTimeDomainData(waveData);

    ctx.beginPath();
    for (let i = 0; i < waveData.length; i++) {
      const norm = (waveData[i] / 128.0) - 1;
      const r = baseR * (0.6 + norm * 0.12);
      const angle = (i / waveData.length) * Math.PI * 2 - Math.PI / 2;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = `rgba(0,220,255,${0.15 + pulse * 0.25})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // --- Pulsing centre dot ---
    const dotR = 6 + pulse * 10;
    const dotGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, dotR * 3);
    dotGrad.addColorStop(0, `rgba(0,220,255,${0.7 + pulse * 0.3})`);
    dotGrad.addColorStop(0.4, `rgba(0,180,220,${0.2 + pulse * 0.2})`);
    dotGrad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.beginPath();
    ctx.arc(cx, cy, dotR, 0, Math.PI * 2);
    ctx.fillStyle = dotGrad;
    ctx.fill();

    rafRef.current = requestAnimationFrame(draw);
  }, []);

  // Draw idle (no audio data) animation
  const drawIdle = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;
    const cy = H / 2;
    const baseR = Math.min(W, H) * 0.28;
    const t = Date.now() / 1000;

    ctx.clearRect(0, 0, W, H);

    // Gentle pulsing ring
    for (let i = 0; i < 80; i++) {
      const angle = (i / 80) * Math.PI * 2 - Math.PI / 2;
      const wave = Math.sin(angle * 3 + t * 1.2) * 0.5 + 0.5;
      const barH = wave * baseR * 0.12 + 3;
      const innerR = baseR + 2;
      const outerR = innerR + barH;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * innerR, cy + Math.sin(angle) * innerR);
      ctx.lineTo(cx + Math.cos(angle) * outerR, cy + Math.sin(angle) * outerR);
      ctx.strokeStyle = `rgba(0,200,220,0.18)`;
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.stroke();
    }

    // Centre dot
    const dotPulse = Math.sin(t * 1.5) * 0.3 + 0.7;
    ctx.beginPath();
    ctx.arc(cx, cy, 6 * dotPulse, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(0,200,220,${0.3 * dotPulse})`;
    ctx.fill();

    rafRef.current = requestAnimationFrame(drawIdle);
  }, []);

  useEffect(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    if (isPlaying && audioRef?.current) {
      const an = getAnalyser(audioRef.current);
      analyserRef.current = an;
      if (an) {
        draw();
        return;
      }
    }
    // Fall back to idle animation
    analyserRef.current = null;
    drawIdle();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying, audioRef, draw, drawIdle]);

  // Resize canvas to match display size
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      const ctx = canvas.getContext("2d");
      ctx.scale(dpr, dpr);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="w-full" style={{ position: "relative", paddingTop: "min(56%, 260px)" }}>
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          top: 0, left: 0,
          width: "100%",
          height: "100%",
          display: "block",
        }}
      />
    </div>
  );
}