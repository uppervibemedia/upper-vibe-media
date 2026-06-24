import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, MessageCircle, Zap } from "lucide-react";
import useZoneChat from "@/hooks/useZoneChat";

const QUICK_MESSAGES = [
  "This song is fire 🔥",
  "Vibe higher ✨",
  "Meet me at the stage 🎤",
  "I'm chilling 😌",
  "Come to the dance floor 🕺",
  "432Hz vibes 🌊",
  "Let's ride 🏄",
  "Good energy only 💫",
];

const ZONE_LABELS = {
  stage: "Music Stage",
  plaza: "Central Plaza",
  lounge: "Vibe Lounge",
  academy: "Vibe Academy",
  hoverboard: "Neon Surf Beach",
  dome: "Visualizer Dome",
  library: "Music Library",
  vibecheck: "Vibe Check",
  zenbeach: "Zen Beach",
  ferriswheel: "Neon Vibe Wheel",
  beach: "Beach",
  launchzone: "Launch Zone",
  crystalzone: "Crystal Zone",
};

export default function ZoneChatPanel({
  open,
  onClose,
  zoneId,
  userId,
  username,
  blockedUsers = {},
  onInputFocus,
  isMobile,
  mobileLayout,
}) {
  const [tab, setTab] = useState("zone"); // "zone" | "quick"
  const [draft, setDraft] = useState("");
  const [sendError, setSendError] = useState(null);
  const [sending, setSending] = useState(false);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const effectiveZone = zoneId || "plaza";

  const { messages, sendMessage } = useZoneChat(effectiveZone, userId, username, blockedUsers);

  // Auto-scroll to bottom
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages.length, open]);

  const handleSend = useCallback(async (text, isQuick = false) => {
    if (!text?.trim()) return;
    setSending(true);
    setSendError(null);
    const result = await sendMessage(text, isQuick);
    setSending(false);
    if (result?.error) {
      setSendError(result.error);
      setTimeout(() => setSendError(null), 3000);
    } else {
      setDraft("");
      // Keep focus on input after send
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [sendMessage]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(draft);
    }
  };

  const handleClose = () => {
    onInputFocus?.(false);
    onClose();
  };

  const zoneName = ZONE_LABELS[effectiveZone] || "Zone";

  // Safe area bottom
  const safeBottom = isMobile && mobileLayout
    ? mobileLayout.sa.bottom
    : 0;

  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 40 }}
      transition={{ type: "spring", damping: 28, stiffness: 340 }}
      className="fixed inset-x-0 bottom-0 z-[90] flex flex-col"
      style={{
        maxHeight: isMobile ? "70dvh" : "520px",
        borderRadius: "20px 20px 0 0",
        background: "rgba(10,8,28,0.97)",
        border: "1px solid rgba(124,58,237,0.25)",
        backdropFilter: "blur(24px)",
        paddingBottom: `max(${safeBottom}px, env(safe-area-inset-bottom, 12px))`,
      }}
      onTouchStart={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
        style={{ borderColor: "rgba(255,255,255,0.07)" }}>
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4" style={{ color: "#C43BFF" }} />
          <span className="font-black text-sm text-white tracking-wide">Zone Chat</span>
          <span
            className="px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider"
            style={{ background: "rgba(196,59,255,0.15)", border: "1px solid rgba(196,59,255,0.3)", color: "#C43BFF" }}
          >
            {zoneName}
          </span>
        </div>
        <button
          onClick={handleClose}
          onTouchStart={(e) => { e.stopPropagation(); handleClose(); }}
          className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:bg-white/10 active:scale-90"
          style={{ minWidth: 32, minHeight: 32, touchAction: "manipulation" }}
        >
          <X className="w-4 h-4 text-white/50" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b flex-shrink-0" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
        {[
          { id: "zone", label: "Zone" },
          { id: "quick", label: "⚡ Quick" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            onTouchStart={(e) => e.stopPropagation()}
            className="flex-1 py-2.5 text-[11px] font-black tracking-wider transition-all"
            style={{
              color: tab === t.id ? "#C43BFF" : "rgba(255,255,255,0.3)",
              borderBottom: tab === t.id ? "2px solid #C43BFF" : "2px solid transparent",
              touchAction: "manipulation",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === "zone" && (
        <>
          {/* Messages list */}
          <div
            ref={listRef}
            className="flex-1 overflow-y-auto px-3 py-2 space-y-2"
            style={{ overscrollBehavior: "contain", WebkitOverflowScrolling: "touch" }}
          >
            {!userId && (
              <div className="text-center py-6">
                <p className="text-xs text-white/30">Sign in to chat in this zone</p>
              </div>
            )}
            {userId && messages.length === 0 && (
              <div className="text-center py-6">
                <p className="text-xs text-white/30">No messages yet in {zoneName}</p>
                <p className="text-[10px] text-white/15 mt-1">Be the first to say something!</p>
              </div>
            )}
            {messages.map((msg) => (
              <MessageRow key={msg.id} msg={msg} isOwn={msg.user_id === userId} />
            ))}
          </div>

          {/* Error */}
          <AnimatePresence>
            {sendError && (
              <motion.p
                initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="text-[10px] font-bold text-center pb-1 flex-shrink-0"
                style={{ color: "#FF6B6B" }}
              >
                {sendError}
              </motion.p>
            )}
          </AnimatePresence>

          {/* Input */}
          {userId && (
            <div className="flex items-center gap-2 px-3 pb-2 pt-1 flex-shrink-0">
              <input
                ref={inputRef}
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value.slice(0, 250))}
                onKeyDown={handleKeyDown}
                onFocus={() => onInputFocus?.(true)}
                onBlur={() => onInputFocus?.(false)}
                placeholder={`Message ${zoneName}...`}
                maxLength={250}
                className="flex-1 px-3 py-2.5 rounded-xl text-xs text-white/90 outline-none"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  minHeight: 44,
                  touchAction: "manipulation",
                  fontSize: "14px", // prevent iOS zoom
                }}
              />
              <button
                onClick={() => handleSend(draft)}
                onTouchStart={(e) => { e.stopPropagation(); }}
                disabled={sending || !draft.trim()}
                className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-all active:scale-90"
                style={{
                  background: draft.trim() ? "linear-gradient(135deg,#7C3AED,#C43BFF)" : "rgba(255,255,255,0.07)",
                  minWidth: 44, minHeight: 44, touchAction: "manipulation",
                  opacity: draft.trim() ? 1 : 0.4,
                }}
              >
                <Send className="w-4 h-4 text-white" />
              </button>
            </div>
          )}
          {!userId && (
            <div className="px-3 pb-2 flex-shrink-0">
              <p className="text-center text-[10px] text-white/25 py-2">Sign in to send messages</p>
            </div>
          )}
        </>
      )}

      {tab === "quick" && (
        <div className="flex-1 overflow-y-auto px-3 py-3">
          {!userId && (
            <div className="text-center py-6">
              <p className="text-xs text-white/30">Sign in to send quick messages</p>
            </div>
          )}
          {userId && (
            <>
              <p className="text-[10px] text-white/30 mb-3 tracking-wider font-black uppercase">
                Tap to send instantly to {zoneName}
              </p>
              <div className="grid grid-cols-1 gap-2">
                {QUICK_MESSAGES.map((qm) => (
                  <button
                    key={qm}
                    onClick={() => { handleSend(qm, true); setTab("zone"); }}
                    onTouchStart={(e) => e.stopPropagation()}
                    className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-left transition-all hover:brightness-110 active:scale-95"
                    style={{
                      background: "rgba(196,59,255,0.08)",
                      border: "1px solid rgba(196,59,255,0.2)",
                      color: "rgba(255,255,255,0.85)",
                      fontSize: "13px",
                      minHeight: 48,
                      touchAction: "manipulation",
                    }}
                  >
                    <Zap className="w-3 h-3 flex-shrink-0" style={{ color: "#C43BFF" }} />
                    {qm}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Safety note */}
      <div className="px-4 py-1.5 flex-shrink-0 border-t" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
        <p className="text-[9px] text-white/20 text-center tracking-wider">
          Public zone chat · be respectful · no personal info
        </p>
      </div>
    </motion.div>
  );
}

function MessageRow({ msg, isOwn }) {
  const time = msg.created_date
    ? new Date(msg.created_date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "now";

  return (
    <div className={`flex gap-2 ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
      {/* Avatar dot */}
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 font-black text-[9px]"
        style={{
          background: isOwn
            ? "linear-gradient(135deg,#7C3AED,#C43BFF)"
            : "rgba(255,255,255,0.1)",
          color: "#fff",
          minWidth: 24, minHeight: 24,
        }}
      >
        {(msg.username || "?")[0].toUpperCase()}
      </div>

      <div className={`flex flex-col gap-0.5 max-w-[75%] ${isOwn ? "items-end" : "items-start"}`}>
        <div className="flex items-center gap-1.5">
          {!isOwn && (
            <span className="text-[9px] font-black text-white/40 tracking-wide">
              {msg.username}
            </span>
          )}
          {msg.is_quick && (
            <Zap className="w-2 h-2" style={{ color: "#C43BFF" }} />
          )}
          <span className="text-[8px] text-white/20">{time}</span>
        </div>
        <div
          className="px-3 py-1.5 rounded-2xl text-xs"
          style={{
            background: isOwn
              ? "linear-gradient(135deg,rgba(124,58,237,0.35),rgba(196,59,255,0.25))"
              : "rgba(255,255,255,0.06)",
            border: isOwn
              ? "1px solid rgba(196,59,255,0.3)"
              : "1px solid rgba(255,255,255,0.08)",
            color: "rgba(255,255,255,0.88)",
            lineHeight: 1.4,
            wordBreak: "break-word",
          }}
        >
          {msg.message}
        </div>
      </div>
    </div>
  );
}