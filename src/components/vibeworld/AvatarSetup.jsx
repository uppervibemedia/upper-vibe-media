import React, { useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, UserCircle, Palette } from "lucide-react";
import { base44 } from "@/api/base44Client";
import * as THREE from "three";
const AVATAR_TYPES = [
  { key: "masculine",  label: "Masculine",  emoji: "♂️", color: "#0080B8", desc: "Athletic build" },
  { key: "feminine",   label: "Feminine",   emoji: "♀️", color: "#E040FB", desc: "Styled curves" },
  { key: "nonbinary",  label: "Non-Binary", emoji: "⚧️", color: "#A078FF", desc: "Balanced style" },
  { key: "neutral",    label: "Neutral",    emoji: "😊", color: "#00D4F0", desc: "Clean & classic" },
];

const SKIN_TONES = [
  { key: "light",        label: "Light",      hex: "#FDEBD3" },
  { key: "medium-light", label: "Med-Light",  hex: "#F3C9A1" },
  { key: "medium",       label: "Medium",     hex: "#C8864A" },
  { key: "medium-dark",  label: "Med-Dark",   hex: "#B07D5A" },
  { key: "dark",         label: "Dark",       hex: "#7B4A3A" },
  { key: "deep",         label: "Deep",       hex: "#4A2C2A" },
];

// Body type color preview (no Three.js needed for setup screen)
const TYPE_PREVIEW = {
  masculine:  { color: "#1a5fc8", emoji: "🧍", accent: "#00D4F0" },
  feminine:   { color: "#9b27af", emoji: "🧍", accent: "#E040FB" },
  nonbinary:  { color: "#4caf8e", emoji: "🧍", accent: "#A078FF" },
  neutral:    { color: "#2196f3", emoji: "🧍", accent: "#00E5FF" },
};

function AvatarPreview3D({ avatarType, skinTone }) {
  const SKIN_HEX = {
    "light": "#FDEBD3", "medium-light": "#F0C490", "medium": "#C8864A",
    "medium-dark": "#9A6038", "dark": "#6B3A22", "deep": "#3E2018",
  };
  const skin = SKIN_HEX[skinTone] || "#C8864A";
  const tp = TYPE_PREVIEW[avatarType] || TYPE_PREVIEW.neutral;

  return (
    <div style={{
      width: 160, height: 280, borderRadius: 16, overflow: "hidden",
      background: "linear-gradient(180deg, rgba(155,126,255,0.08) 0%, rgba(0,212,240,0.05) 100%)",
      border: "1px solid rgba(155,126,255,0.20)",
      boxShadow: "0 0 40px rgba(155,126,255,0.12)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8,
    }}>
      {/* Simple SVG humanoid silhouette */}
      <svg viewBox="0 0 80 160" width="80" height="160" xmlns="http://www.w3.org/2000/svg">
        {/* Head */}
        <circle cx="40" cy="22" r="14" fill={skin} />
        {/* Hair */}
        <ellipse cx="40" cy="12" rx="14" ry="10" fill="#1a0e08" />
        {/* Eyes */}
        <circle cx="35" cy="21" r="2.5" fill="#222" />
        <circle cx="45" cy="21" r="2.5" fill="#222" />
        {/* Neck */}
        <rect x="36" y="35" width="8" height="8" rx="3" fill={skin} />
        {/* Torso */}
        <rect x="22" y="42" width="36" height="42" rx="8" fill={tp.color} />
        {/* Left Arm */}
        <rect x="10" y="44" width="12" height="32" rx="6" fill={tp.color} />
        <rect x="10" y="75" width="10" height="18" rx="5" fill={skin} />
        {/* Right Arm */}
        <rect x="58" y="44" width="12" height="32" rx="6" fill={tp.color} />
        <rect x="60" y="75" width="10" height="18" rx="5" fill={skin} />
        {/* Left Leg */}
        <rect x="24" y="84" width="14" height="36" rx="7" fill="#111122" />
        <rect x="24" y="118" width="14" height="24" rx="7" fill="#111122" />
        {/* Right Leg */}
        <rect x="42" y="84" width="14" height="36" rx="7" fill="#111122" />
        <rect x="42" y="118" width="14" height="24" rx="7" fill="#111122" />
        {/* Shoes */}
        <ellipse cx="31" cy="148" rx="10" ry="5" fill="#0a0a18" />
        <ellipse cx="49" cy="148" rx="10" ry="5" fill="#0a0a18" />
        {/* Chest accent line */}
        <rect x="39" y="47" width="2" height="28" rx="1" fill={tp.accent} opacity="0.7" />
      </svg>
      <p style={{ color: tp.accent, fontSize: 11, fontWeight: 700, marginTop: 4, letterSpacing: 1 }}>
        {avatarType?.toUpperCase()}
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
      await base44.auth.updateMe({ avatar_type: avatarType, skin_tone: skinTone });
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
            Customize Avatar
          </span>
        </div>

        <div>
          <h2 className="font-heading font-black text-2xl md:text-3xl text-white mb-1">
            Your Vibe World Avatar
          </h2>
          <p className="text-sm text-white/40 leading-relaxed max-w-sm mx-auto">
            Choose your look. This is how others will see you in Upper Vibe City.
          </p>
        </div>

        {/* ── Live 3D Preview ─────────────────────────────── */}
        <AvatarPreview3D avatarType={avatarType} skinTone={skinTone} />

        {/* ── Body Type ──────────────────────────────────── */}
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
                className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl text-left transition-all hover:brightness-110 active:scale-[0.98]"
                style={{
                  background: avatarType === type.key ? `${type.color}14` : "rgba(255,255,255,0.04)",
                  border: avatarType === type.key ? `2px solid ${type.color}` : "1px solid rgba(255,255,255,0.08)",
                  minHeight: 58,
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

        {/* ── Skin Tone ──────────────────────────────────── */}
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
                className="w-12 h-12 rounded-full transition-all hover:scale-110 active:scale-95 flex items-center justify-center"
                style={{
                  background: tone.hex,
                  border: skinTone === tone.key ? "3px solid #fff" : "2px solid rgba(255,255,255,0.15)",
                  boxShadow: skinTone === tone.key ? `0 0 16px ${tone.hex}66` : "none",
                }}
                title={tone.label}
              />
            ))}
          </div>
        </div>

        {!hasSelection && (
          <p className="text-[10px] text-amber-400/60 font-medium">Choose a body type and skin tone to continue</p>
        )}

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
          More outfits, hairstyles, and accessories coming to the Vibe Shop.
        </p>
      </motion.div>
    </div>
  );
}