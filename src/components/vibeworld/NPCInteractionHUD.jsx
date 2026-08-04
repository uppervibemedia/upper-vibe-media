import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, X } from "lucide-react";

export default function NPCInteractionHUD({ isMobile, mobileLayout, groundInteractionsEnabled = true }) {
  const [npc, setNpc] = useState(null);
  const [openNpcId, setOpenNpcId] = useState(null);

  useEffect(() => {
    const onNpc = (event) => {
      const next = event.detail || null;
      setNpc(next);
      if (!next || next.id !== openNpcId) setOpenNpcId(null);
    };
    window.addEventListener("uvcNpcProximity", onNpc);
    return () => window.removeEventListener("uvcNpcProximity", onNpc);
  }, [openNpcId]);

  useEffect(() => {
    if (!groundInteractionsEnabled) {
      setNpc(null);
      setOpenNpcId(null);
    }
  }, [groundInteractionsEnabled]);

  if (!groundInteractionsEnabled) return null;

  const bottom = isMobile && mobileLayout
    ? mobileLayout.actionBottom + (openNpcId ? 58 : 4)
    : isMobile
      ? "calc(env(safe-area-inset-bottom, 0px) + 230px)"
      : "calc(env(safe-area-inset-bottom, 0px) + 7rem)";

  const bubbleBottom = isMobile && mobileLayout
    ? mobileLayout.actionBottom + 104
    : isMobile
      ? "calc(env(safe-area-inset-bottom, 0px) + 286px)"
      : "calc(env(safe-area-inset-bottom, 0px) + 11rem)";

  const showingDialogue = npc && openNpcId === npc.id;

  return (
    <>
      <AnimatePresence>
        {npc && !showingDialogue && (
          <motion.div
            key="npc-talk-prompt"
            initial={{ opacity: 0, y: 10, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.94 }}
            className="fixed left-1/2 z-[58] -translate-x-1/2"
            style={{ bottom, pointerEvents: "auto" }}
          >
            <button
              onTouchStart={(e) => e.stopPropagation()}
              onClick={() => {
                try { navigator?.vibrate?.(10); } catch {}
                setOpenNpcId(npc.id);
              }}
              className="flex items-center gap-2 rounded-full px-4 py-2 font-black text-xs tracking-wider transition-all hover:brightness-110 active:scale-95"
              style={{
                background: "rgba(5, 6, 18, 0.86)",
                border: `1px solid ${npc.accent || "rgba(0,229,255,0.35)"}`,
                color: "#fff",
                boxShadow: `0 0 18px ${(npc.accent || "#00E5FF")}44`,
                backdropFilter: "blur(14px)",
                touchAction: "manipulation",
              }}
            >
              <MessageCircle className="h-3.5 w-3.5" />
              Talk
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {npc && showingDialogue && (
          <motion.div
            key={`npc-dialogue-${npc.id}`}
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            className="fixed left-1/2 z-[58] -translate-x-1/2 px-3"
            style={{ bottom: bubbleBottom, width: "min(92vw, 360px)", pointerEvents: "auto" }}
          >
            <div
              className="rounded-2xl p-3"
              style={{
                background: "rgba(5, 6, 18, 0.92)",
                border: `1px solid ${npc.accent || "rgba(0,229,255,0.35)"}`,
                boxShadow: `0 0 28px ${(npc.accent || "#00E5FF")}33, 0 12px 38px rgba(0,0,0,0.45)`,
                backdropFilter: "blur(18px)",
              }}
            >
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <p className="font-heading text-xs font-black tracking-wider" style={{ color: npc.accent || "#00E5FF" }}>
                  {npc.name}
                </p>
                <button
                  onTouchStart={(e) => e.stopPropagation()}
                  onClick={() => setOpenNpcId(null)}
                  className="rounded-full p-1 text-white/60 active:scale-95"
                  style={{ background: "rgba(255,255,255,0.08)", touchAction: "manipulation" }}
                  aria-label="Close NPC message"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
              <p className="text-sm leading-snug text-white/86" style={{ fontSize: isMobile ? 12 : 13 }}>
                {npc.message}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}