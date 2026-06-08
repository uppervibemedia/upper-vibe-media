import React, { useRef, useState, useCallback } from "react";
import { Heart } from "lucide-react";
import { motion } from "framer-motion";
import { useFavoritesContext } from "@/context/FavoritesContext";

/**
 * FavoriteButton — iOS-safe heart button.
 *
 * iOS/PWA fixes:
 *  - Only `onClick` fires — no `onTouchEnd` (eliminates double-fire).
 *  - `touch-action: manipulation` (set globally in index.css) removes 300ms delay.
 *  - `lastActivatedAt` ref: 800ms dedup guard catches any residual double events.
 *  - `saving` state: disables button while DB write is in progress.
 *  - Gates on `user` being present AND `isLoadingAuth` being false.
 *  - Debug logs on iOS for diagnosing production issues.
 */
export default function FavoriteButton({ type, id, meta = {}, size = "sm", onNeedLogin, className = "" }) {
  const { isFaved, toggle, user, isLoadingAuth } = useFavoritesContext();
  const [pulse, setPulse] = useState(false);
  const [saving, setSaving] = useState(false);
  const saved = isFaved(type, id);

  // Per-instance dedup guard (800ms window)
  const lastActivatedAt = useRef(0);
  // Refs so handleActivate never has stale closures
  const savingRef = useRef(false);
  const userRef = useRef(user);
  const isLoadingAuthRef = useRef(isLoadingAuth);
  userRef.current = user;
  isLoadingAuthRef.current = isLoadingAuth;

  const handleActivate = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (isLoadingAuthRef.current) return;

    // Deduplicate within 800ms
    const now = Date.now();
    if (now - lastActivatedAt.current < 800) return;
    lastActivatedAt.current = now;

    if (savingRef.current) return;

    if (!userRef.current) {
      onNeedLogin?.();
      return;
    }

    savingRef.current = true;
    setSaving(true);
    setPulse(true);
    setTimeout(() => setPulse(false), 400);

    await toggle(type, id, meta);

    savingRef.current = false;
    setSaving(false);
  }, [toggle, type, id, meta, onNeedLogin]); // stable — reads user/saving/isLoadingAuth from refs

  const dim = size === "md" ? "w-9 h-9" : "w-8 h-8";
  const iconDim = size === "md" ? "w-4 h-4" : "w-3.5 h-3.5";

  // While auth is loading, render a neutral skeleton-like state
  if (isLoadingAuth) {
    return (
      <div
        className={`${dim} rounded-xl flex items-center justify-center flex-shrink-0 ${className}`}
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.06)",
          opacity: 0.4,
          pointerEvents: "none",
        }}
      >
        <Heart className={`${iconDim}`} style={{ color: "rgba(255,255,255,0.2)" }} />
      </div>
    );
  }

  return (
    <motion.button
      type="button"
      onClick={handleActivate}
      whileTap={{ scale: 0.82 }}
      animate={pulse ? { scale: [1, 1.35, 1] } : {}}
      transition={{ duration: 0.3 }}
      disabled={saving}
      title={saved ? "Saved to My Vibe Library" : "Save to My Vibe Library"}
      className={`${dim} rounded-xl flex items-center justify-center flex-shrink-0 transition-all select-none ${className}`}
      style={{
        position: "relative",
        zIndex: 10,
        pointerEvents: saving ? "none" : "auto",
        WebkitTapHighlightColor: "transparent",
        touchAction: "manipulation",
        cursor: saving ? "default" : "pointer",
        opacity: saving ? 0.6 : 1,
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