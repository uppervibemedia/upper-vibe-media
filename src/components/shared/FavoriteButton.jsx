import React, { useRef, useState, useCallback } from "react";
import { Heart } from "lucide-react";
import { useFavoritesContext } from "@/context/FavoritesContext";

/**
 * FavoriteButton — iOS-safe heart button.
 *
 * iOS fixes:
 *  - Uses onTouchStart for instant response (no 300ms delay on iOS PWA).
 *  - onTouchStart sets a ref flag; onClick checks the flag to skip if already handled.
 *  - 600ms dedup guard prevents any double-fire.
 *  - No framer-motion on the button itself (motion wrappers can swallow iOS touch events).
 *  - No `disabled` attribute — just pointer-events none while saving (disabled blocks touch).
 */
export default function FavoriteButton({ type, id, meta = {}, size = "sm", onNeedLogin, className = "" }) {
  const { isFaved, toggle, user, isLoadingAuth } = useFavoritesContext();
  const [saving, setSaving] = useState(false);
  const saved = isFaved(type, id);

  const lastActivatedAt = useRef(0);
  const savingRef = useRef(false);
  const userRef = useRef(user);
  const isLoadingAuthRef = useRef(isLoadingAuth);
  const touchHandledRef = useRef(false);

  userRef.current = user;
  isLoadingAuthRef.current = isLoadingAuth;

  const activate = useCallback(async () => {
    if (isLoadingAuthRef.current) return;

    const now = Date.now();
    if (now - lastActivatedAt.current < 600) return;
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

  const handleTouchStart = useCallback((e) => {
    touchHandledRef.current = true;
    e.stopPropagation();
    activate();
  }, [activate]);

  const handleClick = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (touchHandledRef.current) {
      touchHandledRef.current = false;
      return;
    }
    activate();
  }, [activate]);

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
      onTouchStart={handleTouchStart}
      onClick={handleClick}
      title={saved ? "Saved to My Vibe Library" : "Save to My Vibe Library"}
      className={`${dim} rounded-xl flex items-center justify-center flex-shrink-0 select-none transition-colors ${className}`}
      style={{
        position: "relative",
        zIndex: 10,
        pointerEvents: saving ? "none" : "auto",
        WebkitTapHighlightColor: "transparent",
        touchAction: "manipulation",
        cursor: saving ? "default" : "pointer",
        opacity: saving ? 0.6 : 1,
        outline: "none",
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