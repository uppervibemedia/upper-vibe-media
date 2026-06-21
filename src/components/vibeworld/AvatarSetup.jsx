import React, { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, UserCircle, Palette, Shirt } from "lucide-react";
import { base44 } from "@/api/base44Client";

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

const STYLES = [
  {
    key: "streetwear",
    label: "Human Streetwear",
    emoji: "👟",
    desc: "Modern hoodie, visible face & hair, neon accents",
    color: "#00B8D4",
    badge: "DEFAULT",
  },
  {
    key: "cosmic",
    label: "Cosmic Explorer",
    emoji: "🚀",
    desc: "Futuristic armor, sci-fi glow, still shows face",
    color: "#9B7EFF",
    badge: "EXPLORER",
  },
];

// Hair colors per skin tone
const HAIR_COLORS = {
  "light":        "#C8A060",
  "medium-light": "#7A4820",
  "medium":       "#3A1E0A",
  "medium-dark":  "#1A0A04",
  "dark":         "#100804",
  "deep":         "#080402",
};

// Outfit colors per style/type
const OUTFIT_COLORS = {
  streetwear: { masculine: "#1a3a6e", feminine: "#4a1060", nonbinary: "#0d4a3a", neutral: "#0d3050" },
  cosmic:     { masculine: "#0d1f4a", feminine: "#2d0640", nonbinary: "#0a2820", neutral: "#071828" },
};
const ACCENT_COLORS = {
  streetwear: { masculine: "#00b8d4", feminine: "#e040fb", nonbinary: "#00e5a0", neutral: "#00e5ff" },
  cosmic:     { masculine: "#00cfff", feminine: "#d060ff", nonbinary: "#00ffcc", neutral: "#40e0ff" },
};

// SVG-based avatar preview — keeps same body proportions, shows face/hair/outfit
function AvatarPreview({ avatarType, skinTone, avatarStyle }) {
  const skin = SKIN_TONES.find((t) => t.key === skinTone)?.hex || "#C8864A";
  const hair = HAIR_COLORS[skinTone] || "#3A1E0A";
  const outfit = OUTFIT_COLORS[avatarStyle]?.[avatarType] || "#1a3a6e";
  const accent = ACCENT_COLORS[avatarStyle]?.[avatarType] || "#00e5ff";

  // Feminine adjustments
  const isFem = avatarType === "feminine";

  return (
    <div style={{
      width: 160, height: 290, borderRadius: 16, overflow: "hidden",
      background: "linear-gradient(180deg, rgba(155,126,255,0.08) 0%, rgba(0,212,240,0.05) 100%)",
      border: "1px solid rgba(155,126,255,0.20)",
      boxShadow: "0 0 40px rgba(155,126,255,0.12)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    }}>
      <svg viewBox="0 0 80 170" width="80" height="170" xmlns="http://www.w3.org/2000/svg">
        {/* ── Hair (back layer) ── */}
        {isFem ? (
          <>
            {/* Feminine: shoulder-length */}
            <ellipse cx="40" cy="22" rx="17" ry="14" fill={hair} />
            <rect x="20" y="28" width="8" height="30" rx="4" fill={hair} />
            <rect x="52" y="28" width="8" height="30" rx="4" fill={hair} />
          </>
        ) : avatarType === "masculine" ? (
          /* Masculine: short crop */
          <ellipse cx="40" cy="18" rx="15" ry="9" fill={hair} />
        ) : (
          /* Neutral/NB: medium */
          <>
            <ellipse cx="40" cy="18" rx="16" ry="10" fill={hair} />
            <rect x="23" y="22" width="6" height="14" rx="3" fill={hair} />
            <rect x="51" y="22" width="6" height="14" rx="3" fill={hair} />
          </>
        )}

        {/* ── Head ── */}
        <ellipse cx="40" cy="24" rx="13.5" ry="15" fill={skin} />

        {/* ── Eyes ── */}
        {/* Eye whites */}
        <ellipse cx="33.5" cy="22" rx="3.5" ry="2.8" fill="#f5f5f5" />
        <ellipse cx="46.5" cy="22" rx="3.5" ry="2.8" fill="#f5f5f5" />
        {/* Iris */}
        <circle cx="33.5" cy="22" r="2" fill={isFem ? "#7788ee" : "#336688"} />
        <circle cx="46.5" cy="22" r="2" fill={isFem ? "#7788ee" : "#336688"} />
        {/* Pupils */}
        <circle cx="33.5" cy="22" r="1.1" fill="#111" />
        <circle cx="46.5" cy="22" r="1.1" fill="#111" />
        {/* Eye shine */}
        <circle cx="34.3" cy="21.2" r="0.5" fill="white" opacity="0.8" />
        <circle cx="47.3" cy="21.2" r="0.5" fill="white" opacity="0.8" />

        {/* ── Eyebrows ── */}
        <path d="M30.5 18.5 Q33.5 17.2 36.5 18.5" stroke="#3a2010" strokeWidth="1.2" fill="none" strokeLinecap="round" />
        <path d="M43.5 18.5 Q46.5 17.2 49.5 18.5" stroke="#3a2010" strokeWidth="1.2" fill="none" strokeLinecap="round" />

        {/* ── Nose ── */}
        <circle cx="40" cy="27" r="1.8" fill={skin} stroke="rgba(0,0,0,0.08)" strokeWidth="0.5" />

        {/* ── Mouth ── */}
        <path d="M36 31 Q40 33.5 44 31" stroke="rgba(0,0,0,0.25)" strokeWidth="1.1" fill="none" strokeLinecap="round" />

        {/* ── Neck ── */}
        <rect x="36.5" y="37" width="7" height="7" rx="3" fill={skin} />

        {/* ── Torso / outfit ── */}
        <rect x="22" y="43" width={isFem ? "36" : "36"} height="44" rx="8" fill={outfit} />
        {/* Chest accent stripe */}
        <rect x="39" y="46" width="2.5" height="32" rx="1" fill={accent} opacity="0.75" />
        {/* Shoulder pips */}
        <circle cx="24" cy="48" r="3" fill={accent} opacity="0.6" />
        <circle cx="56" cy="48" r="3" fill={accent} opacity="0.6" />

        {/* ── Left Arm ── */}
        <rect x="9" y="44" width="13" height="30" rx="6" fill={outfit} />
        <rect x="9.5" y="73" width="11" height="18" rx="5.5" fill={skin} />

        {/* ── Right Arm ── */}
        <rect x="58" y="44" width="13" height="30" rx="6" fill={outfit} />
        <rect x="59.5" y="73" width="11" height="18" rx="5.5" fill={skin} />

        {/* ── Left Leg ── */}
        <rect x="24" y="87" width="14" height="34" rx="7" fill="#111122" />
        <rect x="24" y="119" width="14" height="22" rx="7" fill="#111122" />

        {/* ── Right Leg ── */}
        <rect x="42" y="87" width="14" height="34" rx="7" fill="#111122" />
        <rect x="42" y="119" width="14" height="22" rx="7" fill="#111122" />

        {/* ── Shoes ── */}
        <ellipse cx="31" cy="146" rx="10" ry="5" fill="#0a0a18" />
        <ellipse cx="49" cy="146" rx="10" ry="5" fill="#0a0a18" />

        {/* ── Cosmic glow ring (cosmic style only) ── */}
        {avatarStyle === "cosmic" && (
          <ellipse cx="40" cy="146" rx="22" ry="4" fill="none" stroke={accent} strokeWidth="1" opacity="0.4" />
        )}
      </svg>

      <p style={{ color: accent, fontSize: 10, fontWeight: 700, marginTop: 6, letterSpacing: 1 }}>
        {avatarStyle === "cosmic" ? "⚡ COSMIC" : "✨ STREETWEAR"}
      </p>
    </div>
  );
}

export default function AvatarSetup({ onComplete, existingType, existingTone, existingStyle }) {
  const [avatarType, setAvatarType] = useState(existingType || "neutral");
  const [skinTone, setSkinTone] = useState(existingTone || "medium");
  const [avatarStyle, setAvatarStyle] = useState(existingStyle || "streetwear");
  const [saving, setSaving] = useState(false);

  const [typeSelected, setTypeSelected] = useState(!!existingType);
  const [toneSelected, setToneSelected] = useState(!!existingTone);

  const hasSelection = (existingType && existingTone) || (typeSelected && toneSelected);

  const handleContinue = async () => {
    setSaving(true);
    try {
      await base44.auth.updateMe({ avatar_type: avatarType, skin_tone: skinTone, avatar_style: avatarStyle });
      onComplete({ avatarType, skinTone, avatarStyle });
    } catch {
      onComplete({ avatarType, skinTone, avatarStyle });
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
        className="relative z-10 w-full max-w-md flex flex-col items-center text-center gap-4 py-6"
      >
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full"
          style={{ background: "rgba(155,126,255,0.1)", border: "1px solid rgba(155,126,255,0.25)" }}>
          <Sparkles className="w-3 h-3" style={{ color: "#9B7EFF" }} />
          <span className="text-[10px] font-black tracking-[0.25em] uppercase" style={{ color: "#9B7EFF" }}>
            Customize Avatar
          </span>
        </div>

        <div>
          <h2 className="font-heading font-black text-2xl text-white mb-1">Your Vibe World Avatar</h2>
          <p className="text-sm text-white/40 leading-relaxed max-w-sm mx-auto">
            Choose your look. This is how others will see you in Upper Vibe City.
          </p>
        </div>

        {/* Live Preview */}
        <AvatarPreview avatarType={avatarType} skinTone={skinTone} avatarStyle={avatarStyle} />

        {/* ── Body Type ── */}
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
                  minHeight: 56,
                }}
              >
                <span className="text-lg flex-shrink-0">{type.emoji}</span>
                <div>
                  <span className="text-xs font-bold text-white block">{type.label}</span>
                  <span className="text-[9px] text-white/25 block">{type.desc}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── Skin Tone ── */}
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
                  border: skinTone === tone.key ? "3px solid #fff" : "2px solid rgba(255,255,255,0.15)",
                  boxShadow: skinTone === tone.key ? `0 0 14px ${tone.hex}66` : "none",
                }}
                title={tone.label}
              />
            ))}
          </div>
        </div>

        {/* ── Style / Outfit ── */}
        <div className="w-full max-w-xs">
          <div className="flex items-center gap-2 mb-2 px-1">
            <Shirt className="w-3.5 h-3.5 text-white/30" />
            <span className="text-[10px] font-black text-white/30 tracking-wider uppercase">Style</span>
          </div>
          <div className="flex flex-col gap-2">
            {STYLES.map((s) => (
              <button
                key={s.key}
                onClick={() => setAvatarStyle(s.key)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all hover:brightness-110 active:scale-[0.98]"
                style={{
                  background: avatarStyle === s.key ? `${s.color}12` : "rgba(255,255,255,0.04)",
                  border: avatarStyle === s.key ? `2px solid ${s.color}` : "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <span className="text-xl flex-shrink-0">{s.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">{s.label}</span>
                    <span className="text-[8px] font-black px-1.5 py-0.5 rounded"
                      style={{ background: `${s.color}22`, color: s.color }}>
                      {s.badge}
                    </span>
                  </div>
                  <span className="text-[9px] text-white/30 block mt-0.5">{s.desc}</span>
                </div>
                {avatarStyle === s.key && (
                  <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: s.color }} />
                )}
              </button>
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
            minHeight: 50, width: "100%", maxWidth: "280px",
          }}
        >
          {saving ? "Saving..." : "Enter Upper Vibe City →"}
        </button>

        <p className="text-[10px] text-white/20 max-w-xs">
          More styles, outfits & accessories coming to the Vibe Shop.
        </p>
      </motion.div>
    </div>
  );
}