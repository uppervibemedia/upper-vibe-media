import React, { useState } from "react";
import { X, GraduationCap, Sparkles, Brain, Waves, Music4, Sun, Gem, Wallet } from "lucide-react";

const LESSON_SECTIONS = [
  { title: "Manifestation Lessons", icon: Sparkles, color: "#B58CFF", copy: "Set clear intentions and align your daily actions with the frequency you want to live in." },
  { title: "Nervous System Reset", icon: Waves, color: "#7DEBFF", copy: "Short grounding practices for breath, calm, safety, and emotional regulation." },
  { title: "432 Hz Learning", icon: Music4, color: "#00D4F0", copy: "Explore how tuned sound, music, and listening rituals support a more centered state." },
  { title: "Daily Vibe Practice", icon: Sun, color: "#FFD08A", copy: "A simple island routine for reflection, gratitude, focus, and energetic reset." },
  { title: "Mindset / Money Energy", icon: Wallet, color: "#EDB84A", copy: "Practice abundance thinking, aligned decisions, and calm confidence around money." },
  { title: "Frequency Training", icon: Gem, color: "#00E676", copy: "Learn to notice your state, shift your environment, and choose higher-vibe inputs." },
];

export default function AcademyPanel({ open, onClose, isMobile }) {
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [completed, setCompleted] = useState(false);
  if (!open) return null;

  const handleCompleteLesson = () => {
    setCompleted(true);
    window.dispatchEvent(new CustomEvent("beachActivityCompleted", { detail: { type: "academy" } }));
  };

  return (
    <div
      className="fixed inset-x-0 bottom-0 rounded-t-3xl overflow-hidden flex flex-col"
      style={{
        zIndex: 72,
        height: isMobile ? "78dvh" : "70vh",
        background: "linear-gradient(180deg, rgba(9,18,24,0.98), rgba(8,10,20,0.98))",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border: "1px solid rgba(125,235,255,0.18)",
        borderBottom: "none",
        pointerEvents: "auto",
      }}
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(181,140,255,0.14)", border: "1px solid rgba(181,140,255,0.26)" }}>
            <GraduationCap className="w-4 h-4" style={{ color: "#B58CFF" }} />
          </div>
          <div className="min-w-0">
            <h3 className="font-heading font-black text-white text-base leading-tight">Vibe Academy Retreat</h3>
            <p className="text-[10px] text-white/35 truncate">Peaceful island lessons for mindset, music, and frequency.</p>
          </div>
        </div>
        <button onTouchStart={(e) => e.stopPropagation()} onClick={onClose} className="w-11 h-11 rounded-full flex items-center justify-center transition-all hover:bg-white/10" style={{ color: "rgba(255,255,255,0.6)", minWidth: 44, minHeight: 44, touchAction: "manipulation" }}>
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="px-5 py-4 border-b border-white/5 flex-shrink-0" style={{ background: "radial-gradient(circle at 20% 0%, rgba(125,235,255,0.12), transparent 55%)" }}>
        <p className="text-xs text-white/62 leading-relaxed">
          Welcome to the beach-side learning retreat. Choose a card to preview the focus area — full guided lessons can be added next.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="grid gap-3" style={{ gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))" }}>
          {LESSON_SECTIONS.map((section) => {
            const Icon = section.icon;
            return (
              <button key={section.title} onClick={() => setSelectedLesson(section)} className="rounded-2xl p-4 text-left transition-all active:scale-[0.98]" style={{ background: selectedLesson?.title === section.title ? `${section.color}18` : "rgba(255,255,255,0.045)", border: `1px solid ${section.color}33`, boxShadow: `0 0 24px ${section.color}12`, touchAction: "manipulation" }}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${section.color}18`, border: `1px solid ${section.color}33` }}>
                    <Icon className="w-4 h-4" style={{ color: section.color }} />
                  </div>
                  <div>
                    <h4 className="font-heading font-black text-white text-sm leading-tight">{section.title}</h4>
                    <p className="text-[11px] text-white/45 leading-relaxed mt-1.5">{section.copy}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-shrink-0 px-4 py-3 border-t border-white/5 flex flex-wrap items-center justify-center gap-2">
        {selectedLesson && !completed && (
          <button onTouchStart={(e) => e.stopPropagation()} onClick={handleCompleteLesson} className="flex items-center gap-2 px-5 py-2 rounded-full font-black text-[10px] tracking-wider transition-all hover:brightness-110 active:scale-95" style={{ background: "linear-gradient(135deg,#7DEBFF,#B58CFF)", color: "#061018", minHeight: 44, touchAction: "manipulation" }}>
            Complete Lesson
          </button>
        )}
        {completed && <span className="text-[10px] font-black text-cyan-200/80 px-2">Lesson complete ✓</span>}
        <button onTouchStart={(e) => e.stopPropagation()} onClick={onClose} className="flex items-center gap-2 px-5 py-2 rounded-full font-black text-[10px] tracking-wider transition-all hover:brightness-110 active:scale-95" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.55)", minHeight: 44, touchAction: "manipulation" }}>
          Close Retreat
        </button>
      </div>
    </div>
  );
}