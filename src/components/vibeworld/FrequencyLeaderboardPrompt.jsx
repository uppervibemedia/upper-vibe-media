import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy } from "lucide-react";

export default function FrequencyLeaderboardPrompt({ visible, onOpen, isMobile, mobileLayout }) {
  return <AnimatePresence>{visible && <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute bottom-0 left-0 right-0 z-[57] flex justify-center px-4" style={{ paddingBottom: isMobile && mobileLayout ? `${mobileLayout.actionBottom}px` : isMobile ? "calc(env(safe-area-inset-bottom, 0px) + 248px)" : "calc(env(safe-area-inset-bottom, 0px) + 6.5rem)", pointerEvents: "none" }}><button onTouchStart={(e) => e.stopPropagation()} onClick={onOpen} className="flex items-center gap-2 px-5 py-2.5 rounded-full font-black text-xs tracking-wider transition-all hover:brightness-110 active:scale-95" style={{ pointerEvents: "auto", background: "linear-gradient(135deg,#00B8D4,#7C3AED)", color: "#fff", boxShadow: "0 0 24px rgba(0,229,255,0.34)", minHeight: 44, touchAction: "manipulation" }}><Trophy className="w-3.5 h-3.5" /> View Leaderboard</button></motion.div>}</AnimatePresence>;
}