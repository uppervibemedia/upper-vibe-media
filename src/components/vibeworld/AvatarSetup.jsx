import React, { useState } from "react";
import { Sparkles, Check } from "lucide-react";

import { base44 } from "@/api/base44Client";
import AvatarPreviewCanvas from "./AvatarPreviewCanvas";

// ── Vibe Suit Styles ──────────────────────────────────────────
export const VIBE_SUIT_STYLES = [
  { key: "cosmic-explorer", label: "Cosmic Explorer", emoji: "🚀", color: "#00D4F0" },
  { key: "neon-dancer",     label: "Neon Dancer",     emoji: "⚡", color: "#C43BFF" },
  { key: "vibe-guardian",   label: "Vibe Guardian",   emoji: "🛡️", color: "#9B7EFF" },
];

// ── Suit Colors ───────────────────────────────────────────────
export const OUTFIT_COLORS = [
  { key: "cosmic-blue",  label: "Cosmic Blue",   hex: "#00AADD", swatch: "#00CFFF" },
  { key: "neon-purple",  label: "Neon Purple",   hex: "#7B2FFF", swatch: "#9B5FFF" },
  { key: "shadow-black", label: "Shadow Black",  hex: "#080A0F", swatch: "#1A1C22" },
  { key: "rose-glow",    label: "Rose Glow",     hex: "#CC2288", swatch: "#FF4FC3" },
  { key: "gold-aura",    label: "Gold Aura",     hex: "#CC9900", swatch: "#FFD34D" },
];

// Legacy exports kept for backward compat (unused in UI)
export const AVATAR_TYPES = [];
export const SKIN_TONES = [];

const AVATAR_CHOICES = [
  { key: "test-mixamo-female", label: "Female", icon: "👩", color: "#C43BFF" },
  { key: "test-mixamo",        label: "Male",   icon: "👨", color: "#00D4F0" },
  { key: "current",            label: "Soldier", icon: "🪖", color: "#9B7EFF" },
];

export default function AvatarSetup({ onComplete, existingOutfitColor, existingStyle }) {
  const [outfitColorKey, setOutfitColorKey] = useState(existingOutfitColor || "cosmic-blue");
  const [vibeStyle, setVibeStyle] = useState(existingStyle || "cosmic-explorer");
  const [avatarTypeKey, setAvatarTypeKey] = useState("test-mixamo-female");
  const [saving, setSaving] = useState(false);

  const handleContinue = async () => {
    setSaving(true);
    try {
      const defaultHair = avatarTypeKey === "test-mixamo-female" ? "ponytail" : avatarTypeKey === "test-mixamo" ? "short" : "";
      await base44.auth.updateMe({
        avatar_outfit_color: outfitColorKey,
        avatar_style: vibeStyle,
        avatar_type: avatarTypeKey,
        skin_tone: "medium",
      });
      try {
        sessionStorage.setItem("uvc_test_avatar", avatarTypeKey);
        sessionStorage.setItem("uvc_hair_style", defaultHair);
      } catch {}
      onComplete({ avatarType: avatarTypeKey, skinTone: "medium", avatarStyle: vibeStyle, outfitColorKey });
    } catch {
      onComplete({ avatarType: avatarTypeKey, skinTone: "medium", avatarStyle: vibeStyle, outfitColorKey });
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
          <AvatarPreviewCanvas outfitColorKey={outfitColorKey} avatarTypeKey={avatarTypeKey} width={220} height={360} />
        </div>

        {/* Options */}
        <div className="w-full lg:flex-1 flex flex-col gap-5 max-w-sm mx-auto lg:mx-0">
          <div className="text-center lg:text-left">
            <h2 className="font-heading font-black text-2xl text-white mb-1">Choose Your Vibe Suit</h2>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
              Your futuristic identity in Upper Vibe City.
            </p>
          </div>

          {/* Avatar Choice */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.3)" }} />
              <span className="text-[10px] font-black tracking-[0.2em] uppercase" style={{ color: "rgba(255,255,255,0.3)" }}>
                Choose Avatar
              </span>
            </div>
            <div className="flex gap-2">
              {AVATAR_CHOICES.map((a) => (
                <button
                  key={a.key}
                  onClick={() => setAvatarTypeKey(a.key)}
                  className="flex-1 flex flex-col items-center gap-1.5 px-3 py-3 rounded-2xl text-center transition-all hover:brightness-110 active:scale-[0.98]"
                  style={{
                    background: avatarTypeKey === a.key ? `${a.color}18` : "rgba(255,255,255,0.04)",
                    border: avatarTypeKey === a.key ? `2px solid ${a.color}` : "1px solid rgba(255,255,255,0.08)",
                    boxShadow: avatarTypeKey === a.key ? `0 0 16px ${a.color}30` : "none",
                  }}
                >
                  <span style={{ fontSize: 20 }}>{a.icon}</span>
                  <span className="text-[11px] font-black" style={{ color: avatarTypeKey === a.key ? "#fff" : "rgba(255,255,255,0.5)" }}>{a.label}</span>
                  {avatarTypeKey === a.key && <Check className="w-3 h-3" style={{ color: a.color }} />}
                </button>
              ))}
            </div>
          </div>

          {/* Suit Color */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.3)" }} />
              <span className="text-[10px] font-black tracking-[0.2em] uppercase" style={{ color: "rgba(255,255,255,0.3)" }}>
                Suit Color
              </span>
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

          <p className="text-[10px] text-center" style={{ color: "rgba(255,255,255,0.2)" }}>
            You can change your avatar anytime in the customizer.
          </p>
        </div>

        {/* Desktop: preview on right */}
        <div className="hidden lg:flex flex-col items-center gap-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5" style={{ color: "#9B7EFF" }} />
            <span className="text-[10px] font-black tracking-[0.25em] uppercase" style={{ color: "#9B7EFF" }}>Live Preview</span>
          </div>
          <AvatarPreviewCanvas outfitColorKey={outfitColorKey} avatarTypeKey={avatarTypeKey} width={280} height={460} />
          <p className="text-[9px]" style={{ color: "rgba(255,255,255,0.2)" }}>Updates instantly as you choose.</p>
        </div>

      </div>
    </div>
  );
}