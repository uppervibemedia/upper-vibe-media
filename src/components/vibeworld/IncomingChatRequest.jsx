import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MessageCircle, Check, AlertTriangle } from "lucide-react";

export default function IncomingChatRequest({
  request,
  onAccept,
  onDecline,
  isMobile,
}) {
  if (!request) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[85] w-[90vw] max-w-sm pointer-events-auto"
      >
        <div
          className="rounded-2xl p-4"
          style={{
            background: "rgba(16,12,34,0.98)",
            border: "1px solid rgba(155,126,255,0.25)",
            backdropFilter: "blur(20px)",
            boxShadow: "0 0 30px rgba(155,126,255,0.15)",
          }}
        >
          {/* Header */}
          <div className="flex items-start gap-3 mb-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(155,126,255,0.15)" }}>
              <MessageCircle className="w-5 h-5 text-purple-300" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white">
                {request.fromUsername}
              </p>
              <p className="text-xs text-white/50 mt-0.5">
                wants to start a 1-on-1 chat with you
              </p>
            </div>
          </div>

          {/* Safety warning */}
          <div className="flex items-start gap-2 p-2.5 rounded-xl mb-3"
            style={{ background: "rgba(245,168,0,0.06)", border: "1px solid rgba(245,168,0,0.12)" }}>
            <AlertTriangle className="w-3.5 h-3.5 text-yellow-400/70 flex-shrink-0 mt-0.5" />
            <p className="text-[10px] text-yellow-400/70 leading-relaxed">
              Do not share personal information, phone numbers, addresses, emails, passwords, or payment details.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={onDecline}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.5)",
                minHeight: 44,
                touchAction: "manipulation",
              }}
            >
              <X className="w-3.5 h-3.5" />
              Decline
            </button>
            <button
              onClick={onAccept}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all hover:brightness-110 active:scale-95"
              style={{
                background: "linear-gradient(135deg,#00C853,#00E676)",
                color: "#000",
                minHeight: 44,
                touchAction: "manipulation",
              }}
            >
              <Check className="w-3.5 h-3.5" />
              Accept
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}