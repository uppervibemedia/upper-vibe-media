/**
 * EmoteEffect — floating emoji/particle effect above the avatar.
 * Renders as a DOM overlay, positioned at the center of the screen
 * slightly above mid-height (where the avatar head is in third-person view).
 * Animates in/out with framer-motion.
 */
import React from "react";
import { motion, AnimatePresence } from "framer-motion";

const EMOTE_DISPLAY = {
  dance:  { emoji: "🕺", label: "Dancing!", color: "#C43BFF" },
  wave:   { emoji: "👋", label: "Wave!",    color: "#00D4F0" },
  clap:   { emoji: "👏", label: "Clap!",    color: "#EDB84A" },
  heart:  { emoji: "❤️", label: "Love!",   color: "#FF4081" },
  fire:   { emoji: "🔥", label: "Fire!",    color: "#FF6D00" },
  peace:  { emoji: "✌️", label: "Peace!",  color: "#A078FF" },
};

// Floating particle — one emoji that drifts upward then fades
function Particle({ emoji, delay, offsetX }) {
  return (
    <motion.span
      initial={{ opacity: 0, y: 0, x: offsetX, scale: 0.4 }}
      animate={{ opacity: [0, 1, 1, 0], y: -70, x: offsetX + (Math.random() > 0.5 ? 8 : -8), scale: [0.4, 1.1, 1.0, 0.7] }}
      transition={{ duration: 1.6, delay, ease: "easeOut" }}
      style={{ position: "absolute", fontSize: 24, pointerEvents: "none", userSelect: "none" }}
    >
      {emoji}
    </motion.span>
  );
}

export default function EmoteEffect({ activeEmote, isMobile }) {
  if (!activeEmote || activeEmote.id === "dance") return null;

  const display = EMOTE_DISPLAY[activeEmote.id];
  if (!display) return null;

  // Burst of 4 particles, staggered
  const particles = [0, 1, 2, 3].map((i) => ({
    key: `${activeEmote.startedAt}-${i}`,
    delay: i * 0.18,
    offsetX: (i - 1.5) * 20,
  }));

  return (
    <AnimatePresence>
      <motion.div
        key={`emote-${activeEmote.startedAt}`}
        initial={{ opacity: 0, scale: 0.5, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: -10 }}
        transition={{ type: "spring", damping: 18, stiffness: 320 }}
        style={{
          position: "fixed",
          left: "50%",
          top: isMobile ? "32%" : "28%",
          transform: "translateX(-50%)",
          zIndex: 72,
          pointerEvents: "none",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 4,
        }}
      >
        {/* Particle burst */}
        <div style={{ position: "relative", width: 80, height: 80, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {particles.map((p) => (
            <Particle key={p.key} emoji={display.emoji} delay={p.delay} offsetX={p.offsetX} />
          ))}
          {/* Big center emoji */}
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.3, 1.0] }}
            transition={{ duration: 0.4, ease: "backOut" }}
            style={{ fontSize: isMobile ? 36 : 44, position: "relative", zIndex: 2, filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.5))" }}
          >
            {display.emoji}
          </motion.span>
        </div>

        {/* Label badge */}
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          style={{
            background: `${display.color}22`,
            border: `1px solid ${display.color}55`,
            borderRadius: 20,
            padding: "2px 10px",
            backdropFilter: "blur(8px)",
          }}
        >
          <span style={{ color: display.color, fontSize: isMobile ? 10 : 11, fontWeight: 900, letterSpacing: "0.15em" }}>
            {display.label}
          </span>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}