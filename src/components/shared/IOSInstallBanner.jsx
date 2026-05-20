import React, { useState, useEffect } from "react";
import { X, Share, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Detects iOS Safari (not Chrome/Firefox on iOS, not Android)
function isIOSSafari() {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
  const isSafari = /^((?!chrome|android|crios|fxios).)*safari/i.test(ua);
  return isIOS && isSafari;
}

function isInStandaloneMode() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

const DISMISSED_KEY = "ios_install_banner_dismissed";

export default function IOSInstallBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isIOSSafari()) return;
    if (isInStandaloneMode()) return;
    if (sessionStorage.getItem(DISMISSED_KEY)) return;
    // Show after a short delay so the page settles
    const t = setTimeout(() => setVisible(true), 3000);
    return () => clearTimeout(t);
  }, []);

  const dismiss = () => {
    sessionStorage.setItem(DISMISSED_KEY, "1");
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ type: "spring", damping: 26, stiffness: 180 }}
          className="fixed bottom-0 left-0 right-0 z-[100] px-4 pb-6 pt-0 pointer-events-none"
          style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))" }}
        >
          <div
            className="pointer-events-auto relative mx-auto max-w-sm rounded-2xl overflow-hidden"
            style={{
              background: "linear-gradient(145deg, rgba(10,10,28,0.97) 0%, rgba(6,6,18,0.99) 100%)",
              border: "1px solid rgba(0,229,255,0.18)",
              boxShadow: "0 0 40px rgba(0,184,212,0.15), 0 8px 32px rgba(0,0,0,0.6)",
              backdropFilter: "blur(40px)",
            }}
          >
            {/* Subtle top glow bar */}
            <div
              className="absolute top-0 left-0 right-0 h-[1px]"
              style={{ background: "linear-gradient(90deg, transparent, rgba(0,229,255,0.5), transparent)" }}
            />

            <div className="p-4 pr-10">
              {/* Header */}
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(0,229,255,0.1)", border: "1px solid rgba(0,229,255,0.2)" }}
                >
                  <span className="text-lg">🎵</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-white leading-tight" style={{ fontFamily: "var(--font-heading)" }}>
                    Add to Home Screen
                  </p>
                  <p className="text-[11px] text-white/40 leading-tight mt-0.5">
                    Unlock background playback &amp; lock-screen controls
                  </p>
                </div>
              </div>

              {/* Steps */}
              <div className="space-y-2">
                <Step number={1} icon={<ShareIcon />} text={<>Tap the <span className="text-cyan-400 font-semibold">Share</span> button in Safari's toolbar</>} />
                <Step number={2} icon={<PlusBoxIcon />} text={<>Scroll down and tap <span className="text-cyan-400 font-semibold">Add to Home Screen</span></>} />
                <Step number={3} text={<>Tap <span className="text-cyan-400 font-semibold">Add</span> to install — it's free!</>} />
              </div>
            </div>

            {/* Dismiss */}
            <button
              onClick={dismiss}
              className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center transition-all hover:bg-white/10"
              style={{ color: "rgba(255,255,255,0.3)" }}
              aria-label="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Step({ number, icon, text }) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-black"
        style={{ background: "rgba(0,229,255,0.12)", color: "#00E5FF" }}
      >
        {number}
      </div>
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <p className="text-[12px] text-white/60 leading-snug">{text}</p>
    </div>
  );
}

// iOS Share icon (box with arrow up) — inline SVG for pixel accuracy
function ShareIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 2v10M6 6l4-4 4 4" stroke="#00E5FF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M5 10H3a1 1 0 00-1 1v6a1 1 0 001 1h14a1 1 0 001-1v-6a1 1 0 00-1-1h-2" stroke="#00E5FF" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}

function PlusBoxIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="16" height="16" rx="3" stroke="#00E5FF" strokeWidth="1.8"/>
      <path d="M10 6v8M6 10h8" stroke="#00E5FF" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}