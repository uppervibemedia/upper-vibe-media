import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Copy, ExternalLink, Chrome, Check } from "lucide-react";

/**
 * Modal shown when a download is attempted inside TikTok/Instagram/Facebook in-app browser.
 * Guides the user to open the song page in Safari/Chrome for a real download.
 */
export default function InAppBrowserDownloadModal({ open, onClose, songUrl }) {
  const [copied, setCopied] = useState(false);
  const [openBlocked, setOpenBlocked] = useState(false);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(songUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback
      const el = document.createElement("textarea");
      el.value = songUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleOpenInBrowser = () => {
    // Try to open the song page URL (not the raw MP3) in the system browser
    const w = window.open(songUrl, "_blank");
    if (!w || w.closed) {
      setOpenBlocked(true);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center"
          style={{ padding: "0 0 env(safe-area-inset-bottom,0px) 0" }}>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="relative w-full sm:max-w-sm sm:mx-auto rounded-t-3xl sm:rounded-3xl overflow-hidden"
            style={{
              background: "linear-gradient(160deg,#0d0d22,#0a0a1a)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderBottom: "none",
              paddingBottom: "env(safe-area-inset-bottom, 16px)",
            }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }} />
            </div>

            <button onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-white/70 transition-colors"
              style={{ background: "rgba(255,255,255,0.07)" }}>
              <X className="w-4 h-4" />
            </button>

            <div className="px-6 pt-5 pb-6">
              {/* Icon */}
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: "rgba(0,160,220,0.12)", border: "1px solid rgba(0,160,220,0.3)" }}>
                <Chrome className="w-6 h-6 text-cyan-400" />
              </div>

              <h2 className="font-heading font-black text-xl text-white mb-2">
                Open in Safari to Download
              </h2>
              <p className="text-sm text-white/45 leading-relaxed mb-6">
                TikTok's browser may play the file instead of downloading it. Open this page in Safari for the best download experience.
              </p>

              {/* Actions */}
              <div className="space-y-3">
                <button
                  onClick={handleCopyLink}
                  className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl font-black text-sm tracking-wide transition-all hover:brightness-110 active:scale-[0.98]"
                  style={{
                    background: copied ? "rgba(0,200,100,0.15)" : "rgba(0,160,220,0.12)",
                    border: copied ? "1px solid rgba(0,200,100,0.35)" : "1px solid rgba(0,160,220,0.3)",
                    color: copied ? "#4ade80" : "#00A0DC",
                  }}>
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Song Link Copied!" : "Copy Song Link"}
                </button>

                <button
                  onClick={handleOpenInBrowser}
                  className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl font-black text-sm tracking-wide transition-all hover:brightness-110 active:scale-[0.98]"
                  style={{
                    background: "linear-gradient(135deg,rgba(0,128,184,0.9),rgba(0,160,220,0.85))",
                    color: "#fff",
                    boxShadow: "0 4px 16px rgba(0,160,220,0.2)",
                  }}>
                  <ExternalLink className="w-4 h-4" /> Open in Safari
                </button>

                {openBlocked && (
                  <p className="text-center text-xs text-white/40 px-2 leading-relaxed mt-1">
                    Tap the <strong className="text-white/60">•••</strong> menu and choose{" "}
                    <strong className="text-white/60">Open in Browser</strong>
                  </p>
                )}

                <button
                  onClick={onClose}
                  className="w-full py-2.5 text-sm font-semibold text-white/30 hover:text-white/60 transition-colors">
                  Keep Browsing
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}