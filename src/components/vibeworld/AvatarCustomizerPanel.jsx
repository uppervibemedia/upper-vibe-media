/**
 * AvatarCustomizerPanel — simplified single-screen avatar editor.
 * No skin tone, no body type — outfit color only + live preview.
 */
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Palette, Check } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { OUTFIT_COLORS } from "./AvatarSetup";
import AvatarPreviewCanvas from "./AvatarPreviewCanvas";
import SkinToneSelector from "./SkinToneSelector";

export default function AvatarCustomizerPanel({ open, onClose, onApply, user }) {
  const [outfitColorKey, setOutfitColorKey] = useState(user?.avatar_outfit_color || "electric-blue");
  const [gender, setGender] = useState(user?.avatar_gender || "male");
  const [skinToneKey, setSkinToneKey] = useState(user?.skin_tone || "medium");
  const [saving, setSaving] = useState(false);

  // Sync to latest saved value when panel opens
  useEffect(() => {
    if (open) {
      if (user?.avatar_outfit_color) setOutfitColorKey(user.avatar_outfit_color);
      if (user?.avatar_gender) setGender(user.avatar_gender);
      if (user?.skin_tone) setSkinToneKey(user.skin_tone);
    }
  }, [open, user?.avatar_outfit_color, user?.avatar_gender, user?.skin_tone]);

  const handleApply = async () => {
    setSaving(true);
    try {
      await base44.auth.updateMe({
        avatar_outfit_color: outfitColorKey,
        avatar_gender: gender,
        avatar_style: "streetwear",
        skin_tone: skinToneKey,
      });
    } catch {}
    setSaving(false);
    onApply?.({
      outfitColorKey,
      gender,
      skinToneKey,
      style: "streetwear",
      suitColor: OUTFIT_COLORS.find(c => c.key === outfitColorKey)?.hex,
    });
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
          onTouchStart={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            style={{
              borderRadius: "20px 20px 0 0",
              background: "rgba(10,8,24,0.98)",
              border: "1px solid rgba(155,126,255,0.18)",
              backdropFilter: "blur(20px)",
              maxHeight: "96vh",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
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

            {/* Main layout: preview left, options right (desktop) | stacked (mobile) */}
            <div className="flex flex-col lg:flex-row flex-1 overflow-y-auto">

              {/* Preview */}
              <div className="flex items-center justify-center px-4 pt-4 pb-2 lg:py-6 lg:pl-6 lg:pr-4 flex-shrink-0">
                <AvatarPreviewCanvas outfitColorKey={outfitColorKey} skinToneKey={skinToneKey} gender={gender} width={200} height={340} />
              </div>

              {/* Options */}
              <div className="flex flex-col flex-1 px-4 pb-4 pt-2 lg:pt-6 lg:pr-6 gap-4">

                {/* Gender */}
                <div>
                  <p className="text-[10px] font-black tracking-[0.2em] uppercase mb-3" style={{ color: "rgba(255,255,255,0.35)" }}>
                    Avatar Model
                  </p>
                  <div className="flex gap-2">
                    {[{ key: "male", label: "♂ Male" }, { key: "female", label: "♀ Female" }].map((g) => (
                      <button
                        key={g.key}
                        onClick={() => setGender(g.key)}
                        className="flex-1 py-2 rounded-xl text-[12px] font-bold transition-all hover:brightness-110 active:scale-[0.97]"
                        style={{
                          background: gender === g.key ? "rgba(155,126,255,0.18)" : "rgba(255,255,255,0.04)",
                          border: gender === g.key ? "2px solid rgba(155,126,255,0.7)" : "1px solid rgba(255,255,255,0.08)",
                          color: gender === g.key ? "#C4AAFF" : "rgba(255,255,255,0.45)",
                        }}
                      >
                        {g.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Skin Tone — all genders */}
                <SkinToneSelector value={skinToneKey} onChange={setSkinToneKey} />

                {/* Outfit Color */}
                <div>
                  <p className="text-[10px] font-black tracking-[0.2em] uppercase mb-3" style={{ color: "rgba(255,255,255,0.35)" }}>
                    Outfit Color
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {OUTFIT_COLORS.map((c) => (
                      <button
                        key={c.key}
                        onClick={() => setOutfitColorKey(c.key)}
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all hover:brightness-110 active:scale-[0.97]"
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
                        <span className="text-[11px] font-bold text-white flex-1 min-w-0 truncate">{c.label}</span>
                        {outfitColorKey === c.key && <Check className="w-3 h-3 flex-shrink-0" style={{ color: c.swatch }} />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Spacer on desktop so button stays near options */}
                <div className="hidden lg:block flex-1" />

                {/* Apply button */}
                <div className="mt-2">
                  <p className="text-[9px] text-white/20 text-center mb-2">Preview updates instantly. Save when ready.</p>
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
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}