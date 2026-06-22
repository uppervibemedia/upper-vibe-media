/**
 * AvatarCustomizerPanel — in-world Vibe Suit editor.
 * Phase 1: style + color only. No gender, no skin tone.
 */
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, Zap, Check } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { OUTFIT_COLORS, VIBE_SUIT_STYLES } from "./AvatarSetup";
import AvatarPreviewCanvas from "./AvatarPreviewCanvas";

export default function AvatarCustomizerPanel({ open, onClose, onApply, user }) {
  const [outfitColorKey, setOutfitColorKey] = useState(user?.avatar_outfit_color || "cosmic-blue");
  const [vibeStyle, setVibeStyle] = useState(user?.avatar_style || "cosmic-explorer");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleApply = async () => {
    setSaving(true);
    setError(null);
    try {
      await base44.auth.updateMe({
        avatar_outfit_color: outfitColorKey,
        avatar_style: vibeStyle,
      });
      onApply?.({
        outfitColorKey,
        style: vibeStyle,
        suitColor: OUTFIT_COLORS.find(c => c.key === outfitColorKey)?.hex,
      });
      onClose?.();
    } catch (e) {
      setError("Save failed. Please try again.");
    }
    setSaving(false);
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
          onTouchStart={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="flex flex-col overflow-hidden"
            style={{
              borderRadius: "20px 20px 0 0",
              background: "rgba(10,8,24,0.98)",
              border: "1px solid rgba(155,126,255,0.18)",
              backdropFilter: "blur(20px)",
              maxHeight: "94vh",
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-3 flex-shrink-0"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" style={{ color: "#9B7EFF" }} />
                <span className="text-sm font-black text-white tracking-wider">Choose Your Vibe Suit</span>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:bg-white/10"
                style={{ color: "rgba(255,255,255,0.4)" }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto">

              {/* Preview */}
              <div
                className="flex flex-col items-center py-4"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
              >
                <span className="text-[9px] font-black tracking-[0.2em] uppercase mb-3" style={{ color: "rgba(155,126,255,0.6)" }}>
                  Live Preview · Updates Instantly
                </span>
                <AvatarPreviewCanvas outfitColorKey={outfitColorKey} width={200} height={310} />
              </div>

              {/* Options */}
              <div className="px-4 py-4 space-y-5">

                {/* Avatar Style */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.3)" }} />
                    <span className="text-[10px] font-black tracking-[0.2em] uppercase" style={{ color: "rgba(255,255,255,0.3)" }}>
                      Avatar Style
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {VIBE_SUIT_STYLES.map((s) => (
                      <button
                        key={s.key}
                        onClick={() => setVibeStyle(s.key)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all hover:brightness-110 active:scale-[0.97]"
                        style={{
                          background: vibeStyle === s.key ? `${s.color}18` : "rgba(255,255,255,0.04)",
                          border: vibeStyle === s.key ? `2px solid ${s.color}` : "1px solid rgba(255,255,255,0.08)",
                        }}
                      >
                        <span className="text-lg flex-shrink-0">{s.emoji}</span>
                        <span className="text-[11px] font-bold text-white flex-1">{s.label}</span>
                        {vibeStyle === s.key && <Check className="w-3 h-3 flex-shrink-0" style={{ color: s.color }} />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Suit Color */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.3)" }} />
                    <span className="text-[10px] font-black tracking-[0.2em] uppercase" style={{ color: "rgba(255,255,255,0.3)" }}>
                      Suit Color
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {OUTFIT_COLORS.map((c) => (
                      <button
                        key={c.key}
                        onClick={() => setOutfitColorKey(c.key)}
                        className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-left transition-all hover:brightness-110 active:scale-[0.97]"
                        style={{
                          background: outfitColorKey === c.key ? `${c.swatch}18` : "rgba(255,255,255,0.04)",
                          border: outfitColorKey === c.key ? `2px solid ${c.swatch}` : "1px solid rgba(255,255,255,0.08)",
                        }}
                      >
                        <div
                          className="w-5 h-5 rounded-full flex-shrink-0"
                          style={{
                            background: c.swatch,
                            border: "2px solid rgba(255,255,255,0.2)",
                            boxShadow: outfitColorKey === c.key ? `0 0 8px ${c.swatch}88` : "none",
                          }}
                        />
                        <span className="text-[10px] font-bold text-white flex-1 min-w-0 truncate">{c.label}</span>
                        {outfitColorKey === c.key && <Check className="w-3 h-3 flex-shrink-0" style={{ color: c.swatch }} />}
                      </button>
                    ))}
                  </div>
                </div>

                <p className="text-[9px] text-center" style={{ color: "rgba(255,255,255,0.2)" }}>
                  Human avatars and premium styles coming soon.
                </p>
              </div>
            </div>

            {/* Apply button */}
            <div
              className="flex-shrink-0 px-4 py-3"
              style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
            >
              {error && (
                <p className="text-[10px] text-red-400 text-center mb-2">{error}</p>
              )}
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