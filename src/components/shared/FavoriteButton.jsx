import React, { useRef, useState, useEffect, useCallback } from "react";
import { Heart } from "lucide-react";
import { useFavoritesContext } from "@/context/FavoritesContext";

/**
 * FavoriteButton — iOS-safe heart toggle.
 *
 * Critical iOS fixes applied here:
 * 1. `savedRef` mirrors `saved` state — handleClick reads ref (never stale closure).
 * 2. The sync effect only updates state when NOT in a pending-save window (isLocalDirty).
 * 3. No framer-motion used (avoids synthetic event re-dispatch issues on iOS).
 * 4. touchAction + WebkitTapHighlightColor prevent ghost clicks / 300ms delay.
 * 5. Single handler for both onClick (desktop) and onTouchEnd (iOS) to prevent double-fire.
 */
export default function FavoriteButton({ type, id, meta = {}, size = "sm", onNeedLogin, className = "" }) {
  const { isFaved, toggle, user, isLoadingAuth, favorites } = useFavoritesContext();

  // LOCAL state is the visual source of truth
  const [saved, setSaved] = useState(() => isFaved(type, id));
  const [saving, setSaving] = useState(false);

  // Ref mirrors state so handleClick always reads current value (no stale closure on iOS)
  const savedRef = useRef(saved);
  savedRef.current = saved;

  // Track whether we have a local "dirty" optimistic update in flight
  // While dirty, block context sync from overwriting our optimistic state
  const isLocalDirty = useRef(false);

  // Sync from context — but only when not in the middle of a local toggle
  useEffect(() => {
    if (isLocalDirty.current) return;
    const next = isFaved(type, id);
    setSaved(next);
    savedRef.current = next;
  }, [favorites, type, id]); // eslint-disable-line react-hooks/exhaustive-deps

  const lastActivatedAt = useRef(0);
  const savingRef = useRef(false);
  const userRef = useRef(user);
  const isLoadingAuthRef = useRef(isLoadingAuth);
  userRef.current = user;
  isLoadingAuthRef.current = isLoadingAuth;
  // Keep stable meta ref so we don't recreate handleClick when meta object identity changes
  const metaRef = useRef(meta);
  metaRef.current = meta;

  const handleToggle = useCallback(async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (isLoadingAuthRef.current) return;

    // Dedup guard — ignore activations within 600ms (covers iOS double-fire)
    const now = Date.now();
    if (now - lastActivatedAt.current < 600) return;
    lastActivatedAt.current = now;

    if (savingRef.current) return;

    if (!userRef.current) {
      onNeedLogin?.();
      return;
    }

    // Read current saved state from REF — never stale on iOS
    const currentlySaved = savedRef.current;
    const nextSaved = !currentlySaved;

    // Mark dirty so the context sync effect won't overwrite our optimistic state
    isLocalDirty.current = true;

    // Flip heart IMMEDIATELY — optimistic update
    setSaved(nextSaved);
    savedRef.current = nextSaved;

    savingRef.current = true;
    setSaving(true);

    const ok = await toggle(type, id, metaRef.current);

    setSaving(false);
    savingRef.current = false;

    if (!ok) {
      // Revert on failure
      setSaved(currentlySaved);
      savedRef.current = currentlySaved;
      isLocalDirty.current = false;
    } else {
      // Success — keep dirty lock for 4s so a post-save context reload doesn't flip it back
      // (iOS PWA resume / RLS propagation delay)
      setTimeout(() => {
        isLocalDirty.current = false;
        // After lock expires, re-sync from context to pick up any server truth
        const serverSaved = isFaved(type, id);
        setSaved(serverSaved);
        savedRef.current = serverSaved;
      }, 4000);
    }
  }, [toggle, type, id, onNeedLogin, isFaved]);

  // Separate touch handler to prevent both touchEnd and click from firing on iOS
  const touchStartedRef = useRef(false);

  const handleTouchEnd = useCallback((e) => {
    e.preventDefault(); // prevent the subsequent click event
    touchStartedRef.current = true;
    handleToggle(e);
    // Reset flag after click event window passes
    setTimeout(() => { touchStartedRef.current = false; }, 700);
  }, [handleToggle]);

  const handleClick = useCallback((e) => {
    // If we already handled this via touchEnd, skip
    if (touchStartedRef.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    handleToggle(e);
  }, [handleToggle]);

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
      onTouchEnd={handleTouchEnd}
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