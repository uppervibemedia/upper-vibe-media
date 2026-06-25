/**
 * SeatedLoungeMiniBar — small floating bar shown while user is seated in Vibe Lounge.
 * Replaces the full VibeLoungeHub panel so the world view is clear.
 */
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Users, Sparkles, RefreshCw } from "lucide-react";

const MANIFEST_PROMPTS = [
  "What version of you are you becoming?",
  "What are you calling in today?",
  "What habit are you upgrading?",
  "What energy are you leaving behind?",
  "What does your future self need from you?",
  "What would you do if you knew you couldn't fail?",
  "What boundary are you ready to set?",
  "What abundance are you open to receiving?",
];

function NearbySheet({ activeUsers, currentUserId, blockedUsers, onSelectUser, onClose }) {
  const loungeUsers = (activeUsers || []).filter(
    (u) => u.user_id !== currentUserId && u.current_zone === "lounge" && !blockedUsers?.[u.user_id]
  );
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed inset-x-0 z-[75] rounded-t-3xl overflow-hidden flex flex-col"
      style={{
        bottom: 0,
        maxHeight: "55dvh",
        background: "rgba(10,8,22,0.97)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border: "1px solid rgba(155,126,255,0.2)",
        borderBottom: "none",
        pointerEvents: "auto",
      }}
      onTouchStart={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 flex-shrink-0">
        <p className="text-[11px] font-black text-white/60 tracking-wider uppercase">
          {loungeUsers.length} Nearby in Lounge
        </p>
        <button
          onTouchStart={(e) => e.stopPropagation()}
          onClick={onClose}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10"
          style={{ color: "rgba(255,255,255,0.4)", minWidth: 40, minHeight: 40, touchAction: "manipulation" }}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {loungeUsers.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-3xl mb-2">🌊</div>
            <p className="text-xs text-white/25">No one else in the lounge right now.</p>
          </div>
        ) : loungeUsers.map((u) => (
          <div key={u.user_id} className="flex items-center gap-3 p-3 rounded-2xl"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 font-black text-sm"
              style={{ background: "linear-gradient(135deg,rgba(155,126,255,0.3),rgba(0,200,220,0.2))", color: "#c4aaff" }}>
              {(u.username || "?")[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black text-white truncate">{u.username || "User"}</p>
            </div>
            <button
              onTouchStart={(e) => e.stopPropagation()}
              onClick={() => { try { navigator?.vibrate?.(10); } catch {} onSelectUser?.(u); onClose(); }}
              className="px-3 py-1.5 rounded-full font-black text-[9px] tracking-wider transition-all active:scale-95"
              style={{ background: "rgba(155,126,255,0.12)", border: "1px solid rgba(155,126,255,0.25)", color: "#c4aaff", minHeight: 32, touchAction: "manipulation" }}
            >
              View
            </button>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function ManifestSheet({ onClose }) {
  const [idx, setIdx] = useState(() => Math.floor(Math.random() * MANIFEST_PROMPTS.length));
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed inset-x-0 z-[75] rounded-t-3xl overflow-hidden flex flex-col"
      style={{
        bottom: 0,
        maxHeight: "50dvh",
        background: "rgba(10,8,22,0.97)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border: "1px solid rgba(155,126,255,0.2)",
        borderBottom: "none",
        pointerEvents: "auto",
      }}
      onTouchStart={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 flex-shrink-0">
        <p className="text-[11px] font-black text-white/60 tracking-wider uppercase">🔮 Manifest</p>
        <button
          onTouchStart={(e) => e.stopPropagation()}
          onClick={onClose}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10"
          style={{ color: "rgba(255,255,255,0.4)", minWidth: 40, minHeight: 40, touchAction: "manipulation" }}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col items-center text-center gap-4">
        <div className="w-full rounded-2xl p-5"
          style={{ background: "linear-gradient(135deg,rgba(196,59,255,0.08),rgba(155,126,255,0.06))", border: "1px solid rgba(155,126,255,0.2)" }}>
          <p className="text-base font-black text-white/90 leading-snug">"{MANIFEST_PROMPTS[idx]}"</p>
        </div>
        <button
          onTouchStart={(e) => e.stopPropagation()}
          onClick={() => setIdx((i) => (i + 1) % MANIFEST_PROMPTS.length)}
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-full font-black text-xs tracking-wider transition-all hover:brightness-110 active:scale-95"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)", minHeight: 44, touchAction: "manipulation" }}
        >
          <RefreshCw className="w-3.5 h-3.5" /> New Prompt
        </button>
      </div>
    </motion.div>
  );
}

export default function SeatedLoungeMiniBar({
  visible,
  seat,
  isMobile,
  mobileLayout,
  activeUsers = [],
  currentUserId,
  blockedUsers = {},
  onSelectUser,
  onStandUp,
}) {
  const [sheet, setSheet] = useState(null); // null | "nearby" | "manifest"

  if (!visible) return null;

  // Position: bottom just above the safe area / music player
  const saBottom = mobileLayout?.sa?.bottom ?? 0;
  const playerHeight = 52;
  const playerBottom = mobileLayout?.playerBottom ?? (saBottom + 16);
  // Sit the mini-bar above the player with a small gap
  const barBottom = playerBottom + playerHeight + 8;

  return (
    <>
      {/* Mini-bar */}
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
            maxWidth: "min(calc(100vw - 32px), 420px)",
            width: "100%",
          }}
        >
          {/* Label */}
          <span className="text-base flex-shrink-0">🛋️</span>
          <p className="text-[10px] font-black text-purple-300/80 tracking-wider flex-1 truncate">
            Chilling in Vibe Lounge{seat ? ` · ${seat.label}` : ""}
          </p>

          {/* Nearby */}
          <button
            onTouchStart={(e) => e.stopPropagation()}
            onClick={() => setSheet(sheet === "nearby" ? null : "nearby")}
            className="flex items-center justify-center rounded-full transition-all hover:brightness-110 active:scale-95"
            style={{
              width: 36, height: 36, minWidth: 36, minHeight: 36,
              background: sheet === "nearby" ? "rgba(155,126,255,0.25)" : "rgba(155,126,255,0.1)",
              border: `1px solid rgba(155,126,255,${sheet === "nearby" ? "0.5" : "0.2"})`,
              color: "#c4aaff",
              touchAction: "manipulation",
            }}
            title="Nearby"
          >
            <Users className="w-3.5 h-3.5" />
          </button>

          {/* Manifest */}
          <button
            onTouchStart={(e) => e.stopPropagation()}
            onClick={() => setSheet(sheet === "manifest" ? null : "manifest")}
            className="flex items-center justify-center rounded-full transition-all hover:brightness-110 active:scale-95"
            style={{
              width: 36, height: 36, minWidth: 36, minHeight: 36,
              background: sheet === "manifest" ? "rgba(196,59,255,0.25)" : "rgba(196,59,255,0.1)",
              border: `1px solid rgba(196,59,255,${sheet === "manifest" ? "0.5" : "0.2"})`,
              color: "#e0a0ff",
              touchAction: "manipulation",
            }}
            title="Manifest"
          >
            <Sparkles className="w-3.5 h-3.5" />
          </button>

          {/* Stand Up */}
          <button
            onTouchStart={(e) => e.stopPropagation()}
            onClick={() => { setSheet(null); onStandUp?.(); }}
            className="flex items-center gap-1 px-3 rounded-full font-black text-[10px] tracking-wider transition-all hover:brightness-110 active:scale-95 flex-shrink-0"
            style={{
              height: 36, minHeight: 36,
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.18)",
              color: "rgba(255,255,255,0.75)",
              touchAction: "manipulation",
              whiteSpace: "nowrap",
            }}
          >
            🧍 Stand Up
          </button>
        </div>
      </motion.div>

      {/* Sub-sheets */}
      <AnimatePresence>
        {sheet === "nearby" && (
          <NearbySheet
            key="nearby"
            activeUsers={activeUsers}
            currentUserId={currentUserId}
            blockedUsers={blockedUsers}
            onSelectUser={onSelectUser}
            onClose={() => setSheet(null)}
          />
        )}
        {sheet === "manifest" && (
          <ManifestSheet
            key="manifest"
            onClose={() => setSheet(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}