import React, { useState } from "react";
import { motion } from "framer-motion";
import { X, MessageCircle, User, UserX, Flag, AlertTriangle } from "lucide-react";

export default function UserInteractionMenu({
  open,
  targetUser,
  onClose,
  onRequestChat,
  onBlock,
  onReport,
  isBlocked,
  isMobile,
}) {
  if (!open || !targetUser) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 flex items-center justify-center px-4"
      style={{
        zIndex: 80,
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(4px)",
        pointerEvents: "auto",
      }}
      onTouchStart={(e) => e.stopPropagation()}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="rounded-2xl w-full max-w-xs overflow-hidden"
        style={{
          background: "rgba(18,14,34,0.98)",
          border: "1px solid rgba(155,126,255,0.2)",
          backdropFilter: "blur(20px)",
          pointerEvents: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: "rgba(155,126,255,0.15)" }}
            >
              <User className="w-4 h-4 text-purple-300" />
            </div>
            <span className="font-bold text-sm text-white">{targetUser.username}</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{
              background: "rgba(255,255,255,0.06)",
              color: "rgba(255,255,255,0.5)",
              minWidth: 32,
              minHeight: 32,
              touchAction: "manipulation",
            }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Options */}
        <div className="p-2 space-y-1">
          {!isBlocked && (
            <button
              onClick={() => { onRequestChat(); onClose(); }}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all hover:brightness-110 active:scale-95"
              style={{
                background: "rgba(0,200,83,0.08)",
                border: "1px solid rgba(0,200,83,0.12)",
                minHeight: 44,
                touchAction: "manipulation",
              }}
            >
              <MessageCircle className="w-4 h-4 text-green-400" />
              <div className="text-left">
                <p className="text-xs font-bold text-white">Request 1-on-1 Chat</p>
                <p className="text-[10px] text-white/30">Send a private chat request</p>
              </div>
            </button>
          )}

          <button
            onClick={() => { onBlock(); onClose(); }}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all active:scale-95"
            style={{
              background: "rgba(239,68,68,0.06)",
              border: "1px solid rgba(239,68,68,0.1)",
              minHeight: 44,
              touchAction: "manipulation",
            }}
          >
            <UserX className="w-4 h-4 text-red-400" />
            <div className="text-left">
              <p className="text-xs font-bold text-red-400">{isBlocked ? "Unblock" : "Block"} User</p>
              <p className="text-[10px] text-white/30">
                {isBlocked ? "Remove block" : "Prevent messages and requests"}
              </p>
            </div>
          </button>

          <button
            onClick={() => { onReport(); onClose(); }}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all active:scale-95"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
              minHeight: 44,
              touchAction: "manipulation",
            }}
          >
            <Flag className="w-4 h-4 text-white/40" />
            <div className="text-left">
              <p className="text-xs font-bold text-white/60">Report User</p>
              <p className="text-[10px] text-white/30">Flag inappropriate behavior</p>
            </div>
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}