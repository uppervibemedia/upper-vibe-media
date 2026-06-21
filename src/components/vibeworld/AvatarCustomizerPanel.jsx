/**
 * AvatarCustomizerPanel — in-world avatar color & style editor.
 * Opens as a slide-up panel; saves to user record on apply.
 */
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Palette, Shirt, Check } from "lucide-react";
import { base44 } from "@/api/base44Client";

// ── Preset suit color swatches ────────────────────────────────────────────
const SUIT_COLORS = [
  { key: "military",  label: "Military",   hex: "#4a5c3a" },
  { key: "navy",      label: "Navy",       hex: "#1a2b5e" },
  { key: "black",     label: "Stealth",    hex: "#141416" },
  { key: "desert",    label: "Desert",     hex: "#b8916a" },
  { key: "crimson",   label: "Crimson",    hex: "#8b1a1a" },
  { key: "arctic",    label: "Arctic",     hex: "#c8d8e8" },
  { key: "midnight",  label: "Midnight",   hex: "#1e1060" },
  { key: "olive",     label: "Olive",      hex: "#5a6632" },
  { key: "cobalt",    label: "Cobalt",     hex: "#1a4a8a" },
  { key: "smoke",     label: "Smoke",      hex: "#5a5a68" },
  { key: "custom",    label: "Custom",     hex: null },  // free pick
];

// ── Preset visual styles ──────────────────────────────────────────────────
const VISUAL_STYLES = [
  {
    key: "streetwear",
    label: "Standard",
    emoji: "🪖",
    desc: "Default soldier loadout",
    tint: [1.0, 1.0, 1.0],
    badge: "DEFAULT",
    color: "#00B8D4",
  },
  {
    key: "cosmic",
    label: "Cosmic",
    emoji: "🔮",
    desc: "Purple ethereal glow",
    tint: [0.72, 0.55, 1.0],
    badge: "EXPLORER",
    color: "#9B7EFF",
  },
  {
    key: "neon",
    label: "Neon",
    emoji: "⚡",
    desc: "Electric cyan tint",
    tint: [0.55, 0.95, 1.0],
    badge: "NEON",
    color: "#00E5FF",
  },
  {
    key: "shadow",
    label: "Shadow",
    emoji: "🌑",
    desc: "Dark stealth operative",
    tint: [0.28, 0.28, 0.32],
    badge: "DARK",
    color: "#8888AA",
  },
  {
    key: "golden",
    label: "Golden",
    emoji: "✨",
    desc: "Warm gold elite finish",
    tint: [1.0, 0.82, 0.38],
    badge: "ELITE",
    color: "#D4A843",
  },
  {
    key: "crimson",
    label: "Crimson",
    emoji: "🔴",
    desc: "Deep red combat suit",
    tint: [1.0, 0.3, 0.3],
    badge: "COMBAT",
    color: "#FF4444",
  },
];

export default function AvatarCustomizerPanel({ open, onClose, onApply, currentStyle, currentSuitColor, isMobile }) {
  const [selectedStyle, setSelectedStyle] = useState(currentStyle || "streetwear");
  const [selectedColor, setSelectedColor] = useState(currentSuitColor || "#4a5c3a");
  const [customColor, setCustomColor] = useState(currentSuitColor || "#4a5c3a");
  const [saving, setSaving] = useState(false);

  const activeColorKey = SUIT_COLORS.find((c) => c.hex === selectedColor)?.key || "custom";

  const handleApply = async () => {
    setSaving(true);
    try {
      await base44.auth.updateMe({
        avatar_style: selectedStyle,
        avatar_suit_color: selectedColor,
      });
    } catch {}
    setSaving(false);
    onApply?.({ style: selectedStyle, suitColor: selectedColor });
    onClose?.();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="avatar-customizer"
          initial={{ opacity: 0, y: "100%" }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: "100%" }}
          transition={{ type: "spring", damping: 28, stiffness: 280 }}
          className="fixed inset-x-0 bottom-0 z-[85] pointer-events-auto"
          style={{ maxHeight: "80vh" }}
          onTouchStart={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="flex flex-col overflow-hidden"
            style={{
              borderRadius: "20px 20px 0 0",
              background: "rgba(12,10,28,0.97)",
              border: "1px solid rgba(155,126,255,0.18)",
              backdropFilter: "blur(20px)",
              maxHeight: "80vh",
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-3 flex-shrink-0"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
            >
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4" style={{ color: "#9B7EFF" }} />
                <span className="text-sm font-black text-white tracking-wider">Avatar Customizer</span>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:bg-white/10"
                style={{ color: "rgba(255,255,255,0.4)" }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">

              {/* ── Visual Style ── */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Shirt className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.3)" }} />
                  <span className="text-[10px] font-black tracking-[0.2em] uppercase" style={{ color: "rgba(255,255,255,0.3)" }}>
                    Visual Style
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {VISUAL_STYLES.map((s) => (
                    <button
                      key={s.key}
                      onClick={() => setSelectedStyle(s.key)}
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all hover:brightness-110 active:scale-[0.97]"
                      style={{
                        background: selectedStyle === s.key ? `${s.color}14` : "rgba(255,255,255,0.04)",
                        border: selectedStyle === s.key ? `2px solid ${s.color}` : "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      <span className="text-lg flex-shrink-0">{s.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-bold text-white">{s.label}</span>
                          {selectedStyle === s.key && (
                            <Check className="w-3 h-3 flex-shrink-0" style={{ color: s.color }} />
                          )}
                        </div>
                        <span className="text-[9px] block mt-0.5" style={{ color: "rgba(255,255,255,0.25)" }}>
                          {s.desc}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Suit Color ── */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Palette className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.3)" }} />
                  <span className="text-[10px] font-black tracking-[0.2em] uppercase" style={{ color: "rgba(255,255,255,0.3)" }}>
                    Suit Color
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-2 mb-3">
                  {SUIT_COLORS.filter((c) => c.hex).map((c) => (
                    <button
                      key={c.key}
                      onClick={() => setSelectedColor(c.hex)}
                      title={c.label}
                      className="flex flex-col items-center gap-1 transition-all hover:scale-110 active:scale-95"
                    >
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{
                          background: c.hex,
                          border: selectedColor === c.hex ? "3px solid #fff" : "2px solid rgba(255,255,255,0.15)",
                          boxShadow: selectedColor === c.hex ? `0 0 12px ${c.hex}88` : "none",
                        }}
                      >
                        {selectedColor === c.hex && <Check className="w-4 h-4 text-white drop-shadow" />}
                      </div>
                      <span className="text-[8px] text-white/30 font-medium">{c.label}</span>
                    </button>
                  ))}
                  {/* Custom color picker */}
                  <div className="flex flex-col items-center gap-1">
                    <label
                      className="w-10 h-10 rounded-full flex items-center justify-center cursor-pointer transition-all hover:scale-110 relative overflow-hidden"
                      style={{
                        background: customColor,
                        border: activeColorKey === "custom" && !SUIT_COLORS.find((c) => c.hex === selectedColor)?.key
                          ? "3px solid #fff"
                          : "2px solid rgba(255,255,255,0.15)",
                        boxShadow: "0 0 8px rgba(255,255,255,0.1)",
                      }}
                    >
                      <input
                        type="color"
                        value={customColor}
                        onChange={(e) => { setCustomColor(e.target.value); setSelectedColor(e.target.value); }}
                        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                      />
                      <span className="text-white/70 text-[14px] pointer-events-none select-none">+</span>
                    </label>
                    <span className="text-[8px] text-white/30 font-medium">Custom</span>
                  </div>
                </div>

                {/* Preview swatch */}
                <div
                  className="flex items-center gap-3 px-3 py-2 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex-shrink-0"
                    style={{ background: selectedColor, border: "1px solid rgba(255,255,255,0.15)" }}
                  />
                  <div>
                    <p className="text-xs font-bold text-white/70">Selected Color</p>
                    <p className="text-[9px] font-mono" style={{ color: "rgba(255,255,255,0.3)" }}>{selectedColor?.toUpperCase()}</p>
                  </div>
                  <div className="ml-auto flex-shrink-0 text-[9px] font-black px-2 py-1 rounded-full"
                    style={{
                      background: `${VISUAL_STYLES.find((s) => s.key === selectedStyle)?.color || "#9B7EFF"}18`,
                      color: VISUAL_STYLES.find((s) => s.key === selectedStyle)?.color || "#9B7EFF",
                      border: `1px solid ${VISUAL_STYLES.find((s) => s.key === selectedStyle)?.color || "#9B7EFF"}44`,
                    }}
                  >
                    {VISUAL_STYLES.find((s) => s.key === selectedStyle)?.badge}
                  </div>
                </div>
              </div>
            </div>

            {/* Apply button */}
            <div
              className="flex-shrink-0 px-4 py-3"
              style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
            >
              <button
                onClick={handleApply}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-full font-black text-sm tracking-wider transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg,#9B7EFF,#A078FF)",
                  color: "#fff",
                  boxShadow: "0 0 24px rgba(155,126,255,0.3)",
                }}
              >
                {saving ? "Saving..." : "Apply & Update Avatar"}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}