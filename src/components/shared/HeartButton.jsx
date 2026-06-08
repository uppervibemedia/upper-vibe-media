import React, { useRef, useCallback } from "react";
import { Heart } from "lucide-react";
import { useFavoritesContext } from "@/context/FavoritesContext";

/**
 * HeartButton — self-contained save/unsave button.
 *
 * Connects directly to FavoritesContext so callers don't need to wire any state.
 *
 * Props:
 *   track        — Track object (must have .id)
 *   size         — "sm" | "md" (default "sm")
 *   onNeedLogin  — called when user is not authenticated
 *   className    — extra class names
 *
 * iOS-safe:
 *   - Single guarded onClick (no onTouchEnd duplicate)
 *   - per-item inFlight lock
 *   - pointer-events auto on button, never disabled attr (blocks iOS touch)
 *   - type="button" always
 */
export default function HeartButton({ track, size = "sm", onNeedLogin, className = "" }) {
  const { isFaved, toggle, user, isLoadingAuth, loaded } = useFavoritesContext();
  const inFlightRef = useRef(false);

  const trackId = track?.id || track?._id || track?.trackId || track?.songId;
  const saved = trackId ? isFaved("track", trackId) : false;

  const handleClick = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();

    if (isLoadingAuth || !loaded) return;
    if (inFlightRef.current) return;

    if (!user) {
      onNeedLogin?.();
      return;
    }

    if (!trackId) return;

    inFlightRef.current = true;

    const meta = {
      title: track?.title || "",
      artist: track?.artist_display || track?.artist || "",
      cover_url: track?.cover_url || "",
    };

    toggle("track", trackId, meta).finally(() => {
      inFlightRef.current = false;
    });
  }, [isLoadingAuth, loaded, user, trackId, track, toggle, onNeedLogin]);

  const dim = size === "md" ? "w-9 h-9" : "w-8 h-8";
  const iconDim = size === "md" ? "w-4 h-4" : "w-3.5 h-3.5";

  // Show skeleton while auth is loading
  if (isLoadingAuth || !loaded) {
    return (
      <div
        className={`${dim} rounded-xl flex items-center justify-center flex-shrink-0 ${className}`}
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.06)",
          opacity: 0.4,
        }}
      >
        <Heart className={`${iconDim}`} style={{ color: "rgba(255,255,255,0.15)" }} />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      title={saved ? "Remove from My Vibe Library" : "Save to My Vibe Library"}
      className={`${dim} rounded-xl flex items-center justify-center flex-shrink-0 select-none transition-colors ${className}`}
      style={{
        position: "relative",
        zIndex: 10,
        pointerEvents: "auto",
        WebkitTapHighlightColor: "transparent",
        touchAction: "manipulation",
        cursor: "pointer",
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