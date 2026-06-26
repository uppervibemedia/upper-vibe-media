import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * VibeCoinHUD — top-left coin wallet display
 * Shows: Session coins (this visit) + Bank total (lifetime)
 * Pops up "+N ✦" on collection.
 * Never overlaps: joystick (bottom-left), camera zone (right 55%),
 * music player (bottom), chat/bell (top-right), iPhone notch (top).
 */
export default function VibeCoinHUD({
  sessionCoins = 0,
  totalCoins = 0,
  lastCollectCount = 0,
  visible = true,
  isMobile = false,
  mobileLayout = null,
  stageFullScreen = false,
  onOpenInventory = null,
}) {
  const [popups, setPopups] = useState([]);
  const popupIdRef = useRef(0);

  // Show "+N" popup whenever lastCollectCount changes to > 0
  useEffect(() => {
    if (lastCollectCount <= 0) return;
    const id = ++popupIdRef.current;
    setPopups((prev) => [...prev, { id, count: lastCollectCount }]);
    const remove = setTimeout(() => setPopups((prev) => prev.filter((p) => p.id !== id)), 1600);
    return () => clearTimeout(remove);
  }, [lastCollectCount]);

  if (!visible || stageFullScreen) return null;

  // Position: below the exit button row (which is ~44px tall + safe-area)
  // Mobile: safe-area top + 52px (exit row) + 6px gap
  // Desktop: 64px from top
  const topOffset = isMobile && mobileLayout
    ? `${mobileLayout.sa.top + 54}px`
    : "calc(env(safe-area-inset-top, 0px) + 54px)";

  const leftOffset = "calc(env(safe-area-inset-left, 0px) + 8px)";

  return (
    <div
      style={{
        position: "absolute",
        top: topOffset,
        left: leftOffset,
        zIndex: 55,
        pointerEvents: "none",
        display: "flex",
        flexDirection: "column",
        gap: "4px",
      }}
    >
      {/* Session coins — only show when > 0 */}
      <AnimatePresence>
        {sessionCoins > 0 && (
          <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.25 }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              padding: "3px 9px",
              borderRadius: "999px",
              background: "rgba(0,229,255,0.10)",
              border: "1px solid rgba(0,229,255,0.20)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
            }}
          >
            <span style={{ fontSize: "9px", color: "#88E8FF", lineHeight: 1 }}>✦</span>
            <span style={{ fontSize: "10px", fontWeight: 900, color: "#88E8FF", letterSpacing: "0.02em", lineHeight: 1 }}>
              {sessionCoins} this session
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bank total + Inventory button */}
      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            padding: "3px 9px",
            borderRadius: "999px",
            background: "rgba(255,215,0,0.09)",
            border: "1px solid rgba(255,215,0,0.20)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
          }}
        >
          <span style={{ fontSize: "9px", color: "#FFD700", lineHeight: 1 }}>✦</span>
          <span style={{ fontSize: "10px", fontWeight: 900, color: "#FFD700", letterSpacing: "0.02em", lineHeight: 1 }}>
            {totalCoins} bank
          </span>
        </div>
        {onOpenInventory && (
          <button
            onClick={onOpenInventory}
            style={{
              padding: "3px 8px",
              borderRadius: "999px",
              background: "rgba(155,126,255,0.12)",
              border: "1px solid rgba(155,126,255,0.22)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              color: "#c4aaff",
              fontSize: "9px",
              fontWeight: 800,
              letterSpacing: "0.04em",
              cursor: "pointer",
              pointerEvents: "auto",
              touchAction: "manipulation",
              lineHeight: 1,
              whiteSpace: "nowrap",
            }}
          >
            📦 Inv
          </button>
        )}
      </div>

      {/* +N collection popups — float upward */}
      <div style={{ position: "absolute", left: 0, bottom: "calc(100% + 6px)" }}>
        <AnimatePresence>
          {popups.map((p) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 1, y: 0, scale: 1 }}
              animate={{ opacity: 0, y: -28, scale: 1.15 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "2px",
                fontWeight: 900,
                fontSize: "13px",
                color: "#FFD700",
                textShadow: "0 0 10px rgba(255,215,0,0.6)",
                pointerEvents: "none",
                whiteSpace: "nowrap",
              }}
            >
              +{p.count} <span style={{ fontSize: "10px", opacity: 0.85 }}>✦</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}