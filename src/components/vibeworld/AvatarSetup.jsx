import React, { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, UserCircle, Palette } from "lucide-react";
import { base44 } from "@/api/base44Client";

const AVATAR_TYPES = [
  { key: "masculine", label: "Masculine", emoji: "♂️", color: "#0080B8", desc: "Broader shoulders" },
  { key: "feminine", label: "Feminine", emoji: "♀️", color: "#E040FB", desc: "Subtle curves" },
  { key: "nonbinary", label: "Non-Binary", emoji: "⚧️", color: "#A078FF", desc: "Balanced build" },
  { key: "neutral", label: "Neutral", emoji: "😊", color: "#00D4F0", desc: "Classic style" },
];

const SKIN_TONES = [
  { key: "light", label: "Light", hex: "#FDEBD3" },
  { key: "medium-light", label: "Med-Light", hex: "#F3C9A1" },
  { key: "medium", label: "Medium", hex: "#D4A373" },
  { key: "medium-dark", label: "Med-Dark", hex: "#B07D5A" },
  { key: "dark", label: "Dark", hex: "#7B4A3A" },
  { key: "deep", label: "Deep", hex: "#4A2C2A" },
];

export default function AvatarSetup({ onComplete, existingType, existingTone }) {
  const [avatarType, setAvatarType] = useState(existingType || "neutral");
  const [skinTone, setSkinTone] = useState(existingTone || "medium");
  const [saving, setSaving] = useState(false);
  // Require explicit selection (not just defaults) for first-time setup
  const [typeSelected, setTypeSelected] = useState(!!existingType);
  const [toneSelected, setToneSelected] = useState(!!existingTone);
  const hasSelection = !!(existingType && existingTone) || (typeSelected && toneSelected);

  const currentTone = SKIN_TONES.find((t) => t.key === skinTone);

  const handleContinue = async () => {
    setSaving(true);
    try {
      await base44.auth.updateMe({
        avatar_type: avatarType,
        skin_tone: skinTone,
      });
      onComplete({ avatarType, skinTone });
    } catch {
      onComplete({ avatarType, skinTone });
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center px-5 overflow-y-auto"
      style={{ background: "linear-gradient(160deg,#05050f 0%,#080818 55%,#050510 100%)" }}
    >
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          className="absolute top-[-120px] left-[10%] w-[420px] h-[420px] rounded-full blur-[120px]"
          style={{ background: "radial-gradient(circle,#9B7EFF,transparent 70%)", opacity: 0.1 }}
          animate={{ scale: [1, 1.15, 1], opacity: [0.08, 0.14, 0.08] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md flex flex-col items-center text-center gap-4 py-8"
      >
        {/* Step badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full"
          style={{ background: "rgba(155,126,255,0.1)", border: "1px solid rgba(155,126,255,0.25)" }}>
          <Sparkles className="w-3 h-3" style={{ color: "#9B7EFF" }} />
          <span className="text-[10px] font-black tracking-[0.25em] uppercase" style={{ color: "#9B7EFF" }}>
            Step 2 of 3
          </span>
        </div>

        <div>
          <h2 className="font-heading font-black text-2xl md:text-3xl text-white mb-2">
            Customize Your Avatar
          </h2>
          <p className="text-sm text-white/45 leading-relaxed max-w-sm mx-auto">
            Choose your avatar type and skin tone. You can change this anytime.
          </p>
        </div>

        {/* ── Avatar Preview ──────────────────────────────── */}
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center relative"
            style={{
              background: `radial-gradient(circle at 50% 35%,${currentTone?.hex || "#D4A373"},${currentTone?.hex || "#D4A373"}66)`,
              border: `3px solid ${AVATAR_TYPES.find((a) => a.key === avatarType)?.color || "#00D4F0"}`,
              boxShadow: `0 0 30px ${AVATAR_TYPES.find((a) => a.key === avatarType)?.color || "#00D4F0"}22`,
            }}
          >
            {/* Simple face preview */}
            <div className="flex flex-col items-center gap-0.5">
              {/* Eyes */}
              <div className="flex gap-3">
                <div className="w-2 h-2.5 rounded-full" style={{ background: "#333" }} />
                <div className="w-2 h-2.5 rounded-full" style={{ background: "#333" }} />
              </div>
              {/* Smile */}
              <div className="w-4 h-1.5 rounded-full border-b-2" style={{ borderColor: "#C4957A" }} />
            </div>
          </div>
          <p className="text-xs text-white/35 font-bold tracking-wider uppercase">
            {AVATAR_TYPES.find((a) => a.key === avatarType)?.label} • {currentTone?.label}
          </p>
        </div>

        {/* ── Avatar Type Selection ────────────────────────── */}
        <div className="w-full max-w-xs">
          <div className="flex items-center gap-2 mb-2 px-1">
            <UserCircle className="w-3.5 h-3.5 text-white/30" />
            <span className="text-[10px] font-black text-white/30 tracking-wider uppercase">Body Type</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {AVATAR_TYPES.map((type) => (
              <button
                key={type.key}
                onClick={() => { setAvatarType(type.key); setTypeSelected(true); }}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-left transition-all hover:brightness-110 active:scale-[0.98]"
                style={{
                  background: avatarType === type.key
                    ? `${type.color}14`
                    : "rgba(255,255,255,0.04)",
                  border: avatarType === type.key
                    ? `2px solid ${type.color}`
                    : "1px solid rgba(255,255,255,0.08)",
                  minHeight: 54,
                }}
              >
                <span className="text-lg flex-shrink-0">{type.emoji}</span>
                <div className="min-w-0 text-left">
                  <span className="text-xs font-bold text-white block">{type.label}</span>
                  <span className="text-[9px] text-white/25 block">{type.desc}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── Skin Tone Selection ──────────────────────────── */}
        <div className="w-full max-w-xs">
          <div className="flex items-center gap-2 mb-2 px-1">
            <Palette className="w-3.5 h-3.5 text-white/30" />
            <span className="text-[10px] font-black text-white/30 tracking-wider uppercase">Skin Tone</span>
          </div>
          <div className="flex gap-2 justify-center flex-wrap">
            {SKIN_TONES.map((tone) => (
              <button
                key={tone.key}
                onClick={() => { setSkinTone(tone.key); setToneSelected(true); }}
                className="w-11 h-11 rounded-full transition-all hover:scale-110 active:scale-95 flex items-center justify-center"
                style={{
                  background: tone.hex,
                  border: skinTone === tone.key
                    ? "2px solid #fff"
                    : "2px solid rgba(255,255,255,0.15)",
                  boxShadow: skinTone === tone.key
                    ? `0 0 12px ${tone.hex}66`
                    : "none",
                }}
                title={tone.label}
              />
            ))}
          </div>
        </div>

        {/* ── Hint when nothing selected ─────────────────────── */}
        {!hasSelection && (
          <p className="text-[10px] text-amber-400/60 font-medium">Choose a body type and skin tone to continue</p>
        )}

        {/* ── Continue ─────────────────────────────────────── */}
        <button
          onClick={handleContinue}
          disabled={saving || !hasSelection}
          className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-full font-black text-sm tracking-wider transition-all hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: "linear-gradient(135deg,#9B7EFF,#A078FF)",
            color: "#fff",
            boxShadow: "0 0 30px rgba(155,126,255,0.35)",
            minHeight: 50,
            width: "100%",
            maxWidth: "280px",
          }}
        >
          {saving ? "Saving..." : "Continue"}
        </button>

        <p className="text-[10px] text-white/20 max-w-xs">
          This is your base avatar. More outfits, hairstyles, and accessories coming soon.
        </p>
      </motion.div>
    </div>
  );
}