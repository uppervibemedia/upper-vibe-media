import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MessageCircle, Check, AlertTriangle } from "lucide-react";

export default function IncomingChatRequest({
  request,
  onAccept,
  onDecline,
  isMobile,
}) {
  // Pulse the screen border to draw attention
  const pulseRef = useRef(null);

  useEffect(() => {
    if (!request) return;
    // Vibrate on mobile to alert user
    try { navigator?.vibrate?.([80, 60, 80, 60, 120]); } catch {}
  }, [request?.id]);

  return (
    <>
      {/* Full-screen attention pulse ring */}
      <AnimatePresence>
        {request && (
          <motion.div
            key="pulse-ring"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.4, 0, 0.4, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, times: [0, 0.25, 0.5, 0.75, 1] }}
            className="fixed inset-0 pointer-events-none"
            style={{
              zIndex: 84,
              border: "3px solid rgba(155,126,255,0.7)",
              borderRadius: 0,
              boxShadow: "inset 0 0 40px rgba(155,126,255,0.3)",
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {request && (
          <motion.div
            key={`req-${request.id}`}
            initial={{ opacity: 0, scale: 0.88, y: -30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.88, y: -30 }}
            transition={{ type: "spring", damping: 22, stiffness: 340 }}
            className="fixed left-1/2 z-[95] w-[92vw] max-w-sm pointer-events-auto"
            style={{
              transform: "translateX(-50%)",
              top: isMobile ? "calc(env(safe-area-inset-top, 0px) + 60px)" : "4.5rem",
            }}
            onTouchStart={(e) => e.stopPropagation()}
          >
            <div
              className="rounded-2xl p-4"
              style={{
                background: "rgba(14,10,32,0.99)",
                border: "2px solid rgba(155,126,255,0.5)",
                backdropFilter: "blur(24px)",
                boxShadow: "0 0 40px rgba(155,126,255,0.35), 0 8px 32px rgba(0,0,0,0.7)",
              }}
            >
              {/* Header */}
              <div className="flex items-start gap-3 mb-3">
                <motion.div
                  animate={{ scale: [1, 1.12, 1] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                  className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: "linear-gradient(135deg,rgba(155,126,255,0.3),rgba(0,200,220,0.2))" }}
                >
                  <MessageCircle className="w-5 h-5" style={{ color: "#c4aaff" }} />
                </motion.div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black tracking-widest uppercase mb-0.5" style={{ color: "#c4aaff" }}>
                    Incoming Chat Request
                  </p>
                  <p className="text-base font-black text-white leading-tight">
                    {request.fromUsername}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>
                    wants to start a private chat
                  </p>
                </div>
              </div>

              {/* Safety warning */}
              <div className="flex items-start gap-2 p-2.5 rounded-xl mb-3"
                style={{ background: "rgba(245,168,0,0.07)", border: "1px solid rgba(245,168,0,0.15)" }}>
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: "rgba(245,168,0,0.7)" }} />
                <p className="text-[10px] leading-relaxed" style={{ color: "rgba(245,168,0,0.65)" }}>
                  Never share personal info, phone numbers, passwords, or payment details.
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={onDecline}
                  onTouchStart={(e) => { e.stopPropagation(); }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-xs font-black tracking-wide transition-all active:scale-95"
                  style={{
                    background: "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    color: "rgba(255,255,255,0.55)",
                    minHeight: 48,
                    touchAction: "manipulation",
                  }}
                >
                  <X className="w-3.5 h-3.5" />
                  Decline
                </button>
                <button
                  onClick={onAccept}
                  onTouchStart={(e) => { e.stopPropagation(); }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-xs font-black tracking-wide transition-all hover:brightness-110 active:scale-95"
                  style={{
                    background: "linear-gradient(135deg,#00C853,#00E676)",
                    color: "#000",
                    minHeight: 48,
                    touchAction: "manipulation",
                    boxShadow: "0 0 20px rgba(0,200,83,0.4)",
                  }}
                >
                  <Check className="w-3.5 h-3.5" />
                  Accept Chat
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}