import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, Flower2 } from "lucide-react";

const ACCENT = "52,211,153";
const AFFIRMATIONS = [
  "I am aligned with abundance and high frequency energy.",
  "Everything I need is already flowing toward me.",
  "My mind is calm, my vision is clear, my path is open.",
  "I attract what I am — and I am rising.",
  "I release the old and welcome elevated energy.",
  "I am grounded, grateful, and growing every day.",
  "The frequency I hold shapes the reality I live.",
  "I trust the timing of my life completely.",
  "Abundance is my natural state of being.",
  "I plant intention today and harvest it tomorrow.",
];

export default function GardensPanel() {
  const [idx, setIdx] = useState(() => Math.floor(Math.random() * AFFIRMATIONS.length));

  const next = () => setIdx((i) => (i + 1) % AFFIRMATIONS.length);

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      <p className="text-sm text-white/55 text-center leading-relaxed max-w-xs">
        Plant a thought in the Manifestation Gardens. Breathe it in, speak it, and let it grow.
      </p>

      <div className="relative w-full min-h-[160px] flex items-center justify-center px-4 py-8 rounded-2xl"
        style={{ background: `rgba(${ACCENT},0.06)`, border: `1px solid rgba(${ACCENT},0.2)` }}>
        <Flower2 className="absolute top-3 right-3 w-5 h-5" style={{ color: `rgba(${ACCENT},0.4)` }} />
        <AnimatePresence mode="wait">
          <motion.p
            key={idx}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.4 }}
            className="font-heading font-black text-lg text-center text-white leading-snug"
          >
            "{AFFIRMATIONS[idx]}"
          </motion.p>
        </AnimatePresence>
      </div>

      <button onClick={next}
        className="flex items-center gap-2 px-6 py-3 rounded-full font-black text-sm tracking-wide transition-all active:scale-95 hover:brightness-110"
        style={{ background: `rgba(${ACCENT},0.15)`, border: `1px solid rgba(${ACCENT},0.4)`, color: `rgb(${ACCENT})` }}>
        <RefreshCw className="w-4 h-4" /> New Affirmation
      </button>
    </div>
  );
}