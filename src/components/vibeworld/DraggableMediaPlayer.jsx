import React, { useState, useEffect, useRef, useCallback } from "react";
import { Play, Pause, SkipForward, GripHorizontal } from "lucide-react";
import CoverImage from "@/components/shared/CoverImage";
import useMobileLayout from "@/hooks/useMobileLayout";

const LS_KEY = "vibeworld_player_pos";

function loadPos() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (typeof p.x === "number" && typeof p.y === "number") return p;
    }
  } catch {}
  return null;
}

function savePos(x, y) {
  try { localStorage.setItem(LS_KEY, JSON.stringify({ x, y })); } catch {}
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

const IS_MOBILE = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

export default function DraggableMediaPlayer({
  currentTrack,
  isPlaying,
  onTogglePlay,
  onSkip,
  nearStage = false,
  domeMode = false,
}) {
  const mobileLayout = useMobileLayout(IS_MOBILE);

  // Normalize cover art from various field names
  const coverSrc = currentTrack?.coverArt || currentTrack?.cover_url || currentTrack?.image || currentTrack?.artwork || null;
  const [pos, setPos] = useState(() => IS_MOBILE ? null : loadPos());
  const playerRef = useRef(null);
  const dragStartRef = useRef({ x: 0, y: 0, px: 0, py: 0 });
  const isDraggingRef = useRef(false);
  const tapCountRef = useRef({ count: 0, lastTime: 0 });

  // Desktop: default position
  useEffect(() => {
    if (IS_MOBILE || pos) return;
    setPos({
      x: window.innerWidth - 280,
      y: window.innerHeight - 70,
    });
  }, []);

  const resetPosition = useCallback(() => {
    if (IS_MOBILE) return;
    const x = window.innerWidth - 280;
    const y = window.innerHeight - 70;
    setPos({ x, y });
    savePos(x, y);
  }, []);

  // Desktop drag
  const handleDragStart = useCallback((e) => {
    if (IS_MOBILE) return;
    e.stopPropagation();
    e.preventDefault();
    isDraggingRef.current = true;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      px: pos?.x || 0,
      py: pos?.y || 0,
    };

    const onMove = (ev) => {
      if (!isDraggingRef.current) return;
      const el = playerRef.current;
      const pw = el?.offsetWidth || 260;
      const ph = el?.offsetHeight || 56;
      const nx = clamp(dragStartRef.current.px + (ev.clientX - dragStartRef.current.x), 0, window.innerWidth - pw);
      const ny = clamp(dragStartRef.current.py + (ev.clientY - dragStartRef.current.y), 0, window.innerHeight - ph);
      setPos({ x: nx, y: ny });
    };
    const onUp = () => {
      isDraggingRef.current = false;
      const cur = pos;
      if (cur) savePos(cur.x, cur.y);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [pos]);

  const handleHandleTap = useCallback((e) => {
    e.stopPropagation();
    const now = Date.now();
    if (now - tapCountRef.current.lastTime < 400) {
      tapCountRef.current.count++;
      if (tapCountRef.current.count >= 2) {
        resetPosition();
        tapCountRef.current.count = 0;
      }
    } else {
      tapCountRef.current.count = 1;
    }
    tapCountRef.current.lastTime = now;
  }, [resetPosition]);

  if (!currentTrack) return null;
  if (!IS_MOBILE && !pos) return null;
  if (IS_MOBILE && !mobileLayout) return null;

  // ── Mobile: position from layout hook ──────────────────────────
  let containerStyle;
  if (domeMode) {
    containerStyle = {
      position: IS_MOBILE ? "absolute" : "fixed",
      left: "max(18px, env(safe-area-inset-left, 0px))",
      bottom: "calc(18px + env(safe-area-inset-bottom, 0px))",
      top: "unset",
      width: "min(360px, calc(100vw - 36px))",
      maxWidth: "calc(100vw - 36px)",
    };
  } else if (IS_MOBILE) {
    const L = mobileLayout;
    // position: absolute (not fixed) to avoid iOS Safari nested-fixed rendering bug
    // The city parent is already fixed inset-0 (full viewport), so absolute is equivalent.
    containerStyle = {
      position: "absolute",
      left: L.playerLeft,
      bottom: L.playerBottom,
      top: "unset",
      width: L.playerMaxWidth,
      maxWidth: L.playerMaxWidth,
    };
  } else {
    containerStyle = {
      position: "fixed",
      left: pos?.x ?? 0,
      top: pos?.y ?? 0,
      maxWidth: "260px",
    };
  }

  return (
    <div
      ref={playerRef}
      className="z-[70] flex items-center gap-1.5 px-2 py-1.5 rounded-full select-none"
      style={{
        ...containerStyle,
        pointerEvents: "auto",
        touchAction: "manipulation",
        background: "rgba(0,0,0,0.88)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: "1px solid rgba(255,255,255,0.14)",
        boxShadow: "0 2px 20px rgba(0,0,0,0.55)",
        height: "52px",
      }}
    >
      {currentTrack && (
        <>
          {/* Drag handle (desktop only — on mobile it's a fixed anchor) */}
          {!IS_MOBILE && (
            <button
              onMouseDown={handleDragStart}
              onClick={handleHandleTap}
              className="rounded-full flex items-center justify-center flex-shrink-0 transition-all hover:bg-white/10"
              style={{
                width: 36, height: 36, minWidth: 36, minHeight: 36,
                color: "rgba(255,255,255,0.35)",
                touchAction: "none",
                cursor: "grab",
                pointerEvents: "auto",
              }}
              aria-label="Drag player. Double-click to reset."
            >
              <GripHorizontal className="w-3 h-3" />
            </button>
          )}

          {/* Cover art */}
          <div
            className="rounded-full overflow-hidden flex-shrink-0 pointer-events-none"
            style={{ width: 36, height: 36, minWidth: 36, minHeight: 36 }}
          >
            <CoverImage
              src={coverSrc}
              alt={currentTrack.title}
              className="w-full h-full"
              iconClassName="w-3 h-3"
            />
          </div>

          {/* Title + Artist */}
          <div
            className="flex-1 min-w-0 pointer-events-none overflow-hidden"
            style={{ maxWidth: domeMode ? (IS_MOBILE ? "120px" : "150px") : IS_MOBILE ? (nearStage ? "52px" : "70px") : "90px" }}
          >
            <p className="text-[10px] font-bold text-white/90 truncate leading-tight">
              {currentTrack.title}
            </p>
            <p className="text-[9px] text-white/40 truncate leading-tight">
              {currentTrack.artist_display || currentTrack.artist || ""}
            </p>
          </div>

          {/* Skip */}
          <button
            onTouchStart={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onSkip?.(); }}
            className="rounded-full flex items-center justify-center flex-shrink-0 transition-all hover:bg-white/10 active:scale-90"
            style={{
              width: 38, height: 38, minWidth: 38, minHeight: 38,
              color: "rgba(255,255,255,0.45)",
              touchAction: "manipulation",
              pointerEvents: "auto",
            }}
            aria-label="Skip"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>

          {/* Play/Pause */}
          <button
            onTouchStart={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onTogglePlay?.(); }}
            className="rounded-full flex items-center justify-center flex-shrink-0 transition-all hover:brightness-110 active:scale-90"
            style={{
              width: 38, height: 38, minWidth: 38, minHeight: 38,
              background: "linear-gradient(135deg,#1B5E20,#2E7D32)",
              color: "#fff",
              touchAction: "manipulation",
              pointerEvents: "auto",
            }}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 ml-0.5" />}
          </button>
        </>
      )}
    </div>
  );
}