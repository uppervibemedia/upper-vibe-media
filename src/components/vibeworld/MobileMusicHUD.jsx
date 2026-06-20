import React, { useState, useCallback } from "react";
import { Play, Pause, SkipForward, ChevronUp, ChevronDown } from "lucide-react";
import CoverImage from "@/components/shared/CoverImage";

/**
 * MobileMusicHUD — compact music controls for Vibe World mobile.
 *
 * Collapsed: small pill (cover + play/pause + expand)
 * Expanded: larger panel with title, artist, skip, collapse
 * All buttons 44px+ targets, haptic feedback, pointer-events isolated.
 */

function getLayout() {
  const isLandscape = window.innerWidth > window.innerHeight;
  const saRight = parseInt(getComputedStyle(document.documentElement).getPropertyValue("env(safe-area-inset-right)").trim()) || 0;
  const saBottom = parseInt(getComputedStyle(document.documentElement).getPropertyValue("env(safe-area-inset-bottom)").trim()) || 0;

  return {
    right: Math.max(16, saRight + 16),
    bottom: Math.max(88, saBottom + 88),
    maxWidth: isLandscape ? "min(240px, 40vw)" : "min(280px, 68vw)",
  };
}

export default function MobileMusicHUD({ currentTrack, isPlaying, onTogglePlay, onSkip }) {
  const [expanded, setExpanded] = useState(false);

  const haptic = useCallback(() => {
    try { navigator?.vibrate?.(10); } catch {}
  }, []);

  // ── Button helpers ──────────────────────────────────────────
  const handlePlayPause = useCallback((e) => {
    e.stopPropagation();
    haptic();
    onTogglePlay?.();
  }, [onTogglePlay, haptic]);

  const handleSkip = useCallback((e) => {
    e.stopPropagation();
    haptic();
    onSkip?.();
  }, [onSkip, haptic]);

  const handleExpand = useCallback((e) => {
    e.stopPropagation();
    haptic();
    setExpanded(true);
  }, [haptic]);

  const handleCollapse = useCallback((e) => {
    e.stopPropagation();
    haptic();
    setExpanded(false);
  }, [haptic]);

  if (!currentTrack) return null;

  const L = getLayout();

  // ═════════════════════════════════════════════════════════════
  // COLLAPSED — small floating pill
  // ═════════════════════════════════════════════════════════════
  if (!expanded) {
    return (
      <div
        className="fixed z-[60] flex items-center gap-2 px-2.5 py-2 rounded-full"
        style={{
          right: L.right,
          bottom: L.bottom,
          maxWidth: L.maxWidth,
          pointerEvents: "auto",
          background: "rgba(0,0,0,0.72)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          border: "1px solid rgba(255,255,255,0.12)",
          boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
        }}
      >
        {/* Cover */}
        <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 pointer-events-none" style={{ minWidth: 32, minHeight: 32 }}>
          <CoverImage
            src={currentTrack.cover_url}
            alt={currentTrack.title}
            className="w-full h-full"
            iconClassName="w-3 h-3"
          />
        </div>

        {/* Title (truncated) */}
        <div className="flex-1 min-w-0 pointer-events-none pr-1">
          <p className="text-[10px] font-bold text-white/90 truncate max-w-[90px]">
            {currentTrack.title}
          </p>
        </div>

        {/* Play/Pause */}
        <button
          onTouchStart={(e) => e.stopPropagation()}
          onClick={handlePlayPause}
          className="rounded-full flex items-center justify-center flex-shrink-0 transition-all hover:brightness-110 active:scale-90"
          style={{
            width: 44,
            height: 44,
            minWidth: 44,
            minHeight: 44,
            background: "#2E7D32",
            color: "#fff",
            touchAction: "manipulation",
            pointerEvents: "auto",
          }}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
        </button>

        {/* Expand */}
        <button
          onTouchStart={(e) => e.stopPropagation()}
          onClick={handleExpand}
          className="rounded-full flex items-center justify-center flex-shrink-0 transition-all hover:bg-white/10"
          style={{
            width: 44,
            height: 44,
            minWidth: 44,
            minHeight: 44,
            color: "rgba(255,255,255,0.5)",
            touchAction: "manipulation",
            pointerEvents: "auto",
          }}
          aria-label="Expand player"
        >
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════
  // EXPANDED — larger panel
  // ═════════════════════════════════════════════════════════════
  const expandRight = Math.max(8, parseInt(getComputedStyle(document.documentElement).getPropertyValue("env(safe-area-inset-right)").trim()) || 0) + 8;
  const expandBottom = Math.max(28, parseInt(getComputedStyle(document.documentElement).getPropertyValue("env(safe-area-inset-bottom)").trim()) || 0) + 28;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[60] flex justify-center px-3"
      style={{
        paddingBottom: expandBottom,
        pointerEvents: "auto",
      }}
    >
      {/* Glass background — non-interactive */}
      <div
        className="absolute inset-x-3 rounded-2xl pointer-events-none"
        style={{
          top: 0,
          bottom: expandBottom - 8,
          background: "rgba(0,0,0,0.78)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.12)",
          boxShadow: "0 -8px 32px rgba(0,0,0,0.5)",
        }}
      />

      {/* Content */}
      <div className="w-full max-w-sm rounded-2xl p-3 relative" style={{ pointerEvents: "auto" }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-2" style={{ pointerEvents: "auto" }}>
          <span className="text-[10px] font-bold tracking-wider text-white/40 uppercase" style={{ pointerEvents: "none" }}>
            Now Playing
          </span>
          <button
            onTouchStart={(e) => e.stopPropagation()}
            onClick={handleCollapse}
            className="rounded-full flex items-center justify-center transition-all hover:bg-white/10"
            style={{
              width: 44,
              height: 44,
              minWidth: 44,
              minHeight: 44,
              color: "rgba(255,255,255,0.5)",
              touchAction: "manipulation",
              pointerEvents: "auto",
            }}
            aria-label="Collapse player"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>

        {/* Track info */}
        <div className="flex items-center gap-3 mb-3" style={{ pointerEvents: "none" }}>
          <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 shadow-md">
            <CoverImage
              src={currentTrack.cover_url}
              alt={currentTrack.title}
              className="w-full h-full"
              iconClassName="w-5 h-5"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white truncate">{currentTrack.title}</p>
            <p className="text-[11px] text-white/50 truncate">
              {currentTrack.artist_display || currentTrack.artist || "Upper Vibe Media"}
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-6" style={{ pointerEvents: "auto" }}>
          <button
            onTouchStart={(e) => e.stopPropagation()}
            onClick={handlePlayPause}
            className="rounded-full flex items-center justify-center transition-all hover:brightness-110 active:scale-90"
            style={{
              width: 48,
              height: 48,
              minWidth: 48,
              minHeight: 48,
              background: "#2E7D32",
              color: "#fff",
              touchAction: "manipulation",
              pointerEvents: "auto",
            }}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
          </button>
          <button
            onTouchStart={(e) => e.stopPropagation()}
            onClick={handleSkip}
            className="rounded-full flex items-center justify-center transition-all hover:bg-white/10 active:scale-90"
            style={{
              width: 44,
              height: 44,
              minWidth: 44,
              minHeight: 44,
              color: "rgba(255,255,255,0.5)",
              touchAction: "manipulation",
              pointerEvents: "auto",
            }}
            aria-label="Skip"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}