import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";

const ACCENT = "236,72,153";
const PHASES = [
  { label: "Breathe In", dur: 4000, scale: 1.4 },
  { label: "Hold", dur: 4000, scale: 1.4 },
  { label: "Breathe Out", dur: 6000, scale: 1 },
];

export default function TemplePanel() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setPhase((p) => (p + 1) % PHASES.length), PHASES[phase].dur);
    return () => clearTimeout(t);
  }, [phase]);

  const current = PHASES[phase];

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      <p className="text-sm text-white/55 text-center leading-relaxed max-w-xs">
        Step into the Temple. Center yourself, sync your breath to the light, and check in with your vibe.
      </p>

      <div className="relative flex items-center justify-center h-56 w-56">
        <motion.div
          className="absolute rounded-full"
          style={{ width: 120, height: 120, background: `radial-gradient(circle,rgba(${ACCENT},0.35),transparent 70%)`, border: `1px solid rgba(${ACCENT},0.4)` }}
          animate={{ scale: current.scale }}
          transition={{ duration: current.dur / 1000, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute rounded-full"
          style={{ width: 70, height: 70, background: `rgba(${ACCENT},0.18)`, border: `1px solid rgba(${ACCENT},0.5)` }}
          animate={{ scale: current.scale }}
          transition={{ duration: current.dur / 1000, ease: "easeInOut" }}
        />
        <span className="relative z-10 font-heading font-black text-base tracking-wide" style={{ color: `rgb(${ACCENT})` }}>
          {current.label}
        </span>
      </div>

      <p className="text-xs text-white/35 text-center max-w-xs leading-relaxed">
        432 Hz frequencies and slow breathing help reset your nervous system. Stay as long as you like — the music keeps playing.
      </p>
    </div>
  );
}