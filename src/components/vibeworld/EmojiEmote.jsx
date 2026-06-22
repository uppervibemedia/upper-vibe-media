/**
 * EmojiEmote — floating emoji above the player avatar for non-dance emotes.
 * Renders a big emoji that floats up and fades for wave/heart/fire/peace,
 * and a persistent dance note for the "clap/dance" emote.
 */
import React, { useEffect, useState, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";

const EMOTE_EMOJIS = {
  wave:  "👋",
  heart: "❤️",
  fire:  "🔥",
  peace: "✌️",
  clap:  "👏",
  dance: "🎵",
};

// Non-dance emotes: show floating emoji that rises and fades
const BODY_EMOTES = new Set(["dance", "clap"]);

export default function EmojiEmote({ activeEmote, isDancing, isMobile }) {
  const [particles, setParticles] = useState([]);
  const intervalRef = useRef(null);
  const counterRef = useRef(0);

  useEffect(() => {
    if (!isDancing || !activeEmote) {
      setParticles([]);
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    const emoji = EMOTE_EMOJIS[activeEmote.id];
    if (!emoji) return;

    // Emit a new particle immediately, then every 1.2s
    const emit = () => {
      const id = counterRef.current++;
      setParticles((prev) => [...prev.slice(-4), { id, emoji }]); // max 5 particles
    };

    emit();
    intervalRef.current = setInterval(emit, 1200);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isDancing, activeEmote?.id]);

  const removeParticle = (id) => {
    setParticles((prev) => prev.filter((p) => p.id !== id));
  };

  if (!isDancing || !activeEmote || !EMOTE_EMOJIS[activeEmote.id]) return null;

  return (
    <div
      className="pointer-events-none fixed z-[95]"
      style={{
        // Center of screen, sits above avatar (lower-center area)
        left: "50%",
        bottom: isMobile
          ? "calc(env(safe-area-inset-bottom, 0px) + 11rem)"
          : "10rem",
        transform: "translateX(-50%)",
        width: 60,
        height: 80,
      }}
    >
      <AnimatePresence>
        {particles.map((p) => (
          <motion.div
            key={p.id}
            initial={{ y: 0, opacity: 1, scale: 1 }}
            animate={{ y: -70, opacity: 0, scale: 1.4 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.1, ease: "easeOut" }}
            onAnimationComplete={() => removeParticle(p.id)}
            style={{
              position: "absolute",
              left: "50%",
              bottom: 0,
              transform: "translateX(-50%)",
              fontSize: isMobile ? "28px" : "32px",
              userSelect: "none",
              filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.6))",
            }}
          >
            {p.emoji}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}