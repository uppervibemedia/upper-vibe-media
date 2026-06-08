import React, { useRef, useState, useCallback } from "react";
import { Heart } from "lucide-react";
import { motion } from "framer-motion";
import { useFavoritesContext } from "@/context/FavoritesContext";

/**
 * FavoriteButton — iOS-safe heart button used everywhere in the app.
 *
 * iOS Safari / PWA fix notes:
 *  - Only `onClick` is used. `touch-action: manipulation` in index.css removes
 *    the 300ms tap delay globally, so onClick fires fast enough on mobile.
 *  - Removing `onTouchEnd` eliminates the double-fire (touchend → click) that
 *    caused heart state to toggle twice, visually resetting to empty.
 *  - A `lastActivatedAt` ref provides a secondary 600ms dedup guard for safety.
 *  - `type="button"` prevents any accidental form submission.
 *  - `pointerEvents: auto` and explicit `zIndex` ensure it's always tappable
 *    even when inside overflow-hidden containers.
 *
 * Props:
 *   type         — "track" | "visualizer"
 *   id           — entity id (string)
 *   meta         — { title, artist, cover_url } for caching
 *   size         — "sm" | "md" (default "sm")
 *   onNeedLogin  — callback when user is not logged in
 *   className    — extra class names
 */
export default function FavoriteButton({ type, id, meta = {}, size = "sm", onNeedLogin, className = "" }) {
  const { isFaved, toggle, user } = useFavoritesContext();
  const [pulse, setPulse] = useState(false);
  const saved = isFaved(type, id);

  // Guard against double-fire on iOS (e.g. touchend → click within 600ms)
  const lastActivatedAt = useRef(0);

  const handleActivate = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();

    // Deduplicate: ignore if activated within last 600ms
    const now = Date.now();
    if (now - lastActivatedAt.current < 600) return;
    lastActivatedAt.current = now;

    if (!user) {
      onNeedLogin?.();
      return;
    }
    setPulse(true);
    setTimeout(() => setPulse(false), 400);
    toggle(type, id, meta);
  }, [user, onNeedLogin, toggle, type, id, meta]);

  const dim = size === "md" ? "w-9 h-9" : "w-8 h-8";
  const iconDim = size === "md" ? "w-4 h-4" : "w-3.5 h-3.5";

  return (
    <motion.button
      type="button"
      onClick={handleActivate}
      whileTap={{ scale: 0.82 }}
      animate={pulse ? { scale: [1, 1.35, 1] } : {}}
      transition={{ duration: 0.3 }}
      title={saved ? "Saved to My Vibe Library" : "Save to My Vibe Library"}
      className={`${dim} rounded-xl flex items-center justify-center flex-shrink-0 transition-all select-none ${className}`}
      style={{
        position: "relative",
        zIndex: 10,
        pointerEvents: "auto",
        WebkitTapHighlightColor: "transparent",
        touchAction: "manipulation",
        cursor: "pointer",
        ...(saved ? {
          background: "rgba(155,126,255,0.18)",
          border: "1px solid rgba(155,126,255,0.45)",
          color: "#9B7EFF",
        } : {
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.1)",
          color: "rgba(255,255,255,0.3)",
        })
      }}
    >
      <Heart className={`${iconDim} ${saved ? "fill-current" : ""}`} />
    </motion.button>
  );
}