import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * VibeCoinHUD — persistent top-left coin counter + +N popup
 *
 * Stays visible during free-roam, hidden in full-screen stage.
 * Sits at top-left (away from joystick/camera/bell) with
 * safe-area awareness so it never overlaps iPhone notch.
 */
export default function VibeCoinHUD({
  sessionCoins,
  totalCoins,
  lastCollectCount = 0,
  visible = true,
  isMobile = false,
  mobileLayout = null,
  stageFullScreen = false,
}) {
  const [popups, setPopups] = useState([]);
  const popupIdRef = useRef(0);

  // Show +N popup when coins are collected
  useEffect(() => {
    if (lastCollectCount <= 0) return;
    const id = ++popupIdRef.current;
    setPopups((prev) => [...prev, { id, count: lastCollectCount }]);
    const remove = setTimeout(() => setPopups((prev) => prev.filter((p) => p.id !== id)), 1400);

    return () => clearTimeout(remove);
  }, [lastCollectCount, sessionCoins]);

  if (!visible || stageFullScreen) return null;

  // Mobile: use safe area from layout hook; desktop: fixed
  const topOffset = isMobile && mobileLayout
    ? `${mobileLayout.sa.top + 56}px`
    : "calc(env(safe-area-inset-top, 0px) + 3.5rem)";

  return (
    <div
      className="absolute z-[55] flex items-center gap-2"
      style={{
        top: topOffset,
        left: isMobile && mobileLayout
          ? `calc(env(safe-area-inset-left, 0px) + ${mobileLayout.sa.left + 52}px)`
          : "calc(env(safe-area-inset-left, 0px) + 3.25rem)",
        pointerEvents: "none",
      }}
    >
      {/* Session */}
      {sessionCoins > 0 && (
        <div
          className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black tracking-tight pointer-events-none"
          style={{
            background: "rgba(0,229,255,0.1)",
            border: "1px solid rgba(0,229,255,0.22)",
            color: "#88E8FF",
            backdropFilter: "blur(8px)",
          }}
        >
          <span className="text-[10px] leading-none">✦</span>
          <span>{sessionCoins}</span>
        </div>
      )}

      {/* Bank (always show, even if 0, to indicate the wallet exists) */}
      <div
        className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black tracking-tight pointer-events-none"
        style={{
          background: "rgba(255,215,0,0.08)",
          border: "1px solid rgba(255,215,0,0.18)",
          color: "#FFD700",
          backdropFilter: "blur(8px)",
        }}
      >
        <span className="text-[10px] leading-none">✦</span>
        <span>{totalCoins}</span>
      </div>

      {/* +N collection popups */}
      <div className="absolute left-0 flex flex-col items-start gap-1" style={{ bottom: "calc(100% + 4px)" }}>
        <AnimatePresence>
          {popups.map((p) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 1, y: 0, scale: 1 }}
              animate={{ opacity: 0, y: -24, scale: 1.2 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1 }}
              className="flex items-center gap-0.5 font-black pointer-events-none whitespace-nowrap"
              style={{ fontSize: "11px", color: "#FFD700", textShadow: "0 0 8px rgba(255,215,0,0.5)" }}
            >
              +{p.count}
              <span className="text-[10px] opacity-80">✦</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}