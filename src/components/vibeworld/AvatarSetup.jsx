import React, { useState } from "react";
import { Sparkles, Shirt, Check } from "lucide-react";
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
  { key: "electric-blue",  label: "Electric Blue",  hex: "#00AADD", swatch: "#00CFFF" },
  { key: "neon-purple",    label: "Neon Purple",     hex: "#7B2FFF", swatch: "#9B5FFF" },
  { key: "cosmic-black",   label: "Cosmic Black",    hex: "#080A0F", swatch: "#1A1C22" },
  { key: "white-silver",   label: "White / Silver",  hex: "#C8D4E0", swatch: "#DDE6F2" },
  { key: "pink-rose",      label: "Pink / Rose",     hex: "#CC2288", swatch: "#FF4FC3" },
  { key: "gold-yellow",    label: "Gold / Yellow",   hex: "#CC9900", swatch: "#FFD34D" },
];

export default function AvatarSetup({ onComplete, existingOutfitColor }) {
  const [outfitColorKey, setOutfitColorKey] = useState(existingOutfitColor || "electric-blue");
  const [saving, setSaving] = useState(false);

  const handleContinue = async () => {
    setSaving(true);
    try {
      await base44.auth.updateMe({
        avatar_outfit_color: outfitColorKey,
        avatar_style: "streetwear",
        avatar_type: "neutral",
        skin_tone: "medium",
      });
      onComplete({ avatarType: "neutral", skinTone: "medium", avatarStyle: "streetwear", outfitColorKey });
    } catch {
      onComplete({ avatarType: "neutral", skinTone: "medium", avatarStyle: "streetwear", outfitColorKey });
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] overflow-y-auto"
      style={{ background: "linear-gradient(160deg,#05050f 0%,#080818 55%,#050510 100%)" }}
    >
      <div className="min-h-full flex flex-col lg:flex-row items-center justify-center gap-6 lg:gap-12 px-4 py-8 lg:py-12 max-w-4xl mx-auto">

        {/* Mobile: preview on top */}
        <div className="flex flex-col items-center gap-2 lg:hidden">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-3.5 h-3.5" style={{ color: "#9B7EFF" }} />
            <span className="text-[10px] font-black tracking-[0.25em] uppercase" style={{ color: "#9B7EFF" }}>Live Preview</span>
          </div>
          <AvatarPreviewCanvas outfitColorKey={outfitColorKey} width={220} height={360} />
        </div>

        {/* Options */}
        <div className="w-full lg:flex-1 flex flex-col gap-5 max-w-sm mx-auto lg:mx-0">
          <div className="text-center lg:text-left">
            <h2 className="font-heading font-black text-2xl text-white mb-1">Your Vibe World Avatar</h2>
            <p className="text-sm text-white/40">Pick your outfit color. More customization coming soon.</p>
          </div>

          {/* Outfit Color */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Shirt className="w-3.5 h-3.5 text-white/30" />
              <span className="text-[10px] font-black text-white/30 tracking-wider uppercase">Outfit Color</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {OUTFIT_COLORS.map((c) => (
                <button
                  key={c.key}
                  onClick={() => setOutfitColorKey(c.key)}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all hover:brightness-110 active:scale-[0.98]"
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

          <button
            onClick={handleContinue}
            disabled={saving}
            className="flex items-center justify-center gap-2 py-3.5 rounded-full font-black text-sm tracking-wider transition-all hover:brightness-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed w-full"
            style={{
              background: "linear-gradient(135deg,#9B7EFF,#A078FF)",
              color: "#fff",
              boxShadow: "0 0 30px rgba(155,126,255,0.3)",
            }}
          >
            {saving ? "Saving..." : "Enter Upper Vibe City →"}
          </button>

          <p className="text-[10px] text-white/20 text-center">
            More outfits &amp; accessories coming to the Vibe Shop.
          </p>
        </div>

        {/* Desktop: preview on right */}
        <div className="hidden lg:flex flex-col items-center gap-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5" style={{ color: "#9B7EFF" }} />
            <span className="text-[10px] font-black tracking-[0.25em] uppercase" style={{ color: "#9B7EFF" }}>Live Preview</span>
          </div>
          <AvatarPreviewCanvas outfitColorKey={outfitColorKey} width={280} height={460} />
          <p className="text-[9px] text-white/20 text-center">Updates instantly as you choose.</p>
        </div>

      </div>
    </div>
  );
}