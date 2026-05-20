import React, { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw } from "lucide-react";

const THRESHOLD = 70; // px drag needed to trigger refresh

export default function PullToRefresh({ onRefresh, children }) {
  const [pullY, setPullY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startYRef = useRef(null);
  const containerRef = useRef(null);

  const isAtTop = () => window.scrollY === 0;

  const onTouchStart = (e) => {
    if (!isAtTop()) return;
    startYRef.current = e.touches[0].clientY;
  };

  const onTouchMove = (e) => {
    if (startYRef.current === null || refreshing) return;
    const delta = e.touches[0].clientY - startYRef.current;
    if (delta > 0) {
      // Resist the pull with a damping factor
      setPullY(Math.min(delta * 0.45, THRESHOLD * 1.2));
    }
  };

  const onTouchEnd = async () => {
    if (pullY >= THRESHOLD && !refreshing) {
      setRefreshing(true);
      setPullY(0);
      startYRef.current = null;
      try { await onRefresh(); } catch {}
      setRefreshing(false);
    } else {
      setPullY(0);
      startYRef.current = null;
    }
  };

  const progress = Math.min(pullY / THRESHOLD, 1);

  return (
    <div
      ref={containerRef}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{ position: "relative" }}
    >
      {/* Pull indicator */}
      <AnimatePresence>
        {(pullY > 0 || refreshing) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "absolute",
              top: refreshing ? 12 : Math.max(pullY - 40, -40),
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 50,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "rgba(0,200,220,0.12)",
              border: "1px solid rgba(0,200,220,0.25)",
              transition: refreshing ? "top 0.2s ease" : undefined,
            }}
          >
            <RefreshCw
              className="w-4 h-4 text-cyan-400"
              style={{
                transform: `rotate(${progress * 360}deg)`,
                transition: refreshing ? undefined : "transform 0.05s linear",
                animation: refreshing ? "spin 0.8s linear infinite" : undefined,
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div
        style={{
          transform: pullY > 0 ? `translateY(${pullY}px)` : undefined,
          transition: pullY === 0 ? "transform 0.25s ease" : undefined,
        }}
      >
        {children}
      </div>
    </div>
  );
}