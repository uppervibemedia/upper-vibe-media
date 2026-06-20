import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Flag, UserX, AlertTriangle, Shield, Check } from "lucide-react";

export default function PrivateChatPanel({
  open,
  peer,
  messages,
  onSend,
  onEnd,
  onBlock,
  onReport,
  currentUserId,
  safetyConfirmed,
  onSafetyConfirm,
  isMobile,
}) {
  const [draft, setDraft] = useState("");
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (open) setDraft("");
  }, [open]);

  if (!open || !peer) return null;

  const handleSend = () => {
    if (!draft.trim()) return;
    onSend(draft);
    setDraft("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 30, stiffness: 300 }}
      className="fixed inset-x-0 bottom-0 rounded-t-3xl overflow-hidden flex flex-col"
      style={{
        zIndex: 74,
        height: isMobile ? "65dvh" : "50vh",
        background: "rgba(16,12,32,0.98)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border: "1px solid rgba(0,160,220,0.2)",
        borderBottom: "none",
        pointerEvents: "auto",
      }}
      onTouchStart={(e) => e.stopPropagation()}
    >
      {/* ── Safety confirmation overlay ──────────────────────── */}
      <AnimatePresence>
        {!safetyConfirmed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6"
            style={{
              zIndex: 2,
              background: "rgba(8,6,18,0.95)",
              pointerEvents: "auto",
            }}
          >
            <div className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ background: "rgba(245,168,0,0.1)", border: "1px solid rgba(245,168,0,0.2)" }}>
              <Shield className="w-7 h-7 text-yellow-400" />
            </div>
            <div className="text-center">
              <h4 className="font-heading font-black text-base text-white mb-2">Safety First</h4>
              <p className="text-xs text-white/50 leading-relaxed max-w-xs">
                Do not share personal information. Do not share your phone number, address,
                email, passwords, payment information, location, or private details.
              </p>
            </div>
            <label className="flex items-center gap-2 text-xs text-white/60 cursor-pointer"
              style={{ minHeight: 44 }}>
              <input
                type="checkbox"
                className="w-4 h-4 accent-green-500"
                onChange={(e) => {
                  if (e.target.checked) onSafetyConfirm();
                }}
              />
              I understand
            </label>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Header ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "rgba(0,160,220,0.15)" }}>
            <span className="text-xs font-black text-cyan-400">
              {peer.username?.charAt(0)?.toUpperCase()}
            </span>
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-tight">{peer.username}</p>
            <p className="text-[10px] text-white/30">1-on-1 Chat</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onReport}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:bg-white/10"
            style={{
              color: "rgba(255,255,255,0.3)",
              minWidth: 32, minHeight: 32,
              touchAction: "manipulation",
            }}
            title="Report"
          >
            <Flag className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onBlock}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:bg-white/10"
            style={{
              color: "rgba(255,255,255,0.3)",
              minWidth: 32, minHeight: 32,
              touchAction: "manipulation",
            }}
            title="Block"
          >
            <UserX className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onEnd}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:bg-red-500/20"
            style={{
              background: "rgba(239,68,68,0.12)",
              color: "#EF4444",
              minWidth: 32, minHeight: 32,
              touchAction: "manipulation",
            }}
            title="End Chat"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Messages ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
        {messages.length === 0 && (
          <p className="text-center text-xs text-white/20 mt-8">
            No messages yet. Say hello!
          </p>
        )}
        {messages.map((msg) => {
          const isMe = msg.sender_user_id === currentUserId;
          return (
            <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div
                className="max-w-[80%] px-3 py-2 rounded-2xl"
                style={{
                  background: isMe
                    ? "linear-gradient(135deg,#0080B8,#00A0DC)"
                    : "rgba(255,255,255,0.06)",
                  border: isMe ? "none" : "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <p className="text-xs leading-relaxed"
                  style={{ color: isMe ? "#fff" : "rgba(255,255,255,0.8)" }}>
                  {msg.message}
                </p>
                <p className="text-[9px] mt-1"
                  style={{ color: isMe ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.2)" }}>
                  {new Date(msg.created_date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Input ────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-4 py-3 border-t border-white/5 flex-shrink-0">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          maxLength={500}
          className="flex-1 px-3 py-2 rounded-xl text-xs text-white placeholder-white/20 outline-none"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.08)",
            minHeight: 40,
          }}
        />
        <button
          onClick={handleSend}
          disabled={!draft.trim()}
          className="w-11 h-11 rounded-full flex items-center justify-center transition-all active:scale-95"
          style={{
            background: draft.trim()
              ? "linear-gradient(135deg,#00C853,#00E676)"
              : "rgba(255,255,255,0.06)",
            border: draft.trim() ? "none" : "1px solid rgba(255,255,255,0.06)",
            color: draft.trim() ? "#000" : "rgba(255,255,255,0.2)",
            minWidth: 44, minHeight: 44,
            touchAction: "manipulation",
          }}
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}