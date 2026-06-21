import React, { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, UserCircle, Palette } from "lucide-react";
import { base44 } from "@/api/base44Client";

const AVATAR_TYPES = [
  { key: "masculine", label: "Masculine", emoji: "♂️", color: "#0080B8", neon: "#00E5FF", desc: "Athletic build" },
  { key: "feminine", label: "Feminine", emoji: "♀️", color: "#E040FB", neon: "#E040FB", desc: "Styled curves" },
  { key: "nonbinary", label: "Non-Binary", emoji: "⚧️", color: "#A078FF", neon: "#A078FF", desc: "Balanced style" },
  { key: "neutral", label: "Neutral", emoji: "😊", color: "#00D4F0", neon: "#00D4F0", desc: "Clean & classic" },
];

const SKIN_TONES = [
  { key: "light", label: "Light", hex: "#FDEBD3", shadow: "#E8D5B8" },
  { key: "medium-light", label: "Med-Light", hex: "#F3C9A1", shadow: "#DFB68A" },
  { key: "medium", label: "Medium", hex: "#D4A373", shadow: "#C08F5C" },
  { key: "medium-dark", label: "Med-Dark", hex: "#B07D5A", shadow: "#9C6A48" },
  { key: "dark", label: "Dark", hex: "#7B4A3A", shadow: "#693D2E" },
  { key: "deep", label: "Deep", hex: "#4A2C2A", shadow: "#3D2321" },
];

const CLOTHING = {
  masculine: { shirt: "#141416", accent: "#1A1A1E", neon: "#00E5FF", pants: "#1A1A1E", shoe: "#121214", style: "track" },
  feminine: { shirt: "#141416", accent: "#1A1A1E", neon: "#E040FB", pants: "#18181C", shoe: "#121214", style: "crop" },
  nonbinary: { shirt: "#141416", accent: "#1A1A1E", neon: "#A078FF", pants: "#1A1A1E", shoe: "#121214", style: "layered" },
  neutral: { shirt: "#141416", accent: "#1A1A1E", neon: "#00D4F0", pants: "#18181C", shoe: "#121214", style: "hoodie" },
};

const HAIR_COLORS = {
  masculine: "#1C110A", feminine: "#180C06", nonbinary: "#2A1810", neutral: "#2A1810",
};

// ── Full-Body Avatar Preview — CSS-drawn stylized human ──
function AvatarPreview({ avatarType, skinTone }) {
  const tone = SKIN_TONES.find(t => t.key === skinTone) || SKIN_TONES[2];
  const typeCfg = AVATAR_TYPES.find(t => t.key === avatarType) || AVATAR_TYPES[3];
  const cloth = CLOTHING[avatarType] || CLOTHING.neutral;
  const hairColor = HAIR_COLORS[avatarType] || HAIR_COLORS.neutral;
  const style = cloth.style;

  const sw = avatarType === "masculine" ? 64 : avatarType === "feminine" ? 50 : 56;
  const hw = sw * (avatarType === "feminine" ? 0.88 : 0.68);

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="relative flex flex-col items-center rounded-2xl overflow-visible"
        style={{
          width: 160, height: 280,
          background: `linear-gradient(180deg, ${typeCfg.color}11 0%, transparent 55%)`,
          border: `2px solid ${typeCfg.color}33`,
          boxShadow: `0 0 60px ${typeCfg.color}14`,
        }}
      >
        {/* ── HEAD ──────────────────────────────────── */}
        <div className="relative" style={{ marginTop: 6, zIndex: 5 }}>
          {/* Hair back */}
          <div style={{
            width: 50, height: 54,
            background: hairColor,
            borderRadius: "55% 55% 42% 42%",
            position: "absolute", top: -8, left: -6,
            boxShadow: `0 2px 8px ${hairColor}44`,
          }} />
          {/* Face */}
          <div style={{
            width: 46, height: 50,
            background: `linear-gradient(160deg, ${tone.hex} 0%, ${tone.shadow} 100%)`,
            borderRadius: "50% 50% 42% 42%",
            position: "relative",
            border: `1px solid ${tone.shadow}`,
            boxShadow: `0 2px 8px ${tone.shadow}22`,
          }}>
            {/* Eyes */}
            <div className="flex gap-12 justify-center pt-16 relative">
              {[0, 1].map(i => (
                <div key={i} className="relative" style={{ width: 7, height: 8 }}>
                  <div style={{ width: 8, height: 8, background: "#FFF", borderRadius: "50%", position: "absolute", top: 0, left: -1, boxShadow: "0 0 2px rgba(0,0,0,0.1)" }} />
                  <div style={{ width: 4, height: 4, background: "#4A7C59", borderRadius: "50%", position: "absolute", top: 2.5, left: 2.5, border: "0.5px solid #2E5A3C" }} />
                  <div style={{ width: 2, height: 2, background: "#0A0A0A", borderRadius: "50%", position: "absolute", top: 3.5, left: 3.5 }} />
                  {/* Eye highlight */}
                  <div style={{ width: 1.5, height: 1, background: "#FFF", borderRadius: "50%", position: "absolute", top: 1.5, left: 1.5, opacity: 0.9 }} />
                </div>
              ))}
            </div>
            {/* Brows */}
            <div className="flex gap-11 justify-center" style={{ marginTop: -10 }}>
              {[0, 1].map(i => (
                <div key={i} style={{ width: 9, height: 3, background: "#3A2018", borderRadius: 2, transform: i === 0 ? "rotate(-2deg)" : "rotate(2deg)" }} />
              ))}
            </div>
            {/* Nose */}
            <div style={{ width: 4, height: 6, background: tone.shadow, borderRadius: "50%", margin: "4px auto 0", opacity: 0.7 }} />
            {/* Mouth */}
            <div style={{ width: 11, height: 3.5, background: "#C07060", borderRadius: 3, margin: "3px auto 0" }} />
            {/* Blush */}
            <div className="flex justify-between px-[6px]" style={{ marginTop: -12 }}>
              <div style={{ width: 6, height: 4, background: "#E8A0A066", borderRadius: "50%" }} />
              <div style={{ width: 6, height: 4, background: "#E8A0A066", borderRadius: "50%" }} />
            </div>
          </div>
          {/* Hair front / bangs */}
          <div style={{
            width: 44, height: 15,
            background: hairColor,
            borderRadius: "0 0 50% 50%",
            position: "absolute", top: -1, left: -4,
            opacity: 0.95,
          }} />
          {/* Style-specific hair details */}
          {style === "crop" && (
            <div className="flex gap-3" style={{ position: "absolute", top: 6, left: 2 }}>
              <div style={{ width: 10, height: 10, background: hairColor, borderRadius: "50%", opacity: 0.5 }} />
              <div style={{ width: 8, height: 8, background: hairColor, borderRadius: "50%", opacity: 0.4 }} />
            </div>
          )}
        </div>

        {/* ── NECK ──────────────────────────────────── */}
        <div style={{
          width: 15, height: 12,
          background: `linear-gradient(180deg, ${tone.hex} 0%, ${tone.shadow} 100%)`,
          borderRadius: "4px 4px 7px 7px",
          marginTop: -3,
          zIndex: 4,
        }} />

        {/* ── TORSO — V-tapered with neon accents ── */}
        <div style={{ position: "relative", width: sw + 6, marginTop: -2, zIndex: 3 }}>
          {/* Shoulder caps */}
          <div style={{ position: "absolute", top: -6, left: -9, width: 24, height: 20, background: cloth.shirt, borderRadius: "50%" }} />
          <div style={{ position: "absolute", top: -6, right: -9, width: 24, height: 20, background: cloth.shirt, borderRadius: "50%" }} />

          <svg width={sw + 8} height="65" style={{ marginLeft: -1 }}>
            <polygon
              points={`${4 + sw * 0.15},0 ${4 + sw * 0.85},0 ${4 + sw * 0.90},56 ${4 + sw * 0.10},56`}
              fill={cloth.shirt}
            />
            {/* Collarbone accent */}
            <line x1={4 + sw * 0.2} y1="3" x2={4 + sw * 0.8} y2="3" stroke={cloth.accent} strokeWidth="2.5" opacity="0.5" strokeLinecap="round" />
          </svg>

          {/* Style-specific chest detail */}
          {style === "track" && (
            <>
              <div style={{ width: 1.5, height: 22, background: cloth.neon, position: "absolute", top: 4, left: "50%", transform: "translateX(-50%)", opacity: 0.7 }} />
              <div style={{ width: 0, height: 0, borderLeft: "8px solid transparent", borderRight: "8px solid transparent", borderBottom: `10px solid ${cloth.neon}`, position: "absolute", top: -4, left: "50%", transform: "translateX(-50%)", opacity: 0.75 }} />
            </>
          )}
          {style === "crop" && (
            <div style={{ position: "absolute", top: 6, left: "50%", transform: "translateX(-50%)", opacity: 0.7 }}>
              <svg width="36" height="12" viewBox="0 0 36 12">
                <polyline points="4,6 10,6 14,2 18,12 22,6 24,9 28,6 32,10" fill="none" stroke={cloth.neon} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          )}
          {style === "layered" && (
            <>
              <div style={{ width: 0, height: 0, borderLeft: "8px solid transparent", borderRight: "8px solid transparent", borderBottom: `12px solid ${cloth.neon}`, position: "absolute", top: -2, left: "50%", transform: "translateX(-50%)", opacity: 0.7 }} />
              <div style={{ width: sw * 0.35, height: 3, background: cloth.accent, borderRadius: 1, position: "absolute", top: 14, left: "50%", transform: "translateX(-50%)", opacity: 0.5 }} />
            </>
          )}
          {style === "hoodie" && (
            <div className="flex justify-around" style={{ position: "absolute", top: 4, width: sw + 8 }}>
              <div style={{ width: 1, height: 30, background: cloth.neon, opacity: 0.6, borderRadius: 1 }} />
              <div style={{ width: 1, height: 30, background: cloth.neon, opacity: 0.6, borderRadius: 1 }} />
            </div>
          )}

          {/* Belt with neon */}
          <div style={{ width: sw * 0.72, height: 6, background: "#222224", borderRadius: 3, margin: "-7px auto 0", position: "relative", zIndex: 1 }}>
            <div style={{ width: sw * 0.72, height: 1, background: cloth.neon, opacity: 0.5, borderRadius: 1, position: "absolute", top: 0 }} />
            <div style={{ width: 9, height: 7, background: "#C8A84E", borderRadius: 2, margin: "0 auto", border: "1px solid #A08830" }} />
          </div>
        </div>

        {/* ── LEGS ────────────────────────────────────── */}
        <div className="flex" style={{ gap: 8, marginTop: 3, zIndex: 2 }}>
          {[0, 1].map((leg) => (
            <div key={leg} className="flex flex-col items-center">
              <div style={{ width: 22, height: 46, background: `linear-gradient(180deg, ${cloth.pants} 0%, ${cloth.pants}DA 100%)`, borderRadius: "8px 8px 4px 4px" }} />
              <div style={{ width: 20, height: 6, background: cloth.pants, borderRadius: "3px", marginTop: -2, boxShadow: "0 1px 2px rgba(0,0,0,0.3)" }} />
              <div style={{ width: 20, height: 42, background: `linear-gradient(180deg, ${cloth.pants}CC 0%, ${cloth.pants} 40%, ${cloth.pants} 100%)`, borderRadius: "4px 4px 6px 6px", marginTop: -1 }} />
              <div style={{ width: 15, height: 8, background: cloth.pants, borderRadius: "0 0 3px 3px", marginTop: -1 }} />
              {/* Neon pant stripe */}
              <div style={{ width: 1.5, height: 82, background: cloth.neon, opacity: 0.35, position: "absolute", marginTop: 0, marginLeft: leg === 0 ? -3 : 3 }} />
              <div style={{
                width: 28, height: 16, background: cloth.shoe, borderRadius: "0 0 11px 5px", marginTop: -1,
                position: "relative", boxShadow: "0 2px 4px rgba(0,0,0,0.4)",
              }}>
                <div style={{ width: 28, height: 5, background: "#1A1A1A", borderRadius: "0 0 10px 4px", position: "absolute", bottom: 0 }} />
                <div style={{ width: 28, height: 1.5, background: cloth.neon, opacity: 0.5, position: "absolute", top: 5, borderRadius: 1 }} />
                <div style={{ width: 18, height: 2, background: "rgba(255,255,255,0.15)", borderRadius: 1, position: "absolute", top: 3, left: 5 }} />
                <div style={{ width: 11, height: 9, background: "#181818", borderRadius: "6px 0 0 2px", position: "absolute", right: 0, top: 1 }} />
              </div>
            </div>
          ))}
        </div>

        {/* ── ARMS — with skin showing + neon wristbands ─ */}
        <div style={{ position: "absolute", top: 64, left: -14, zIndex: 1 }}>
          <div style={{ width: 15, height: 32, background: tone.hex, borderRadius: "10px 10px 7px 7px", boxShadow: `inset 0 0 5px ${tone.shadow}` }} />
          <div style={{ width: 12, height: 28, background: tone.hex, borderRadius: "6px 6px 7px 7px", marginTop: -1 }} />
          {/* Neon wristband */}
          <div style={{ width: 13, height: 2, background: cloth.neon, opacity: 0.6, borderRadius: 1, marginTop: -1 }} />
          <div style={{ width: 17, height: 14, background: tone.hex, borderRadius: 7, marginTop: -1, position: "relative" }}>
            {[-5, 0, 5].map((fx, i) => (
              <div key={i} style={{ width: 4, height: 8, background: tone.hex, borderRadius: "4px 4px 2px 2px", position: "absolute", top: -6, left: 4 + fx }} />
            ))}
          </div>
        </div>
        <div style={{ position: "absolute", top: 64, right: -14, zIndex: 1 }}>
          <div style={{ width: 15, height: 32, background: tone.hex, borderRadius: "10px 10px 7px 7px", boxShadow: `inset 0 0 5px ${tone.shadow}` }} />
          <div style={{ width: 12, height: 28, background: tone.hex, borderRadius: "6px 6px 7px 7px", marginTop: -1 }} />
          <div style={{ width: 13, height: 2, background: cloth.neon, opacity: 0.6, borderRadius: 1, marginTop: -1 }} />
          <div style={{ width: 17, height: 14, background: tone.hex, borderRadius: 7, marginTop: -1, position: "relative" }}>
            {[-5, 0, 5].map((fx, i) => (
              <div key={i} style={{ width: 4, height: 8, background: tone.hex, borderRadius: "4px 4px 2px 2px", position: "absolute", top: -6, left: 4 + fx }} />
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

        {/* ── Full-Body Preview ────────────────────── */}
        <AvatarPreview avatarType={avatarType} skinTone={skinTone} />

        {/* ── Body Type ──────────────────────────────── */}
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
                  background: avatarType === type.key
                    ? `${type.color}14`
                    : "rgba(255,255,255,0.04)",
                  border: avatarType === type.key
                    ? `2px solid ${type.color}`
                    : "1px solid rgba(255,255,255,0.08)",
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

        {/* ── Skin Tone ──────────────────────────────── */}
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
                  border: skinTone === tone.key
                    ? "3px solid #fff"
                    : "2px solid rgba(255,255,255,0.15)",
                  boxShadow: skinTone === tone.key
                    ? `0 0 16px ${tone.hex}66`
                    : "none",
                }}
                title={tone.label}
              />
            ))}
          </div>
        </div>

        {/* ── Hint ──────────────────────────────────────── */}
        {!hasSelection && (
          <p className="text-[10px] text-amber-400/60 font-medium">Choose a body type and skin tone to continue</p>
        )}

        {/* ── Continue ──────────────────────────────────── */}
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
          This is your base avatar. More outfits, hairstyles, and accessories coming to the Vibe Shop.
        </p>
      </motion.div>
    </div>
  );
}