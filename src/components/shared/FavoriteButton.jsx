import React, { useState } from "react";
import { Heart } from "lucide-react";
import { motion } from "framer-motion";
import { useFavoritesContext } from "@/context/FavoritesContext";

/**
 * FavoriteButton — drop-in heart button used everywhere in the app.
 * Handles: auth check, login prompt, optimistic toggle, stopPropagation/preventDefault.
 *
 * Props:
 *   type         — "track" | "visualizer"
 *   id           — entity id (string)
 *   meta         — { title, artist, cover_url } for caching
 *   size         — "sm" | "md" (default "sm")
 *   onNeedLogin  — optional callback when user is not logged in (open login modal etc.)
 *   className    — extra class names
 */
export default function FavoriteButton({ type, id, meta = {}, size = "sm", onNeedLogin, className = "" }) {
  const { isFaved, toggle, user } = useFavoritesContext();
  const [pulse, setPulse] = useState(false);
  const saved = isFaved(type, id);

  const handleActivate = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      onNeedLogin?.();
      return;
    }
    setPulse(true);
    setTimeout(() => setPulse(false), 400);
    toggle(type, id, meta);
  };

  const dim = size === "md" ? "w-9 h-9" : "w-8 h-8";
  const iconDim = size === "md" ? "w-4 h-4" : "w-3.5 h-3.5";

  return (
    <motion.button
      onClick={handleActivate}
      onTouchEnd={handleActivate}
      whileTap={{ scale: 0.82 }}
      animate={pulse ? { scale: [1, 1.35, 1] } : {}}
      transition={{ duration: 0.3 }}
      title={saved ? "Saved to My Vibe Library" : "Save to My Vibe Library"}
      className={`${dim} rounded-xl flex items-center justify-center flex-shrink-0 transition-all select-none ${className}`}
      style={saved ? {
        background: "rgba(155,126,255,0.18)",
        border: "1px solid rgba(155,126,255,0.45)",
        color: "#9B7EFF",
      } : {
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.1)",
        color: "rgba(255,255,255,0.3)",
      }}
    >
      <Heart className={`${iconDim} ${saved ? "fill-current" : ""}`} />
    </motion.button>
  );
}