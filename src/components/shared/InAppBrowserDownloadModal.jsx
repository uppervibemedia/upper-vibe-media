import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Copy, Check } from "lucide-react";

/**
 * Modal shown when a download is attempted inside TikTok/Instagram/Facebook in-app browser.
 * window.open() is blocked by TikTok — so we cannot programmatically open Safari.
 * Instead: show manual instructions (··· → Open in Browser) + copy link button.
 */
export default function InAppBrowserDownloadModal({ open, onClose, songUrl }) {
  const [copied, setCopied] = useState(false);

  const intentUrl = songUrl.includes("?")
    ? `${songUrl}&downloadIntent=true`
    : `${songUrl}?downloadIntent=true`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(intentUrl);
    } catch {
      const el = document.createElement("textarea");
      el.value = intentUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
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
              <h2 className="font-heading font-black text-xl text-white mb-1">
                Open in Safari to Download
              </h2>
              <p className="text-sm text-white/45 leading-relaxed mb-5">
                TikTok's browser can't download files. Follow these steps:
              </p>

              {/* Step-by-step instructions */}
              <div className="space-y-3 mb-6">
                {/* Step 1 */}
                <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <span className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-black mt-0.5"
                    style={{ background: "rgba(0,160,220,0.2)", color: "#00A0DC", border: "1px solid rgba(0,160,220,0.3)" }}>1</span>
                  <p className="text-sm text-white/70 leading-relaxed">
                    Tap the <strong className="text-white">···</strong> menu at the bottom of your screen
                  </p>
                </div>

                {/* Step 2 */}
                <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <span className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-black mt-0.5"
                    style={{ background: "rgba(0,160,220,0.2)", color: "#00A0DC", border: "1px solid rgba(0,160,220,0.3)" }}>2</span>
                  <p className="text-sm text-white/70 leading-relaxed">
                    Tap <strong className="text-white">Open in browser</strong>
                  </p>
                </div>

                {/* Step 3 */}
                <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <span className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-black mt-0.5"
                    style={{ background: "rgba(0,160,220,0.2)", color: "#00A0DC", border: "1px solid rgba(0,160,220,0.3)" }}>3</span>
                  <p className="text-sm text-white/70 leading-relaxed">
                    Tap <strong className="text-white">Download</strong> on the song page in Safari
                  </p>
                </div>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3 mb-5">
                <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
                <span className="text-xs text-white/25 font-semibold">OR</span>
                <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
              </div>

              {/* Copy link fallback */}
              <p className="text-xs text-white/35 text-center mb-3 leading-relaxed">
                Copy this song link, open Safari manually, paste it, then tap Download.
              </p>

              <div className="space-y-2.5">
                <button
                  onClick={handleCopyLink}
                  className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl font-black text-sm tracking-wide transition-all hover:brightness-110 active:scale-[0.98]"
                  style={{
                    background: copied ? "rgba(0,200,100,0.15)" : "rgba(0,160,220,0.12)",
                    border: copied ? "1px solid rgba(0,200,100,0.35)" : "1px solid rgba(0,160,220,0.3)",
                    color: copied ? "#4ade80" : "#00A0DC",
                  }}>
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Link Copied!" : "Copy Song Link"}
                </button>

                <button
                  onClick={onClose}
                  className="w-full py-2.5 text-sm font-semibold text-white/30 hover:text-white/60 transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}