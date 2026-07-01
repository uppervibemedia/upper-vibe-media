import React, { useMemo, useState } from "react";
import { X, GraduationCap, Sparkles, Brain, Waves, Music4, Sun, Gem, Wallet, Wind } from "lucide-react";

const CITY_LESSONS = [
  { title: "Daily Lesson Station", icon: Sun, color: "#00E5FF", copy: "Start with one focused high-frequency lesson for today’s city quest." },
  { title: "Sacred Geometry Library", icon: Gem, color: "#B58CFF", copy: "Study the symbols across the city and how activation shifts your state." },
  { title: "Manifestation Lab", icon: Sparkles, color: "#FFD36E", copy: "Turn intention into clean action using visualization, identity, and repetition." },
  { title: "Frequency Education", icon: Music4, color: "#00D4F0", copy: "Learn how sound, 432 Hz rituals, and listening habits support alignment." },
  { title: "Nervous System Knowledge", icon: Brain, color: "#7DEBFF", copy: "Understand regulation, safety, focus, and recovery through spiritual-tech practice." },
  { title: "Wisdom Progress", icon: Wallet, color: "#EDB84A", copy: "Build daily knowledge streaks that connect lessons, symbols, and Vibe Coins." },
];

const BEACH_LESSONS = [
  { title: "Beach Reset Lesson", icon: Waves, color: "#7DEBFF", copy: "Use ocean rhythm to release tension and soften your nervous system." },
  { title: "Breath Reset Station", icon: Wind, color: "#A7F3D0", copy: "Practice slow breath, longer exhales, and gentle body awareness." },
  { title: "Ocean Wisdom", icon: Sparkles, color: "#FFD08A", copy: "Reflect with water energy, grounding prompts, and peaceful perspective shifts." },
  { title: "Emotional Reset", icon: Brain, color: "#B58CFF", copy: "Let the beach space support rest, safety, calm, and inner recovery." },
];

export default function AcademyPanel({ open, onClose, isMobile, mode = "beach" }) {
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [completed, setCompleted] = useState(false);
  const config = useMemo(() => {
    const city = mode === "city";
    return {
      city,
      title: city ? "Main Vibe Academy" : "Vibe Retreat Academy",
      subtitle: city ? "Spiritual-tech learning hub for frequency, wisdom, and sacred symbols." : "Ocean reset lessons for breathwork, rest, grounding, and recovery.",
      intro: city ? "Welcome to the city’s main learning hub: daily lessons, sacred geometry knowledge, manifestation, nervous system education, music/frequency study, and wisdom progress." : "Welcome to the beach retreat classroom: softer reset lessons for breath, emotional release, water energy, relaxation, and grounding.",
      link: city ? "Go deeper into reset mode at Upper Vibe Beach." : "Return to Upper Vibe City for full Vibe Academy lessons.",
      lessons: city ? CITY_LESSONS : BEACH_LESSONS,
      bg: city ? "linear-gradient(180deg, rgba(6,8,22,0.98), rgba(10,6,28,0.98))" : "linear-gradient(180deg, rgba(9,18,24,0.98), rgba(8,16,22,0.98))",
      accent: city ? "#00E5FF" : "#7DEBFF",
      button: city ? "linear-gradient(135deg,#7C3AED,#00D4F0)" : "linear-gradient(135deg,#7DEBFF,#B58CFF)",
    };
  }, [mode]);

  if (!open) return null;

  const handleCompleteLesson = () => {
    setCompleted(true);
    if (config.city) window.dispatchEvent(new CustomEvent("uvcDailyAction", { detail: { action: "read_frequency_lesson" } }));
    else window.dispatchEvent(new CustomEvent("beachActivityCompleted", { detail: { type: "academy" } }));
  };

  return (
    <div className="fixed inset-x-0 bottom-0 rounded-t-3xl overflow-hidden flex flex-col" style={{ zIndex: 72, height: isMobile ? "78dvh" : "70vh", background: config.bg, backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", border: `1px solid ${config.accent}30`, borderBottom: "none", pointerEvents: "auto" }}>
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `${config.accent}18`, border: `1px solid ${config.accent}38` }}>
            <GraduationCap className="w-4 h-4" style={{ color: config.accent }} />
          </div>
          <div className="min-w-0">
            <h3 className="font-heading font-black text-white text-base leading-tight">{config.title}</h3>
            <p className="text-[10px] text-white/35 truncate">{config.subtitle}</p>
          </div>
        </div>
        <button onTouchStart={(e) => e.stopPropagation()} onClick={onClose} className="w-11 h-11 rounded-full flex items-center justify-center transition-all hover:bg-white/10" style={{ color: "rgba(255,255,255,0.6)", minWidth: 44, minHeight: 44, touchAction: "manipulation" }}>
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="px-5 py-4 border-b border-white/5 flex-shrink-0" style={{ background: `radial-gradient(circle at 20% 0%, ${config.accent}1F, transparent 55%)` }}>
        <p className="text-xs text-white/62 leading-relaxed">{config.intro}</p>
        <p className="mt-2 text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: config.accent }}>{config.link}</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="grid gap-3" style={{ gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))" }}>
          {config.lessons.map((section) => {
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
        {selectedLesson && !completed && <button onTouchStart={(e) => e.stopPropagation()} onClick={handleCompleteLesson} className="flex items-center gap-2 px-5 py-2 rounded-full font-black text-[10px] tracking-wider transition-all hover:brightness-110 active:scale-95" style={{ background: config.button, color: config.city ? "#fff" : "#061018", minHeight: 44, touchAction: "manipulation" }}>Complete Lesson</button>}
        {completed && <span className="text-[10px] font-black text-cyan-200/80 px-2">Lesson complete ✓</span>}
        <button onTouchStart={(e) => e.stopPropagation()} onClick={onClose} className="flex items-center gap-2 px-5 py-2 rounded-full font-black text-[10px] tracking-wider transition-all hover:brightness-110 active:scale-95" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.55)", minHeight: 44, touchAction: "manipulation" }}>Close {config.city ? "Academy" : "Retreat"}</button>
      </div>
    </div>
  );
}