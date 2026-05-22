/**
 * PullToRefresh — Upper Vibe Media
 *
 * Smart pull-to-refresh that:
 * - Only triggers on predominantly vertical downward swipes (ignores horizontal carousel swipes)
 * - Never calls window.location.reload() — only calls onRefresh() for soft data revalidation
 * - Never touches the audio player, queue, AirPlay, or Bluetooth session
 * - Branded UV animation: cyan/gold frequency bars, no white flash, no screen flicker
 * - iOS Safari + PWA safe: uses touch events with passive listeners
 * - Resistance curve matches Spotify/Apple Music feel
 */

import React, { useRef, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

const THRESHOLD       = 72;  // px pull needed to trigger
const MAX_PULL        = 96;  // px max visual travel
const DAMPING         = 0.42; // rubber-band resistance
const DIRECTION_LOCK  = 10;  // px of travel before locking axis

export default function PullToRefresh({ onRefresh, children }) {
  const [pullY,      setPullY]      = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [triggered,  setTriggered]  = useState(false); // crossed threshold

  const startYRef     = useRef(null);
  const startXRef     = useRef(null);
  const axisRef       = useRef(null); // "vertical" | "horizontal" | null
  const isActiveRef   = useRef(false);
  const refreshingRef = useRef(false);

  // Check if the page is scrolled to the very top
  const isAtTop = () => (window.scrollY || document.documentElement.scrollTop) <= 0;

  const reset = useCallback(() => {
    setPullY(0);
    setTriggered(false);
    startYRef.current   = null;
    startXRef.current   = null;
    axisRef.current     = null;
    isActiveRef.current = false;
  }, []);

  useEffect(() => {
    const onTouchStart = (e) => {
      if (refreshingRef.current) return;
      if (!isAtTop()) return;
      if (e.touches.length !== 1) return;
      startYRef.current   = e.touches[0].clientY;
      startXRef.current   = e.touches[0].clientX;
      axisRef.current     = null;
      isActiveRef.current = true;
    };

    const onTouchMove = (e) => {
      if (!isActiveRef.current || refreshingRef.current) return;
      if (startYRef.current === null) return;

      const dy = e.touches[0].clientY - startYRef.current;
      const dx = e.touches[0].clientX - startXRef.current;

      // Axis lock — determine direction on first significant movement
      if (axisRef.current === null) {
        const travel = Math.sqrt(dx * dx + dy * dy);
        if (travel < DIRECTION_LOCK) return; // not enough movement yet
        axisRef.current = Math.abs(dx) > Math.abs(dy) ? "horizontal" : "vertical";
      }

      // Ignore horizontal swipes (carousels, tabs, etc.)
      if (axisRef.current === "horizontal") {
        isActiveRef.current = false;
        return;
      }

      // Only pull downward from top
      if (dy <= 0) {
        if (pullY > 0) setPullY(0);
        return;
      }

      // Rubber-band resistance curve (matches iOS feel)
      const clamped = Math.min(dy * DAMPING, MAX_PULL);
      setPullY(clamped);
      setTriggered(clamped >= THRESHOLD);

      // Prevent native scroll rubber-band while we're pulling
      if (clamped > 4) {
        e.preventDefault();
      }
    };

    const onTouchEnd = async () => {
      if (!isActiveRef.current || refreshingRef.current) return;

      const shouldRefresh = pullY >= THRESHOLD;
      reset();

      if (shouldRefresh) {
        refreshingRef.current = true;
        setRefreshing(true);
        try {
          await onRefresh();
        } catch {}
        // Small delay so the animation feels complete
        await new Promise(r => setTimeout(r, 400));
        setRefreshing(false);
        refreshingRef.current = false;
      }
    };

    // passive: false on touchmove so we can call preventDefault() to prevent
    // iOS over-scroll rubber-band from fighting with our pull animation
    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove",  onTouchMove,  { passive: false });
    document.addEventListener("touchend",   onTouchEnd,   { passive: true });
    document.addEventListener("touchcancel",reset,        { passive: true });

    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove",  onTouchMove);
      document.removeEventListener("touchend",   onTouchEnd);
      document.removeEventListener("touchcancel",reset);
    };
  }, [pullY, onRefresh, reset]);

  const progress = Math.min(pullY / THRESHOLD, 1); // 0 → 1

  return (
    <div style={{ position: "relative", overflowX: "hidden" }}>

      {/* ── Pull indicator — fixed at top, never inside scroll flow ── */}
      <AnimatePresence>
        {(pullY > 2 || refreshing) && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            style={{
              position: "fixed",
              top: refreshing ? 16 : Math.max(8, pullY - 32),
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 9999,
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px 6px 8px",
              borderRadius: 999,
              background: "rgba(6,6,20,0.92)",
              border: `1px solid ${triggered || refreshing ? "rgba(0,200,220,0.4)" : "rgba(255,255,255,0.1)"}`,
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              boxShadow: triggered || refreshing
                ? "0 0 16px rgba(0,200,220,0.2), 0 4px 20px rgba(0,0,0,0.4)"
                : "0 4px 20px rgba(0,0,0,0.3)",
              transition: "border-color 0.2s ease, box-shadow 0.2s ease",
              pointerEvents: "none",
            }}
          >
            {/* UV frequency bars animation */}
            <FrequencyBars progress={progress} refreshing={refreshing} triggered={triggered} />
            <span style={{
              fontSize: 10,
              fontWeight: 900,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: triggered || refreshing ? "#00C9E0" : "rgba(255,255,255,0.35)",
              fontFamily: "var(--font-heading)",
              transition: "color 0.2s ease",
              whiteSpace: "nowrap",
            }}>
              {refreshing ? "Refreshing..." : triggered ? "Release to refresh" : "Pull to refresh"}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Content — translates down with pull, snaps back ── */}
      <div
        style={{
          transform: pullY > 0 ? `translateY(${pullY}px)` : "translateY(0px)",
          transition: pullY === 0 ? "transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)" : "none",
          willChange: pullY > 0 ? "transform" : "auto",
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ── Branded frequency bar loader ──────────────────────────────────────────────
function FrequencyBars({ progress, refreshing, triggered }) {
  const baseHeights = [4, 7, 10, 7, 4];
  const delays      = [0, 0.08, 0.16, 0.08, 0];

  return (
    <>
      <style>{`
        @keyframes uvBarPulse {
          0%   { transform: scaleY(0.3); }
          100% { transform: scaleY(1); }
        }
      `}</style>
      <div style={{ display: "flex", alignItems: "center", gap: 2, height: 14 }}>
        {baseHeights.map((base, i) => {
          const scaledH = refreshing ? base : Math.max(2, base * Math.max(progress, 0.15));
          const color   = i === 2
            ? (triggered || refreshing ? "#D4A843" : "rgba(212,168,67,0.45)")
            : (triggered || refreshing ? "#00C9E0" : "rgba(0,200,220,0.4)");

          return (
            <div
              key={i}
              style={{
                width: 2,
                height: `${scaledH}px`,
                borderRadius: 2,
                background: color,
                transformOrigin: "bottom center",
                transition: refreshing ? "none" : "background 0.2s ease, height 0.05s linear",
                animation: refreshing
                  ? `uvBarPulse 0.65s ease-in-out ${delays[i]}s infinite alternate`
                  : "none",
              }}
            />
          );
        })}
      </div>
    </>
  );
}