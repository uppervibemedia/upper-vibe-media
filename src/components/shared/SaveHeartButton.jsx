import React, { useState, useEffect, useRef, useCallback } from "react";
import { Heart } from "lucide-react";
import { useSavedItemsContext } from "@/context/SavedItemsContext";
import { normalizeId } from "@/hooks/useSavedItems";

/**
 * SaveHeartButton — clean heart toggle connected to SavedItem system.
 *
 * Props:
 *   item       — track/visualizer record OR plain ID string
 *   itemType   — "song" | "visualizer"
 *   meta       — { title, artist, cover_url, audio_url }
 *   size       — "sm" | "md"
 *   onNeedLogin — called when unauthenticated user taps
 *   className  — extra classes
 *
 * Design:
 * - Single onClick only — no onTouchEnd (prevents iOS double-fire)
 * - Reads saved state from context ref — never stale
 * - Optimistic: heart flips immediately
 * - Per-item in-flight lock via context
 * - Dirty lock: local optimistic state blocks context sync for 5s after save
 */
export default function SaveHeartButton({
  item,
  itemType,
  meta = {},
  size = "sm",
  onNeedLogin,
  className = "",
}) {
  const { isSaved, toggleSaved, savedKeys, user, isLoadingAuth } = useSavedItemsContext();

  const itemId = normalizeId(item);

  // Local saved state — optimistic source of truth
  const [saved, setSaved] = useState(() => isSaved(item, itemType));
  const [busy, setBusy] = useState(false);

  // Ref mirrors state so click handler always reads current value (iOS stale closure fix)
  const savedRef = useRef(saved);
  savedRef.current = saved;

  // dirty = true while we have an optimistic update in flight — blocks context sync
  const dirty = useRef(false);

  // Sync from context only when not dirty
  useEffect(() => {
    if (dirty.current) return;
    const next = isSaved(item, itemType);
    setSaved(next);
    savedRef.current = next;
  }, [savedKeys, item, itemType]); // eslint-disable-line react-hooks/exhaustive-deps

  // Dedup guard — ignore taps within 600ms
  const lastTap = useRef(0);
  const busyRef = useRef(false);

  const handleClick = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (isLoadingAuth) return;
    if (busyRef.current) return;

    const now = Date.now();
    if (now - lastTap.current < 600) return;
    lastTap.current = now;

    if (!user) {
      onNeedLogin?.();
      return;
    }

    const currentlySaved = savedRef.current;
    const next = !currentlySaved;

    // Optimistic flip
    dirty.current = true;
    setSaved(next);
    savedRef.current = next;
    busyRef.current = true;
    setBusy(true);

    const result = await toggleSaved(item, itemType, meta);

    setBusy(false);
    busyRef.current = false;

    if (!result.ok) {
      // Revert on failure
      setSaved(currentlySaved);
      savedRef.current = currentlySaved;
      dirty.current = false;
    } else {
      // Keep dirty lock for 5s — prevents stale reload from overwriting optimistic state
      setTimeout(() => {
        dirty.current = false;
        // Re-sync from context after lock expires
        const serverState = isSaved(item, itemType);
        setSaved(serverState);
        savedRef.current = serverState;
      }, 5000);
    }
  }, [toggleSaved, item, itemType, meta, user, isLoadingAuth, onNeedLogin, isSaved]);

  const dim = size === "md" ? "w-9 h-9" : "w-8 h-8";
  const iconDim = size === "md" ? "w-4 h-4" : "w-3.5 h-3.5";

  // While auth loads — show disabled placeholder
  if (isLoadingAuth) {
    return (
      <div
        className={`${dim} rounded-xl flex items-center justify-center flex-shrink-0 ${className}`}
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.06)",
          opacity: 0.35,
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
      disabled={busy}
      title={saved ? "Remove from My Vibe Library" : "Save to My Vibe Library"}
      className={`${dim} rounded-xl flex items-center justify-center flex-shrink-0 select-none ${className}`}
      style={{
        touchAction: "manipulation",
        WebkitTapHighlightColor: "transparent",
        cursor: busy ? "default" : "pointer",
        opacity: busy ? 0.6 : 1,
        outline: "none",
        userSelect: "none",
        WebkitUserSelect: "none",
        transition: "all 0.15s ease",
        zIndex: 10,
        position: "relative",
        pointerEvents: "auto",
        ...(saved
          ? {
              background: "rgba(155,126,255,0.18)",
              border: "1px solid rgba(155,126,255,0.45)",
              color: "#9B7EFF",
            }
          : {
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.3)",
            }),
      }}
    >
      <Heart className={`${iconDim} ${saved ? "fill-current" : ""}`} />
    </button>
  );
}