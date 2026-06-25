/**
 * DMInbox — approved 1-on-1 conversations inbox.
 * Lists all MessageRequest records with status "approved" for the current user.
 * Conversations persist across sessions — never auto-deleted.
 */
import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { X, MessageCircle, ChevronRight } from "lucide-react";
import { base44 } from "@/api/base44Client";

function formatTime(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now - d;
  if (diffMs < 60000) return "Just now";
  if (diffMs < 3600000) return `${Math.floor(diffMs / 60000)}m ago`;
  if (diffMs < 86400000) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function DMInbox({
  open,
  onClose,
  currentUserId,
  currentUsername,
  blockedUsers = {},
  onOpenConversation,   // (userId, username, conversationId) => void
  isMobile,
}) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastMessages, setLastMessages] = useState({}); // conversationId → last message text + time

  // Use a ref for blockedUsers so loadConversations never gets recreated when it changes
  const blockedUsersRef = useRef(blockedUsers);
  blockedUsersRef.current = blockedUsers;

  // Guard: only load once per open session to prevent reload loops
  const hasLoadedRef = useRef(false);

  // Stable load function — deps only on currentUserId (never on blockedUsers object)
  const loadConversations = useCallback(async () => {
    if (!currentUserId) return;
    setLoading(true);
    try {
      const [asSender, asReceiver] = await Promise.all([
        base44.entities.MessageRequest.filter({ sender_user_id: currentUserId, status: "approved" }),
        base44.entities.MessageRequest.filter({ receiver_user_id: currentUserId, status: "approved" }),
      ]);

      const all = [...(asSender || []), ...(asReceiver || [])];

      const seen = new Set();
      const unique = all.filter((c) => {
        if (seen.has(c.conversation_id)) return false;
        seen.add(c.conversation_id);
        return true;
      });

      // Use ref to avoid adding blockedUsers to deps
      const filtered = unique.filter((c) => {
        const otherId = c.sender_user_id === currentUserId ? c.receiver_user_id : c.sender_user_id;
        return !blockedUsersRef.current[otherId];
      });

      filtered.sort((a, b) => new Date(b.updated_date || b.created_date) - new Date(a.updated_date || a.created_date));

      setConversations(filtered);

      for (const conv of filtered) {
        base44.entities.DirectMessage
          .filter({ conversation_id: conv.conversation_id }, "-created_date", 1)
          .then((msgs) => {
            if (msgs?.length) {
              const last = msgs[0];
              setLastMessages((prev) => ({
                ...prev,
                [conv.conversation_id]: {
                  text: last.message_text || "",
                  time: last.created_date,
                  senderId: last.sender_user_id,
                },
              }));
            }
          }).catch(() => {});
      }
    } catch (err) {
      console.error("[DMInbox] load error", err);
    } finally {
      setLoading(false);
    }
  }, [currentUserId]); // blockedUsers intentionally excluded — accessed via ref

  // Load once when panel first opens; reset guard when panel closes
  useEffect(() => {
    if (!open) {
      hasLoadedRef.current = false;
      return;
    }
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    loadConversations();
  }, [open, currentUserId]); // loadConversations is stable; currentUserId triggers reload if user changes

  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.97 }}
      transition={{ duration: 0.16 }}
      className="fixed rounded-2xl overflow-hidden flex flex-col"
      style={{
        zIndex: 82,
        top: isMobile ? "calc(env(safe-area-inset-top, 0px) + 5.5rem)" : "7rem",
        right: isMobile ? "0.5rem" : "1rem",
        width: isMobile ? "min(calc(100vw - 1rem), 320px)" : "320px",
        maxHeight: isMobile ? "65dvh" : "480px",
        background: "rgba(10,8,28,0.99)",
        border: "1px solid rgba(0,160,220,0.25)",
        backdropFilter: "blur(28px)",
        WebkitBackdropFilter: "blur(28px)",
        boxShadow: "0 8px 48px rgba(0,0,0,0.8)",
        pointerEvents: "auto",
      }}
      onTouchStart={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center gap-2">
          <MessageCircle style={{ width: 13, height: 13, color: "#00D4F0" }} />
          <p className="text-[11px] font-black text-white/70 tracking-wider uppercase">Messages</p>
          {conversations.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[8px] font-black"
              style={{ background: "rgba(0,212,240,0.18)", color: "#00D4F0" }}>
              {conversations.length}
            </span>
          )}
        </div>
        <button
          onTouchStart={(e) => e.stopPropagation()}
          onClick={onClose}
          className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 active:scale-90"
          style={{ color: "rgba(255,255,255,0.4)", touchAction: "manipulation", minWidth: 32, minHeight: 32 }}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1" style={{ overscrollBehavior: "contain" }}>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-5 h-5 border-2 border-cyan-400/20 border-t-cyan-400 rounded-full animate-spin" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="py-10 text-center">
            <MessageCircle style={{ width: 28, height: 28, color: "rgba(255,255,255,0.07)", margin: "0 auto 8px" }} />
            <p className="text-xs text-white/20">No approved chats yet.</p>
            <p className="text-[10px] text-white/15 mt-1">Once someone approves your message request, it'll appear here.</p>
          </div>
        ) : conversations.map((conv) => {
          const otherId = conv.sender_user_id === currentUserId ? conv.receiver_user_id : conv.sender_user_id;
          const otherName = conv.sender_user_id === currentUserId ? conv.receiver_username : conv.sender_username;
          const lastMsg = lastMessages[conv.conversation_id];

          return (
            <button
              key={conv.conversation_id}
              onTouchStart={(e) => e.stopPropagation()}
              onClick={() => {
                onOpenConversation?.(otherId, otherName, conv.conversation_id);
                onClose?.();
              }}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all active:scale-[0.98] text-left hover:brightness-125"
              style={{
                background: "rgba(0,160,220,0.05)",
                border: "1px solid rgba(0,160,220,0.12)",
                touchAction: "manipulation",
                minHeight: 60,
              }}
            >
              {/* Avatar */}
              <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 font-black text-sm"
                style={{ background: "rgba(0,160,220,0.18)", color: "#00D4F0" }}>
                {(otherName || "?")[0].toUpperCase()}
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white truncate">{otherName || "User"}</p>
                {lastMsg ? (
                  <p className="text-[10px] truncate mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
                    {lastMsg.senderId === currentUserId ? "You: " : ""}{lastMsg.text}
                  </p>
                ) : (
                  <p className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.2)" }}>Tap to open chat</p>
                )}
              </div>

              {/* Time + chevron */}
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                {lastMsg?.time && (
                  <p className="text-[9px]" style={{ color: "rgba(255,255,255,0.25)" }}>{formatTime(lastMsg.time)}</p>
                )}
                <ChevronRight className="w-3.5 h-3.5" style={{ color: "rgba(0,212,240,0.4)" }} />
              </div>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}