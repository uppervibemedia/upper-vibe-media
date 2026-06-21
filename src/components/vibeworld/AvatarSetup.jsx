import React, { useState } from "react";
import { Sparkles, UserCircle, Palette, Shirt, Check } from "lucide-react";
import { base44 } from "@/api/base44Client";
import AvatarPreviewCanvas from "./AvatarPreviewCanvas";

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



export default function AvatarSetup({ onComplete, existingType, existingTone, existingStyle, existingOutfitColor }) {
  const [avatarType, setAvatarType] = useState(existingType || "neutral");
  const [skinTone, setSkinTone] = useState(existingTone || "medium");
  const [outfitColorKey, setOutfitColorKey] = useState(existingOutfitColor || "electric-blue");
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

          <AvatarPreviewCanvas outfitColorKey={outfitColorKey} width={200} height={300} />
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