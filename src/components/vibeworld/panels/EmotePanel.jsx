import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Music4, Hand, Heart, Flame, PartyPopper, Flower2, Sparkles } from "lucide-react";

const EMOTES = [
  { id: "dance",     label: "Dance",     icon: Music4,      color: "#C43BFF", effect: "dance"    },
  { id: "wave",      label: "Wave",      icon: Hand,         color: "#00D4F0", effect: "wave"     },
  { id: "clap",      label: "Clap",      icon: Sparkles,     color: "#EDB84A", effect: "clap"     },
  { id: "heart",     label: "Heart",     icon: Heart,        color: "#FF4081", effect: "heart"    },
  { id: "fire",      label: "Fire",      icon: Flame,        color: "#FF6D00", effect: "fire"     },
  { id: "celebrate", label: "Celebrate", icon: PartyPopper,  color: "#00E676", effect: "celebrate"},
  { id: "peace",     label: "Peace",     icon: Flower2,      color: "#A078FF", effect: "peace"    },
];

export default function EmotePanel({ open, onClose, onEmote, onStopDance, isDancing, isMobile }) {
  const hapticTap = () => { try { navigator?.vibrate?.(10); } catch {} };

  const handleEmote = useCallback((emote) => {
    hapticTap();
    if (emote.id === "dance") {
      if (isDancing) {
        onStopDance?.();
      } else {
        onEmote?.(emote);
      }
    } else {
      onEmote?.(emote);
    }
  }, [onEmote, onStopDance, isDancing]);

  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 20 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className="fixed z-[73] overflow-hidden"
      style={{
        left: "50%",
        bottom: isMobile ? "calc(env(safe-area-inset-bottom, 0px) + 10rem)" : "4rem",
        transform: "translateX(-50%)",
        width: isMobile ? "min(340px, 92vw)" : "380px",
        pointerEvents: "auto",
        borderRadius: "20px",
        background: "rgba(10,8,24,0.95)",
        border: "1px solid rgba(0,212,240,0.2)",
        backdropFilter: "blur(20px)",
        boxShadow: "0 8px 40px rgba(0,0,0,0.6), 0 0 60px rgba(0,212,240,0.08)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Music4 className="w-4 h-4 text-purple-400" />
          <h3 className="font-heading font-black text-sm text-white">Emotes</h3>
        </div>
        <button
          onTouchStart={(e) => e.stopPropagation()}
          onClick={() => { hapticTap(); onClose(); }}
          className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:bg-white/10"
          style={{
            color: "rgba(255,255,255,0.5)",
            minWidth: 36, minHeight: 36,
            touchAction: "manipulation",
          }}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Emote grid */}
      <div
        className="grid gap-2 p-4"
        style={{
          gridTemplateColumns: isMobile ? "repeat(3, 1fr)" : "repeat(4, 1fr)",
        }}
      >
        {EMOTES.map((emote) => {
          const isActive = emote.id === "dance" && isDancing;
          const Icon = emote.icon;
          return (
            <button
              key={emote.id}
              onTouchStart={(e) => e.stopPropagation()}
              onClick={() => handleEmote(emote)}
              className="flex flex-col items-center justify-center gap-1.5 rounded-xl transition-all hover:brightness-110 active:scale-95"
              style={{
                background: isActive ? `${emote.color}22` : "rgba(255,255,255,0.04)",
                border: `1px solid ${isActive ? emote.color + "44" : "rgba(255,255,255,0.08)"}`,
                padding: isMobile ? "10px 6px" : "12px 8px",
                minHeight: isMobile ? 64 : 72,
                touchAction: "manipulation",
              }}
            >
              <div
                className="rounded-full flex items-center justify-center"
                style={{
                  width: isMobile ? 32 : 36,
                  height: isMobile ? 32 : 36,
                  background: `${emote.color}18`,
                  border: `1px solid ${emote.color}33`,
                }}
              >
                <Icon
                  style={{
                    width: isMobile ? 15 : 17,
                    height: isMobile ? 15 : 17,
                    color: isActive ? emote.color : `${emote.color}aa`,
                  }}
                />
              </div>
              <span
                className="font-black tracking-wider"
                style={{
                  fontSize: isMobile ? "9px" : "10px",
                  color: isActive ? emote.color : "rgba(255,255,255,0.5)",
                }}
              >
                {emote.id === "dance" && isDancing ? "Stop" : emote.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Dance status bar */}
      <AnimatePresence>
        {isDancing && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-white/5 px-4 py-2"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                <span className="text-[10px] font-black text-purple-300 tracking-wider">
                  DANCING — Move to stop
                </span>
              </div>
              <button
                onTouchStart={(e) => e.stopPropagation()}
                onClick={() => { hapticTap(); onStopDance?.(); }}
                className="px-2.5 py-1 rounded-full font-black text-[9px] tracking-wider transition-all hover:brightness-110"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "rgba(255,255,255,0.5)",
                  minHeight: 28,
                  touchAction: "manipulation",
                }}
              >
                Stop Dance
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}