import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, Loader2, Compass } from "lucide-react";
import { Link } from "react-router-dom";
import VibeWorldCanvas from "@/components/vibeworld/VibeWorldCanvas";
import PageErrorBoundary from "@/components/shared/PageErrorBoundary";

function VibeWorldInner() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Safety timeout — force unmask after 8s even if scene never calls onLoaded
  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(false);
    }, 8000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="fixed inset-0 bg-[#050510] overflow-hidden">
      {/* ── Loading overlay ── */}
      {loading && (
        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: loading ? 1 : 0 }}
          className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-[#050510]"
        >
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#00A0DC" }} />
          <p className="font-heading font-black text-sm tracking-widest uppercase" style={{ color: "#9B7EFF" }}>
            Entering Upper Vibe World...
          </p>
        </motion.div>
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
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-3"
          style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.75rem)" }}>
          <Link
            to="/"
            className="pointer-events-auto inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all hover:bg-white/5"
            style={{ background: "rgba(10,10,30,0.7)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)", backdropFilter: "blur(12px)" }}
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Back
          </Link>

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

export default function VibeWorld() {
  return (
    <PageErrorBoundary>
      <VibeWorldInner />
    </PageErrorBoundary>
  );
}