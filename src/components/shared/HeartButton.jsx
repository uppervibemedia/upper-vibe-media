import React, { useState } from "react";
import { Heart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * HeartButton — small save-to-Vibe-Library button.
 * Props:
 *   isSaved      — bool
 *   onToggle     — () => void  (already handles premium check upstream)
 *   isPremium    — bool (if false, shows upgrade prompt instead of saving)
 *   onUpgrade    — () => void
 *   size         — "sm" | "md"  (default "sm")
 */
export default function HeartButton({ isSaved, onToggle, isPremium, onUpgrade, size = "sm" }) {
  const [pulse, setPulse] = useState(false);

  const handleClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (!isPremium) {
      onUpgrade?.();
      return;
    }
    setPulse(true);
    setTimeout(() => setPulse(false), 400);
    onToggle?.();
  };

  const dim = size === "md" ? "w-9 h-9" : "w-8 h-8";
  const iconDim = size === "md" ? "w-4 h-4" : "w-3.5 h-3.5";

  return (
    <motion.button
      onClick={handleClick}
      whileTap={{ scale: 0.85 }}
      animate={pulse ? { scale: [1, 1.3, 1] } : {}}
      transition={{ duration: 0.3 }}
      title={isSaved ? "Saved to My Vibe Library" : "Save to My Vibe Library"}
      className={`${dim} rounded-xl flex items-center justify-center flex-shrink-0 transition-all`}
      style={isSaved ? {
        background: "rgba(236,72,153,0.15)",
        border: "1px solid rgba(236,72,153,0.35)",
        color: "#ec4899",
      } : {
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.1)",
        color: "rgba(255,255,255,0.3)",
      }}
    >
      <Heart className={`${iconDim} ${isSaved ? "fill-current" : ""}`} />
    </motion.button>
  );
}