/**
 * MessageRequestComposer — shown when User A taps "Message" on User B's profile.
 * Allows sending 1–2 pre-approval messages.
 */
import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { X, Send, AlertTriangle } from "lucide-react";

export default function MessageRequestComposer({
  open,
  targetUser, // { userId, username }
  onSend,     // async (text) => { success, error, pending, limitReached }
  onClose,
  isMobile,
}) {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState(null); // null | "sent" | "limit" | "error"
  const [errorMsg, setErrorMsg] = useState("");
  const [panelBottom, setPanelBottom] = useState(0);
  const inputRef = useRef(null);

  // iOS keyboard tracking
  useEffect(() => {
    if (!open) { setPanelBottom(0); return; }
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => setPanelBottom(Math.max(0, window.innerHeight - vv.height - vv.offsetTop));
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    update();
    return () => { vv.removeEventListener("resize", update); vv.removeEventListener("scroll", update); };
  }, [open]);

  // Reset on open
  useEffect(() => {
    if (open) { setDraft(""); setStatus(null); setErrorMsg(""); }
  }, [open, targetUser?.userId]);

  if (!open || !targetUser) return null;

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setErrorMsg("");
    const result = await onSend(text);
    setSending(false);
    if (result?.error) {
      if (result.limitReached) { setStatus("limit"); }
      else { setStatus("error"); setErrorMsg(result.error); }
    } else if (result?.success) {
      setDraft("");
      setStatus("sent");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleClose = () => {
    inputRef.current?.blur();
    setTimeout(() => onClose?.(), 50);
  };

  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 30, stiffness: 300 }}
      className="fixed flex flex-col overflow-hidden rounded-t-3xl"
      style={{
        zIndex: 76,
        left: "max(8px, env(safe-area-inset-left, 0px))",
        right: "max(8px, env(safe-area-inset-right, 0px))",
        bottom: panelBottom,
        width: "auto",
        maxWidth: "calc(100vw - env(safe-area-inset-left, 0px) - env(safe-area-inset-right, 0px) - 16px)",
        height: isMobile ? "min(56dvh, calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 12px))" : "40vh",
        maxHeight: "calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 12px)",
        background: "rgba(16,12,32,0.98)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border: "1px solid rgba(0,160,220,0.2)",
        borderBottom: "none",
        pointerEvents: "auto",
      }}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-white/5 flex-shrink-0 min-w-0">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-white break-words whitespace-normal" style={{ overflowWrap: "anywhere" }}>
            Message {targetUser.username}
          </p>
          <p className="text-[10px] text-white/30">Message request</p>
        </div>
        <button
          onTouchStart={(e) => e.stopPropagation()}
          onClick={handleClose}
          className="flex items-center justify-center rounded-full hover:bg-red-500/20 transition-all"
          style={{ background: "rgba(239,68,68,0.12)", color: "#EF4444", width: 36, height: 36, minWidth: 36, minHeight: 36, touchAction: "manipulation" }}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Status / body */}
      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col items-center justify-center px-5 gap-3" style={{ WebkitOverflowScrolling: "touch", overflowWrap: "anywhere", wordBreak: "break-word" }}>
        {status === "sent" && (
          <div className="text-center">
            <p className="text-2xl mb-2">📨</p>
            <p className="text-sm font-black text-white">Message Request Sent</p>
            <p className="text-xs text-white/40 mt-1">Waiting for {targetUser.username} to approve.</p>
            <p className="text-[10px] text-white/25 mt-1">You can send 1 more message before they need to approve.</p>
          </div>
        )}
        {status === "limit" && (
          <div className="text-center">
            <AlertTriangle className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
            <p className="text-sm font-black text-white">Request Pending</p>
            <p className="text-xs text-white/40 mt-1">Waiting for approval. You can't send more messages until {targetUser.username} approves.</p>
          </div>
        )}
        {status === "error" && (
          <div className="text-center">
            <p className="text-xs text-red-400">{errorMsg}</p>
          </div>
        )}
        {(status === null || status === "sent") && status !== "limit" && (
          <p className="text-[11px] text-white/30 text-center max-w-full break-words whitespace-normal" style={{ overflowWrap: "anywhere" }}>
            {status === "sent"
              ? "You can send one more message while waiting."
              : `Send a message to ${targetUser.username}. They'll see a preview and can Approve or Deny.`}
          </p>
        )}
      </div>

      {/* Input bar */}
      {status !== "limit" && (
        <div
          className="flex items-center gap-2 px-4 border-t border-white/5 flex-shrink-0"
          style={{ paddingTop: 10, paddingBottom: "max(12px, env(safe-area-inset-bottom, 12px))" }}
        >
          <input
            ref={inputRef}
            type="text"
            value={draft}
            onChange={(e) => { setDraft(e.target.value); if (status === "error") setStatus(null); }}
            onKeyDown={handleKeyDown}
            onTouchStart={(e) => e.stopPropagation()}
            placeholder="Write a message..."
            maxLength={300}
            className="flex-1 min-w-0 px-3 py-2 rounded-xl text-white placeholder-white/20 outline-none"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.08)",
              minHeight: 44, fontSize: "16px", lineHeight: "1.4",
            }}
            enterKeyHint="send"
          />
          <button
            onTouchStart={(e) => e.stopPropagation()}
            onClick={handleSend}
            disabled={!draft.trim() || sending}
            className="flex items-center justify-center rounded-full transition-all active:scale-95"
            style={{
              background: draft.trim() && !sending ? "linear-gradient(135deg,#0080B8,#00A0DC)" : "rgba(255,255,255,0.06)",
              color: draft.trim() && !sending ? "#fff" : "rgba(255,255,255,0.2)",
              width: 48, height: 48, minWidth: 48, minHeight: 48,
              flexShrink: 0, touchAction: "manipulation",
            }}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      )}
    </motion.div>
  );
}