import React, { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, User } from "lucide-react";
import { base44 } from "@/api/base44Client";

const AVATARS = [
  { key: "male", label: "Male Avatar", emoji: "🧑", color: "#0080B8" },
  { key: "female", label: "Female Avatar", emoji: "👩", color: "#A078FF" },
];

export default function AvatarSetup({ onComplete }) {
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleContinue = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await base44.auth.updateMe({ world_avatar: selected });
      onComplete(selected);
    } catch (err) {
      // Still proceed even if save fails
      onComplete(selected);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center px-5"
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
        <motion.div
          className="absolute bottom-[-120px] right-[5%] w-[480px] h-[480px] rounded-full blur-[130px]"
          style={{ background: "radial-gradient(circle,#00A0DC,transparent 70%)", opacity: 0.1 }}
          animate={{ scale: [1, 1.2, 1], opacity: [0.07, 0.13, 0.07] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md flex flex-col items-center text-center gap-5"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full"
          style={{ background: "rgba(155,126,255,0.1)", border: "1px solid rgba(155,126,255,0.25)" }}>
          <Sparkles className="w-3 h-3" style={{ color: "#9B7EFF" }} />
          <span className="text-[10px] font-black tracking-[0.25em] uppercase" style={{ color: "#9B7EFF" }}>
            Step 2 of 4
          </span>
        </div>

        <div>
          <h2 className="font-heading font-black text-2xl md:text-3xl text-white mb-3">
            Choose Your Avatar
          </h2>
          <p className="text-sm text-white/45 leading-relaxed max-w-sm mx-auto">
            Select an avatar for Upper Vibe City. You can change this later.
          </p>
        </div>

        {/* Avatar options */}
        <div className="w-full max-w-xs flex flex-col gap-3">
          {AVATARS.map((avatar) => (
            <button
              key={avatar.key}
              onClick={() => setSelected(avatar.key)}
              className="flex items-center gap-4 px-5 py-4 rounded-2xl text-left transition-all hover:brightness-110 active:scale-[0.98]"
              style={{
                background: selected === avatar.key
                  ? `rgba(${avatar.key === "male" ? "0,128,184" : "160,120,255"},0.12)`
                  : "rgba(255,255,255,0.04)",
                border: selected === avatar.key
                  ? `2px solid ${avatar.color}`
                  : "1px solid rgba(255,255,255,0.08)",
                minHeight: 70,
              }}
            >
              {/* Avatar preview circle */}
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  background: `rgba(${avatar.key === "male" ? "0,128,184" : "160,120,255"},0.15)`,
                  border: `1px solid ${avatar.color}`,
                }}
              >
                {avatar.key === "male" ? (
                  <User className="w-6 h-6" style={{ color: "#0080B8" }} />
                ) : (
                  <User className="w-6 h-6" style={{ color: "#A078FF" }} />
                )}
              </div>
              <div className="flex-1 min-w-0 flex flex-col items-start">
                <span className="text-sm font-bold text-white">{avatar.label}</span>
                <span className="text-[11px] text-white/25">
                  {avatar.emoji} Default style
                </span>
              </div>
              {selected === avatar.key && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: avatar.color }}
                >
                  <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </motion.div>
              )}
            </button>
          ))}
        </div>

        {/* Continue button */}
        <button
          onClick={handleContinue}
          disabled={!selected || saving}
          className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-full font-black text-sm tracking-wider transition-all hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: "linear-gradient(135deg,#9B7EFF,#A078FF)",
            color: "#fff",
            boxShadow: "0 0 30px rgba(155,126,255,0.35)",
            minHeight: 50,
          }}
        >
          {saving ? "Saving..." : "Continue"}
        </button>

        <p className="text-[10px] text-white/20 max-w-xs">
          You can customize your avatar more later. For now, choose a base style.
        </p>
      </motion.div>
    </div>
  );
}