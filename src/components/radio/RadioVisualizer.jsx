import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

const STORAGE_KEY = "uvm_visualizer_style";

// ── Canvas-based audio-reactive visualizers ───────────────────────────────────
// Each uses requestAnimationFrame + AnalyserNode for real audio data.
// Falls back to animated idle when analyser is unavailable (iOS / not playing).

function useAnalyserData(isPlaying, binCount = 64) {
  const dataRef = useRef(new Uint8Array(binCount));
  const rafRef  = useRef(null);

  const tick = useCallback(() => {
    const analyser = window._uvAnalyser;
    if (analyser && isPlaying) {
      const buf = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(buf);
      // Downsample to binCount
      const step = Math.floor(buf.length / binCount);
      for (let i = 0; i < binCount; i++) {
        let s = 0;
        for (let j = 0; j < step; j++) s += buf[i * step + j];
        dataRef.current[i] = s / step;
      }
    } else {
      // Idle: fill with low noise
      for (let i = 0; i < binCount; i++) {
        dataRef.current[i] = 8 + Math.sin(Date.now() / 1200 + i * 0.4) * 6;
      }
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [isPlaying, binCount]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [tick]);

  return dataRef;
}

// ── BARS ──────────────────────────────────────────────────────────────────────
function BarsViz({ isPlaying }) {
  const canvasRef = useRef(null);
  const dataRef   = useAnalyserData(isPlaying, 48);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let raf;

    const draw = () => {
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      const bins = dataRef.current.length;
      const gap  = 2;
      const barW = (W - gap * (bins - 1)) / bins;

      for (let i = 0; i < bins; i++) {
        const val = dataRef.current[i] / 255;
        const h   = Math.max(3, val * H);
        const x   = i * (barW + gap);
        const hue = i % 3 === 0 ? "rgba(0,200,220," : i % 3 === 1 ? "rgba(155,126,255," : "rgba(0,200,220,";
        const alpha = 0.3 + val * 0.7;
        ctx.fillStyle = `${hue}${alpha})`;
        ctx.beginPath();
        ctx.roundRect(x, H - h, barW, h, 3);
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [dataRef]);

  return <canvas ref={canvasRef} width={440} height={110} className="w-full" style={{ height: 110 }} />;
}

// ── WAVEFORM ──────────────────────────────────────────────────────────────────
function WaveformViz({ isPlaying }) {
  const canvasRef = useRef(null);
  const dataRef   = useAnalyserData(isPlaying, 64);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let raf;

    const draw = () => {
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      const bins = dataRef.current.length;
      const sliceW = W / bins;

      ctx.lineWidth = 2;
      const grad = ctx.createLinearGradient(0, 0, W, 0);
      grad.addColorStop(0,    "rgba(0,229,255,0.2)");
      grad.addColorStop(0.5,  "rgba(0,229,255,0.9)");
      grad.addColorStop(1,    "rgba(0,229,255,0.2)");
      ctx.strokeStyle = grad;

      ctx.beginPath();
      for (let i = 0; i < bins; i++) {
        const val = dataRef.current[i] / 255;
        const x   = i * sliceW;
        const y   = H / 2 - (val - 0.5) * H * 0.85;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Mirror bottom
      ctx.beginPath();
      for (let i = 0; i < bins; i++) {
        const val = dataRef.current[i] / 255;
        const x   = i * sliceW;
        const y   = H / 2 + (val - 0.5) * H * 0.85;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.globalAlpha = 0.35;
      ctx.stroke();
      ctx.globalAlpha = 1;

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [dataRef]);

  return <canvas ref={canvasRef} width={440} height={110} className="w-full" style={{ height: 110 }} />;
}

// ── PULSE RING ────────────────────────────────────────────────────────────────
function PulseRingViz({ isPlaying }) {
  const canvasRef = useRef(null);
  const dataRef   = useAnalyserData(isPlaying, 32);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let raf;

    const draw = () => {
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      const cx = W / 2, cy = H / 2;

      // Average low-freq energy for pulse
      let energy = 0;
      for (let i = 0; i < 8; i++) energy += dataRef.current[i];
      energy = energy / 8 / 255;

      const rings = [
        { r: 18 + energy * 22, color: "rgba(0,229,255,", w: 2 },
        { r: 32 + energy * 28, color: "rgba(155,126,255,", w: 1.5 },
        { r: 46 + energy * 32, color: "rgba(0,229,255,", w: 1 },
        { r: 60 + energy * 36, color: "rgba(155,126,255,", w: 1 },
      ];

      rings.forEach((ring, i) => {
        const alpha = Math.max(0.08, 0.6 - i * 0.12 - (1 - energy) * 0.3);
        ctx.beginPath();
        ctx.arc(cx, cy, ring.r, 0, Math.PI * 2);
        ctx.strokeStyle = `${ring.color}${alpha})`;
        ctx.lineWidth = ring.w;
        ctx.stroke();
      });

      // Core dot
      const coreR = 6 + energy * 8;
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR);
      grad.addColorStop(0, "#00E5FF");
      grad.addColorStop(1, "rgba(0,229,255,0)");
      ctx.beginPath();
      ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [dataRef]);

  return <canvas ref={canvasRef} width={440} height={110} className="w-full" style={{ height: 110 }} />;
}

// ── COSMIC PARTICLES ──────────────────────────────────────────────────────────
function CosmicParticlesViz({ isPlaying }) {
  const canvasRef  = useRef(null);
  const dataRef    = useAnalyserData(isPlaying, 24);
  const partsRef   = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;

    // Init particles
    partsRef.current = Array.from({ length: 40 }, (_, i) => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.4,
      vy: -0.3 - Math.random() * 0.4,
      r: 1.5 + Math.random() * 2.5,
      bin: Math.floor((i / 40) * 24),
      color: i % 3 === 0 ? "#00E5FF" : i % 3 === 1 ? "#9B7EFF" : "#EDB84A",
    }));

    let raf;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      partsRef.current.forEach((p) => {
        const energy = (dataRef.current[p.bin] || 0) / 255;
        const speed  = isPlaying ? 1 + energy * 4 : 0.3;

        p.x += p.vx * speed;
        p.y += p.vy * speed;

        if (p.y < -4) { p.y = H + 4; p.x = Math.random() * W; }
        if (p.x < -4) p.x = W + 4;
        if (p.x > W + 4) p.x = -4;

        const alpha = 0.3 + energy * 0.7;
        const size  = p.r * (1 + energy * 1.5);
        ctx.beginPath();
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha;
        ctx.fill();
        if (energy > 0.4) {
          ctx.shadowBlur = 8;
          ctx.shadowColor = p.color;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
        ctx.globalAlpha = 1;
      });
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [dataRef, isPlaying]);

  return <canvas ref={canvasRef} width={440} height={110} className="w-full" style={{ height: 110 }} />;
}

// ── NEON TUNNEL ───────────────────────────────────────────────────────────────
function NeonTunnelViz({ isPlaying }) {
  const canvasRef = useRef(null);
  const dataRef   = useAnalyserData(isPlaying, 8);
  const tRef      = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let raf;

    const draw = () => {
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      tRef.current += 0.02;
      const t = tRef.current;

      const cx = W / 2, cy = H / 2;
      const RINGS = 7;

      for (let i = RINGS; i >= 1; i--) {
        const energy = (dataRef.current[RINGS - i] || 0) / 255;
        const r      = (i / RINGS) * (Math.min(W, H) * 0.48) * (1 + (isPlaying ? energy * 0.2 : 0));
        const alpha  = 0.15 + (isPlaying ? energy * 0.65 : 0.1);
        const color  = i % 2 === 0 ? `rgba(0,229,255,${alpha})` : `rgba(155,126,255,${alpha})`;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(t * (i % 2 === 0 ? 1 : -1) * 0.4);
        ctx.beginPath();
        ctx.ellipse(0, 0, r, r * 0.45, 0, 0, Math.PI * 2);
        ctx.strokeStyle = color;
        ctx.lineWidth   = 1.5;
        ctx.stroke();
        ctx.restore();
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [dataRef, isPlaying]);

  return <canvas ref={canvasRef} width={440} height={110} className="w-full" style={{ height: 110 }} />;
}

// ── ENERGY GRID ───────────────────────────────────────────────────────────────
function EnergyGridViz({ isPlaying }) {
  const canvasRef = useRef(null);
  const dataRef   = useAnalyserData(isPlaying, 24);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let raf;

    const COLS = 10, ROWS = 4;
    const draw = () => {
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      const cw = W / COLS, ch = H / ROWS;
      const gap = 3;

      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          const bin   = Math.floor(((col + row * COLS) / (COLS * ROWS)) * 24);
          const energy= (dataRef.current[bin] || 0) / 255;
          const x     = col * cw + gap;
          const y     = row * ch + gap;
          const w     = cw - gap * 2;
          const h     = ch - gap * 2;
          const alpha = 0.08 + energy * 0.85;
          const color = (col + row) % 3 === 0 ? `rgba(0,229,255,${alpha})` : (col + row) % 3 === 1 ? `rgba(155,126,255,${alpha})` : `rgba(237,184,74,${alpha})`;

          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.roundRect(x, y, w, h, 4);
          ctx.fill();
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [dataRef]);

  return <canvas ref={canvasRef} width={440} height={110} className="w-full" style={{ height: 110 }} />;
}

// ── Style selector bottom sheet ───────────────────────────────────────────────
function StyleSheet({ open, onClose, current, onSelect }) {
  const options = [
    { name: "Bars",             emoji: "📊" },
    { name: "Waveform",         emoji: "〰️" },
    { name: "Pulse Ring",       emoji: "🔵" },
    { name: "Cosmic Particles", emoji: "✨" },
    { name: "Neon Tunnel",      emoji: "🌀" },
    { name: "Energy Grid",      emoji: "⚡" },
  ];

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center" style={{ WebkitOverflowScrolling: "touch" }}>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 320 }}
            className="relative w-full max-w-lg overflow-hidden"
            style={{
              background: "linear-gradient(160deg,#0d0d22,#0a0a1a)",
              border: "1px solid rgba(0,200,220,0.2)",
              borderBottom: "none",
              borderRadius: "24px 24px 0 0",
              boxShadow: "0 -8px 60px rgba(0,200,220,0.12)",
            }}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }} />
            </div>
            <div className="px-5 pt-2 pb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <p className="font-heading font-black text-white text-base">Visualizer Style ⚡</p>
              <p className="text-[11px] text-white/30 mt-0.5">Choose how the radio comes alive</p>
            </div>
            <div className="px-4 py-3 grid grid-cols-2 gap-2.5"
              style={{ paddingBottom: `calc(env(safe-area-inset-bottom, 16px) + 100px)` }}>
              {options.map((opt) => {
                const active = current === opt.name;
                return (
                  <button key={opt.name}
                    onClick={() => { onSelect(opt.name); onClose(); }}
                    className="flex items-center gap-3 px-4 rounded-2xl font-bold text-sm transition-all active:scale-[0.97]"
                    style={{
                      minHeight: 52,
                      background: active ? "rgba(0,200,220,0.12)" : "rgba(255,255,255,0.04)",
                      border: active ? "1px solid rgba(0,200,220,0.4)" : "1px solid rgba(255,255,255,0.08)",
                      color: active ? "#00E5FF" : "rgba(255,255,255,0.65)",
                    }}
                  >
                    <span className="text-lg leading-none">{opt.emoji}</span>
                    <span>{opt.name}</span>
                    {active && <span className="ml-auto text-[10px] font-black tracking-wide text-cyan-400">ON</span>}
                  </button>
                );
              })}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ── Main exported component ───────────────────────────────────────────────────
export default function RadioVisualizer({ isPlaying }) {
  const [style, setStyle] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) || "Bars"; } catch { return "Bars"; }
  });
  const [sheetOpen, setSheetOpen] = useState(false);

  const handleSelect = (s) => {
    setStyle(s);
    try { localStorage.setItem(STORAGE_KEY, s); } catch {}
  };

  const renderViz = () => {
    switch (style) {
      case "Waveform":         return <WaveformViz isPlaying={isPlaying} />;
      case "Pulse Ring":       return <PulseRingViz isPlaying={isPlaying} />;
      case "Cosmic Particles": return <CosmicParticlesViz isPlaying={isPlaying} />;
      case "Neon Tunnel":      return <NeonTunnelViz isPlaying={isPlaying} />;
      case "Energy Grid":      return <EnergyGridViz isPlaying={isPlaying} />;
      default:                 return <BarsViz isPlaying={isPlaying} />;
    }
  };

  return (
    <>
      <div className="w-full" style={{ minHeight: 110 }}>
        {renderViz()}
      </div>

      <div className="flex justify-center pt-2 pb-1">
        <button
          onClick={() => setSheetOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full text-[11px] font-black tracking-wide transition-all hover:brightness-115 active:scale-95"
          style={{
            background: "rgba(0,200,220,0.07)",
            border: "1px solid rgba(0,200,220,0.2)",
            color: "rgba(0,200,220,0.75)",
          }}
        >
          Change Visualizer ⚡
        </button>
      </div>

      <StyleSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        current={style}
        onSelect={handleSelect}
      />
    </>
  );
}