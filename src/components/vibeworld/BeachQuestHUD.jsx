import React from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function BeachQuestHUD({ worldMode, quest, nearbyActivity, onRelax, isMobile, mobileLayout }) {
  if (worldMode !== "beach" || !quest) return null;
  const shellsFound = Array.isArray(quest.shells) ? quest.shells.length : (quest.shells || 0);
  const completeCount = [shellsFound >= 10, quest.visitedZen, quest.relaxedBonfire, quest.surfComplete, quest.diveComplete, quest.coasterComplete, quest.frequencyComplete, quest.zenResetComplete].filter(Boolean).length;
  const bottom = isMobile && mobileLayout ? mobileLayout.actionBottom + 56 : isMobile ? 300 : 112;

  return (
    <>
      <div
        className="absolute z-[56] rounded-2xl px-3 py-2 pointer-events-none"
        style={{
          top: isMobile && mobileLayout ? mobileLayout.sa.top + 98 : 98,
          left: "calc(env(safe-area-inset-left, 0px) + 8px)",
          background: "rgba(4,12,24,0.68)",
          border: "1px solid rgba(0,229,255,0.20)",
          backdropFilter: "blur(12px)",
          maxWidth: isMobile ? 178 : 230,
        }}
      >
        <p className="text-[9px] font-black tracking-[0.18em] text-cyan-200/80">DAILY BEACH QUEST</p>
        <p className="text-[11px] font-black text-white mt-1">{completeCount}/8 tasks complete</p>
        <div className="mt-2 space-y-1 text-[9px] text-white/60">
          <p>{shellsFound >= 10 ? "✓" : "○"} Find 10 Golden Shells ({Math.min(shellsFound, 10)}/10)</p>
          <p>{quest.surfComplete ? "✓" : "○"} Complete Surf Challenge</p>
          <p>{quest.diveComplete ? "✓" : "○"} Complete Dive Adventure</p>
          <p>{quest.coasterComplete ? "✓" : "○"} Ride Vibe Coaster</p>
          <p>{quest.visitedZen ? "✓" : "○"} Visit Zen Beach</p>
          <p>{quest.zenResetComplete ? "✓" : "○"} Complete Zen Reset</p>
          <p>{quest.frequencyComplete ? "✓" : "○"} Enter Frequency Cove</p>
          <p>{quest.relaxedBonfire ? "✓" : "○"} Relax at Bonfire Beach</p>
        </div>
        {quest.completed && <p className="mt-2 text-[9px] font-black text-yellow-300">Reward claimed: +150 ✦</p>}
      </div>

      <AnimatePresence>
        {nearbyActivity === "bonfire" && !quest.relaxedBonfire && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute left-0 right-0 z-[57] flex justify-center px-4"
            style={{ bottom, pointerEvents: "none" }}
          >
            <button
              onTouchStart={(e) => e.stopPropagation()}
              onClick={onRelax}
              className="rounded-full px-5 py-3 font-black text-xs tracking-wider transition-all active:scale-95 pointer-events-auto"
              style={{ background: "linear-gradient(135deg,#FFB347,#FFD36E)", color: "#261000", boxShadow: "0 0 24px rgba(255,179,71,0.35)", touchAction: "manipulation" }}
            >
              Relax by Bonfire
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}