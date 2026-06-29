import React from 'react';
import { motion } from 'framer-motion';
import { Rocket, Ban } from 'lucide-react';

export default function PersonalHoverboardHUD({ isMobile, mobileLayout, onToggle, personalHoverboardActive, canUsePersonalBoard }) {
  // Hide until an equipped board can be used, but keep the put-away control visible while riding.
  if (!canUsePersonalBoard && !personalHoverboardActive) return null;

  return (
    <motion.div
      key="personal-hb-hud"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="absolute bottom-0 right-0 z-[58] flex flex-col items-end gap-2 px-3"
      style={{
        paddingBottom: isMobile && mobileLayout
          ? `${mobileLayout.actionBottom + 60}px`
          : isMobile
            ? `calc(env(safe-area-inset-bottom, 0px) + 308px)`
            : `calc(env(safe-area-inset-bottom, 0px) + 12rem)`,
        pointerEvents: "auto",
      }}
    >
      <button
        onTouchStart={(e) => e.stopPropagation()}
        onClick={onToggle}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full font-black text-[10px] tracking-wider transition-all hover:brightness-110 active:scale-95"
        style={{
          background: personalHoverboardActive ? "rgba(255, 80, 80, 0.15)" : "linear-gradient(135deg,#00B8D488,#00D4F088)",
          border: personalHoverboardActive ? "1px solid rgba(255, 80, 80, 0.4)" : "1px solid rgba(0,212,240,0.4)",
          color: personalHoverboardActive ? "#ff8a8a" : "#fff",
          minHeight: isMobile ? 36 : 40,
          touchAction: "manipulation",
          boxShadow: personalHoverboardActive ? "0 0 14px rgba(255, 80, 80, 0.25)" : "0 0 14px rgba(0,212,240,0.25)",
        }}
      >
        {personalHoverboardActive ? <Ban className="w-3 h-3" /> : <Rocket className="w-3 h-3" />}
        {personalHoverboardActive ? "Put Away Board" : "Ride Hoverboard"}
      </button>
    </motion.div>
  );
}