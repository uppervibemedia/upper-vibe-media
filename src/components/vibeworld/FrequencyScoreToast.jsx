import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy } from "lucide-react";

export default function FrequencyScoreToast({ isMobile, mobileLayout }) {
  const [message, setMessage] = useState("");
  useEffect(() => {
    const onMessage = (e) => {
      if (!e.detail?.message) return;
      setMessage(e.detail.message);
      setTimeout(() => setMessage(""), 2800);
    };
    window.addEventListener("uvcFrequencyScoreMessage", onMessage);
    return () => window.removeEventListener("uvcFrequencyScoreMessage", onMessage);
  }, []);
  return <AnimatePresence>{message && <motion.div initial={{ opacity: 0, y: -10, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.96 }} className="absolute left-1/2 z-[69] pointer-events-none flex items-center gap-2 rounded-full px-4 py-2" style={{ top: isMobile && mobileLayout ? mobileLayout.sa.top + 142 : 140, transform: "translateX(-50%)", background: "rgba(5,8,22,0.86)", border: "1px solid rgba(0,229,255,0.22)", color: message.includes("come back") ? "#FFD36E" : "#DFFBFF", backdropFilter: "blur(14px)", boxShadow: "0 10px 34px rgba(0,0,0,0.42)" }}><Trophy className="w-3.5 h-3.5" /><span className="text-[10px] font-black uppercase tracking-wider whitespace-nowrap">{message}</span></motion.div>}</AnimatePresence>;
}