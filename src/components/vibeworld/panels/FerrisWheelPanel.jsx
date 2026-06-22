import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Wind } from "lucide-react";

export default function FerrisWheelPanel({ open, onClose, onRide, isRiding, onExitRide, isMobile }) {
  if (isRiding) {
    // Riding overlay — always-visible Exit button
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="riding-hud"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed z-[80] pointer-events-auto"
          style={{
            bottom: isMobile
              ? "calc(env(safe-area-inset-bottom,0px) + 7rem)"
              : "6.5rem",
            left: "50%",
            transform: "translateX(-50%)",
          }}
        >
          <div
            className="flex flex-col items-center gap-2"
          >
            <div
              className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-black tracking-wider"
              style={{
                background: "rgba(0,229,255,0.12)",
                border: "1px solid rgba(0,229,255,0.3)",
                color: "#00E5FF",
                backdropFilter: "blur(12px)",
              }}
            >
              <Wind className="w-3.5 h-3.5 animate-pulse" />
              Riding the Neon Vibe Wheel
            </div>
            <button
              onTouchStart={(e) => e.stopPropagation()}
              onClick={onExitRide}
              className="px-6 py-2.5 rounded-full font-black text-sm tracking-wider transition-all hover:brightness-110 active:scale-95"
              style={{
                background: "linear-gradient(135deg,#FF4FC3,#C43BFF)",
                color: "#fff",
                boxShadow: "0 0 20px rgba(196,59,255,0.4)",
                minHeight: "44px",
                touchAction: "manipulation",
              }}
            >
              Exit Ride
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="ferris-panel"
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 26, stiffness: 260 }}
          className="fixed inset-x-0 bottom-0 z-[70] pointer-events-auto"
          style={{
            height: isMobile ? "52%" : "44%",
            maxHeight: "400px",
            borderTopLeftRadius: "24px",
            borderTopRightRadius: "24px",
            background: "linear-gradient(180deg, #0D1A2A 0%, #080E18 100%)",
            border: "1px solid rgba(0,229,255,0.2)",
            borderBottom: "none",
            boxShadow: "0 -20px 60px rgba(0,0,0,0.5), 0 -4px 20px rgba(0,212,240,0.15)",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center text-lg"
                style={{ background: "rgba(0,229,255,0.12)", border: "1px solid rgba(0,229,255,0.3)" }}
              >
                🎡
              </div>
              <div>
                <h3 className="font-heading font-black text-base text-white">Neon Vibe Wheel</h3>
                <p className="text-[10px] tracking-wider" style={{ color: "rgba(0,229,255,0.5)" }}>AERIAL CITY TOUR</p>
              </div>
            </div>
            <button
              onTouchStart={(e) => e.stopPropagation()}
              onClick={onClose}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:bg-white/5"
              style={{ minWidth: 36, minHeight: 36, touchAction: "manipulation", color: "rgba(255,255,255,0.5)" }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 flex flex-col gap-4">
            {/* Info card */}
            <div
              className="rounded-2xl p-4"
              style={{
                background: "rgba(0,229,255,0.05)",
                border: "1px solid rgba(0,229,255,0.15)",
              }}
            >
              <p className="text-sm text-white/70 leading-relaxed">
                Take a slow ride on the <span className="text-white font-bold">Neon Vibe Wheel</span> and enjoy an aerial view of Upper Vibe City — the Music Stage, Dance Floor, skyline, and the beach below.
              </p>
              <p className="text-[10px] mt-2" style={{ color: "rgba(0,229,255,0.4)" }}>
                Your music keeps playing throughout the ride.
              </p>
            </div>

            {/* Ride button */}
            <button
              onTouchStart={(e) => e.stopPropagation()}
              onClick={onRide}
              className="w-full py-3.5 rounded-2xl font-black text-sm tracking-wider transition-all hover:brightness-110 active:scale-[0.98] flex items-center justify-center gap-2"
              style={{
                background: "linear-gradient(135deg,#00B8D4,#00E5FF)",
                color: "#000",
                boxShadow: "0 0 24px rgba(0,184,212,0.4)",
                minHeight: "52px",
                touchAction: "manipulation",
              }}
            >
              🎡 Ride the Wheel
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}