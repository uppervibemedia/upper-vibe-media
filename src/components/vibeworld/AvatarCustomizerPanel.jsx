/**
 * AvatarCustomizerPanel — Vibe Suit editor.
 * Two-column desktop layout: preview left, colors right.
 * No Avatar Style (does nothing visible), no skin tone, no body type.
 */
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, Check, Zap, Lock, User, Users } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { OUTFIT_COLORS } from "./AvatarSetup";
import AvatarPreviewCanvas, { SKIN_TONES } from "./AvatarPreviewCanvas";

// Avatar type options — "current" is the permanent default; others are TEST only
const AVATAR_TYPE_OPTIONS = [
  { key: "current", label: "Current Avatar", sub: "Default", icon: "🤖" },
  { key: "test-mixamo", label: "Male Casual", sub: "⚠️ Test Only", icon: "👨" },
  { key: "test-mixamo-female", label: "Female Casual", sub: "⚠️ Test Only", icon: "👩" },
];

export default function AvatarCustomizerPanel({ open, onClose, onApply, user }) {
  const [outfitColorKey, setOutfitColorKey] = useState(user?.avatar_outfit_color || "cosmic-blue");
  const [skinColorKey, setSkinColorKey] = useState("brown");
  // Read saved test avatar type from sessionStorage (not persisted to account — test only)
  const [avatarTypeKey, setAvatarTypeKey] = useState(() => {
    try { return sessionStorage.getItem("uvc_test_avatar") || "current"; } catch { return "current"; }
  });
  const [saving, setSaving] = useState(false);
  const isProcedural = avatarTypeKey !== "current";
  const [error, setError] = useState(null);
  const trailUnlocked = !!user?.trail_boost_unlocked;
  const isMember = !!(user?.isPlus || user?.tier === "plus" || user?.tier === "premium" || user?.role === "admin");

  const handleAvatarTypeChange = (key) => {
    setAvatarTypeKey(key);
    try { sessionStorage.setItem("uvc_test_avatar", key); } catch {}
    // Notify parent immediately so the 3D world can swap the avatar
    onApply?.({ avatarTypeKey: key, outfitColorKey, suitColor: OUTFIT_COLORS.find(c => c.key === outfitColorKey)?.hex });
  };

  const handleApply = async () => {
    setSaving(true);
    setError(null);
    try {
      await base44.auth.updateMe({ avatar_outfit_color: outfitColorKey });
      onApply?.({
        outfitColorKey,
        avatarTypeKey,
        suitColor: OUTFIT_COLORS.find(c => c.key === outfitColorKey)?.hex,
      });
      onClose?.();
    } catch {
      setError("Save failed. Please try again.");
    }
    setSaving(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="avatar-customizer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[85] flex items-center justify-center pointer-events-auto"
          style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="relative w-full mx-3"
            style={{ maxWidth: 760, maxHeight: "92vh" }}
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            <div
              className="flex flex-col overflow-hidden"
              style={{
                borderRadius: 24,
                background: "rgba(10,8,24,0.98)",
                border: "1px solid rgba(155,126,255,0.2)",
                boxShadow: "0 0 80px rgba(155,126,255,0.12)",
              }}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-5 py-4 flex-shrink-0"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
              >
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-4 h-4" style={{ color: "#9B7EFF" }} />
                  <span className="font-black text-white tracking-wider" style={{ fontSize: 15 }}>
                    Choose Your Vibe Suit
                  </span>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:bg-white/10 active:scale-90"
                  style={{ color: "rgba(255,255,255,0.4)" }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body — two-column desktop, stack mobile */}
              <div className="flex flex-col lg:flex-row flex-1 overflow-y-auto lg:overflow-hidden" style={{ maxHeight: "calc(92vh - 130px)" }}>

                {/* LEFT: preview */}
                <div
                  className="flex flex-col items-center justify-center px-5 py-5 flex-shrink-0 lg:w-80"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
                >
                  {/* Mobile: compact preview */}
                  <div className="block lg:hidden w-full">
                    <AvatarPreviewCanvas outfitColorKey={outfitColorKey} skinColorKey={skinColorKey} avatarTypeKey={avatarTypeKey} width={300} height={240} />
                  </div>
                  {/* Desktop: tall preview */}
                  <div className="hidden lg:block w-full">
                    <AvatarPreviewCanvas outfitColorKey={outfitColorKey} skinColorKey={skinColorKey} avatarTypeKey={avatarTypeKey} width={280} height={400} />
                  </div>
                  <p className="text-[9px] mt-2 text-center" style={{ color: "rgba(255,255,255,0.2)" }}>
                    Click a color to preview instantly
                  </p>
                </div>

                {/* RIGHT: color picker + apply */}
                <div
                  className="flex flex-col flex-1 overflow-y-auto px-5 py-4 lg:border-l"
                  style={{ borderColor: "rgba(255,255,255,0.06)" }}
                >
                  {/* Avatar Type Selector — TEST MODE */}
                  <div className="mb-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[10px] font-black tracking-[0.2em] uppercase" style={{ color: "rgba(255,255,255,0.3)" }}>
                        Avatar Type
                      </span>
                      <span className="text-[9px] px-2 py-0.5 rounded-full font-black" style={{ background: "rgba(255,180,0,0.12)", color: "#FFB800", border: "1px solid rgba(255,180,0,0.25)" }}>
                        TEST
                      </span>
                    </div>
                    <div className="flex gap-1.5">
                      {AVATAR_TYPE_OPTIONS.map((opt) => {
                        const active = avatarTypeKey === opt.key;
                        return (
                          <button
                            key={opt.key}
                            onClick={() => handleAvatarTypeChange(opt.key)}
                            className="flex-1 flex flex-col items-center gap-1 px-2 py-2 rounded-xl text-center transition-all hover:brightness-110 active:scale-[0.98]"
                            style={{
                              background: active ? "rgba(155,126,255,0.14)" : "rgba(255,255,255,0.04)",
                              border: active ? "1.5px solid rgba(155,126,255,0.6)" : "1px solid rgba(255,255,255,0.08)",
                              boxShadow: active ? "0 0 14px rgba(155,126,255,0.2)" : "none",
                            }}
                          >
                            <span style={{ fontSize: 16, lineHeight: 1 }}>{opt.icon}</span>
                            <span className="text-[10px] font-black text-white leading-tight">{opt.label}</span>
                            {active && <Check className="w-3 h-3" style={{ color: "#9B7EFF" }} />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Skin Color — only for procedural avatars */}
                  {isProcedural && (
                    <div className="mb-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 14 }}>
                      <span className="text-[10px] font-black tracking-[0.2em] uppercase mb-2 block" style={{ color: "rgba(255,255,255,0.3)" }}>
                        Skin Tone
                      </span>
                      <div className="flex gap-2">
                        {SKIN_TONES.map((t) => {
                          const active = skinColorKey === t.key;
                          return (
                            <button
                              key={t.key}
                              title={t.label}
                              onClick={() => setSkinColorKey(t.key)}
                              className="flex flex-col items-center gap-1 transition-all hover:scale-110 active:scale-95"
                            >
                              <div
                                className="w-8 h-8 rounded-full"
                                style={{
                                  background: `#${t.hex.toString(16).padStart(6, "0")}`,
                                  border: active ? "2.5px solid #fff" : "2px solid rgba(255,255,255,0.15)",
                                  boxShadow: active ? "0 0 10px rgba(255,255,255,0.4)" : "none",
                                }}
                              />
                              <span className="text-[9px]" style={{ color: active ? "#fff" : "rgba(255,255,255,0.3)" }}>{t.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="mb-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 14 }}>
                    <span className="text-[10px] font-black tracking-[0.2em] uppercase" style={{ color: "rgba(255,255,255,0.3)" }}>
                      Suit Color
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 flex-1">
                    {OUTFIT_COLORS.map((c) => {
                      const active = outfitColorKey === c.key;
                      return (
                        <button
                          key={c.key}
                          onClick={() => setOutfitColorKey(c.key)}
                          className="flex items-center gap-3 px-3.5 py-3 rounded-2xl text-left transition-all hover:brightness-110 active:scale-[0.97]"
                          style={{
                            background: active ? `${c.swatch}15` : "rgba(255,255,255,0.04)",
                            border: active ? `2px solid ${c.swatch}` : "1px solid rgba(255,255,255,0.08)",
                            boxShadow: active ? `0 0 16px ${c.swatch}30` : "none",
                          }}
                        >
                          <div
                            className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center"
                            style={{
                              background: c.swatch,
                              border: "2px solid rgba(255,255,255,0.25)",
                              boxShadow: active ? `0 0 10px ${c.swatch}` : "none",
                            }}
                          >
                            {active && <Check className="w-3.5 h-3.5" style={{ color: c.key === "shadow-black" ? "#fff" : "#000" }} />}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-[11px] font-black text-white truncate">{c.label}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Spacer */}
                  <div className="flex-1 min-h-4" />

                  {/* Trail Boost reward status */}
                  <div
                    className="mt-4 flex items-center gap-3 px-4 py-3 rounded-2xl"
                    style={{
                      background: trailUnlocked ? "rgba(255,215,0,0.08)" : "rgba(255,255,255,0.04)",
                      border: trailUnlocked ? "1px solid rgba(255,215,0,0.25)" : "1px solid rgba(255,255,255,0.07)",
                    }}
                  >
                    {trailUnlocked ? (
                      <Zap className="w-4 h-4 flex-shrink-0" style={{ color: "#FFD700" }} />
                    ) : (
                      <Lock className="w-4 h-4 flex-shrink-0" style={{ color: "rgba(255,255,255,0.25)" }} />
                    )}
                    <div className="min-w-0">
                      <p className="text-[11px] font-black" style={{ color: trailUnlocked ? "#FFD700" : "rgba(255,255,255,0.35)" }}>
                        {trailUnlocked ? "⚡ Trail Boost Unlocked" : "Trail Boost — Locked"}
                      </p>
                      <p className="text-[9px] mt-0.5" style={{ color: "rgba(255,255,255,0.2)" }}>
                        {trailUnlocked
                          ? "Earn 50 orbs in the Launch Zone to re-activate"
                          : isMember
                          ? "Collect 50 Vibe Orbs in the Launch Zone to unlock"
                          : "Requires Upper Vibe Plus — collect 50 orbs to unlock"}
                      </p>
                    </div>
                  </div>

                  {/* Apply */}
                  <div className="mt-4 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                    {error && (
                      <p className="text-[10px] text-red-400 text-center mb-2">{error}</p>
                    )}
                    <button
                      onClick={handleApply}
                      disabled={saving}
                      className="w-full py-3.5 rounded-full font-black text-sm tracking-wider transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
                      style={{
                        background: "linear-gradient(135deg,#9B7EFF,#A078FF)",
                        color: "#fff",
                        boxShadow: "0 0 28px rgba(155,126,255,0.3)",
                      }}
                    >
                      {saving ? "Saving..." : "Apply Vibe Suit"}
                    </button>
                    <p className="text-[9px] text-center mt-2" style={{ color: "rgba(255,255,255,0.18)" }}>
                      Human avatars and premium styles coming soon.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}