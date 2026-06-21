import React, { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, UserCircle, Palette, Shirt, Check, RotateCcw, RotateCw } from "lucide-react";
import { base44 } from "@/api/base44Client";

export const AVATAR_TYPES = [
  { key: "masculine",  label: "Masculine",  emoji: "♂️", color: "#0080B8" },
  { key: "feminine",   label: "Feminine",   emoji: "♀️", color: "#E040FB" },
  { key: "nonbinary",  label: "Non-Binary", emoji: "⚧️", color: "#A078FF" },
  { key: "neutral",    label: "Neutral",    emoji: "😊", color: "#00D4F0" },
];

export const SKIN_TONES = [
  { key: "light",        label: "Light",      hex: "#FDEBD3" },
  { key: "medium-light", label: "Med-Light",  hex: "#F3C9A1" },
  { key: "medium",       label: "Medium",     hex: "#C8864A" },
  { key: "tan",          label: "Tan",        hex: "#B07D5A" },
  { key: "brown",        label: "Brown",      hex: "#7B4A3A" },
  { key: "dark-brown",   label: "Dark Brown", hex: "#4A2C2A" },
];

export const OUTFIT_COLORS = [
  { key: "electric-blue",  label: "Electric Blue",  hex: "#0055CC", accent: "#00AAFF" },
  { key: "neon-purple",    label: "Neon Purple",     hex: "#5500AA", accent: "#AA55FF" },
  { key: "cosmic-black",   label: "Cosmic Black",    hex: "#0A0A18", accent: "#00D4F0" },
  { key: "white-silver",   label: "White / Silver",  hex: "#CCD8E8", accent: "#88CCFF" },
  { key: "pink-rose",      label: "Pink / Rose",     hex: "#882255", accent: "#FF77BB" },
  { key: "gold-yellow",    label: "Gold / Yellow",   hex: "#886600", accent: "#FFD044" },
];

const HAIR_COLORS = {
  "light":        "#C8A060",
  "medium-light": "#7A4820",
  "medium":       "#3A1E0A",
  "tan":          "#2A1208",
  "brown":        "#180804",
  "dark-brown":   "#080402",
};

// Shared SVG avatar preview — used in both AvatarSetup and AvatarCustomizerPanel
export function AvatarPreview({ avatarType, skinTone, outfitColorKey, rotation = 0 }) {
  const skin = SKIN_TONES.find((t) => t.key === skinTone)?.hex || "#C8864A";
  const hair = HAIR_COLORS[skinTone] || "#3A1E0A";
  const outfit = OUTFIT_COLORS.find((c) => c.key === outfitColorKey) || OUTFIT_COLORS[0];
  const isFem = avatarType === "feminine";
  const isMasc = avatarType === "masculine";

  // Pants: slightly darker version of outfit base
  const pantsColor = "#111122";
  // Shoes: distinct from outfit
  const shoeColor = outfitColorKey === "white-silver" ? "#334455" : "#0A0A1A";

  return (
    <svg
      viewBox="0 0 80 175"
      xmlns="http://www.w3.org/2000/svg"
      style={{ transform: `rotateY(${rotation}deg)`, transition: "transform 0.4s ease", display: "block" }}
    >
      {/* ── Hair (back layer) ── */}
      {isFem ? (
        <>
          <ellipse cx="40" cy="22" rx="17" ry="14" fill={hair} />
          <rect x="19" y="28" width="8" height="32" rx="4" fill={hair} />
          <rect x="53" y="28" width="8" height="32" rx="4" fill={hair} />
        </>
      ) : isMasc ? (
        <ellipse cx="40" cy="18" rx="15" ry="9" fill={hair} />
      ) : (
        <>
          <ellipse cx="40" cy="18" rx="16" ry="10" fill={hair} />
          <rect x="23" y="22" width="5" height="16" rx="3" fill={hair} />
          <rect x="52" y="22" width="5" height="16" rx="3" fill={hair} />
        </>
      )}

      {/* ── Head ── */}
      <ellipse cx="40" cy="24" rx={isFem ? 13 : 13.5} ry="15" fill={skin} />

      {/* ── Eyes ── */}
      <ellipse cx="33.5" cy="22" rx="3.5" ry="2.8" fill="#f5f5f5" />
      <ellipse cx="46.5" cy="22" rx="3.5" ry="2.8" fill="#f5f5f5" />
      <circle cx="33.5" cy="22" r="2" fill={isFem ? "#8899ee" : "#336688"} />
      <circle cx="46.5" cy="22" r="2" fill={isFem ? "#8899ee" : "#336688"} />
      <circle cx="33.5" cy="22" r="1.1" fill="#111" />
      <circle cx="46.5" cy="22" r="1.1" fill="#111" />
      <circle cx="34.3" cy="21.2" r="0.5" fill="white" opacity="0.8" />
      <circle cx="47.3" cy="21.2" r="0.5" fill="white" opacity="0.8" />
      {isFem && (
        <>
          <path d="M30 18 Q33.5 16.5 37 18" stroke={hair} strokeWidth="1.4" fill="none" strokeLinecap="round" />
          <path d="M43 18 Q46.5 16.5 50 18" stroke={hair} strokeWidth="1.4" fill="none" strokeLinecap="round" />
        </>
      )}

      {/* ── Eyebrows ── */}
      <path d="M30.5 18.5 Q33.5 17.2 36.5 18.5" stroke="#3a2010" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <path d="M43.5 18.5 Q46.5 17.2 49.5 18.5" stroke="#3a2010" strokeWidth="1.2" fill="none" strokeLinecap="round" />

      {/* ── Nose ── */}
      <circle cx="40" cy="27" r="1.8" fill={skin} stroke="rgba(0,0,0,0.08)" strokeWidth="0.5" />

      {/* ── Mouth ── */}
      <path d={isFem ? "M36.5 31.5 Q40 34 43.5 31.5" : "M36 31 Q40 33.5 44 31"} stroke="rgba(0,0,0,0.25)" strokeWidth="1.1" fill="none" strokeLinecap="round" />

      {/* ── Neck ── */}
      <rect x="36.5" y="37" width="7" height="7" rx="3" fill={skin} />

      {/* ── Jacket / Top — main outfit color ── */}
      <rect x={isFem ? 24 : 22} y="43" width={isFem ? 32 : 36} height="40" rx="8" fill={outfit.hex} />

      {/* Jacket lapels */}
      <path d="M36 43 L40 52 L44 43" fill={outfit.accent} opacity="0.5" />

      {/* Accent stripe down center */}
      <rect x="38.5" y="55" width="3" height="22" rx="1.5" fill={outfit.accent} opacity="0.7" />

      {/* Shoulder accent pips */}
      <circle cx={isFem ? 26 : 24} cy="48" r="3" fill={outfit.accent} opacity="0.65" />
      <circle cx={isFem ? 54 : 56} cy="48" r="3" fill={outfit.accent} opacity="0.65" />

      {/* ── Arms (sleeve = outfit color) ── */}
      <rect x={isFem ? 11 : 9} y="44" width="13" height="28" rx="6" fill={outfit.hex} />
      <rect x={isFem ? 11.5 : 9.5} y="71" width="11" height="16" rx="5.5" fill={skin} />
      <rect x={isFem ? 56 : 58} y="44" width="13" height="28" rx="6" fill={outfit.hex} />
      <rect x={isFem ? 57.5 : 59.5} y="71" width="11" height="16" rx="5.5" fill={skin} />

      {/* ── Belt ── */}
      <rect x={isFem ? 24 : 22} y="82" width={isFem ? 32 : 36} height="4" rx="2" fill={outfit.accent} opacity="0.6" />

      {/* ── Pants — always dark, separate from jacket ── */}
      <rect x="25" y="85" width="13" height="38" rx="6" fill={pantsColor} />
      <rect x="42" y="85" width="13" height="38" rx="6" fill={pantsColor} />

      {/* Leg stripe accent */}
      <rect x="30.5" y="87" width="2" height="30" rx="1" fill={outfit.accent} opacity="0.25" />
      <rect x="47.5" y="87" width="2" height="30" rx="1" fill={outfit.accent} opacity="0.25" />

      {/* ── Shoes — distinct color ── */}
      <ellipse cx="31.5" cy="126" rx="10" ry="5.5" fill={shoeColor} />
      <ellipse cx="48.5" cy="126" rx="10" ry="5.5" fill={shoeColor} />
      {/* Shoe accent */}
      <ellipse cx="31.5" cy="124" rx="7" ry="3" fill={outfit.accent} opacity="0.2" />
      <ellipse cx="48.5" cy="124" rx="7" ry="3" fill={outfit.accent} opacity="0.2" />
    </svg>
  );
}

export default function AvatarSetup({ onComplete, existingType, existingTone, existingStyle, existingOutfitColor }) {
  const [avatarType, setAvatarType] = useState(existingType || "neutral");
  const [skinTone, setSkinTone] = useState(existingTone || "medium");
  const [outfitColorKey, setOutfitColorKey] = useState(existingOutfitColor || "electric-blue");
  const [previewRot, setPreviewRot] = useState(0);
  const [saving, setSaving] = useState(false);

  const handleContinue = async () => {
    setSaving(true);
    try {
      await base44.auth.updateMe({
        avatar_type: avatarType,
        skin_tone: skinTone,
        avatar_outfit_color: outfitColorKey,
        // Keep legacy fields in sync
        avatar_style: "streetwear",
      });
      onComplete({ avatarType, skinTone, avatarStyle: "streetwear", outfitColorKey });
    } catch {
      onComplete({ avatarType, skinTone, avatarStyle: "streetwear", outfitColorKey });
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] overflow-y-auto"
      style={{ background: "linear-gradient(160deg,#05050f 0%,#080818 55%,#050510 100%)" }}
    >
      <div className="min-h-full flex flex-col lg:flex-row items-start justify-center gap-0 lg:gap-8 px-4 py-6 lg:py-10 max-w-4xl mx-auto">

        {/* ── LEFT: Avatar Preview ── */}
        <div className="w-full lg:w-auto flex flex-col items-center gap-3 lg:sticky lg:top-10">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-3.5 h-3.5" style={{ color: "#9B7EFF" }} />
            <span className="text-[10px] font-black tracking-[0.25em] uppercase" style={{ color: "#9B7EFF" }}>
              Live Preview
            </span>
          </div>

          {/* Preview box */}
          <div
            className="relative flex items-center justify-center"
            style={{
              width: 180, height: 280,
              borderRadius: 20,
              background: "linear-gradient(180deg, rgba(20,10,40,0.9) 0%, rgba(5,5,20,0.95) 100%)",
              border: "1px solid rgba(155,126,255,0.25)",
              boxShadow: "0 0 60px rgba(155,126,255,0.12), inset 0 0 30px rgba(0,0,0,0.4)",
              overflow: "hidden",
            }}
          >
            {/* Floor glow */}
            <div style={{
              position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)",
              width: 90, height: 16, borderRadius: "50%",
              background: OUTFIT_COLORS.find(c => c.key === outfitColorKey)?.accent || "#00D4F0",
              opacity: 0.15, filter: "blur(8px)",
            }} />
            <AvatarPreview
              avatarType={avatarType}
              skinTone={skinTone}
              outfitColorKey={outfitColorKey}
              rotation={previewRot}
            />
          </div>

          {/* Rotate buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPreviewRot(r => r - 45)}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:bg-white/10 active:scale-90"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              <RotateCcw className="w-3.5 h-3.5 text-white/50" />
            </button>
            <span className="text-[9px] text-white/20 font-medium tracking-wider">ROTATE</span>
            <button
              onClick={() => setPreviewRot(r => r + 45)}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:bg-white/10 active:scale-90"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              <RotateCw className="w-3.5 h-3.5 text-white/50" />
            </button>
          </div>

          <p className="text-[9px] text-white/20 text-center">Preview updates instantly as you choose.</p>
        </div>

        {/* ── RIGHT: Options ── */}
        <div className="w-full lg:flex-1 flex flex-col gap-5 max-w-sm lg:max-w-none mx-auto">

          <div className="text-center lg:text-left">
            <h2 className="font-heading font-black text-2xl text-white mb-1">Your Vibe World Avatar</h2>
            <p className="text-sm text-white/40">Choose your look. This is how others see you in Upper Vibe City.</p>
          </div>

          {/* Body Type */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <UserCircle className="w-3.5 h-3.5 text-white/30" />
              <span className="text-[10px] font-black text-white/30 tracking-wider uppercase">Body Type</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {AVATAR_TYPES.map((type) => (
                <button
                  key={type.key}
                  onClick={() => setAvatarType(type.key)}
                  className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl text-left transition-all hover:brightness-110 active:scale-[0.98]"
                  style={{
                    background: avatarType === type.key ? `${type.color}18` : "rgba(255,255,255,0.04)",
                    border: avatarType === type.key ? `2px solid ${type.color}` : "1px solid rgba(255,255,255,0.08)",
                    minHeight: 52,
                  }}
                >
                  <span className="text-lg flex-shrink-0">{type.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-bold text-white block">{type.label}</span>
                  </div>
                  {avatarType === type.key && <Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: type.color }} />}
                </button>
              ))}
            </div>
          </div>

          {/* Skin Tone */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Palette className="w-3.5 h-3.5 text-white/30" />
              <span className="text-[10px] font-black text-white/30 tracking-wider uppercase">Skin Tone</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {SKIN_TONES.map((tone) => (
                <button
                  key={tone.key}
                  onClick={() => setSkinTone(tone.key)}
                  title={tone.label}
                  className="flex flex-col items-center gap-1 transition-all hover:scale-110 active:scale-95"
                >
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center"
                    style={{
                      background: tone.hex,
                      border: skinTone === tone.key ? "3px solid #fff" : "2px solid rgba(255,255,255,0.15)",
                      boxShadow: skinTone === tone.key ? `0 0 14px ${tone.hex}88` : "none",
                    }}
                  >
                    {skinTone === tone.key && <Check className="w-4 h-4" style={{ color: skinTone === "light" || skinTone === "medium-light" ? "#333" : "#fff" }} />}
                  </div>
                  <span className="text-[8px] text-white/30">{tone.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Outfit Color */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Shirt className="w-3.5 h-3.5 text-white/30" />
              <span className="text-[10px] font-black text-white/30 tracking-wider uppercase">Outfit Color</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {OUTFIT_COLORS.map((c) => (
                <button
                  key={c.key}
                  onClick={() => setOutfitColorKey(c.key)}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all hover:brightness-110 active:scale-[0.97]"
                  style={{
                    background: outfitColorKey === c.key ? `${c.accent}18` : "rgba(255,255,255,0.04)",
                    border: outfitColorKey === c.key ? `2px solid ${c.accent}` : "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <div
                    className="w-6 h-6 rounded-full flex-shrink-0"
                    style={{ background: c.hex, border: `2px solid ${c.accent}`, boxShadow: `0 0 8px ${c.accent}44` }}
                  />
                  <span className="text-[11px] font-bold text-white flex-1 min-w-0 truncate">{c.label}</span>
                  {outfitColorKey === c.key && <Check className="w-3 h-3 flex-shrink-0" style={{ color: c.accent }} />}
                </button>
              ))}
            </div>
          </div>

          {/* Continue */}
          <button
            onClick={handleContinue}
            disabled={saving}
            className="flex items-center justify-center gap-2 py-4 rounded-full font-black text-sm tracking-wider transition-all hover:brightness-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed w-full"
            style={{
              background: "linear-gradient(135deg,#9B7EFF,#A078FF)",
              color: "#fff",
              boxShadow: "0 0 30px rgba(155,126,255,0.35)",
            }}
          >
            {saving ? "Saving..." : "Enter Upper Vibe City →"}
          </button>

          <p className="text-[10px] text-white/20 text-center">
            More outfits, hairstyles &amp; accessories coming to the Vibe Shop.
          </p>
        </div>
      </div>
    </div>
  );
}