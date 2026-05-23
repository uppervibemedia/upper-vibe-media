import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Headphones, Share } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { RADIO_THEMES } from "../radio/RadioThemePicker";

const STORAGE_KEY = "uvm_ios_tip_dismissed";

function isIOSSafari() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const isIOS = /iphone|ipad|ipod/i.test(ua);
  if (!isIOS) return false;
  // TikTok in-app browser
  if (/musical_ly|tiktok/i.test(ua)) return true;
  // iOS PWA standalone
  if (window.navigator.standalone) return true;
  // Safari (not Chrome/Firefox on iOS)
  return /safari/i.test(ua) && !/crios|fxios|opios|mercury/i.test(ua);
}

function isDismissed() {
  try { return !!localStorage.getItem(STORAGE_KEY); } catch { return false; }
}

function saveDismiss() {
  try { localStorage.setItem(STORAGE_KEY, "1"); } catch {}
}

/**
 * iOSTip — shows a small bottom-sheet tip for iOS Safari users.
 *
 * Props:
 *   trigger: "always" | "on-play"
 *     - "always": show on mount (Radio page, Song pages)
 *     - "on-play": show only after isPlaying becomes true (Home, Music)
 *   isPlaying: boolean (only needed when trigger="on-play")
 */
export default function IOSTip({ trigger = "always", isPlaying = false }) {
  const [visible, setVisible] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const { accentId } = useTheme();
  const radioTheme = RADIO_THEMES[accentId] || RADIO_THEMES.cyan;
  const p = radioTheme.vars["--rt-primary"]; // e.g. "0,160,220"

  useEffect(() => {
    if (!isIOSSafari()) return;
    if (isDismissed()) return;

    if (trigger === "always") {
      // Slight delay so it doesn't flash on load
      const t = setTimeout(() => setVisible(true), 1800);
      return () => clearTimeout(t);
    }
  }, [trigger]);

  // For "on-play" trigger — fire once when playback starts
  const firedRef = React.useRef(false);
  useEffect(() => {
    if (trigger !== "on-play") return;
    if (!isIOSSafari()) return;
    if (isDismissed()) return;
    if (isPlaying && !firedRef.current) {
      firedRef.current = true;
      const t = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(t);
    }
  }, [isPlaying, trigger]);

  const handleDismiss = () => {
    setVisible(false);
    saveDismiss();
  };

  const handleAddToHomeScreen = () => {
    setShowInstructions(true);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 260 }}
          style={{
            position: "fixed",
            left: 0,
            right: 0,
            // Sit above the bottom player bar (mobile: ~56px nav + player ~64px) and safe area
            bottom: "calc(128px + env(safe-area-inset-bottom, 16px))",
            zIndex: 48,
            display: "flex",
            justifyContent: "center",
            padding: "0 16px",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              pointerEvents: "auto",
              width: "100%",
              maxWidth: 380,
              borderRadius: 20,
              background: `rgba(6,6,18,0.96)`,
              border: `1px solid rgba(${p},0.25)`,
              boxShadow: `0 8px 40px rgba(0,0,0,0.55), 0 0 24px rgba(${p},0.12)`,
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              padding: "14px 16px 14px",
              overflow: "hidden",
            }}
          >
            {/* Dismiss */}
            <button
              onClick={handleDismiss}
              style={{
                position: "absolute", top: 10, right: 10,
                width: 26, height: 26, borderRadius: "50%",
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <X style={{ width: 12, height: 12, color: "rgba(255,255,255,0.4)" }} />
            </button>

            {!showInstructions ? (
              <>
                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                    background: `rgba(${p},0.1)`,
                    border: `1px solid rgba(${p},0.2)`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Headphones style={{ width: 16, height: 16, color: `rgb(${p})` }} />
                  </div>
                  <div>
                    <p style={{
                      fontSize: 11, fontWeight: 900, letterSpacing: "0.05em",
                      color: "#fff", fontFamily: "var(--font-heading)", lineHeight: 1.2,
                    }}>
                      Best Listening Tip
                    </p>
                    <p style={{ fontSize: 9, color: `rgb(${p})`, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                      Upper Vibe Media
                    </p>
                  </div>
                </div>

                {/* Message */}
                <p style={{
                  fontSize: 12, lineHeight: 1.6,
                  color: "rgba(255,255,255,0.55)",
                  marginBottom: 12,
                }}>
                  For the smoothest playback, keep Upper Vibe Media open while listening. For longer sessions, use Safari or add the app to your Home Screen.
                </p>

                {/* Buttons */}
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={handleDismiss}
                    style={{
                      flex: 1, padding: "9px 0", borderRadius: 12,
                      fontSize: 11, fontWeight: 900, letterSpacing: "0.06em",
                      background: `rgba(${p},0.12)`,
                      border: `1px solid rgba(${p},0.3)`,
                      color: `rgb(${p})`,
                      cursor: "pointer",
                      fontFamily: "var(--font-heading)",
                    }}
                  >
                    Got It
                  </button>
                  <button
                    onClick={handleAddToHomeScreen}
                    style={{
                      flex: 1.3, padding: "9px 0", borderRadius: 12,
                      fontSize: 11, fontWeight: 900, letterSpacing: "0.04em",
                      background: `linear-gradient(135deg,rgba(${p},0.7),rgba(${p},0.9))`,
                      border: "none",
                      color: "#000",
                      cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                      fontFamily: "var(--font-heading)",
                    }}
                  >
                    <Share style={{ width: 11, height: 11 }} />
                    Add To Home Screen
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Instructions */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <Share style={{ width: 16, height: 16, color: `rgb(${p})`, flexShrink: 0 }} />
                  <p style={{ fontSize: 12, fontWeight: 900, color: "#fff", fontFamily: "var(--font-heading)" }}>
                    Add to Your Home Screen
                  </p>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
                  {[
                    { step: "1", text: "Tap the Share button (□↑) at the bottom of Safari" },
                    { step: "2", text: 'Scroll down and tap "Add to Home Screen"' },
                    { step: "3", text: "Tap Add — done! Open from your home screen for the best experience." },
                  ].map(({ step, text }) => (
                    <div key={step} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <span style={{
                        width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                        background: `rgba(${p},0.15)`, border: `1px solid rgba(${p},0.3)`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 9, fontWeight: 900, color: `rgb(${p})`,
                        marginTop: 1,
                      }}>{step}</span>
                      <p style={{ fontSize: 12, lineHeight: 1.55, color: "rgba(255,255,255,0.55)" }}>{text}</p>
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleDismiss}
                  style={{
                    width: "100%", padding: "9px 0", borderRadius: 12,
                    fontSize: 11, fontWeight: 900,
                    background: `rgba(${p},0.12)`,
                    border: `1px solid rgba(${p},0.3)`,
                    color: `rgb(${p})`,
                    cursor: "pointer",
                    fontFamily: "var(--font-heading)",
                  }}
                >
                  Got It
                </button>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}