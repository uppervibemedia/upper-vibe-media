import React, { useState } from "react";
import { motion } from "framer-motion";
import { Compass, Music4, Radio, Rocket, AlertTriangle, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import UpperVibeCity from "@/components/vibeworld/UpperVibeCity";
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

// ── The hub / landing page — lightweight, no 3D loaded ──
function VibeWorldHub() {
  // Auto-launch via URL param for testing: ?launch=1
  const [launched, setLaunched] = useState(() => {
    try { return new URLSearchParams(window.location.search).get("launch") === "1"; } catch { return false; }
  });
  const [webglOk] = useState(() => isWebGLAvailable());

  if (launched) {
    return <UpperVibeCity onExit={() => setLaunched(false)} />;
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
            Explorable 3D City
          </span>
        </div>

        {/* Headline */}
        <div>
          <h1 className="font-heading font-black text-4xl md:text-5xl leading-[0.95] mb-4 text-white">
            Upper Vibe <span style={{ color: "#00A0DC", textShadow: "0 0 50px rgba(0,160,220,0.5)" }}>City</span>
          </h1>
          <p className="text-sm md:text-base text-white/45 leading-relaxed max-w-md mx-auto">
            Roam a living 3D city and step into its districts — the Music District, Radio Tower, Vibe Check Temple, Manifestation Gardens, and Concert Arena. Browse music, save favorites, and keep the vibe playing without ever leaving the world.
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