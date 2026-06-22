/**
 * DJBoothPanel (replaces JukeboxPanel) — Live DJ Booth interaction panel.
 * Shows current track info + Join/Leave buttons.
 * Uses the existing global player — no new audio system.
 */
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Music4, Radio, Disc3 } from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";

const DJ_CYAN = "#00E5FF";
const DJ_PURPLE = "#C43BFF";
const DJ_PINK = "#FF4FC3";

// Animated equalizer bars
function EqBars({ active }) {
  return (
    <div className="flex items-end gap-0.5 h-4">
      {[1, 2, 3, 4, 5].map((b) => (
        <div
          key={b}
          className="w-1 rounded-full"
          style={{
            background: b % 2 === 0 ? DJ_PURPLE : DJ_CYAN,
            height: active ? `${6 + b * 2}px` : "4px",
            animation: active ? `pulse-glow ${0.3 + b * 0.12}s ease-in-out infinite alternate` : "none",
            transition: "height 0.3s ease",
          }}
        />
      ))}
    </div>
  );
}

export default function JukeboxPanel({ open, onClose, isMobile, djTrack }) {
  const [joined, setJoined] = useState(false);
  const { isPlaying } = usePlayer() || {};

  // When panel closes, reset joined state
  useEffect(() => { if (!open) setJoined(false); }, [open]);

  const handleJoin = () => {
    setJoined(true);
    // DJ stream is already playing globally — just flag as joined
  };

  const handleLeave = () => {
    setJoined(false);
    onClose?.();
  };

  const trackTitle = djTrack?.title || "Live DJ Mix";
  const trackArtist = djTrack?.artist_display || "Upper Vibe";
  const trackCover = djTrack?.cover_url || null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="dj-booth-panel"
          initial={{ opacity: 0, y: 40, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.96 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          className="absolute left-0 right-0 bottom-0 z-[70] pointer-events-auto"
          style={{
            paddingBottom: isMobile
              ? "calc(env(safe-area-inset-bottom, 0px) + 5.5rem)"
              : "5.5rem",
          }}
        >
          <div
            className="mx-auto rounded-2xl overflow-hidden"
            style={{
              maxWidth: isMobile ? "calc(100% - 16px)" : "400px",
              margin: isMobile ? "0 8px" : "0 auto",
              background: "rgba(5,4,18,0.97)",
              border: `1px solid rgba(0,229,255,0.22)`,
              boxShadow: `0 0 48px rgba(196,59,255,0.18), 0 0 24px rgba(0,229,255,0.12), 0 8px 40px rgba(0,0,0,0.7)`,
              backdropFilter: "blur(24px)",
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-3"
              style={{
                borderBottom: "1px solid rgba(0,229,255,0.1)",
                background: "linear-gradient(90deg,rgba(196,59,255,0.08),rgba(0,229,255,0.06))",
              }}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: "linear-gradient(135deg,rgba(196,59,255,0.25),rgba(0,229,255,0.15))",
                    border: "1px solid rgba(0,229,255,0.3)",
                  }}
                >
                  <Disc3 className="w-4 h-4" style={{ color: DJ_CYAN }} />
                </div>
                <div>
                  <p className="font-heading font-black text-sm text-white leading-none tracking-wide">
                    Upper Vibe DJ Booth
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: DJ_PINK }} />
                    <p className="text-[9px] font-bold tracking-wider" style={{ color: DJ_PINK }}>
                      LIVE SET
                    </p>
                  </div>
                </div>
              </div>
              <button
                onTouchStart={(e) => e.stopPropagation()}
                onClick={onClose}
                className="w-7 h-7 rounded-full flex items-center justify-center transition-all hover:bg-white/10 active:scale-90"
                style={{ color: "rgba(255,255,255,0.35)", touchAction: "manipulation" }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Now Playing card */}
            <div className="px-4 pt-4 pb-3">
              <div
                className="rounded-xl p-3 flex items-center gap-3"
                style={{
                  background: "rgba(0,229,255,0.05)",
                  border: "1px solid rgba(0,229,255,0.12)",
                }}
              >
                {/* Cover */}
                <div
                  className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center"
                  style={{ background: "rgba(196,59,255,0.15)", border: "1px solid rgba(196,59,255,0.25)" }}
                >
                  {trackCover ? (
                    <img src={trackCover} alt={trackTitle} className="w-full h-full object-cover" />
                  ) : (
                    <Radio className="w-5 h-5" style={{ color: DJ_PURPLE }} />
                  )}
                </div>

                {/* Track info */}
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black tracking-widest uppercase mb-0.5" style={{ color: DJ_PURPLE }}>
                    Now Playing
                  </p>
                  <p className="text-sm font-black text-white truncate leading-tight">{trackTitle}</p>
                  <p className="text-[10px] truncate mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>
                    {trackArtist}
                  </p>
                </div>

                {/* EQ bars */}
                <div className="flex-shrink-0">
                  <EqBars active={isPlaying && joined} />
                </div>
              </div>
            </div>

            {/* EQ visualizer bar row */}
            <div className="px-4 pb-3 flex items-end justify-center gap-1 h-8">
              {Array.from({ length: 18 }).map((_, i) => {
                const h = 4 + Math.sin(i * 0.8) * 8 + (i % 3 === 0 ? 6 : 0);
                return (
                  <div
                    key={i}
                    className="flex-1 rounded-full"
                    style={{
                      background: i % 3 === 0 ? DJ_CYAN : i % 3 === 1 ? DJ_PURPLE : DJ_PINK,
                      height: isPlaying && joined ? `${h}px` : "3px",
                      opacity: isPlaying && joined ? 0.65 : 0.2,
                      animation: isPlaying && joined ? `pulse-glow ${0.35 + i * 0.04}s ease-in-out infinite alternate` : "none",
                      transition: "height 0.4s ease, opacity 0.4s ease",
                    }}
                  />
                );
              })}
            </div>

            {/* Hint */}
            <div
              className="px-4 py-2 flex items-center gap-2"
              style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
            >
              <Music4 className="w-3 h-3 flex-shrink-0" style={{ color: "rgba(0,229,255,0.5)" }} />
              <p className="text-[9px]" style={{ color: "rgba(255,255,255,0.28)" }}>
                Stay on the Dance Floor to hear the mix at full volume
              </p>
            </div>

            {/* Action buttons */}
            <div className="px-4 pb-4 flex gap-2">
              {!joined ? (
                <button
                  onTouchStart={(e) => e.stopPropagation()}
                  onClick={handleJoin}
                  className="flex-1 py-3 rounded-xl font-black text-sm tracking-wider transition-all hover:brightness-110 active:scale-[0.98]"
                  style={{
                    background: "linear-gradient(135deg,#00B8D4,#C43BFF)",
                    color: "#fff",
                    boxShadow: "0 0 24px rgba(196,59,255,0.35)",
                    touchAction: "manipulation",
                    minHeight: "48px",
                  }}
                >
                  🎧 Join Live DJ
                </button>
              ) : (
                <button
                  onTouchStart={(e) => e.stopPropagation()}
                  onClick={handleLeave}
                  className="flex-1 py-3 rounded-xl font-black text-sm tracking-wider transition-all hover:brightness-110 active:scale-[0.98]"
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.14)",
                    color: "rgba(255,255,255,0.6)",
                    touchAction: "manipulation",
                    minHeight: "48px",
                  }}
                >
                  Leave DJ Audio
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}