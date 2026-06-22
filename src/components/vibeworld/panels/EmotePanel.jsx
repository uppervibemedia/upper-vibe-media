import React, { useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Music4, Hand, Heart, Flame, Flower2 } from "lucide-react";

// dance/clap = body animation (clap motion); wave/heart/fire/peace = emoji floaters only
const EMOTES = [
  { id: "dance",  label: "Dance", icon: Music4,   color: "#C43BFF", effect: "dance" },
  { id: "wave",   label: "Wave",  icon: Hand,      color: "#00D4F0", effect: "wave"  },
  { id: "heart",  label: "Heart", icon: Heart,     color: "#FF4081", effect: "heart" },
  { id: "fire",   label: "Fire",  icon: Flame,     color: "#FF6D00", effect: "fire"  },
  { id: "peace",  label: "Peace", icon: Flower2,   color: "#A078FF", effect: "peace" },
];

export default function EmotePanel({ open, onClose, onEmote, onStopDance, isDancing, activeEmote, isMobile }) {
  const hapticTap = () => { try { navigator?.vibrate?.(10); } catch {} };

  const handleEmote = useCallback((emote) => {
    hapticTap();
    // If tapping the currently active emote (or dance while dancing), stop it
    if (isDancing && activeEmote?.id === emote.id) {
      onStopDance?.();
      onClose?.();
    } else {
      onEmote?.(emote);
      // Auto-close panel so user can watch avatar animation
      onClose?.();
    }
  }, [onEmote, onStopDance, onClose, isDancing, activeEmote]);

  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 20, scale: 0.95 }}
      transition={{ type: "spring", damping: 28, stiffness: 350 }}
      className="fixed z-[73] pointer-events-auto"
      style={{
        right: isMobile ? 8 : 16,
        bottom: isMobile
          ? "calc(env(safe-area-inset-bottom, 0px) + 12rem)"
          : "6rem",
        width: isMobile ? "min(180px, 48vw)" : "200px",
        borderRadius: "16px",
        background: "rgba(10,8,24,0.94)",
        border: "1px solid rgba(0,212,240,0.15)",
        backdropFilter: "blur(20px)",
        boxShadow: "0 6px 30px rgba(0,0,0,0.5), 0 0 40px rgba(0,212,240,0.05)",
      }}
    >
      {/* Header — compact */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
        <span className="font-heading font-black text-[11px] text-white/60 tracking-wider">EMOTES</span>
        <button
          onTouchStart={(e) => e.stopPropagation()}
          onClick={() => { hapticTap(); onClose(); }}
          className="w-7 h-7 rounded-full flex items-center justify-center transition-all hover:bg-white/10"
          style={{
            color: "rgba(255,255,255,0.4)",
            minWidth: 28, minHeight: 28,
            touchAction: "manipulation",
          }}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Emote grid — 3 columns, 2 rows */}
      <div
        className="grid gap-1.5 p-2.5"
        style={{ gridTemplateColumns: "repeat(3, 1fr)", gridTemplateRows: "auto" }}
      >
        {EMOTES.map((emote) => {
          const isActive = isDancing && activeEmote?.id === emote.id;
          const Icon = emote.icon;
          return (
            <button
              key={emote.id}
              onTouchStart={(e) => e.stopPropagation()}
              onClick={() => handleEmote(emote)}
              className="flex flex-col items-center justify-center gap-1 rounded-lg transition-all hover:brightness-110 active:scale-95"
              style={{
                background: isActive ? `${emote.color}18` : "rgba(255,255,255,0.03)",
                border: `1px solid ${isActive ? emote.color + "44" : "rgba(255,255,255,0.06)"}`,
                padding: isMobile ? "6px 2px" : "7px 4px",
                minHeight: isMobile ? 48 : 54,
                touchAction: "manipulation",
              }}
            >
              <div
                className="rounded-full flex items-center justify-center"
                style={{
                  width: isMobile ? 24 : 28,
                  height: isMobile ? 24 : 28,
                  background: `${emote.color}14`,
                  border: `1px solid ${emote.color}28`,
                }}
              >
                <Icon
                  style={{
                    width: isMobile ? 12 : 14,
                    height: isMobile ? 12 : 14,
                    color: isActive ? emote.color : `${emote.color}cc`,
                  }}
                />
              </div>
              <span
                className="font-black tracking-wider"
                style={{
                  fontSize: isMobile ? "7px" : "8px",
                  color: isActive ? emote.color : "rgba(255,255,255,0.45)",
                }}
              >
                {isActive ? "Stop" : emote.label}
              </span>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}