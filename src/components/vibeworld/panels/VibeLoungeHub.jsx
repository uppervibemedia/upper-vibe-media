/**
 * VibeLoungeHub — Simplified Vibe Lounge panel.
 * One view: group chat + who's here list. No tabs, no complexity.
 */
import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { X, Send, Users } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import useLoungeChat from "@/hooks/useLoungeChat";

const QUICK_MESSAGES = [
  "🌊 Chilling",
  "✨ Manifesting",
  "🎵 Loving this track",
  "💜 Good energy",
  "🤝 Open to connect",
];

export default function VibeLoungeHub({
  open,
  onClose,
  isMobile,
  onInputFocus,
  blockedUsers = {},
  activeUsers = [],
  currentUserId,
  onSelectUser,
}) {
  const { user } = useAuth();
  const username = user?.world_username || "New User";
  const { messages, sendMessage, loading } = useLoungeChat(user?.id, username, blockedUsers);

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(null);
  const [showPeople, setShowPeople] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // iOS keyboard-safe
  const [panelBottom, setPanelBottom] = useState(0);
  useEffect(() => {
    if (!isMobile || !open) { setPanelBottom(0); return; }
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const kh = window.innerHeight - vv.height - vv.offsetTop;
      setPanelBottom(Math.max(0, kh));
    };
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    update();
    return () => { vv.removeEventListener("resize", update); vv.removeEventListener("scroll", update); };
  }, [isMobile, open]);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const loungeUsers = (activeUsers || []).filter(
    (u) => u.user_id !== currentUserId && u.current_zone === "lounge" && !blockedUsers?.[u.user_id]
  );

  const handleSend = useCallback(async (text) => {
    const trimmed = (text || input).trim();
    if (!trimmed || sending) return;
    setSending(true);
    setSendError(null);
    setInput("");
    const result = await sendMessage(trimmed);
    if (result?.error) setSendError(result.error);
    setSending(false);
  }, [input, sending, sendMessage]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!open) return null;

  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 30, stiffness: 300 }}
      className="fixed inset-x-0 rounded-t-3xl overflow-hidden flex flex-col"
      style={{
        zIndex: 70,
        bottom: panelBottom,
        height: isMobile ? "min(78dvh, 100dvh)" : "65vh",
        maxHeight: "100dvh",
        background: "rgba(10,8,22,0.97)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border: "1px solid rgba(155,126,255,0.18)",
        borderBottom: "none",
        pointerEvents: "auto",
      }}
      onTouchStart={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-lg">🛋️</span>
          <div>
            <h3 className="font-heading font-black text-sm text-white leading-none">Vibe Lounge</h3>
            <p className="text-[9px] text-purple-300/50 mt-0.5">Group Chat</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Who's Here toggle */}
          <button
            onTouchStart={(e) => e.stopPropagation()}
            onClick={() => setShowPeople((v) => !v)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full font-black text-[9px] tracking-wider transition-all active:scale-95"
            style={{
              background: showPeople ? "rgba(155,126,255,0.2)" : "rgba(155,126,255,0.08)",
              border: `1px solid rgba(155,126,255,${showPeople ? "0.4" : "0.18"})`,
              color: "#c4aaff",
              minHeight: 32, touchAction: "manipulation",
            }}
          >
            <Users className="w-3 h-3" />
            {loungeUsers.length + 1}
          </button>
          <button
            onTouchStart={(e) => e.stopPropagation()}
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:bg-white/10 active:bg-white/20"
            style={{ color: "rgba(255,255,255,0.5)", minWidth: 40, minHeight: 40, touchAction: "manipulation" }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main content: chat | people */}
      <div className="flex-1 flex min-h-0">
        {/* Chat messages */}
        <div className={`flex flex-col min-h-0 transition-all ${showPeople ? "w-[60%]" : "w-full"}`}>
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2" style={{ overscrollBehavior: "contain" }}>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="w-5 h-5 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-10">
                <div className="text-3xl mb-2">🛋️</div>
                <p className="text-xs text-white/25">Be the first to say something...</p>
              </div>
            ) : messages.map((msg) => {
              const isOwn = msg.sender_user_id === user?.id;
              return (
                <div key={msg.id} className={`flex gap-2 ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
                  {!isOwn && (
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 font-black text-xs mt-0.5"
                      style={{ background: "linear-gradient(135deg,rgba(155,126,255,0.35),rgba(0,200,220,0.2))", color: "#c4aaff" }}
                    >
                      {(msg.sender_username || "?")[0].toUpperCase()}
                    </div>
                  )}
                  <div className={`max-w-[75%] ${isOwn ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
                    {!isOwn && (
                      <p className="text-[8px] font-black tracking-wider px-1" style={{ color: "rgba(155,126,255,0.6)" }}>
                        {msg.sender_username || "User"}
                      </p>
                    )}
                    <div
                      className="px-3 py-2 rounded-2xl text-xs leading-snug"
                      style={isOwn
                        ? { background: "linear-gradient(135deg,rgba(155,126,255,0.3),rgba(124,58,237,0.25))", color: "rgba(255,255,255,0.9)", border: "1px solid rgba(155,126,255,0.25)" }
                        : { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.8)", border: "1px solid rgba(255,255,255,0.07)" }
                      }
                    >
                      {msg.message}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick messages */}
          <div className="flex-shrink-0 flex gap-1.5 px-3 pb-1.5 overflow-x-auto hide-scrollbar">
            {QUICK_MESSAGES.map((qm) => (
              <button
                key={qm}
                onTouchStart={(e) => e.stopPropagation()}
                onClick={() => handleSend(qm)}
                className="flex-shrink-0 px-2.5 py-1 rounded-full font-black text-[9px] tracking-wider transition-all active:scale-95 hover:brightness-110"
                style={{
                  background: "rgba(155,126,255,0.08)",
                  border: "1px solid rgba(155,126,255,0.18)",
                  color: "#c4aaff",
                  whiteSpace: "nowrap",
                  touchAction: "manipulation",
                  minHeight: 28,
                }}
              >
                {qm}
              </button>
            ))}
          </div>

          {/* Input bar */}
          <div className="flex-shrink-0 flex items-center gap-2 px-3 pb-3 pt-1.5">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => onInputFocus?.(true)}
              onBlur={() => onInputFocus?.(false)}
              placeholder="Say something..."
              maxLength={250}
              className="flex-1 rounded-2xl px-3 py-2 text-xs text-white placeholder-white/30 outline-none"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(155,126,255,0.2)",
                fontSize: "16px", // prevent iOS zoom
                minHeight: 40,
              }}
            />
            <button
              onTouchStart={(e) => e.stopPropagation()}
              onClick={() => handleSend()}
              disabled={!input.trim() || sending}
              className="flex items-center justify-center rounded-full transition-all active:scale-95 hover:brightness-110 flex-shrink-0"
              style={{
                width: 40, height: 40, minWidth: 40, minHeight: 40,
                background: input.trim() ? "linear-gradient(135deg,#7C3AED,#A078FF)" : "rgba(255,255,255,0.06)",
                border: "none",
                color: input.trim() ? "#fff" : "rgba(255,255,255,0.25)",
                touchAction: "manipulation",
              }}
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
          {sendError && (
            <p className="text-[9px] text-red-400/70 px-4 pb-2 -mt-1">{sendError}</p>
          )}
        </div>

        {/* People panel (slide in) */}
        {showPeople && (
          <div
            className="w-[40%] border-l flex flex-col min-h-0"
            style={{ borderColor: "rgba(155,126,255,0.12)" }}
          >
            <p className="text-[9px] font-black text-white/30 tracking-wider uppercase px-3 pt-3 pb-1 flex-shrink-0">
              Here ({loungeUsers.length + 1})
            </p>
            <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-1.5" style={{ overscrollBehavior: "contain" }}>
              {/* Self */}
              <div className="flex items-center gap-2 px-2 py-2 rounded-xl"
                style={{ background: "rgba(155,126,255,0.08)", border: "1px solid rgba(155,126,255,0.15)" }}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 font-black text-xs"
                  style={{ background: "linear-gradient(135deg,#7C3AED,#A078FF)", color: "#fff" }}>
                  {(username || "Y")[0].toUpperCase()}
                </div>
                <p className="text-[9px] font-black text-purple-300 truncate flex-1">You</p>
              </div>
              {loungeUsers.length === 0 ? (
                <p className="text-[9px] text-white/20 text-center py-4">No one else here</p>
              ) : loungeUsers.map((u) => (
                <button
                  key={u.user_id}
                  onTouchStart={(e) => e.stopPropagation()}
                  onClick={() => { onSelectUser?.(u); }}
                  className="w-full flex items-center gap-2 px-2 py-2 rounded-xl transition-all active:scale-[0.97] text-left hover:brightness-125"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", touchAction: "manipulation" }}
                >
                  <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 font-black text-xs"
                    style={{ background: "linear-gradient(135deg,rgba(155,126,255,0.3),rgba(0,200,220,0.2))", color: "#c4aaff" }}>
                    {(u.username || "?")[0].toUpperCase()}
                  </div>
                  <p className="text-[9px] font-black text-white/70 truncate flex-1">{u.username || "User"}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}