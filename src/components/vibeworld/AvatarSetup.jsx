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

// ── Full-body Avatar Preview (CSS drawn, human-proportioned) ──
function AvatarPreview({ avatarType, skinTone }) {
  const tone = SKIN_TONES.find(t => t.key === skinTone) || SKIN_TONES[2];
  const typeCfg = AVATAR_TYPES.find(t => t.key === avatarType) || AVATAR_TYPES[3];
  const shirtColor = SHIRT_COLORS[avatarType] || SHIRT_COLORS.neutral;
  const hairColor = HAIR_COLORS[avatarType] || HAIR_COLORS.neutral;
  const pantsColor = avatarType === "masculine" ? "#212F3D" : avatarType === "feminine" ? "#1B2631" : "#2C3E50";
  const shoeColor = "#1A1A1A";
  const beltColor = "#3A3A3A";

  // Fortnite-heroic proportions — 8-head scale, broad shoulders, long legs
  const sw = avatarType === "masculine" ? 64 : avatarType === "feminine" ? 48 : 56;
  const hw = sw * (avatarType === "feminine" ? 0.9 : 0.7);

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="relative flex flex-col items-center rounded-2xl overflow-hidden"
        style={{
          width: 160,
          height: 260,
          background: `linear-gradient(180deg, ${typeCfg.color}11 0%, transparent 55%)`,
          border: `2px solid ${typeCfg.color}33`,
          boxShadow: `0 0 50px ${typeCfg.color}14`,
        }}
      >
        {/* ─── HEAD ──────────────────────────────────── */}
        <div className="relative" style={{ marginTop: 6, zIndex: 5 }}>
          {/* Hair back/top */}
          <div style={{
            width: 48, height: 52,
            background: hairColor,
            borderRadius: "55% 55% 42% 42%",
            position: "absolute",
            top: -8, left: -5,
            boxShadow: `0 2px 6px ${hairColor}44`,
          }} />
          {/* Face */}
          <div style={{
            width: 44, height: 48,
            background: `linear-gradient(160deg, ${tone.hex} 0%, ${tone.shadow} 100%)`,
            borderRadius: "48% 48% 42% 42%",
            position: "relative",
            border: `1px solid ${tone.shadow}`,
          }}>
            {/* Eyes */}
            <div style={{ display: "flex", gap: 12, justifyContent: "center", paddingTop: 16, position: "relative" }}>
              {/* Left eye */}
              <div style={{ position: "relative", width: 6, height: 7 }}>
                <div style={{ width: 7, height: 7, background: "#FFF", borderRadius: "50%", position: "absolute", top: 0, left: -1 }} />
                <div style={{ width: 3.5, height: 3.5, background: "#4A7C59", borderRadius: "50%", position: "absolute", top: 2, left: 2 }} />
                <div style={{ width: 1.5, height: 1.5, background: "#0A0A0A", borderRadius: "50%", position: "absolute", top: 3, left: 3 }} />
              </div>
              {/* Right eye */}
              <div style={{ position: "relative", width: 6, height: 7 }}>
                <div style={{ width: 7, height: 7, background: "#FFF", borderRadius: "50%", position: "absolute", top: 0, left: -1 }} />
                <div style={{ width: 3.5, height: 3.5, background: "#4A7C59", borderRadius: "50%", position: "absolute", top: 2, left: 2 }} />
                <div style={{ width: 1.5, height: 1.5, background: "#0A0A0A", borderRadius: "50%", position: "absolute", top: 3, left: 3 }} />
              </div>
            </div>
            {/* Eyebrows */}
            <div style={{ display: "flex", gap: 11, justifyContent: "center", marginTop: -10 }}>
              <div style={{ width: 8, height: 2.5, background: "#3E2723", borderRadius: 2, transform: "rotate(-2deg)" }} />
              <div style={{ width: 8, height: 2.5, background: "#3E2723", borderRadius: 2, transform: "rotate(2deg)" }} />
            </div>
            {/* Nose */}
            <div style={{ width: 3, height: 5, background: tone.shadow, borderRadius: "50%", margin: "4px auto 0" }} />
            {/* Mouth */}
            <div style={{ width: 10, height: 3, background: "#C07060", borderRadius: 3, margin: "3px auto 0" }} />
            {/* Blush */}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "0 5px", marginTop: -12 }}>
              <div style={{ width: 6, height: 4, background: "#E8A0A066", borderRadius: "50%" }} />
              <div style={{ width: 6, height: 4, background: "#E8A0A066", borderRadius: "50%" }} />
            </div>
          </div>
          {/* Hair front/bangs */}
          <div style={{
            width: 42, height: 14,
            background: hairColor,
            borderRadius: "0 0 50% 50%",
            position: "absolute",
            top: -2, left: -3,
            opacity: 0.92,
          }} />
        </div>

        {/* ─── NECK ──────────────────────────────────── */}
        <div style={{
          width: 14, height: 10,
          background: `linear-gradient(180deg, ${tone.hex} 0%, ${tone.shadow} 100%)`,
          borderRadius: "3px 3px 6px 6px",
          marginTop: -2,
          zIndex: 4,
        }} />

        {/* ─── TORSO — V-tapered, human-proportioned ── */}
        <div style={{
          position: "relative",
          width: sw,
          marginTop: -1,
          zIndex: 3,
        }}>
          {/* Shoulder caps */}
          <div style={{ position: "absolute", top: -6, left: -8, width: 22, height: 18, background: shirtColor, borderRadius: "50%" }} />
          <div style={{ position: "absolute", top: -6, right: -8, width: 22, height: 18, background: shirtColor, borderRadius: "50%" }} />
          {/* Chest/torso — wider at shoulders, narrower at waist */}
          <svg width={sw + 4} height="60" style={{ marginLeft: -2 }}>
            <polygon
              points={`${2 + sw * 0.15},0 ${2 + sw * 0.85},0 ${2 + sw * 0.9},56 ${2 + sw * 0.1},56`}
              fill={shirtColor}
              rx="4"
            />
            {/* Collarbone accent */}
            <line x1={2 + sw * 0.2} y1="2" x2={2 + sw * 0.8} y2="2" stroke={shirtColor} strokeWidth="2.5" opacity="0.6" strokeLinecap="round" />
          </svg>
          {/* Belt */}
          <div style={{
            width: sw * 0.75, height: 5,
            background: beltColor,
            borderRadius: 2,
            margin: "-6px auto 0",
            position: "relative",
            zIndex: 1,
          }}>
            {/* Belt buckle */}
            <div style={{
              width: 8, height: 6,
              background: "#C8A84E",
              borderRadius: 2,
              margin: "0 auto",
              border: "1px solid #A08830",
            }} />
          </div>
        </div>

        {/* ─── LEGS — segmented thighs + calves ──────── */}
        <div style={{ display: "flex", gap: 8, marginTop: 2, zIndex: 2 }}>
          {/* Left leg */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            {/* Thigh */}
            <div style={{ width: 20, height: 44, background: pantsColor, borderRadius: "6px 6px 4px 4px" }} />
            {/* Calf */}
            <div style={{ width: 17, height: 40, background: pantsColor, borderRadius: "4px 4px 5px 5px", marginTop: -1 }} />
            {/* Shoe */}
            <div style={{ width: 26, height: 10, background: shoeColor, borderRadius: "0 0 9px 4px", marginTop: -1, position: "relative" }}>
              <div style={{ width: 26, height: 3, background: "#333", borderRadius: "0 0 6px 3px", position: "absolute", bottom: 0 }} />
            </div>
          </div>
          {/* Right leg */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ width: 20, height: 44, background: pantsColor, borderRadius: "6px 6px 4px 4px" }} />
            <div style={{ width: 17, height: 40, background: pantsColor, borderRadius: "4px 4px 5px 5px", marginTop: -1 }} />
            <div style={{ width: 26, height: 10, background: shoeColor, borderRadius: "0 0 9px 4px", marginTop: -1, position: "relative" }}>
              <div style={{ width: 26, height: 3, background: "#333", borderRadius: "0 0 6px 3px", position: "absolute", bottom: 0 }} />
            </div>
          </div>
        </div>

        {/* ─── ARMS — proper biceps + forearms + hands ─ */}
        {/* Left arm */}
        <div style={{ position: "absolute", top: 63, left: -12, zIndex: 1 }}>
          {/* Upper arm / bicep */}
          <div style={{ width: 14, height: 30, background: tone.hex, borderRadius: "8px 8px 6px 6px", boxShadow: `inset 0 0 4px ${tone.shadow}` }} />
          {/* Forearm */}
          <div style={{ width: 11, height: 28, background: tone.hex, borderRadius: "5px 5px 6px 6px", marginTop: -1 }} />
          {/* Hand */}
          <div style={{ width: 16, height: 13, background: tone.hex, borderRadius: 6, marginTop: -1, position: "relative" }}>
            {/* Fingers */}
            {[-4, 0, 4].map((fx, i) => (
              <div key={i} style={{
                width: 3.5, height: 7,
                background: tone.hex,
                borderRadius: "3px 3px 2px 2px",
                position: "absolute",
                top: -6,
                left: 3.5 + fx,
              }} />
            ))}
          </div>
        </div>
        {/* Right arm */}
        <div style={{ position: "absolute", top: 63, right: -12, zIndex: 1 }}>
          <div style={{ width: 14, height: 30, background: tone.hex, borderRadius: "8px 8px 6px 6px", boxShadow: `inset 0 0 4px ${tone.shadow}` }} />
          <div style={{ width: 11, height: 28, background: tone.hex, borderRadius: "5px 5px 6px 6px", marginTop: -1 }} />
          <div style={{ width: 16, height: 13, background: tone.hex, borderRadius: 6, marginTop: -1, position: "relative" }}>
            {[-4, 0, 4].map((fx, i) => (
              <div key={i} style={{
                width: 3.5, height: 7,
                background: tone.hex,
                borderRadius: "3px 3px 2px 2px",
                position: "absolute",
                top: -6,
                left: 3.5 + fx,
              }} />
            ))}
          </div>
        </div>
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