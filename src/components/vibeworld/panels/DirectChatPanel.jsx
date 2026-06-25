/**
 * DirectChatPanel — the approved 1-on-1 chat box.
 * Opens only after a message request is approved.
 * sendMessage() never opens a new chat — it just sends into the active conversation.
 */
import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { X, Send, UserX, Flag, AlertTriangle, RotateCcw } from "lucide-react";
import BlockReportConfirmModal from "@/components/vibeworld/BlockReportConfirmModal";
import { base44 } from "@/api/base44Client";

export default function DirectChatPanel({
  open,
  peer,        // { userId, username, conversationId }
  messages,    // DirectMessage records
  onSend,      // async (text) => { success, error }
  onClose,
  onBlock,
  onReport,
  currentUserId,
  isMobile,
}) {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(null);
  const [failedDraft, setFailedDraft] = useState(null);
  const [panelBottom, setPanelBottom] = useState(0);
  const [confirmModal, setConfirmModal] = useState(null); // { mode }
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // iOS keyboard tracking
  useEffect(() => {
    if (!isMobile || !open) { setPanelBottom(0); return; }
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => setPanelBottom(Math.max(0, window.innerHeight - vv.height - vv.offsetTop));
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    update();
    return () => { vv.removeEventListener("resize", update); vv.removeEventListener("scroll", update); };
  }, [isMobile, open]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages?.length]);

  // Reset draft when chat opens
  useEffect(() => {
    if (open) { setDraft(""); setSendError(null); setFailedDraft(null); }
  }, [open, peer?.conversationId]);

  const handleSend = useCallback(async (textOverride) => {
    const text = (textOverride ?? draft).trim();
    if (!text || sending) return;
    setSending(true);
    setSendError(null);
    setFailedDraft(null);
    setDraft("");
    const result = await onSend(text);
    setSending(false);
    if (result?.error) {
      setSendError(result.error);
      setFailedDraft(text);
    }
  }, [draft, sending, onSend]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleClose = () => {
    inputRef.current?.blur();
    setTimeout(() => onClose?.(), 50);
  };

  if (!open || !peer) return null;

  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 30, stiffness: 300 }}
      className="fixed inset-x-0 flex flex-col overflow-hidden rounded-t-3xl"
      style={{
        zIndex: 74,
        bottom: panelBottom,
        height: isMobile ? "65dvh" : "55vh",
        background: "rgba(16,12,32,0.98)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border: "1px solid rgba(0,160,220,0.2)",
        borderBottom: "none",
        pointerEvents: "auto",
        transform: "translateZ(0)",
      }}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
    >
      {/* Header */}
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
            <p className="text-[10px] text-white/30">Direct Message</p>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Safety actions — 2-step confirm to avoid accidental taps */}
          <button onTouchStart={(e) => e.stopPropagation()} onClick={() => setConfirmModal({ mode: "report" })}
            className="flex items-center justify-center rounded-full hover:bg-white/10"
            style={{ color: "rgba(255,255,255,0.25)", width: 36, height: 36, minWidth: 36, minHeight: 36, touchAction: "manipulation" }}>
            <Flag className="w-3.5 h-3.5" />
          </button>
          <button onTouchStart={(e) => e.stopPropagation()} onClick={() => setConfirmModal({ mode: "block" })}
            className="flex items-center justify-center rounded-full hover:bg-white/10"
            style={{ color: "rgba(255,255,255,0.25)", width: 36, height: 36, minWidth: 36, minHeight: 36, touchAction: "manipulation" }}>
            <UserX className="w-3.5 h-3.5" />
          </button>
          <button onTouchStart={(e) => e.stopPropagation()} onClick={handleClose}
            className="flex items-center justify-center rounded-full hover:bg-red-500/20"
            style={{ background: "rgba(239,68,68,0.12)", color: "#EF4444", width: 36, height: 36, minWidth: 36, minHeight: 36, touchAction: "manipulation" }}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5" style={{ WebkitOverflowScrolling: "touch" }}>
        {(!messages || messages.length === 0) && (
          <p className="text-center text-xs text-white/20 mt-8">Chat approved! Say something ✨</p>
        )}
        {(messages || []).map((msg) => {
          const isMe = msg.sender_user_id === currentUserId;
          const isFailed = msg._failed;
          const isOpt = msg._optimistic && !isFailed;
          const text = msg.message_text || msg.message || "";
          return (
            <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div className="max-w-[80%] px-3 py-2 rounded-2xl"
                style={{
                  background: isFailed ? "rgba(239,68,68,0.15)" : isMe ? "linear-gradient(135deg,#0080B8,#00A0DC)" : "rgba(255,255,255,0.06)",
                  border: isFailed ? "1px solid rgba(239,68,68,0.3)" : isMe ? "none" : "1px solid rgba(255,255,255,0.06)",
                  opacity: isOpt ? 0.75 : 1,
                }}>
                <p className="text-xs leading-relaxed"
                  style={{ color: isFailed ? "#EF4444" : isMe ? "#fff" : "rgba(255,255,255,0.85)" }}>
                  {text}
                </p>
                {isFailed ? (
                  <button onTouchStart={(e) => e.stopPropagation()} onClick={() => { setSendError(null); handleSend(failedDraft); }}
                    className="flex items-center gap-1 mt-1 text-[9px] font-bold text-red-400"
                    style={{ touchAction: "manipulation" }}>
                    <RotateCcw className="w-2.5 h-2.5" /> Tap to retry
                  </button>
                ) : (
                  <p className="text-[9px] mt-1" style={{ color: isMe ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.2)" }}>
                    {isOpt ? "Sending…" : new Date(msg.created_date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Error banner */}
      {sendError && (
        <div className="flex items-center gap-2 px-4 py-2 flex-shrink-0"
          style={{ background: "rgba(239,68,68,0.1)", borderTop: "1px solid rgba(239,68,68,0.2)" }}>
          <AlertTriangle className="w-3 h-3 text-red-400 flex-shrink-0" />
          <p className="text-[10px] text-red-300">{sendError}</p>
        </div>
      )}

      {/* Input bar */}
      <div className="flex items-center gap-2 px-4 border-t border-white/5 flex-shrink-0"
        style={{ paddingTop: 10, paddingBottom: "max(12px, env(safe-area-inset-bottom, 12px))" }}>
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => { setDraft(e.target.value); setSendError(null); }}
          onKeyDown={handleKeyDown}
          onTouchStart={(e) => e.stopPropagation()}
          placeholder={failedDraft ? "Tap retry above..." : "Type a message..."}
          maxLength={500}
          disabled={!!failedDraft}
          className="flex-1 px-3 py-2 rounded-xl text-white placeholder-white/20 outline-none"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: `1px solid ${sendError ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.08)"}`,
            minHeight: 44, fontSize: "16px", lineHeight: "1.4",
          }}
          enterKeyHint="send"
        />
        <button
          onTouchStart={(e) => e.stopPropagation()}
          onClick={() => handleSend()}
          disabled={!draft.trim() || sending || !!failedDraft}
          className="flex items-center justify-center rounded-full transition-all active:scale-95"
          style={{
            background: draft.trim() && !sending && !failedDraft ? "linear-gradient(135deg,#00C853,#00E676)" : "rgba(255,255,255,0.06)",
            color: draft.trim() && !sending && !failedDraft ? "#000" : "rgba(255,255,255,0.2)",
            width: 48, height: 48, minWidth: 48, minHeight: 48,
            flexShrink: 0, touchAction: "manipulation",
          }}
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

      {/* 2-step block/report confirm */}
      <BlockReportConfirmModal
        open={!!confirmModal}
        mode={confirmModal?.mode}
        targetUsername={peer?.username}
        onConfirm={async (reason, note) => {
          if (confirmModal?.mode === "block") {
            setConfirmModal(null);
            onBlock?.();
          } else if (confirmModal?.mode === "report") {
            try {
              await base44.entities.UserReport?.create?.({
                reporter_user_id: currentUserId,
                reported_user_id: peer?.userId,
                reason: reason || "Other",
                note: note || "",
                status: "pending",
              });
            } catch {}
            // modal shows success state, user closes it manually
          }
        }}
        onCancel={() => setConfirmModal(null)}
      />
    </motion.div>
  );
}