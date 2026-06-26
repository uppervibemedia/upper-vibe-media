/**
 * NotificationPanel — bell notification dropdown.
 * Tapping a notification card opens a detail view.
 * X dismisses the individual notification.
 * Approve/Deny/Block work from the detail view.
 */
import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X, Check, MessageCircle, Sparkles, UserX, ArrowLeft, ChevronRight } from "lucide-react";
import { base44 } from "@/api/base44Client";
import BlockReportConfirmModal from "@/components/vibeworld/BlockReportConfirmModal";

const TYPE_ICON = {
  message_request: MessageCircle,
  message_approved: Check,
  message_denied: X,
  direct_message: MessageCircle,
  system: Sparkles,
};

const TYPE_COLOR = {
  message_request: "#C43BFF",
  message_approved: "#00C853",
  message_denied: "#EF4444",
  direct_message: "#00D4F0",
  system: "#9B7EFF",
};

function formatTime(dateStr) {
  if (!dateStr) return "Just now";
  return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// ── Detail view: shows messages + Approve/Deny/Block ──────────
function RequestDetailView({
  note,
  onBack,
  onApprove,
  onDeny,
  onBlock,
  onDismiss,
}) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);

  useEffect(() => {
    if (!note?.conversation_id) { setLoading(false); return; }
    base44.entities.DirectMessage
      .filter({ conversation_id: note.conversation_id }, "created_date", 20)
      .then((msgs) => {
        setMessages((msgs || []).sort((a, b) => new Date(a.created_date) - new Date(b.created_date)));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [note?.conversation_id]);

  const isRequest = note.type === "message_request";
  const isApproved = note.type === "message_approved";
  const isDM = note.type === "direct_message";
  const color = TYPE_COLOR[note.type] || "#9B7EFF";

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Detail header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 flex-shrink-0">
        <button
          onTouchStart={(e) => e.stopPropagation()}
          onClick={onBack}
          className="flex items-center justify-center rounded-full hover:bg-white/10 active:scale-90 transition-all"
          style={{ width: 32, height: 32, minWidth: 32, minHeight: 32, touchAction: "manipulation", color: "rgba(255,255,255,0.5)" }}
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-black text-white/70 tracking-wider uppercase">
            {isRequest ? "Message Request" : isDM ? "Direct Message" : "Notification"}
          </p>
          <p className="text-xs font-black text-white truncate">{note.from_username || "User"}</p>
        </div>
        <button
          onTouchStart={(e) => e.stopPropagation()}
          onClick={() => { onDismiss?.(note.id); onBack(); }}
          className="flex items-center justify-center rounded-full hover:bg-white/10 active:scale-90 transition-all"
          style={{ width: 32, height: 32, minWidth: 32, minHeight: 32, touchAction: "manipulation", color: "rgba(255,255,255,0.3)" }}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Message thread */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2" style={{ overscrollBehavior: "contain" }}>
        {loading ? (
          <div className="flex justify-center py-6">
            <div className="w-5 h-5 border-2 border-white/10 border-t-purple-400 rounded-full animate-spin" />
          </div>
        ) : messages.length > 0 ? (
          messages.map((msg) => (
            <div key={msg.id} className="rounded-xl px-3 py-2.5"
              style={{ background: `${color}0D`, border: `1px solid ${color}20` }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] font-black tracking-wider" style={{ color }}>{msg.sender_username || "User"}</span>
                <span className="text-[8px] text-white/25">{formatTime(msg.created_date)}</span>
              </div>
              <p className="text-xs text-white/85 leading-snug">{msg.message_text}</p>
            </div>
          ))
        ) : (
          // Fallback: show the notification message text
          <div className="rounded-xl px-3 py-2.5"
            style={{ background: `${color}0D`, border: `1px solid ${color}20` }}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] font-black tracking-wider" style={{ color }}>{note.from_username || "User"}</span>
              <span className="text-[8px] text-white/25">{formatTime(note.created_date)}</span>
            </div>
            <p className="text-xs text-white/85 leading-snug">{note.message}</p>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex-shrink-0 px-4 pb-4 pt-2 space-y-2" style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom, 16px))" }}>
        {isRequest && note.related_request_id && (
          <>
            <button
              onTouchStart={(e) => e.stopPropagation()}
              onClick={() => { onApprove?.(note.related_request_id, note.from_user_id, note.from_username); }}
              className="w-full rounded-xl font-black text-sm tracking-wider transition-all active:scale-[0.98] hover:brightness-110"
              style={{
                background: "rgba(0,200,83,0.18)",
                border: "1px solid rgba(0,200,83,0.4)",
                color: "#00C853",
                minHeight: 48,
                touchAction: "manipulation",
                padding: "12px 16px",
              }}
            >
              ✓ Approve Request
            </button>
            <div className="flex gap-2">
              <button
                onTouchStart={(e) => e.stopPropagation()}
                onClick={() => { onDeny?.(note.related_request_id, note.from_user_id); onBack(); }}
                className="flex-1 rounded-xl font-black text-sm tracking-wider transition-all active:scale-[0.98]"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "rgba(255,255,255,0.5)",
                  minHeight: 48,
                  touchAction: "manipulation",
                  padding: "12px 16px",
                }}
              >
                Deny
              </button>
              <button
                  onTouchStart={(e) => e.stopPropagation()}
                  onClick={() => setShowBlockConfirm(true)}
                  className="flex-1 rounded-xl font-black text-sm tracking-wider transition-all active:scale-[0.98]"
                  style={{
                    background: "rgba(239,68,68,0.1)",
                    border: "1px solid rgba(239,68,68,0.25)",
                    color: "#EF4444",
                    minHeight: 48,
                    touchAction: "manipulation",
                    padding: "12px 16px",
                  }}
                >
                  <UserX className="w-3.5 h-3.5 inline mr-1" />Block
                </button>
            </div>
          </>
        )}

        {(isApproved || isDM) && note.from_user_id && (
          <button
            onTouchStart={(e) => e.stopPropagation()}
            onClick={() => { onApprove?.(null, note.from_user_id, note.from_username); onDismiss?.(note.id); }}
            className="w-full rounded-xl font-black text-sm tracking-wider transition-all active:scale-[0.98] hover:brightness-110"
            style={{
              background: "rgba(0,212,240,0.14)",
              border: "1px solid rgba(0,212,240,0.3)",
              color: "#00D4F0",
              minHeight: 48,
              touchAction: "manipulation",
              padding: "12px 16px",
            }}
          >
            Open Chat →
          </button>
        )}
      </div>

      <BlockReportConfirmModal
        open={showBlockConfirm}
        mode="block"
        targetUsername={note.from_username}
        onConfirm={() => {
          setShowBlockConfirm(false);
          onBlock?.(note.from_user_id, note.from_username);
          onDismiss?.(note.id);
          onBack();
        }}
        onCancel={() => setShowBlockConfirm(false)}
      />
    </div>
  );
}

// ── Main NotificationPanel ──────────────────────────────────────
export default function NotificationPanel({
  open,
  onClose,
  notifications = [],
  unreadCount = 0,
  onApproveRequest,   // (requestId, fromUserId, fromUsername) => void
  onDenyRequest,      // (requestId, fromUserId) => void
  onBlockUser,        // (userId, username) => void
  onOpenChat,         // (userId, username) => void
  onMarkHandled,      // (noteId) => void
  onMarkAllRead,
  isMobile,
}) {
  const [selectedNote, setSelectedNote] = useState(null);

  // Reset detail when panel closes
  useEffect(() => {
    if (!open) setSelectedNote(null);
  }, [open]);

  if (!open) return null;

  const handleCardTap = (note) => {
    setSelectedNote(note);
  };

  const handleDismissOnly = (e, noteId) => {
    e.stopPropagation();
    e.preventDefault();
    onMarkHandled?.(noteId);
  };

  const handleApprove = (requestId, fromUserId, fromUsername) => {
    if (requestId) {
      // message_request approve
      onApproveRequest?.(requestId, fromUserId, fromUsername);
    } else {
      // direct_message / approved — open chat
      onOpenChat?.(fromUserId, fromUsername);
    }
    setSelectedNote(null);
    onClose?.();
  };

  const handleDeny = (requestId, fromUserId) => {
    onDenyRequest?.(requestId, fromUserId);
    setSelectedNote(null);
  };

  const handleBlock = (userId, username) => {
    onBlockUser?.(userId, username);
  };

  return (
    <motion.div
      key="notif-panel"
      initial={{ opacity: 0, y: -10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ duration: 0.18 }}
      className="absolute right-1 z-[80] pointer-events-auto"
      style={{
        right: "calc(env(safe-area-inset-right, 0px) + 4px)",
        top: isMobile ? "calc(env(safe-area-inset-top, 0px) + 5.5rem)" : "7rem",
        width: isMobile ? "min(calc(100vw - 1rem), 320px)" : "320px",
        maxHeight: isMobile ? "65dvh" : "480px",
        display: "flex",
        flexDirection: "column",
        borderRadius: "16px",
        background: "rgba(10,8,28,0.99)",
        border: "1px solid rgba(124,58,237,0.3)",
        backdropFilter: "blur(28px)",
        WebkitBackdropFilter: "blur(28px)",
        boxShadow: "0 8px 48px rgba(0,0,0,0.8)",
        overflow: "hidden",
      }}
      onTouchStart={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <AnimatePresence mode="wait">
        {selectedNote ? (
          <motion.div
            key="detail"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 30 }}
            transition={{ duration: 0.15 }}
            className="flex flex-col flex-1 min-h-0"
            style={{ minHeight: 0 }}
          >
            <RequestDetailView
              note={selectedNote}
              onBack={() => setSelectedNote(null)}
              onApprove={handleApprove}
              onDeny={handleDeny}
              onBlock={handleBlock}
              onDismiss={onMarkHandled}
            />
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.15 }}
            className="flex flex-col flex-1 min-h-0"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 flex-shrink-0">
              <div className="flex items-center gap-2">
                <Bell style={{ width: 13, height: 13, color: "#9B7EFF" }} />
                <p className="text-[11px] font-black text-white/70 tracking-wider uppercase">Notifications</p>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[8px] font-black"
                    style={{ background: "rgba(155,126,255,0.25)", color: "#c4aaff" }}>
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onTouchStart={(e) => e.stopPropagation()}
                    onClick={onMarkAllRead}
                    className="px-2 py-0.5 rounded-full text-[8px] font-black hover:bg-white/10"
                    style={{ color: "rgba(255,255,255,0.35)", touchAction: "manipulation" }}
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onTouchStart={(e) => e.stopPropagation()}
                  onClick={onClose}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 active:scale-90"
                  style={{ color: "rgba(255,255,255,0.4)", touchAction: "manipulation", minWidth: 32, minHeight: 32 }}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5" style={{ overscrollBehavior: "contain" }}>
              {notifications.length === 0 ? (
                <div className="py-8 text-center">
                  <Bell style={{ width: 24, height: 24, color: "rgba(255,255,255,0.08)", margin: "0 auto 8px" }} />
                  <p className="text-xs text-white/20">No notifications</p>
                </div>
              ) : notifications.map((note) => {
                const Icon = TYPE_ICON[note.type] || Sparkles;
                const color = TYPE_COLOR[note.type] || "#9B7EFF";
                const isActionable = note.type === "message_request" || note.type === "message_approved" || note.type === "direct_message";

                return (
                  <div
                    key={note.id}
                    className="relative rounded-xl overflow-hidden"
                    style={{
                      background: note.read ? "rgba(255,255,255,0.03)" : `${color}0D`,
                      border: `1px solid ${note.read ? "rgba(255,255,255,0.06)" : color + "28"}`,
                    }}
                  >
                    {/* Tappable card body */}
                    <button
                      onTouchStart={(e) => e.stopPropagation()}
                      onClick={() => isActionable ? handleCardTap(note) : onMarkHandled?.(note.id)}
                      className="w-full text-left transition-all active:brightness-125"
                      style={{
                        display: "block",
                        padding: "12px 40px 12px 12px", // right padding for the X button
                        touchAction: "manipulation",
                        minHeight: 56,
                        cursor: isActionable ? "pointer" : "default",
                        WebkitTapHighlightColor: "transparent",
                        background: "transparent",
                        border: "none",
                        width: "100%",
                      }}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                          style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
                          <Icon style={{ width: 12, height: 12, color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-bold text-white/85 leading-snug">{note.message}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-[9px] text-white/25">{formatTime(note.created_date)}</p>
                            {isActionable && (
                              <span className="text-[9px] font-black tracking-wider flex items-center gap-0.5" style={{ color }}>
                                Tap to view <ChevronRight style={{ width: 9, height: 9, display: "inline" }} />
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>

                    {/* X dismiss — absolutely positioned so it doesn't block the card tap */}
                    <button
                      onTouchStart={(e) => { e.stopPropagation(); }}
                      onClick={(e) => handleDismissOnly(e, note.id)}
                      className="absolute top-2 right-2 flex items-center justify-center rounded-full hover:bg-white/15 active:scale-90 transition-all"
                      style={{
                        width: 28, height: 28, minWidth: 28, minHeight: 28,
                        color: "rgba(255,255,255,0.3)",
                        touchAction: "manipulation",
                        WebkitTapHighlightColor: "transparent",
                        zIndex: 2,
                      }}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}