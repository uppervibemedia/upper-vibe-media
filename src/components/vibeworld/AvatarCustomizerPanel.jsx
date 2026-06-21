/**
 * AvatarCustomizerPanel — in-world slide-up panel with live avatar preview.
 * Uses the same AvatarPreview and color data as AvatarSetup for consistency.
 */
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Palette, Shirt, Check, UserCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { AVATAR_TYPES, SKIN_TONES, OUTFIT_COLORS } from "./AvatarSetup";
import AvatarPreviewCanvas from "./AvatarPreviewCanvas";

export default function AvatarCustomizerPanel({ open, onClose, onApply, currentStyle, currentSuitColor, isMobile, user }) {
  const [avatarType, setAvatarType] = useState(user?.avatar_type || "neutral");
  const [skinTone, setSkinTone] = useState(user?.skin_tone || "medium");
  const [outfitColorKey, setOutfitColorKey] = useState(user?.avatar_outfit_color || "electric-blue");
  const [saving, setSaving] = useState(false);

  const handleApply = async () => {
    setSaving(true);
    try {
      await base44.auth.updateMe({
        avatar_type: avatarType,
        skin_tone: skinTone,
        avatar_outfit_color: outfitColorKey,
        avatar_style: "streetwear",
      });
    } catch {}
    setSaving(false);
    onApply?.({ avatarType, skinTone, outfitColorKey, style: "streetwear", suitColor: OUTFIT_COLORS.find(c => c.key === outfitColorKey)?.hex });
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
          style={{ maxHeight: "92vh" }}
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
              maxHeight: "92vh",
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-3 flex-shrink-0"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
            >
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4" style={{ color: "#9B7EFF" }} />
                <span className="text-sm font-black text-white tracking-wider">Edit Avatar</span>
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
            <div className="flex-1 overflow-y-auto">

              {/* ── Live Preview ── */}
              <div
                className="flex flex-col items-center pt-4 pb-2"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
              >
                <span className="text-[9px] font-black tracking-[0.2em] uppercase mb-2" style={{ color: "rgba(155,126,255,0.6)" }}>
                  Live Preview · Updates Instantly
                </span>
                <AvatarPreviewCanvas outfitColorKey={outfitColorKey} width={160} height={240} />
              </div>

              {/* Options */}
              <div className="px-4 py-4 space-y-5">

                {/* Body Type */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <UserCircle className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.3)" }} />
                    <span className="text-[10px] font-black tracking-[0.2em] uppercase" style={{ color: "rgba(255,255,255,0.3)" }}>
                      Body Type
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {AVATAR_TYPES.map((type) => (
                      <button
                        key={type.key}
                        onClick={() => setAvatarType(type.key)}
                        className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-left transition-all hover:brightness-110 active:scale-[0.97]"
                        style={{
                          background: avatarType === type.key ? `${type.color}18` : "rgba(255,255,255,0.04)",
                          border: avatarType === type.key ? `2px solid ${type.color}` : "1px solid rgba(255,255,255,0.08)",
                          minHeight: 44,
                        }}
                      >
                        <span className="text-base flex-shrink-0">{type.emoji}</span>
                        <span className="text-[11px] font-bold text-white flex-1">{type.label}</span>
                        {avatarType === type.key && <Check className="w-3 h-3 flex-shrink-0" style={{ color: type.color }} />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Skin Tone */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Palette className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.3)" }} />
                    <span className="text-[10px] font-black tracking-[0.2em] uppercase" style={{ color: "rgba(255,255,255,0.3)" }}>
                      Skin Tone
                    </span>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {SKIN_TONES.map((tone) => (
                      <button
                        key={tone.key}
                        onClick={() => setSkinTone(tone.key)}
                        title={tone.label}
                        className="flex flex-col items-center gap-0.5 transition-all hover:scale-110 active:scale-95"
                      >
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center"
                          style={{
                            background: tone.hex,
                            border: skinTone === tone.key ? "3px solid #fff" : "2px solid rgba(255,255,255,0.15)",
                            boxShadow: skinTone === tone.key ? `0 0 10px ${tone.hex}88` : "none",
                          }}
                        >
                          {skinTone === tone.key && (
                            <Check className="w-3.5 h-3.5" style={{ color: (tone.key === "light" || tone.key === "medium-light") ? "#333" : "#fff" }} />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Outfit Color */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Shirt className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.3)" }} />
                    <span className="text-[10px] font-black tracking-[0.2em] uppercase" style={{ color: "rgba(255,255,255,0.3)" }}>
                      Outfit Color
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {OUTFIT_COLORS.map((c) => (
                      <button
                        key={c.key}
                        onClick={() => setOutfitColorKey(c.key)}
                        className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-left transition-all hover:brightness-110 active:scale-[0.97]"
                        style={{
                          background: outfitColorKey === c.key ? `${c.accent}18` : "rgba(255,255,255,0.04)",
                          border: outfitColorKey === c.key ? `2px solid ${c.accent}` : "1px solid rgba(255,255,255,0.08)",
                        }}
                      >
                        <div
                          className="w-5 h-5 rounded-full flex-shrink-0"
                          style={{ background: c.hex, border: `2px solid ${c.accent}` }}
                        />
                        <span className="text-[10px] font-bold text-white flex-1 min-w-0 truncate">{c.label}</span>
                        {outfitColorKey === c.key && <Check className="w-3 h-3 flex-shrink-0" style={{ color: c.accent }} />}
                      </button>
                    ))}
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