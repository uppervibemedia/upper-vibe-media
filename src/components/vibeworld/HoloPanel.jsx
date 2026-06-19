import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

/**
 * HoloPanel — holographic glass overlay rendered inside the 3D world.
 * Slides up from bottom on mobile, centered card on desktop.
 * Does NOT navigate away — content lives on top of the live canvas.
 */
export default function HoloPanel({ open, onClose, title, accent = "0,160,220", icon, children }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-30 flex items-end md:items-center justify-center md:p-6"
          style={{ background: "rgba(3,3,12,0.55)", backdropFilter: "blur(4px)" }}
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%", opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: "100%", opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", damping: 30, stiffness: 280 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full md:max-w-md max-h-[82vh] md:max-h-[80vh] flex flex-col overflow-hidden rounded-t-3xl md:rounded-3xl"
            style={{
              background: "linear-gradient(165deg,rgba(12,14,32,0.96),rgba(7,8,20,0.97))",
              border: `1px solid rgba(${accent},0.35)`,
              boxShadow: `0 -10px 60px rgba(0,0,0,0.6), 0 0 50px rgba(${accent},0.12)`,
              backdropFilter: "blur(24px)",
              paddingBottom: "env(safe-area-inset-bottom, 0px)",
            }}
          >
            {/* Holographic top edge glow */}
            <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg,transparent,rgb(${accent}),transparent)` }} />

            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 flex-shrink-0"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `rgba(${accent},0.15)`, border: `1px solid rgba(${accent},0.35)`, color: `rgb(${accent})` }}>
                {icon}
              </div>
              <h2 className="flex-1 font-heading font-black text-base text-white tracking-wide">{title}</h2>
              <button onClick={onClose}
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all hover:bg-white/10"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}>
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content (scrollable) */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}