/**
 * SeatedLoungeMiniBar — floating pill shown while seated in Vibe Lounge.
 * Keeps the world view clear. Shows seat label, Lounge Chat button, Stand Up.
 */
import React from "react";
import { motion } from "framer-motion";
import { MessageCircle } from "lucide-react";

export default function SeatedLoungeMiniBar({
  visible,
  seat,
  isMobile,
  mobileLayout,
  activeUsers = [],
  currentUserId,
  onOpenLounge,
  onStandUp,
}) {
  if (!visible) return null;

  const saBottom = mobileLayout?.sa?.bottom ?? 0;
  const playerHeight = 52;
  const playerBottom = mobileLayout?.playerBottom ?? (saBottom + 16);
  const barBottom = playerBottom + playerHeight + 8;

  // Count how many others are in the lounge
  const loungeCount = (activeUsers || []).filter(
    (u) => u.user_id !== currentUserId && u.current_zone === "lounge"
  ).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ type: "spring", damping: 28, stiffness: 320 }}
      className="fixed inset-x-0 flex items-center justify-center z-[68]"
      style={{
        bottom: isMobile ? barBottom : 96,
        pointerEvents: "auto",
        paddingLeft: "max(16px, env(safe-area-inset-left, 16px))",
        paddingRight: "max(16px, env(safe-area-inset-right, 16px))",
      }}
      onTouchStart={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-2xl"
        style={{
          background: "rgba(10,8,22,0.92)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(155,126,255,0.25)",
          boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
          maxWidth: "min(calc(100vw - 32px), 380px)",
          width: "100%",
        }}
      >
        {/* Seated label */}
        <span className="text-base flex-shrink-0">🛋️</span>
        <p className="text-[10px] font-black text-purple-300/80 tracking-wider flex-1 truncate min-w-0">
          {seat ? seat.label : "Seated"}{loungeCount > 0 ? ` · ${loungeCount + 1} here` : ""}
        </p>

        {/* Open Lounge Chat */}
        <button
          onTouchStart={(e) => e.stopPropagation()}
          onClick={() => onOpenLounge?.()}
          className="flex items-center gap-1.5 px-3 rounded-full font-black text-[9px] tracking-wider transition-all hover:brightness-110 active:scale-95 flex-shrink-0"
          style={{
            height: 36, minHeight: 36,
            background: "linear-gradient(135deg,rgba(124,58,237,0.5),rgba(155,126,255,0.4))",
            border: "1px solid rgba(155,126,255,0.35)",
            color: "#fff",
            touchAction: "manipulation",
            whiteSpace: "nowrap",
          }}
        >
          <MessageCircle className="w-3 h-3" />
          Chat
        </button>

        {/* Stand Up */}
        <button
          onTouchStart={(e) => e.stopPropagation()}
          onClick={() => onStandUp?.()}
          className="flex items-center gap-1 px-3 rounded-full font-black text-[10px] tracking-wider transition-all hover:brightness-110 active:scale-95 flex-shrink-0"
          style={{
            height: 36, minHeight: 36,
            background: "rgba(255,255,255,0.1)",
            border: "1px solid rgba(255,255,255,0.18)",
            color: "rgba(255,255,255,0.7)",
            touchAction: "manipulation",
            whiteSpace: "nowrap",
          }}
        >
          🧍 Stand Up
        </button>
      </div>
    </motion.div>
  );
}