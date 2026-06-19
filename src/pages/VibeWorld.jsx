import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, Loader2, Compass, Music4, Radio, Sparkles, Rocket, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import VibeWorldCanvas from "@/components/vibeworld/VibeWorldCanvas";
import PageErrorBoundary from "@/components/shared/PageErrorBoundary";

// ── WebGL support detection ──
function isWebGLAvailable() {
  try {
    const canvas = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (canvas.getContext("webgl") || canvas.getContext("experimental-webgl")));
  } catch {
    return false;
  }
}

// ── The immersive 3D experience — only mounted after Launch ──
function WorldExperience({ onExit }) {
  const [loading, setLoading] = useState(true);

  // Safety timeout — force unmask after 8s even if scene never calls onLoaded
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 8000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="fixed inset-0 bg-[#050510] overflow-hidden z-[60]">
      {/* ── Loading overlay ── */}
      {loading && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-[#050510]">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#00A0DC" }} />
          <p className="font-heading font-black text-sm tracking-widest uppercase" style={{ color: "#9B7EFF" }}>
            Entering Upper Vibe World...
          </p>
        </div>
      )}

      {/* ── 3D Canvas ── */}
      <div className="absolute inset-0" style={loading ? { opacity: 0, pointerEvents: "none" } : undefined}>
        <VibeWorldCanvas onLoaded={() => setLoading(false)} />
      </div>

      {/* ── HUD overlay ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: loading ? 0 : 1 }}
        transition={{ delay: 0.5 }}
        className="absolute top-0 left-0 right-0 z-10 pointer-events-none"
      >
        <div className="flex items-center justify-between px-4 py-3"
          style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.75rem)" }}>
          <button
            onClick={onExit}
            className="pointer-events-auto inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all hover:bg-white/5"
            style={{ background: "rgba(10,10,30,0.7)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)", backdropFilter: "blur(12px)" }}
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Exit World
          </button>

          <div className="flex items-center gap-2 pointer-events-auto px-3 py-2 rounded-xl"
            style={{ background: "rgba(10,10,30,0.7)", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(12px)" }}>
            <Compass className="w-3.5 h-3.5" style={{ color: "#00A0DC" }} />
            <span className="font-heading font-black text-[10px] tracking-[0.2em] text-white/70">UPPER VIBE WORLD</span>
          </div>
        </div>
      </motion.div>

      {/* ── Bottom hint ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: loading ? 0 : 1, y: loading ? 20 : 0 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-0 left-0 right-0 z-10 flex justify-center pointer-events-none"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1.5rem)" }}
      >
        <p className="text-[10px] tracking-wider text-white/20 pointer-events-auto px-4 py-2 rounded-full"
          style={{ background: "rgba(10,10,30,0.5)", backdropFilter: "blur(12px)" }}>
          Tap a glowing portal to explore &nbsp;·&nbsp; Drag to look around
        </p>
      </motion.div>
    </div>
  );
}

// ── The hub / landing page — lightweight, no 3D loaded ──
function VibeWorldHub() {
  const [launched, setLaunched] = useState(false);
  const [webglOk] = useState(() => isWebGLAvailable());

  if (launched) {
    return <WorldExperience onExit={() => setLaunched(false)} />;
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden px-5 py-16 md:py-20"
      style={{ background: "linear-gradient(160deg,#05050f 0%,#080818 55%,#050510 100%)" }}>

      {/* ── Lightweight animated background ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          className="absolute top-[-120px] left-[10%] w-[420px] h-[420px] rounded-full blur-[120px]"
          style={{ background: "radial-gradient(circle,#00A0DC,transparent 70%)", opacity: 0.12 }}
          animate={{ scale: [1, 1.15, 1], opacity: [0.1, 0.16, 0.1] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-[-120px] right-[5%] w-[480px] h-[480px] rounded-full blur-[130px]"
          style={{ background: "radial-gradient(circle,#9B7EFF,transparent 70%)", opacity: 0.12 }}
          animate={{ scale: [1, 1.2, 1], opacity: [0.08, 0.15, 0.08] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[360px] h-[360px] rounded-full blur-[90px]"
          style={{ background: "radial-gradient(circle,#EC4899,transparent 70%)", opacity: 0.07 }}
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-lg flex flex-col items-center text-center gap-7"
      >
        {/* Animated orb icon */}
        <motion.div
          className="relative w-24 h-24 rounded-full flex items-center justify-center"
          style={{ background: "radial-gradient(circle at 30% 30%,rgba(0,160,220,0.4),rgba(155,126,255,0.25))", border: "1px solid rgba(155,126,255,0.4)", boxShadow: "0 0 60px rgba(0,160,220,0.4)" }}
          animate={{ scale: [1, 1.06, 1] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
          <Compass className="w-11 h-11 text-white" />
        </motion.div>

        {/* Eyebrow */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full"
          style={{ background: "rgba(155,126,255,0.1)", border: "1px solid rgba(155,126,255,0.25)" }}>
          <Sparkles className="w-3 h-3" style={{ color: "#9B7EFF" }} />
          <span className="text-[10px] font-black tracking-[0.25em] uppercase" style={{ color: "#9B7EFF" }}>
            Immersive 3D Experience
          </span>
        </div>

        {/* Headline */}
        <div>
          <h1 className="font-heading font-black text-4xl md:text-5xl leading-[0.95] mb-4 text-white">
            Upper Vibe <span style={{ color: "#00A0DC", textShadow: "0 0 50px rgba(0,160,220,0.5)" }}>World</span>
          </h1>
          <p className="text-sm md:text-base text-white/45 leading-relaxed max-w-md mx-auto">
            Step inside an interactive 3D space and travel through glowing portals to your music rooms, live radio, Vibe Check, and 432 Hz visual zones — all in one immersive environment.
          </p>
        </div>

        {/* ── Launch button OR WebGL fallback ── */}
        {webglOk ? (
          <motion.button
            onClick={() => setLaunched(true)}
            whileTap={{ scale: 0.96 }}
            className="flex items-center gap-3 px-9 py-4 rounded-full font-black text-base tracking-wider transition-all hover:brightness-110"
            style={{ background: "linear-gradient(135deg,#0080B8,#00A0DC)", color: "#fff", boxShadow: "0 0 40px rgba(0,160,220,0.45)" }}
          >
            <Rocket className="w-5 h-5" /> Launch World
          </motion.button>
        ) : (
          <div className="w-full flex flex-col items-center gap-2 px-5 py-5 rounded-2xl"
            style={{ background: "rgba(245,168,0,0.06)", border: "1px solid rgba(245,168,0,0.22)" }}>
            <AlertTriangle className="w-6 h-6" style={{ color: "#F5A800" }} />
            <p className="text-sm font-bold text-white">3D not supported on this device</p>
            <p className="text-xs text-white/45 leading-relaxed max-w-xs">
              Your browser or device doesn't support WebGL, which is required for the 3D world. You can still explore everything through the Music Library and Radio below.
            </p>
          </div>
        )}

        {/* ── Secondary navigation ── */}
        <div className="w-full grid grid-cols-2 gap-3 mt-2">
          <Link to="/music"
            className="flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold tracking-wide transition-all active:scale-[0.97]"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)" }}>
            <Music4 className="w-4 h-4" /> Music Library
          </Link>
          <Link to="/radio"
            className="flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold tracking-wide transition-all active:scale-[0.97]"
            style={{ background: "rgba(0,160,220,0.07)", border: "1px solid rgba(0,160,220,0.22)", color: "#00A0DC" }}>
            <Radio className="w-4 h-4" /> Go to Radio
          </Link>
        </div>

        <Link to="/" className="text-xs font-bold transition-colors hover:text-white/60" style={{ color: "rgba(255,255,255,0.3)" }}>
          ← Back to Home
        </Link>
      </motion.div>
    </div>
  );
}

export default function VibeWorld() {
  return (
    <PageErrorBoundary>
      <VibeWorldHub />
    </PageErrorBoundary>
  );
}