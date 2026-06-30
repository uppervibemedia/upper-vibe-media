import React from "react";
import { motion, AnimatePresence } from "framer-motion";

const LABELS = {
  surf: { title: "Surf Challenge", exit: "Exit Surf", unit: "checkpoints" },
  dive: { title: "Dive Adventure", exit: "Exit Dive", unit: "collectibles" },
  coaster: { title: "Vibe Coaster", exit: "Exit Ride", unit: "ride" },
};

export default function BeachActivityHUD({ activity, onExit, isMobile, mobileLayout }) {
  if (!activity?.active) return null;
  const cfg = LABELS[activity.type] || LABELS.surf;
  const progress = activity.total ? `${activity.progress || 0}/${activity.total}` : "0/0";
  const bottom = isMobile && mobileLayout ? mobileLayout.actionBottom + 58 : isMobile ? 300 : 112;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 16 }}
        className="absolute left-0 right-0 z-[84] flex justify-center px-3 pointer-events-none"
        style={{ bottom }}
      >
        <div className="flex items-center gap-2 rounded-2xl px-3 py-2 pointer-events-auto" style={{ background: "rgba(4,12,24,0.78)", border: "1px solid rgba(0,229,255,0.25)", backdropFilter: "blur(14px)", maxWidth: "calc(100vw - 24px)" }}>
          <div className="min-w-0">
            <p className="text-[10px] font-black tracking-[0.16em] text-cyan-200/80 truncate">{cfg.title}</p>
            <p className="text-[11px] text-white/65">{progress} {cfg.unit}</p>
          </div>
          <button onTouchStart={(e) => e.stopPropagation()} onClick={onExit} className="rounded-full px-4 py-2 font-black text-[10px] tracking-wider active:scale-95" style={{ background: "linear-gradient(135deg,#FF4FC3,#C43BFF)", color: "#fff", minHeight: 42, touchAction: "manipulation" }}>
            {cfg.exit}
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}