import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { X, Send, Flag, UserX, Shield, Mic, MicOff, AlertTriangle, RotateCcw } from "lucide-react";

/**
 * PrivateChatPanel — keyboard-safe direct message UI for iPhone Safari.
 *
 * Layout strategy:
 *  - Panel uses fixed positioning with top anchored so the keyboard pushes it up naturally
 *    via the browser's visual viewport (iOS Safari moves fixed elements when keyboard opens).
 *  - We listen to `visualViewport` resize/scroll to reposition when the keyboard changes height.
 *  - Font-size 16px on input prevents iOS Safari zoom on focus.
 *  - Message list grows to fill available space between header and input bar.
 */
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
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(null);
  const [failedDraft, setFailedDraft] = useState(null); // kept for retry
  const [isMicMuted, setIsMicMuted] = useState(true);
  const [panelBottom, setPanelBottom] = useState(0);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const panelRef = useRef(null);

  // ── Scroll to bottom when messages change ───────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages?.length]);

  // ── Reset draft when chat opens ────────────────────────
  useEffect(() => {
    if (open) {
      setDraft("");
      setSendError(null);
      setFailedDraft(null);
    }
  }, [open]);

  // ── Visual Viewport API — keep panel above keyboard ────
  // iOS Safari moves the visual viewport up when keyboard opens.
  // By tracking visualViewport.offsetTop we can pin the panel bottom
  // to the keyboard top exactly, without needing dvh hacks.
  useEffect(() => {
    if (!isMobile || !open) {
      setPanelBottom(0);
      return;
    }
    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      // offsetTop = distance from layout viewport top to visual viewport top
      // When keyboard is open on iOS, window.innerHeight stays the same but
      // vv.height shrinks. The gap between them is the keyboard height.
      const keyboardHeight = window.innerHeight - vv.height - vv.offsetTop;
      setPanelBottom(Math.max(0, keyboardHeight));
    };

    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    update();

    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, [isMobile, open]);

  const handleSend = useCallback(async (textOverride) => {
    const text = (textOverride ?? draft).trim();
    if (!text || sending) return;

    setSending(true);
    setSendError(null);
    setFailedDraft(null);
    setDraft(""); // clear optimistically — message appears via optimistic update in hook

    const result = await onSend(text);

    setSending(false);
    if (result?.error) {
      setSendError(result.error);
      setFailedDraft(text); // restore for retry
    }
  }, [draft, sending, onSend]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleRetry = () => {
    if (failedDraft) {
      setSendError(null);
      handleSend(failedDraft);
    }
  };

  const handleClose = () => {
    // Blur input first so keyboard closes before panel animates out
    inputRef.current?.blur();
    setTimeout(() => onEnd?.(), 50);
  };

  if (!open || !peer) return null;

  // Panel height: 65dvh on mobile portrait, 55dvh landscape, 50vh desktop
  // We anchor to bottom and shift up when keyboard appears via panelBottom
  const panelHeight = isMobile ? "65dvh" : "50vh";

  return (
    <motion.div
      ref={panelRef}
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 30, stiffness: 300 }}
      className="fixed inset-x-0 flex flex-col overflow-hidden rounded-t-3xl"
      style={{
        zIndex: 74,
        bottom: panelBottom,
        height: panelHeight,
        background: "rgba(16,12,32,0.98)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border: "1px solid rgba(0,160,220,0.2)",
        borderBottom: "none",
        pointerEvents: "auto",
        // Ensure no transform scale on parent that would affect font-size zoom detection
        transform: "translateZ(0)",
      }}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
    >
      {/* ── Safety confirmation overlay ──────────────────────── */}
      {!safetyConfirmed && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 rounded-t-3xl"
          style={{ zIndex: 2, background: "rgba(8,6,18,0.97)", pointerEvents: "auto" }}
        >
          <div className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{ background: "rgba(245,168,0,0.1)", border: "1px solid rgba(245,168,0,0.2)" }}>
            <Shield className="w-7 h-7 text-yellow-400" />
          </div>
          <div className="text-center">
            <h4 className="font-heading font-black text-base text-white mb-2">Safety First</h4>
            <p className="text-xs text-white/50 leading-relaxed max-w-xs">
              Do not share personal information — no phone number, address, email, passwords, or location.
            </p>
          </div>
          <label className="flex items-center gap-2 text-xs text-white/60 cursor-pointer" style={{ minHeight: 44 }}>
            <input type="checkbox" className="w-4 h-4 accent-green-500"
              onChange={(e) => { if (e.target.checked) onSafetyConfirm?.(); }} />
            I understand
          </label>
        </div>
      )}

      {/* ── Header ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(0,160,220,0.15)" }}>
            <span className="text-xs font-black text-cyan-400">
              {peer.username?.charAt(0)?.toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-white leading-tight truncate">{peer.username}</p>
            <p className="text-[10px] text-white/30">1-on-1 Chat</p>
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onTouchStart={(e) => e.stopPropagation()}
            onClick={() => setIsMicMuted((m) => !m)}
            className="flex items-center justify-center rounded-full transition-all active:scale-90"
            style={{
              background: isMicMuted ? "rgba(239,68,68,0.15)" : "rgba(0,230,118,0.15)",
              border: `1.5px solid ${isMicMuted ? "rgba(239,68,68,0.5)" : "rgba(0,230,118,0.5)"}`,
              width: 36, height: 36, minWidth: 36, minHeight: 36,
              touchAction: "manipulation",
            }}
          >
            {isMicMuted
              ? <MicOff className="w-4 h-4" style={{ color: "#EF4444" }} />
              : <Mic className="w-4 h-4" style={{ color: "#00E676" }} />}
          </button>
          <button
            onTouchStart={(e) => e.stopPropagation()}
            onClick={onReport}
            className="flex items-center justify-center rounded-full transition-all hover:bg-white/10"
            style={{ color: "rgba(255,255,255,0.3)", width: 36, height: 36, minWidth: 36, minHeight: 36, touchAction: "manipulation" }}
          >
            <Flag className="w-3.5 h-3.5" />
          </button>
          <button
            onTouchStart={(e) => e.stopPropagation()}
            onClick={onBlock}
            className="flex items-center justify-center rounded-full transition-all hover:bg-white/10"
            style={{ color: "rgba(255,255,255,0.3)", width: 36, height: 36, minWidth: 36, minHeight: 36, touchAction: "manipulation" }}
          >
            <UserX className="w-3.5 h-3.5" />
          </button>
          <button
            onTouchStart={(e) => e.stopPropagation()}
            onClick={handleClose}
            className="flex items-center justify-center rounded-full transition-all hover:bg-red-500/20"
            style={{
              background: "rgba(239,68,68,0.12)",
              color: "#EF4444",
              width: 36, height: 36, minWidth: 36, minHeight: 36,
              touchAction: "manipulation",
            }}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Messages ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5" style={{ WebkitOverflowScrolling: "touch" }}>
        {(!messages || messages.length === 0) && (
          <p className="text-center text-xs text-white/20 mt-8">No messages yet. Say hello!</p>
        )}
        {(messages || []).map((msg) => {
          const isMe = msg.sender_user_id === currentUserId;
          const isFailed = msg._failed;
          const isOptimistic = msg._optimistic && !isFailed;
          return (
            <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div
                className="max-w-[80%] px-3 py-2 rounded-2xl"
                style={{
                  background: isFailed
                    ? "rgba(239,68,68,0.15)"
                    : isMe
                      ? "linear-gradient(135deg,#0080B8,#00A0DC)"
                      : "rgba(255,255,255,0.06)",
                  border: isFailed
                    ? "1px solid rgba(239,68,68,0.3)"
                    : isMe ? "none" : "1px solid rgba(255,255,255,0.06)",
                  opacity: isOptimistic ? 0.75 : 1,
                }}
              >
                <p className="text-xs leading-relaxed"
                  style={{ color: isFailed ? "#EF4444" : isMe ? "#fff" : "rgba(255,255,255,0.85)" }}>
                  {msg.message}
                </p>
                {isFailed ? (
                  <button
                    onTouchStart={(e) => e.stopPropagation()}
                    onClick={handleRetry}
                    className="flex items-center gap-1 mt-1 text-[9px] font-bold text-red-400 hover:text-red-300"
                    style={{ touchAction: "manipulation" }}
                  >
                    <RotateCcw className="w-2.5 h-2.5" /> Tap to retry
                  </button>
                ) : (
                  <p className="text-[9px] mt-1"
                    style={{ color: isMe ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.2)" }}>
                    {isOptimistic ? "Sending…" : new Date(msg.created_date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Send error banner ─────────────────────────────── */}
      {sendError && !failedDraft && (
        <div className="flex items-center gap-2 px-4 py-2 flex-shrink-0"
          style={{ background: "rgba(239,68,68,0.1)", borderTop: "1px solid rgba(239,68,68,0.2)" }}>
          <AlertTriangle className="w-3 h-3 text-red-400 flex-shrink-0" />
          <p className="text-[10px] text-red-300">{sendError}</p>
        </div>
      )}

      {/* ── Input bar ────────────────────────────────────────── */}
      <div
        className="flex items-center gap-2 px-4 py-3 border-t border-white/5 flex-shrink-0"
        style={{
          // On iOS, add env safe area so input clears home indicator
          paddingBottom: `max(12px, env(safe-area-inset-bottom, 12px))`,
        }}
      >
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => { setDraft(e.target.value); setSendError(null); }}
          onKeyDown={handleKeyDown}
          onTouchStart={(e) => e.stopPropagation()}
          placeholder={failedDraft ? "Tap retry on the message above..." : "Type a message..."}
          maxLength={500}
          disabled={!!failedDraft}
          className="flex-1 px-3 py-2 rounded-xl text-white placeholder-white/20 outline-none"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: `1px solid ${sendError ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.08)"}`,
            minHeight: 44,
            // CRITICAL: 16px prevents iOS Safari from zooming the viewport on input focus
            fontSize: "16px",
            lineHeight: "1.4",
          }}
          enterKeyHint="send"
        />
        <button
          onTouchStart={(e) => e.stopPropagation()}
          onClick={() => handleSend()}
          disabled={!draft.trim() || sending || !!failedDraft}
          className="flex items-center justify-center rounded-full transition-all active:scale-95"
          style={{
            background: draft.trim() && !sending && !failedDraft
              ? "linear-gradient(135deg,#00C853,#00E676)"
              : "rgba(255,255,255,0.06)",
            border: draft.trim() && !sending && !failedDraft ? "none" : "1px solid rgba(255,255,255,0.06)",
            color: draft.trim() && !sending && !failedDraft ? "#000" : "rgba(255,255,255,0.2)",
            width: 48, height: 48, minWidth: 48, minHeight: 48,
            flexShrink: 0,
            touchAction: "manipulation",
          }}
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}