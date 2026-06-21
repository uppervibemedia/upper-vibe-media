import React from "react";
import { SKIN_TONES } from "./AvatarSetup";

export default function SkinToneSelector({ value, onChange }) {
  return (
    <div>
      <p className="text-[10px] font-black tracking-[0.2em] uppercase mb-3" style={{ color: "rgba(255,255,255,0.35)" }}>
        Skin Tone
      </p>
      <div className="flex gap-2 flex-wrap">
        {SKIN_TONES.map((t) => (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            title={t.label}
            className="relative w-9 h-9 rounded-full transition-all active:scale-95 hover:scale-105"
            style={{
              background: t.hex,
              border: value === t.key ? "3px solid #A078FF" : "2px solid rgba(255,255,255,0.15)",
              boxShadow: value === t.key ? `0 0 10px rgba(160,120,255,0.5)` : "none",
            }}
          >
            {value === t.key && (
              <span
                className="absolute inset-0 flex items-center justify-center"
                style={{ fontSize: 14, color: "#fff", textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}
              >
                ✓
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}