import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Zap, X } from "lucide-react";

/**
 * DownloadToast — appears after a Plus download starts.
 *
 * Props:
 *   track      — Track record (needs .id, .title)
 *   onClose    — dismiss callback
 *   iosMode    — if true, show iOS "Save to Files" tip instead of "Download started"
 *   simple     — if true, show only "Download started" with no support nudge
 *   onSupport  — callback to open SupportModal; if omitted, support button is hidden
 */
export default function DownloadToast({ track, onClose, iosMode = false, simple = false, onSupport }) {
  // Auto-dismiss after 10s
  useEffect(() => {
    if (!track) return;
    const t = setTimeout(onClose, 10000);
    return () => clearTimeout(t);
  }, [track, onClose]);

  const handleSupport = () => {
    onClose();
    onSupport && onSupport(track);
  };

  return (
    <AnimatePresence>
      {track && (
        // Wrapper div is positioned fixed and centered — framer-motion only animates opacity/scale/y
        // We avoid putting transform: translateX in framer's style to prevent conflicts
        <div
          className="fixed z-[200] w-[calc(100%-2rem)] max-w-sm"
          style={{
            bottom: "calc(80px + env(safe-area-inset-bottom, 12px))",
            left: "0",
            right: "0",
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          <motion.div
            key="download-toast"
            initial={{ opacity: 0, y: 30, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ type: "spring", damping: 22, stiffness: 300 }}
          >
            <div
              className="rounded-2xl px-4 py-3 flex items-start gap-3"
              style={{
                background: "rgba(8,8,22,0.97)",
                border: iosMode ? "1px solid rgba(212,168,67,0.28)" : "1px solid rgba(0,160,220,0.28)",
                boxShadow: "0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,160,220,0.06)",
                backdropFilter: "blur(24px)",
                WebkitBackdropFilter: "blur(24px)",
              }}
            >
              {/* Icon */}
              <div
                className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center mt-0.5"
                style={iosMode
                  ? { background: "rgba(212,168,67,0.12)", border: "1px solid rgba(212,168,67,0.25)" }
                  : { background: "rgba(0,160,220,0.12)", border: "1px solid rgba(0,160,220,0.25)" }}
              >
                <Download className="w-4 h-4" style={{ color: iosMode ? "#D4A843" : "#00A0DC" }} />
              </div>

              {/* Text + buttons */}
              <div className="flex-1 min-w-0">
                {iosMode ? (
                  <>
                    <p className="text-sm font-black text-white leading-snug">Opening audio file</p>
                    <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "rgba(255,255,255,0.50)" }}>
                      On iPhone: tap the share icon → <strong style={{ color: "rgba(212,168,67,0.9)" }}>Save to Files</strong> to keep it.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-black text-white leading-snug">Download started</p>
                    {!simple && (
                      <p className="text-xs mt-0.5 mb-2.5" style={{ color: "rgba(255,255,255,0.42)" }}>
                        Want to support this track?
                      </p>
                    )}
                  </>
                )}

                {!simple && !iosMode && (
                  <div className="flex items-center gap-2 flex-wrap mt-2.5">
                    <button
                      onClick={handleSupport}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black tracking-wide transition-all hover:brightness-110 active:scale-[0.97]"
                      style={{
                        background: "linear-gradient(135deg,rgba(0,144,200,0.9),rgba(0,160,220,0.8))",
                        color: "#fff",
                        boxShadow: "0 0 14px rgba(0,160,220,0.3)",
                      }}
                    >
                      <Zap className="w-3 h-3" /> Support Upper Vibe Media
                    </button>

                    <button
                      onClick={onClose}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all hover:bg-white/10"
                      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}
                    >
                      Keep Browsing
                    </button>
                  </div>
                )}
              </div>

              {/* X dismiss */}
              <button
                onClick={onClose}
                className="flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center transition-all hover:bg-white/10"
                style={{ color: "rgba(255,255,255,0.3)" }}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}