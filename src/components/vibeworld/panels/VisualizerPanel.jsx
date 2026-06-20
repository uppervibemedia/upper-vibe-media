import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Sparkles, Disc3 } from "lucide-react";
import { usePlayer, requestAnalyser } from "@/context/PlayerContext";

const STYLES = [
  { key: "cosmic", label: "Cosmic Tunnel" },
  { key: "spectrum", label: "Spectrum Bars" },
  { key: "energy", label: "Energy Rings" },
  { key: "waveform", label: "Waveform Glow" },
  { key: "particles", label: "Pulse Particles" },
];

function drawCosmic(canvas, ctx, dataArray, bufferLength, t) {
  const { width, height } = canvas;
  const cx = width / 2;
  const cy = height / 2;

  // Dark background
  ctx.fillStyle = "rgba(5,5,16,0.3)";
  ctx.fillRect(0, 0, width, height);

  // Cosmic tunnel rings
  for (let i = 0; i < bufferLength; i += 4) {
    const val = dataArray[i] / 255;
    const radius = 60 + i * 1.2 + Math.sin(t * 2 + i * 0.02) * 20;
    const alpha = val * 0.5;

    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = `hsla(${260 + val * 40}, 80%, ${50 + val * 30}%, ${alpha})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // Center glow
  const glow = ctx.createRadialGradient(cx, cy, 20, cx, cy, 120);
  glow.addColorStop(0, "rgba(155,126,255,0.3)");
  glow.addColorStop(1, "rgba(155,126,255,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, 120, 0, Math.PI * 2);
  ctx.fill();
}

function drawSpectrum(canvas, ctx, dataArray, bufferLength) {
  const { width, height } = canvas;
  ctx.fillStyle = "rgba(5,5,16,0.4)";
  ctx.fillRect(0, 0, width, height);

  const barWidth = width / bufferLength * 2.5;
  let x = 0;
  for (let i = 0; i < bufferLength; i++) {
    const val = dataArray[i] / 255;
    const barHeight = val * height * 0.8;

    const gradient = ctx.createLinearGradient(0, height, 0, height - barHeight);
    gradient.addColorStop(0, "rgba(0,229,255,0.8)");
    gradient.addColorStop(0.5, "rgba(155,126,255,0.6)");
    gradient.addColorStop(1, "rgba(0,160,220,0.4)");

    ctx.fillStyle = gradient;
    ctx.fillRect(x, height - barHeight, barWidth - 1, barHeight);
    x += barWidth;
  }
}

function drawEnergyRings(canvas, ctx, dataArray, bufferLength, t) {
  const { width, height } = canvas;
  const cx = width / 2;
  const cy = height / 2;

  ctx.fillStyle = "rgba(5,5,16,0.3)";
  ctx.fillRect(0, 0, width, height);

  for (let r = 0; r < 5; r++) {
    const ringRadius = 40 + r * 60 + Math.sin(t * 1.5 + r) * 15;
    const slice = bufferLength / 5;

    ctx.beginPath();
    for (let i = 0; i < slice; i++) {
      const val = (dataArray[r * slice + i] || dataArray[i]) / 255;
      const angle = (i / slice) * Math.PI * 2;
      const rad = ringRadius + val * 25;

      if (i === 0) {
        ctx.moveTo(cx + Math.cos(angle) * rad, cy + Math.sin(angle) * rad);
      } else {
        ctx.lineTo(cx + Math.cos(angle) * rad, cy + Math.sin(angle) * rad);
      }
    }
    ctx.closePath();
    ctx.strokeStyle = `hsla(${200 + r * 40}, 80%, ${55 + r * 5}%, 0.6)`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function drawWaveform(canvas, ctx, dataArray, bufferLength) {
  const { width, height } = canvas;
  const sliceWidth = width / bufferLength;

  ctx.fillStyle = "rgba(5,5,16,0.5)";
  ctx.fillRect(0, 0, width, height);

  // Center waveform
  ctx.beginPath();
  ctx.moveTo(0, height / 2);
  for (let i = 0; i < bufferLength; i++) {
    const v = dataArray[i] / 128 - 1;
    const y = (v * height) / 2 + height / 2;
    ctx.lineTo(i * sliceWidth, y);
  }

  const grad = ctx.createLinearGradient(0, 0, width, 0);
  grad.addColorStop(0, "rgba(155,126,255,0.8)");
  grad.addColorStop(0.5, "rgba(0,229,255,0.8)");
  grad.addColorStop(1, "rgba(155,126,255,0.8)");

  ctx.strokeStyle = grad;
  ctx.lineWidth = 3;
  ctx.stroke();

  // Glow under waveform
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.closePath();
  ctx.fillStyle = "rgba(155,126,255,0.05)";
  ctx.fill();
}

function drawParticles(canvas, ctx, dataArray, bufferLength, t) {
  const { width, height } = canvas;
  ctx.fillStyle = "rgba(5,5,16,0.15)";
  ctx.fillRect(0, 0, width, height);

  const particleCount = 80;
  for (let i = 0; i < particleCount; i++) {
    const bandIdx = Math.floor((i / particleCount) * bufferLength);
    const val = dataArray[bandIdx] / 255;

    const angle = (i / particleCount) * Math.PI * 2 + t * 0.5;
    const radius = 30 + val * 150 + Math.sin(t + i) * 20;
    const x = width / 2 + Math.cos(angle) * radius;
    const y = height / 2 + Math.sin(angle) * radius;
    const size = 2 + val * 6;

    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${260 + val * 40}, 80%, ${60 + val * 30}%, 0.8)`;
    ctx.fill();

    // Glow
    const glow = ctx.createRadialGradient(x, y, 0, x, y, size * 3);
    glow.addColorStop(0, `rgba(155,126,255,${val * 0.4})`);
    glow.addColorStop(1, "rgba(155,126,255,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, size * 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Center star
  const starSize = 4 + Math.sin(t * 2) * 2;
  ctx.beginPath();
  ctx.arc(width / 2, height / 2, starSize, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,229,255,0.9)";
  ctx.fill();
}

const DRAW_FNS = {
  cosmic: drawCosmic,
  spectrum: drawSpectrum,
  energy: drawEnergyRings,
  waveform: drawWaveform,
  particles: drawParticles,
};

export default function VisualizerPanel({ open, onClose }) {
  const { currentTrack, isPlaying } = usePlayer() || {};
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const styleIdx = useRef(0);
  const [styleKey, setStyleKey] = useState("cosmic");
  const [analyserData, setAnalyserData] = useState(null);
  const fallbackRef = useRef(false);

  const handlePrev = useCallback(() => {
    styleIdx.current = (styleIdx.current - 1 + STYLES.length) % STYLES.length;
    setStyleKey(STYLES[styleIdx.current].key);
  }, []);

  const handleNext = useCallback(() => {
    styleIdx.current = (styleIdx.current + 1) % STYLES.length;
    setStyleKey(STYLES[styleIdx.current].key);
  }, []);

  useEffect(() => {
    if (!open) return;

    // Request analyser from PlayerContext
    const audioEl = document.querySelector("audio");
    if (audioEl && !analyserData) {
      const result = requestAnalyser(audioEl);
      if (result?.analyser) {
        setAnalyserData(result.analyser);
      } else {
        fallbackRef.current = true;
      }
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    const bufferLength = analyserData ? analyserData.frequencyBinCount : 1024;
    const dataArray = new Uint8Array(bufferLength);

    let frame = 0;
    const animate = () => {
      animRef.current = requestAnimationFrame(animate);
      const t = frame * 0.016;

      if (analyserData) {
        analyserData.getByteFrequencyData(dataArray);
      } else {
        // Fallback: fake data for visual effect when no analyser
        for (let i = 0; i < bufferLength; i++) {
          dataArray[i] = 60 + Math.sin(t * 3 + i * 0.05) * 40 + Math.sin(t * 5 + i * 0.02) * 30;
        }
      }

      const drawFn = DRAW_FNS[styleKey] || DRAW_FNS.cosmic;
      drawFn(canvas, ctx, dataArray, bufferLength, t);
      frame++;
    };

    animate();

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [open, styleKey, analyserData]);

  // Attempt to get analyser when panel opens
  useEffect(() => {
    if (!open || analyserData || fallbackRef.current) return;
    const timer = setTimeout(() => {
      const audioEl = document.querySelector("audio");
      if (audioEl) {
        const result = requestAnalyser(audioEl);
        if (result?.analyser) setAnalyserData(result.analyser);
        else fallbackRef.current = true;
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [open, analyserData]);

  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-35 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.92)" }}
    >
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
      />

      {/* Top controls */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.75rem)" }}>
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all hover:bg-white/15"
          style={{ background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)" }}
        >
          <X className="w-3.5 h-3.5" /> Exit
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrev}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:bg-white/15"
            style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)" }}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-[10px] font-black tracking-wider text-white/50">
            {STYLES.find(s => s.key === styleKey)?.label || "Cosmic Tunnel"}
          </span>
          <button
            onClick={handleNext}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:bg-white/15"
            style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)" }}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-cyan-400" />
          <span className="text-[10px] font-black tracking-wider text-cyan-400/60">
            {isPlaying ? "REACTING" : "VISUAL"}
          </span>
        </div>
      </div>

      {/* Now Playing (bottom) */}
      {currentTrack && (
        <div className="absolute bottom-0 left-0 right-0 z-10 flex justify-center px-4"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1.5rem)" }}>
          <div
            className="flex items-center gap-3 px-4 py-2.5 rounded-2xl max-w-sm w-full"
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.1)",
              backdropFilter: "blur(12px)",
            }}
          >
            <Disc3 className="w-4 h-4 text-cyan-400" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">{currentTrack.title}</p>
              <p className="text-[10px] text-white/35 truncate">
                {currentTrack.artist_display || "Upper Vibe Media"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Style dots indicator */}
      <div className="absolute bottom-16 left-0 right-0 z-10 flex justify-center gap-2">
        {STYLES.map((s) => (
          <button
            key={s.key}
            onClick={() => { styleIdx.current = STYLES.indexOf(s); setStyleKey(s.key); }}
            className="w-2 h-2 rounded-full transition-all"
            style={{
              background: s.key === styleKey
                ? "rgba(155,126,255,0.9)"
                : "rgba(255,255,255,0.15)",
              transform: s.key === styleKey ? "scale(1.4)" : "scale(1)",
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}