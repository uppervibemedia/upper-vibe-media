import React, { useState, useEffect, useRef, useCallback } from "react";
import { Play, Pause, SkipForward, GripHorizontal, RotateCcw } from "lucide-react";
import CoverImage from "@/components/shared/CoverImage";

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

export default function DraggableMediaPlayer({
  currentTrack,
  isPlaying,
  onTogglePlay,
  onSkip,
}) {
  const [isMobileDevice] = useState(() => /iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
  const [pos, setPos] = useState(() => isMobileDevice ? null : loadPos());
  const draggingRef = useRef(false);
  const offsetRef = useRef({ x: 0, y: 0 });
  const playerRef = useRef(null);
  const dragStartRef = useRef({ x: 0, y: 0, px: 0, py: 0 });
  const tapCountRef = useRef({ count: 0, lastTime: 0 });
  const isDraggingRef = useRef(false);

  // On mount, if no saved position, default to bottom-right (desktop only)
  useEffect(() => {
    if (isMobileDevice) return; // Mobile uses fixed bottom anchor
    if (!pos) {
      const saRight = parseInt(getComputedStyle(document.documentElement).getPropertyValue("env(safe-area-inset-right)").trim()) || 0;
      const saBottom = parseInt(getComputedStyle(document.documentElement).getPropertyValue("env(safe-area-inset-bottom)").trim()) || 0;
      setPos({
        x: window.innerWidth - 260 - Math.max(16, saRight + 16),
        y: window.innerHeight - 70 - Math.max(96, saBottom + 96),
      });
    }
  }, [isMobileDevice]);

  const resetPosition = useCallback(() => {
    const saRight = parseInt(getComputedStyle(document.documentElement).getPropertyValue("env(safe-area-inset-right)").trim()) || 0;
    const saBottom = parseInt(getComputedStyle(document.documentElement).getPropertyValue("env(safe-area-inset-bottom)").trim()) || 0;
    const x = window.innerWidth - 260 - Math.max(16, saRight + 16);
    const y = window.innerHeight - 70 - Math.max(96, saBottom + 96);
    setPos({ x, y });
    savePos(x, y);
  }, []);

  // ── Drag handlers ────────────────────────────────────
  const handleDragStart = useCallback((e) => {
    e.stopPropagation();
    e.preventDefault();
    isDraggingRef.current = true;
    const clientX = e.touches?.[0]?.clientX ?? e.clientX;
    const clientY = e.touches?.[0]?.clientY ?? e.clientY;
    dragStartRef.current = {
      x: clientX,
      y: clientY,
      px: pos?.x || 0,
      py: pos?.y || 0,
    };

    const onMove = (ev) => {
      if (!isDraggingRef.current) return;
      ev.preventDefault();
      const cx = ev.touches?.[0]?.clientX ?? ev.clientX;
      const cy = ev.touches?.[0]?.clientY ?? ev.clientY;
      const dx = cx - dragStartRef.current.x;
      const dy = cy - dragStartRef.current.y;
      const el = playerRef.current;
      const pw = el?.offsetWidth || 260;
      const ph = el?.offsetHeight || 56;
      const mx = window.innerWidth - pw;
      const my = window.innerHeight - ph;
      const nx = clamp(dragStartRef.current.px + dx, 0, mx);
      const ny = clamp(dragStartRef.current.py + dy, 0, my);
      setPos({ x: nx, y: ny });
    };

    const onUp = () => {
      isDraggingRef.current = false;
      if (dragStartRef.current) {
        const cx = dragStartRef.current;
        const totalMoved = Math.abs((pos?.x || cx.px) - cx.px) + Math.abs((pos?.y || cx.py) - cx.py);
        if (totalMoved > 2) {
          savePos(pos?.x || cx.px, pos?.y || cx.py);
        }
      }
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onUp);
  }, [pos]);

  // Double-tap drag handle to reset
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
  // Mobile: needs pos OR isMobileDevice (fixed anchor, no pos needed)
  if (!isMobileDevice && !pos) return null;

  // Mobile: fixed bottom-LEFT anchor — must sit ABOVE the joystick.
  // Portrait joystick bottom=135px, landscape=75px. Use the taller portrait value
  // so the player never overlaps the joystick in either orientation.
  // We push it up to 180px so there's also safe clearance for action buttons.
  const mobileStyle = {
    left: "12px",
    bottom: "calc(env(safe-area-inset-bottom, 0px) + 180px)",
    top: "unset",
    maxWidth: "210px",
  };
  const desktopStyle = {
    left: pos?.x ?? 0,
    top: pos?.y ?? 0,
    maxWidth: "260px",
  };

  return (
    <div
      ref={playerRef}
      className="fixed z-[58] flex items-center gap-1.5 px-2 py-1.5 rounded-full select-none"
      style={{
        ...(isMobileDevice ? mobileStyle : desktopStyle),
        pointerEvents: "auto",
        touchAction: isMobileDevice ? "manipulation" : "none",
        background: "rgba(0,0,0,0.82)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        border: "1px solid rgba(255,255,255,0.12)",
        boxShadow: "0 2px 20px rgba(0,0,0,0.45)",
        height: "48px",
      }}
    >
      {/* Drag handle — left side grip */}
      <button
        onTouchStart={(e) => { e.stopPropagation(); handleDragStart(e); }}
        onMouseDown={(e) => { e.stopPropagation(); handleDragStart(e); }}
        onClick={handleHandleTap}
        className="rounded-full flex items-center justify-center flex-shrink-0 transition-all hover:bg-white/10"
        style={{
          width: 36,
          height: 36,
          minWidth: 36,
          minHeight: 36,
          color: "rgba(255,255,255,0.35)",
          touchAction: "none",
          cursor: "grab",
          pointerEvents: "auto",
        }}
        aria-label="Drag to move player. Double-tap to reset."
      >
        <GripHorizontal className="w-3 h-3" />
      </button>

      {/* Cover */}
      <div
        className="rounded-full overflow-hidden flex-shrink-0 pointer-events-none"
        style={{
          width: 38,
          height: 38,
          minWidth: 38,
          minHeight: 38,
        }}
      >
        <CoverImage
          src={currentTrack.cover_url}
          alt={currentTrack.title}
          className="w-full h-full"
          iconClassName="w-3 h-3"
        />
      </div>

      {/* Title + Artist */}
      <div className="flex-1 min-w-0 pointer-events-none overflow-hidden" style={{ maxWidth: "90px" }}>
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
          width: 40,
          height: 40,
          minWidth: 40,
          minHeight: 40,
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
          width: 40,
          height: 40,
          minWidth: 40,
          minHeight: 40,
          background: "#2E7D32",
          color: "#fff",
          touchAction: "manipulation",
          pointerEvents: "auto",
        }}
        aria-label={isPlaying ? "Pause" : "Play"}
      >
        {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 ml-0.5" />}
      </button>
    </div>
  );
}