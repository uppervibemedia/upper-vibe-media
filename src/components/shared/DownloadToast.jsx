import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Zap, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

/**
 * DownloadToast — appears after a Plus download starts.
 * Shows "Download started" + a nudge to support the track.
 *
 * Props:
 *   track    — Track record (needs .id, .title)
 *   onClose  — dismiss callback
 */
export default function DownloadToast({ track, onClose }) {
  const navigate = useNavigate();

  // Auto-dismiss after 8s
  useEffect(() => {
    if (!track) return;
    const t = setTimeout(onClose, 8000);
    return () => clearTimeout(t);
  }, [track, onClose]);

  const handleSupport = () => {
    onClose();
    navigate(`/song/${track.id}`);
  };

  return (
    <AnimatePresence>
      {track && (
        <motion.div
          key="download-toast"
          initial={{ opacity: 0, y: 60, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.95 }}
          transition={{ type: "spring", damping: 22, stiffness: 300 }}
          className="fixed z-[200] left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm"
          style={{
            // Sits above player bar on mobile, above nav
            bottom: "calc(80px + env(safe-area-inset-bottom, 12px))",
          }}
        >
          <div
            className="rounded-2xl px-4 py-3 flex items-start gap-3"
            style={{
              background: "rgba(8,8,22,0.96)",
              border: "1px solid rgba(0,160,220,0.28)",
              boxShadow: "0 8px 40px rgba(0,0,0,0.55), 0 0 0 1px rgba(0,160,220,0.08)",
              backdropFilter: "blur(20px)",
            }}
          >
            {/* Icon */}
            <div
              className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center mt-0.5"
              style={{ background: "rgba(0,160,220,0.12)", border: "1px solid rgba(0,160,220,0.25)" }}
            >
              <Download className="w-4 h-4" style={{ color: "#00A0DC" }} />
            </div>

            {/* Text + buttons */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-white leading-snug">Download started</p>
              <p className="text-xs mt-0.5 mb-2.5" style={{ color: "rgba(255,255,255,0.42)" }}>
                Want to support this track?
              </p>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleSupport}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black tracking-wide transition-all hover:brightness-110 active:scale-[0.97]"
                  style={{
                    background: "linear-gradient(135deg,rgba(0,144,200,0.9),rgba(0,160,220,0.8))",
                    color: "#000",
                    boxShadow: "0 0 16px rgba(0,160,220,0.35)",
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
      )}
    </AnimatePresence>
  );
}