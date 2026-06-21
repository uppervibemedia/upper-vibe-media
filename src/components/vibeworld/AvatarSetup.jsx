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
  { key: "light", label: "Light", hex: "#FDEBD3", shadow: "#E8D5B8" },
  { key: "medium-light", label: "Med-Light", hex: "#F3C9A1", shadow: "#DFB68A" },
  { key: "medium", label: "Medium", hex: "#D4A373", shadow: "#C08F5C" },
  { key: "medium-dark", label: "Med-Dark", hex: "#B07D5A", shadow: "#9C6A48" },
  { key: "dark", label: "Dark", hex: "#7B4A3A", shadow: "#693D2E" },
  { key: "deep", label: "Deep", hex: "#4A2C2A", shadow: "#3D2321" },
];

const SHIRT_COLORS = {
  masculine: "#1A5276",
  feminine: "#8E44AD",
  nonbinary: "#2E86C1",
  neutral: "#2E86C1",
};

const HAIR_COLORS = {
  masculine: "#2C1B0E",
  feminine: "#1A0E08",
  nonbinary: "#3E2723",
  neutral: "#3E2723",
};

// ── Full-body Avatar Preview (CSS drawn, lightweight) ──────────
function AvatarPreview({ avatarType, skinTone }) {
  const tone = SKIN_TONES.find(t => t.key === skinTone) || SKIN_TONES[2];
  const typeCfg = AVATAR_TYPES.find(t => t.key === avatarType) || AVATAR_TYPES[3];
  const shirtColor = SHIRT_COLORS[avatarType] || SHIRT_COLORS.neutral;
  const hairColor = HAIR_COLORS[avatarType] || HAIR_COLORS.neutral;

  // Fortnite-style proportions
  const shoulderW = avatarType === "masculine" ? 62 : avatarType === "feminine" ? 50 : 56;
  const bodyH = avatarType === "masculine" ? 55 : avatarType === "feminine" ? 50 : 52;
  const legLen = avatarType === "masculine" ? 88 : avatarType === "feminine" ? 86 : 87;

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="relative flex flex-col items-center rounded-2xl overflow-hidden"
        style={{
          width: 150,
          height: 240,
          background: `linear-gradient(180deg, ${typeCfg.color}11 0%, transparent 60%)`,
          border: `2px solid ${typeCfg.color}33`,
          boxShadow: `0 0 40px ${typeCfg.color}18`,
        }}
      >
        {/* ── HEAD ──────────────────────────────────── */}
        <div className="relative mt-2" style={{ zIndex: 2 }}>
          <div style={{
            width: 44, height: 48,
            background: hairColor,
            borderRadius: "50% 50% 38% 38%",
            position: "absolute",
            top: -7, left: -2,
          }} />
          <div style={{
            width: 40, height: 44,
            background: tone.hex,
            borderRadius: "46% 46% 40% 40%",
            position: "relative",
            border: `1px solid ${tone.shadow}`,
          }}>
            <div style={{ display: "flex", gap: 11, justifyContent: "center", paddingTop: 14 }}>
              <div style={{ width: 4.5, height: 5.5, background: "#1A1A1A", borderRadius: "50%" }} />
              <div style={{ width: 4.5, height: 5.5, background: "#1A1A1A", borderRadius: "50%" }} />
            </div>
            <div style={{ width: 3.5, height: 3, background: tone.shadow, borderRadius: "50%", margin: "3px auto 0" }} />
            <div style={{ width: 9, height: 2.5, background: "#C07060", borderRadius: 2, margin: "3px auto 0" }} />
          </div>
          <div style={{
            width: 38, height: 11,
            background: hairColor,
            borderRadius: "40% 40% 0 0",
            position: "absolute",
            top: -4, left: 0,
            opacity: 0.9,
          }} />
        </div>

        {/* ── NECK ──────────────────────────────────── */}
        <div style={{ width: 12, height: 9, background: tone.hex, borderRadius: 3, marginTop: -1 }} />

        {/* ── TORSO (shirt) — broad chest, tapered waist ── */}
        <div style={{
          width: shoulderW, height: bodyH,
          background: shirtColor,
          borderRadius: "12px 12px 6px 6px",
          position: "relative",
          marginTop: -1,
        }}>
          <div style={{
            width: shoulderW * 0.55, height: 3,
            background: `${shirtColor}88`,
            borderRadius: 2,
            margin: "5px auto 0",
          }} />
          {/* Belt */}
          <div style={{
            width: shoulderW * 0.7, height: 5,
            background: "#3A3A3A",
            borderRadius: 2,
            margin: `${bodyH - 10}px auto 0`,
          }} />
        </div>

        {/* ── LEGS — longer for Fortnite proportions ─── */}
        <div style={{ display: "flex", gap: 7, marginTop: -1 }}>
          <div style={{ width: 20, height: legLen * 0.52, background: "#212F3D", borderRadius: "4px 4px 0 0" }} />
          <div style={{ width: 20, height: legLen * 0.52, background: "#212F3D", borderRadius: "4px 4px 0 0" }} />
        </div>
        <div style={{ display: "flex", gap: 7, marginTop: -1 }}>
          <div style={{ width: 17, height: legLen * 0.48, background: "#212F3D", borderRadius: "0 0 5px 5px" }} />
          <div style={{ width: 17, height: legLen * 0.48, background: "#212F3D", borderRadius: "0 0 5px 5px" }} />
        </div>

        {/* ── ARMS — upper + lower ──────────────────── */}
        <div style={{ position: "absolute", top: 60, left: 5, zIndex: 1 }}>
          <div style={{ width: 13, height: 28, background: tone.hex, borderRadius: "7px 7px 4px 4px" }} />
          <div style={{ width: 11, height: 26, background: tone.hex, borderRadius: "4px 4px 5px 5px" }} />
        </div>
        <div style={{ position: "absolute", top: 60, right: 5, zIndex: 1 }}>
          <div style={{ width: 13, height: 28, background: tone.hex, borderRadius: "7px 7px 4px 4px" }} />
          <div style={{ width: 11, height: 26, background: tone.hex, borderRadius: "4px 4px 5px 5px" }} />
        </div>

        {/* ── SHOES ──────────────────────────────────── */}
        <div style={{ display: "flex", gap: 7, marginTop: 0 }}>
          <div style={{ width: 24, height: 9, background: "#1A1A1A", borderRadius: "0 0 7px 3px" }} />
          <div style={{ width: 24, height: 9, background: "#1A1A1A", borderRadius: "0 0 7px 3px" }} />
        </div>

        {/* ── HANDS — palm with fingers ──────────────── */}
        <div style={{ position: "absolute", top: 110, left: 1, width: 15, height: 12, background: tone.hex, borderRadius: 5, zIndex: 3 }} />
        <div style={{ position: "absolute", top: 110, right: 1, width: 15, height: 12, background: tone.hex, borderRadius: 5, zIndex: 3 }} />
      </div>

      <p className="text-xs text-white/40 font-bold tracking-wider uppercase">
        {typeCfg.label} • {tone.label}
      </p>
    </div>
  );
}

export default function AvatarSetup({ onComplete, existingType, existingTone }) {
  const [avatarType, setAvatarType] = useState(existingType || "neutral");
  const [skinTone, setSkinTone] = useState(existingTone || "medium");
  const [saving, setSaving] = useState(false);
  const [typeSelected, setTypeSelected] = useState(!!existingType);
  const [toneSelected, setToneSelected] = useState(!!existingTone);
  const hasSelection = !!(existingType && existingTone) || (typeSelected && toneSelected);

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
      className="fixed inset-0 z-[80] flex items-center justify-center px-4 overflow-y-auto"
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
        className="relative z-10 w-full max-w-md flex flex-col items-center text-center gap-5 py-6"
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
          <h2 className="font-heading font-black text-2xl md:text-3xl text-white mb-1">
            Customize Your Avatar
          </h2>
          <p className="text-sm text-white/40 leading-relaxed max-w-sm mx-auto">
            Choose your avatar type and skin tone. You can change this anytime.
          </p>
        </div>

        {/* ── Full-Body Avatar Preview ────────────────────── */}
        <AvatarPreview avatarType={avatarType} skinTone={skinTone} />

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
                    ? `0 0 14px ${tone.hex}66`
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