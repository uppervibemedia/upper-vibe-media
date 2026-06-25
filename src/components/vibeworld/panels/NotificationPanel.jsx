/**
 * NotificationPanel — bell notification dropdown.
 * Shows friend requests, accepted requests, direct message alerts.
 */
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X, Check, UserPlus, MessageCircle, Sparkles } from "lucide-react";

const TYPE_ICON = {
  friend_request: UserPlus,
  request_accepted: Check,
  direct_message: MessageCircle,
  system: Sparkles,
};

const TYPE_COLOR = {
  friend_request: "#C43BFF",
  request_accepted: "#00C853",
  direct_message: "#00D4F0",
  system: "#9B7EFF",
};

export default function NotificationPanel({
  open,
  onClose,
  notifications = [],
  unreadCount = 0,
  onAcceptRequest,
  onDeclineRequest,
  onOpenChat,
  onMarkHandled,
  onMarkAllRead,
  isMobile,
}) {
  if (!open) return null;

  return (
    <motion.div
      key="notif-panel"
      initial={{ opacity: 0, y: -10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ duration: 0.18 }}
      className="absolute right-1 z-[57] pointer-events-auto"
      style={{
        top: isMobile ? "calc(env(safe-area-inset-top, 0px) + 5.5rem)" : "7rem",
        width: isMobile ? "min(calc(100vw - 1rem), 320px)" : "310px",
        maxHeight: isMobile ? "60dvh" : "420px",
        display: "flex",
        flexDirection: "column",
        borderRadius: "16px",
        background: "rgba(10,8,28,0.98)",
        border: "1px solid rgba(124,58,237,0.3)",
        backdropFilter: "blur(24px)",
        boxShadow: "0 8px 48px rgba(0,0,0,0.7)",
        overflow: "hidden",
      }}
      onTouchStart={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
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
              className="px-2 py-0.5 rounded-full text-[8px] font-black transition-all hover:bg-white/10"
              style={{ color: "rgba(255,255,255,0.35)", touchAction: "manipulation" }}
            >
              Mark all read
            </button>
          )}
          <button
            onTouchStart={(e) => e.stopPropagation()}
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 active:scale-90 transition-all"
            style={{ color: "rgba(255,255,255,0.4)", touchAction: "manipulation", minWidth: 32, minHeight: 32 }}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Notification list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {notifications.length === 0 ? (
          <div className="py-8 text-center">
            <Bell style={{ width: 24, height: 24, color: "rgba(255,255,255,0.08)", margin: "0 auto 8px" }} />
            <p className="text-xs text-white/20">No notifications</p>
          </div>
        ) : notifications.map((note) => {
          const Icon = TYPE_ICON[note.type] || Sparkles;
          const color = TYPE_COLOR[note.type] || "#9B7EFF";
          const isRequest = note.type === "friend_request";
          const isDM = note.type === "direct_message" || note.type === "request_accepted";

          return (
            <div
              key={note.id}
              className="p-3 rounded-xl"
              style={{
                background: note.read ? "rgba(255,255,255,0.03)" : `${color}0D`,
                border: `1px solid ${note.read ? "rgba(255,255,255,0.06)" : color + "28"}`,
              }}
            >
              {/* Top row */}
              <div className="flex items-start gap-2.5 mb-2">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: `${color}18`, border: `1px solid ${color}30` }}
                >
                  <Icon style={{ width: 12, height: 12, color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold text-white/85 leading-snug">{note.message}</p>
                  <p className="text-[9px] text-white/25 mt-0.5">
                    {note.created_date
                      ? new Date(note.created_date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      : "Just now"}
                  </p>
                </div>
                {/* Dismiss X */}
                <button
                  onTouchStart={(e) => e.stopPropagation()}
                  onClick={() => onMarkHandled?.(note.id)}
                  className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 hover:bg-white/10 active:scale-90"
                  style={{ color: "rgba(255,255,255,0.25)", touchAction: "manipulation", minWidth: 24, minHeight: 24 }}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>

              {/* Friend request actions */}
              {isRequest && note.related_request_id && (
                <div className="flex gap-1.5">
                  <button
                    onTouchStart={(e) => e.stopPropagation()}
                    onClick={() => {
                      onAcceptRequest?.(note.related_request_id, note.from_user_id, note.from_username);
                      onMarkHandled?.(note.id);
                      onClose?.();
                    }}
                    className="flex-1 py-1.5 rounded-lg font-black text-[10px] transition-all hover:brightness-110 active:scale-95"
                    style={{
                      background: "rgba(0,200,83,0.18)",
                      border: "1px solid rgba(0,200,83,0.35)",
                      color: "#00C853",
                      minHeight: 32,
                      touchAction: "manipulation",
                    }}
                  >
                    ✓ Accept
                  </button>
                  <button
                    onTouchStart={(e) => e.stopPropagation()}
                    onClick={() => {
                      onDeclineRequest?.(note.related_request_id);
                      onMarkHandled?.(note.id);
                    }}
                    className="flex-1 py-1.5 rounded-lg font-black text-[10px] transition-all active:scale-95"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "rgba(255,255,255,0.45)",
                      minHeight: 32,
                      touchAction: "manipulation",
                    }}
                  >
                    Decline
                  </button>
                </div>
              )}

              {/* Open chat for DM / accepted */}
              {isDM && note.from_user_id && (
                <button
                  onTouchStart={(e) => e.stopPropagation()}
                  onClick={() => {
                    onOpenChat?.(note.from_user_id, note.from_username);
                    onMarkHandled?.(note.id);
                    onClose?.();
                  }}
                  className="w-full py-1.5 rounded-lg font-black text-[10px] transition-all hover:brightness-110 active:scale-95"
                  style={{
                    background: "rgba(0,212,240,0.12)",
                    border: "1px solid rgba(0,212,240,0.25)",
                    color: "#00D4F0",
                    minHeight: 32,
                    touchAction: "manipulation",
                  }}
                >
                  Open Chat →
                </button>
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}