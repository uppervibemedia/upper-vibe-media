import React, { useRef, useState, useCallback } from "react";
import { Heart } from "lucide-react";
import { useFavoritesContext } from "@/context/FavoritesContext";

/**
 * FavoriteButton — single shared heart button used across all pages.
 *
 * iOS/PWA approach:
 *  - Uses ONLY onClick (no onTouchStart). touch-action:manipulation in CSS
 *    already removes the 300ms delay on iOS, making onClick instant.
 *  - onTouchStart caused double-fire issues and scroll interference on iOS.
 *  - 500ms dedup ref guard as a safety net.
 *  - No `disabled` prop — uses pointerEvents:none instead (disabled blocks iOS touch).
 *  - No framer-motion wrapper (can swallow touch events in scroll containers).
 */
export default function FavoriteButton({ type, id, meta = {}, size = "sm", onNeedLogin, className = "" }) {
  const { isFaved, toggle, user, isLoadingAuth } = useFavoritesContext();
  const [saving, setSaving] = useState(false);
  const saved = isFaved(type, id);

  const lastActivatedAt = useRef(0);
  const savingRef = useRef(false);
  // Keep refs so the callback never has stale closures
  const userRef = useRef(user);
  const isLoadingAuthRef = useRef(isLoadingAuth);
  userRef.current = user;
  isLoadingAuthRef.current = isLoadingAuth;

  const handleClick = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (isLoadingAuthRef.current) return;

    // Dedup: ignore if tapped within 500ms
    const now = Date.now();
    if (now - lastActivatedAt.current < 500) return;
    lastActivatedAt.current = now;

    if (savingRef.current) return;

    if (!userRef.current) {
      onNeedLogin?.();
      return;
    }

    savingRef.current = true;
    setSaving(true);

    await toggle(type, id, meta);

    savingRef.current = false;
    setSaving(false);
  }, [toggle, type, id, meta, onNeedLogin]);

  const dim = size === "md" ? "w-9 h-9" : "w-8 h-8";
  const iconDim = size === "md" ? "w-4 h-4" : "w-3.5 h-3.5";

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
        <Heart className={iconDim} style={{ color: "rgba(255,255,255,0.2)" }} />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      title={saved ? "Saved to My Vibe Library" : "Save to My Vibe Library"}
      className={`${dim} rounded-xl flex items-center justify-center flex-shrink-0 select-none ${className}`}
      style={{
        // touch-action:manipulation removes 300ms iOS tap delay without needing onTouchStart
        touchAction: "manipulation",
        WebkitTapHighlightColor: "transparent",
        // Never use `disabled` — it blocks touch events on iOS
        pointerEvents: saving ? "none" : "auto",
        opacity: saving ? 0.7 : 1,
        cursor: "pointer",
        outline: "none",
        userSelect: "none",
        WebkitUserSelect: "none",
        // Visual state
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
    </button>
  );
}