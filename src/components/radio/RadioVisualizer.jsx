import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

const STORAGE_KEY = "uvm_visualizer_style";

const STYLES = ["Bars", "Waveform", "Pulse Ring", "Cosmic Particles", "Neon Tunnel", "Energy Grid"];

// ── Individual style renderers ────────────────────────────────────────────────

function BarsViz({ isPlaying }) {
  const BAR_COUNT = 32;
  return (
    <div className="w-full flex items-end justify-center gap-[2px] px-4" style={{ height: 110 }}>
      {Array.from({ length: BAR_COUNT }).map((_, i) => {
        const delay = (i / BAR_COUNT) * 0.8;
        const minH = 4 + Math.sin(i * 0.6) * 4;
        const maxH = 30 + Math.sin(i * 0.4) * 40 + Math.cos(i * 0.7) * 20;
        return (
          <motion.div key={i} className="rounded-full flex-shrink-0"
            style={{ width: 5, background: i % 3 === 0 ? "rgba(0,200,220,0.75)" : i % 3 === 1 ? "rgba(155,126,255,0.65)" : "rgba(0,200,220,0.35)" }}
            animate={{ height: isPlaying ? [minH, maxH, minH * 1.5, maxH * 0.7, minH] : [minH, minH + 2, minH] }}
            transition={{ duration: isPlaying ? 0.8 : 2, repeat: Infinity, ease: "easeInOut", delay }}
          />
        );
      })}
    </div>
  );
}

function WaveformViz({ isPlaying }) {
  const BAR_COUNT = 48;
  return (
    <div className="w-full flex items-center justify-center gap-[1.5px] px-2" style={{ height: 110 }}>
      {Array.from({ length: BAR_COUNT }).map((_, i) => {
        const center = BAR_COUNT / 2;
        const dist = Math.abs(i - center) / center;
        const base = 2;
        const peak = isPlaying ? (1 - dist) * 60 + 4 : 6;
        const delay = (i / BAR_COUNT) * 1.2;
        return (
          <motion.div key={i} className="rounded-full flex-shrink-0"
            style={{ width: 3, background: `rgba(0,229,255,${0.3 + (1 - dist) * 0.6})` }}
            animate={{ height: isPlaying ? [base, peak, base + 3, peak * 0.6, base] : [base, 8, base] }}
            transition={{ duration: isPlaying ? 1.1 : 2.5, repeat: Infinity, ease: "easeInOut", delay }}
          />
        );
      })}
    </div>
  );
}

function PulseRingViz({ isPlaying }) {
  return (
    <div className="w-full flex items-center justify-center" style={{ height: 110 }}>
      <div className="relative flex items-center justify-center">
        {[0, 1, 2, 3].map((i) => (
          <motion.div key={i}
            className="absolute rounded-full border"
            style={{ borderColor: i % 2 === 0 ? "rgba(0,200,220,0.4)" : "rgba(155,126,255,0.35)" }}
            animate={isPlaying
              ? { width: [20 + i * 18, 32 + i * 22, 20 + i * 18], height: [20 + i * 18, 32 + i * 22, 20 + i * 18], opacity: [0.7, 0.2, 0.7] }
              : { width: [20 + i * 18, 22 + i * 18, 20 + i * 18], height: [20 + i * 18, 22 + i * 18, 20 + i * 18], opacity: [0.3, 0.5, 0.3] }
            }
            transition={{ duration: isPlaying ? 1.2 + i * 0.3 : 3, repeat: Infinity, ease: "easeInOut", delay: i * 0.2 }}
          />
        ))}
        <motion.div className="w-5 h-5 rounded-full"
          style={{ background: "radial-gradient(circle,#00E5FF,#009CB8)" }}
          animate={{ scale: isPlaying ? [1, 1.4, 1] : [1, 1.05, 1], opacity: isPlaying ? [0.9, 0.5, 0.9] : [0.5, 0.7, 0.5] }}
          transition={{ duration: isPlaying ? 0.9 : 2.5, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
    </div>
  );
}

function CosmicParticlesViz({ isPlaying }) {
  const DOTS = 20;
  return (
    <div className="w-full relative overflow-hidden" style={{ height: 110 }}>
      {Array.from({ length: DOTS }).map((_, i) => {
        const x = 5 + (i / DOTS) * 90;
        const baseY = 30 + Math.sin(i * 1.3) * 25;
        const color = i % 3 === 0 ? "#00E5FF" : i % 3 === 1 ? "#9B7EFF" : "#EDB84A";
        const size = 3 + (i % 4);
        return (
          <motion.div key={i}
            className="absolute rounded-full"
            style={{ left: `${x}%`, width: size, height: size, background: color, boxShadow: `0 0 6px ${color}` }}
            animate={isPlaying
              ? { top: [baseY, baseY - 20 - (i % 5) * 10, baseY + 10, baseY], opacity: [0.6, 1, 0.4, 0.6] }
              : { top: [baseY, baseY + 3, baseY], opacity: [0.3, 0.5, 0.3] }
            }
            transition={{ duration: isPlaying ? 1.5 + (i % 4) * 0.3 : 3, repeat: Infinity, ease: "easeInOut", delay: (i / DOTS) * 1.5 }}
          />
        );
      })}
    </div>
  );
}

function NeonTunnelViz({ isPlaying }) {
  const RINGS = 6;
  return (
    <div className="w-full flex items-center justify-center" style={{ height: 110 }}>
      <div className="relative flex items-center justify-center">
        {Array.from({ length: RINGS }).map((_, i) => {
          const size = 14 + i * 16;
          const color = i % 2 === 0 ? "rgba(0,229,255," : "rgba(155,126,255,";
          return (
            <motion.div key={i}
              className="absolute rounded-full"
              style={{ width: size, height: size, border: `1.5px solid ${color}0.5)` }}
              animate={isPlaying
                ? { scale: [1, 1.15, 1], opacity: [0.3, 0.8, 0.3], rotate: [0, i % 2 === 0 ? 15 : -15, 0] }
                : { scale: [1, 1.03, 1], opacity: [0.15, 0.3, 0.15] }
              }
              transition={{ duration: isPlaying ? 1.4 + i * 0.2 : 3.5, repeat: Infinity, ease: "easeInOut", delay: i * 0.15 }}
            />
          );
        })}
      </div>
    </div>
  );
}

function EnergyGridViz({ isPlaying }) {
  const COLS = 8, ROWS = 3;
  return (
    <div className="w-full flex items-center justify-center" style={{ height: 110 }}>
      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}>
        {Array.from({ length: COLS * ROWS }).map((_, i) => {
          const col = i % COLS;
          const row = Math.floor(i / COLS);
          const delay = (col + row) * 0.1;
          const color = (col + row) % 3 === 0 ? "#00E5FF" : (col + row) % 3 === 1 ? "#9B7EFF" : "#EDB84A";
          return (
            <motion.div key={i}
              className="rounded-sm"
              style={{ width: 10, height: 10, background: color }}
              animate={isPlaying
                ? { opacity: [0.15, 0.9, 0.15], scale: [0.8, 1.2, 0.8] }
                : { opacity: [0.1, 0.2, 0.1], scale: [1, 1, 1] }
              }
              transition={{ duration: isPlaying ? 0.9 : 2.5, repeat: Infinity, ease: "easeInOut", delay }}
            />
          );
        })}
      </div>
    </div>
  );
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
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          {/* Sheet */}
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
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }} />
            </div>

            {/* Header */}
            <div className="px-5 pt-2 pb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <p className="font-heading font-black text-white text-base">Visualizer Style ⚡</p>
              <p className="text-[11px] text-white/30 mt-0.5">Choose how the radio comes alive</p>
            </div>

            {/* Options */}
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
      {/* Visualizer canvas */}
      <div className="w-full" style={{ minHeight: 110 }}>
        {renderViz()}
      </div>

      {/* Change Visualizer button — sits below the viz, above controls */}
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

      {/* Bottom sheet selector */}
      <StyleSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        current={style}
        onSelect={handleSelect}
      />
    </>
  );
}