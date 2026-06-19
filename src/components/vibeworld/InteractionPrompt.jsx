import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DISTRICTS } from "./cityData";

/**
 * InteractionPrompt — shows when the player enters a district's zone.
 * Desktop: "Press E to enter"
 * Mobile: "Tap to enter"
 */
export default function InteractionPrompt({ zoneId, onEnter }) {
  if (!zoneId) return null;
  const dist = DISTRICTS[zoneId];
  if (!dist) return null;

  const isMobile = "ontouchstart" in window || navigator.maxTouchPoints > 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.95 }}
        className="absolute bottom-32 left-1/2 -translate-x-1/2 z-30 pointer-events-none"
      >
        <button
          onClick={isMobile ? onEnter : undefined}
          className="pointer-events-auto flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold tracking-wide transition-all active:scale-95"
          style={{
            background: `rgba(${dist.accent},0.15)`,
            border: `1px solid rgba(${dist.accent},0.4)`,
            color: `rgb(${dist.accent})`,
            boxShadow: `0 0 30px rgba(${dist.accent},0.2)`,
          }}
        >
          <span className="text-base">{isMobile ? "👆" : "⌨️"}</span>
          <span>
            {isMobile ? "Tap to enter" : "Press E to enter"} {dist.title}
          </span>
        </button>
      </motion.div>
    </AnimatePresence>
  );
}