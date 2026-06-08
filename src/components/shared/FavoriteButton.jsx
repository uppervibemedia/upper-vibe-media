import React, { useRef, useState, useEffect, useCallback } from "react";
import { Heart } from "lucide-react";
import { useFavoritesContext } from "@/context/FavoritesContext";

/**
 * FavoriteButton — iOS-safe heart toggle.
 *
 * KEY FIX: We track `saved` in LOCAL state (not just reading from context).
 * This guarantees the heart flips visually on iOS even if React's context
 * propagation is delayed or batched. We sync with context on mount + when
 * the context's favorites list changes (e.g. after a reload).
 */
export default function FavoriteButton({ type, id, meta = {}, size = "sm", onNeedLogin, className = "" }) {
  const { isFaved, toggle, user, isLoadingAuth, favorites } = useFavoritesContext();

  // Local state — source of truth for the visual heart fill.
  // Synced from context whenever favorites list changes.
  const [saved, setSaved] = useState(() => isFaved(type, id));
  const [saving, setSaving] = useState(false);

  // Sync local state from context whenever favorites array changes
  useEffect(() => {
    setSaved(isFaved(type, id));
  }, [favorites, type, id]); // eslint-disable-line react-hooks/exhaustive-deps

  const lastActivatedAt = useRef(0);
  const savingRef = useRef(false);
  const userRef = useRef(user);
  const isLoadingAuthRef = useRef(isLoadingAuth);
  userRef.current = user;
  isLoadingAuthRef.current = isLoadingAuth;

  const handleClick = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (isLoadingAuthRef.current) return;

    // Dedup guard — ignore taps within 500ms
    const now = Date.now();
    if (now - lastActivatedAt.current < 500) return;
    lastActivatedAt.current = now;

    if (savingRef.current) return;

    if (!userRef.current) {
      onNeedLogin?.();
      return;
    }

    // Flip local state IMMEDIATELY for instant visual feedback on iOS
    const nextSaved = !saved;
    setSaved(nextSaved);

    savingRef.current = true;
    setSaving(true);

    const ok = await toggle(type, id, meta);

    // If the toggle failed, revert
    if (!ok) {
      setSaved(!nextSaved);
    }

    savingRef.current = false;
    setSaving(false);
  }, [toggle, type, id, meta, onNeedLogin, saved]);

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
        touchAction: "manipulation",
        WebkitTapHighlightColor: "transparent",
        pointerEvents: saving ? "none" : "auto",
        opacity: saving ? 0.7 : 1,
        cursor: "pointer",
        outline: "none",
        userSelect: "none",
        WebkitUserSelect: "none",
        transition: "all 0.15s ease",
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