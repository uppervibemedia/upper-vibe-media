import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Palette, Check } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

const PULSE_PREF_KEY = "uvm_radio_pulse";
export const getPulseEnabled = () => { try { return localStorage.getItem(PULSE_PREF_KEY) !== "off"; } catch { return true; } };
export const setPulseEnabled = (v) => { try { localStorage.setItem(PULSE_PREF_KEY, v ? "on" : "off"); } catch {} };

export const RADIO_THEMES = {
  cyan: {
    id: "cyan",
    label: "Electric Blue",
    swatch: "#00A0DC",
    vars: {
      "--rt-primary":       "0,160,220",
      "--rt-primary-dark":  "0,120,175",
      "--rt-primary-glow":  "0,145,200",
      "--rt-secondary":     "155,126,255",
      "--rt-ambient1":      "#0090C8",
      "--rt-ambient2":      "#9B7EFF",
      "--rt-blob-opacity":  "0.06",
    },
  },
  violet: {
    id: "violet",
    label: "Deep Violet",
    swatch: "#A855F7",
    vars: {
      "--rt-primary":       "168,85,247",
      "--rt-primary-dark":  "126,58,210",
      "--rt-primary-glow":  "155,100,255",
      "--rt-secondary":     "236,72,153",
      "--rt-ambient1":      "#7C3AED",
      "--rt-ambient2":      "#EC4899",
      "--rt-blob-opacity":  "0.07",
    },
  },
  amber: {
    id: "amber",
    label: "Midnight Amber",
    swatch: "#F59E0B",
    vars: {
      "--rt-primary":       "245,158,11",
      "--rt-primary-dark":  "180,110,0",
      "--rt-primary-glow":  "212,168,67",
      "--rt-secondary":     "251,113,133",
      "--rt-ambient1":      "#D4A843",
      "--rt-ambient2":      "#F87171",
      "--rt-blob-opacity":  "0.06",
    },
  },
};

/** Hook: returns the full RADIO_THEMES entry + setter wired to global ThemeContext */
export function useRadioTheme() {
  const { accentId, setAccent } = useTheme();
  const theme = RADIO_THEMES[accentId] || RADIO_THEMES.cyan;

  const applyTheme = (id) => {
    setAccent(id);
    return RADIO_THEMES[id] || RADIO_THEMES.cyan;
  };

  return { themeId: accentId, theme, applyTheme };
}

export default function RadioThemePicker({ themeId, onSelect, pulseEnabled, onTogglePulse }) {
  const [open, setOpen] = useState(false);
  const currentTheme = RADIO_THEMES[themeId] || RADIO_THEMES.cyan;
  const p = currentTheme.vars["--rt-primary"];

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          padding: "5px 12px", borderRadius: 20,
          fontSize: 9, fontWeight: 800, letterSpacing: "0.07em",
          textTransform: "uppercase", cursor: "pointer", whiteSpace: "nowrap",
          transition: "all 0.2s ease",
          userSelect: "none", WebkitUserSelect: "none",
          background: open ? `rgba(${p},0.18)` : `rgba(${p},0.10)`,
          border: `1px solid rgba(${p},0.45)`,
          color: `rgb(${p})`,
          boxShadow: `0 0 8px rgba(${p},0.12)`,
        }}
      >
        <Palette style={{ width: 10, height: 10 }} />
        Vibe Color
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div
              style={{ position: "fixed", inset: 0, zIndex: 40 }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: -6 }}
              transition={{ duration: 0.15 }}
              style={{
                position: "absolute", top: "calc(100% + 8px)", right: 0, zIndex: 50,
                background: "rgba(10,10,24,0.96)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 14, padding: "10px 8px",
                minWidth: 190,
                boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
                backdropFilter: "blur(20px)",
              }}
            >
              <p style={{ fontSize: 8, fontWeight: 800, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", paddingLeft: 8, marginBottom: 8 }}>
                Vibe Color
              </p>
              {Object.values(RADIO_THEMES).map((t) => (
                <button
                  key={t.id}
                  onClick={() => { onSelect(t.id); setOpen(false); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    width: "100%", padding: "8px 10px", borderRadius: 10,
                    background: themeId === t.id ? "rgba(255,255,255,0.07)" : "transparent",
                    border: "none", cursor: "pointer",
                    transition: "background 0.15s ease",
                  }}
                >
                  <span style={{
                    width: 14, height: 14, borderRadius: "50%",
                    background: t.swatch,
                    boxShadow: `0 0 8px ${t.swatch}88`,
                    flexShrink: 0,
                  }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: themeId === t.id ? "#fff" : "rgba(255,255,255,0.55)", flex: 1, textAlign: "left" }}>
                    {t.label}
                  </span>
                  {themeId === t.id && <Check style={{ width: 10, height: 10, color: t.swatch }} />}
                </button>
              ))}

              {/* Pulse toggle */}
              <div style={{ margin: "8px 0 2px", borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 8 }}>
                <button
                  onClick={() => { onTogglePulse(!pulseEnabled); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    width: "100%", padding: "8px 10px", borderRadius: 10,
                    background: "transparent", border: "none", cursor: "pointer",
                    transition: "background 0.15s ease",
                  }}
                >
                  <span style={{
                    width: 28, height: 16, borderRadius: 8, flexShrink: 0,
                    background: pulseEnabled ? "rgba(0,200,220,0.55)" : "rgba(255,255,255,0.12)",
                    position: "relative", transition: "background 0.2s ease",
                  }}>
                    <span style={{
                      position: "absolute", top: 2, left: pulseEnabled ? 14 : 2,
                      width: 12, height: 12, borderRadius: "50%", background: "#fff",
                      transition: "left 0.2s ease",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.4)",
                    }} />
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.55)", flex: 1, textAlign: "left" }}>
                    Pulse Effect
                  </span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}