import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

export default function BeachPreviewNotice({ worldMode, isMobile, mobileLayout }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (worldMode !== "beach") return;
    try {
      if (sessionStorage.getItem("uvc_beach_preview_notice_seen") === "1") return;
      sessionStorage.setItem("uvc_beach_preview_notice_seen", "1");
    } catch {}
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), 8500);
    return () => clearTimeout(timer);
  }, [worldMode]);

  return (
    <AnimatePresence>
      {visible && worldMode === "beach" && (
        <motion.div
          initial={{ opacity: 0, y: -12, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.96 }}
          className="absolute left-1/2 z-[67] rounded-2xl px-4 py-3 pointer-events-auto"
          style={{
            top: isMobile && mobileLayout ? mobileLayout.sa.top + 96 : 96,
            transform: "translateX(-50%)",
            width: isMobile ? "min(88vw, 340px)" : 380,
            background: "rgba(6,16,24,0.82)",
            border: "1px solid rgba(125,235,255,0.22)",
            backdropFilter: "blur(18px)",
            boxShadow: "0 12px 42px rgba(0,0,0,0.35)",
          }}
        >
          <button onClick={() => setVisible(false)} className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center" style={{ color: "rgba(255,255,255,0.45)", background: "rgba(255,255,255,0.06)", touchAction: "manipulation" }}>
            <X className="w-3.5 h-3.5" />
          </button>
          <p className="font-heading font-black text-sm text-white pr-8">Upper Vibe Beach Preview</p>
          <p className="text-[11px] text-white/55 leading-relaxed mt-1 pr-4">Beach activities are being upgraded. Explore the island and ride the Vibe Coaster now.</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}