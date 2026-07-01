import React, { useEffect, useMemo, useState } from "react";
import { X, GraduationCap, Sparkles, Brain, Waves, Music4, Sun, Gem, Wallet, Wind, ChevronLeft, ChevronRight, PlayCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";

const CITY_LESSONS = [
  { title: "Daily Lesson", icon: Sun, color: "#00E5FF", copy: "Open today’s focused learning session inside the Academy classroom." },
  { title: "Learning Videos", icon: PlayCircle, color: "#B58CFF", copy: "Watch the real Upper Vibe Academy YouTube lesson playlist without leaving the city." },
  { title: "Sacred Geometry", icon: Gem, color: "#FFD36E", copy: "Connect city symbols, frequency practice, and personal alignment." },
  { title: "Frequency Education", icon: Music4, color: "#00D4F0", copy: "Learn how sound, 432 Hz rituals, and listening habits support alignment." },
  { title: "Nervous System", icon: Brain, color: "#7DEBFF", copy: "Study regulation, safety, focus, and recovery through spiritual-tech practice." },
  { title: "Wisdom Progress", icon: Wallet, color: "#EDB84A", copy: "Build daily knowledge streaks that connect lessons, symbols, and Vibe Coins." },
];

const BEACH_LESSONS = [
  { title: "Beach Reset Lesson", icon: Waves, color: "#7DEBFF", copy: "Use ocean rhythm to release tension and soften your nervous system." },
  { title: "Breath Reset Station", icon: Wind, color: "#A7F3D0", copy: "Practice slow breath, longer exhales, and gentle body awareness." },
  { title: "Ocean Wisdom", icon: Sparkles, color: "#FFD08A", copy: "Reflect with water energy, grounding prompts, and peaceful perspective shifts." },
  { title: "Emotional Reset", icon: Brain, color: "#B58CFF", copy: "Let the beach space support rest, safety, calm, and inner recovery." },
];

function toEmbedUrl(lesson) {
  const raw = lesson?.embed_url || lesson?.video_url || "";
  if (!raw) return null;
  const id = lesson.youtube_video_id || raw.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/)?.[1];
  const base = id ? `https://www.youtube.com/embed/${id}` : raw;
  return `${base}${base.includes("?") ? "&" : "?"}playsinline=1&rel=0&modestbranding=1`;
}

export default function AcademyPanel({ open, onClose, isMobile, mode = "beach", initialView = "overview" }) {
  const [view, setView] = useState(initialView);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [completed, setCompleted] = useState(false);
  const [lessons, setLessons] = useState([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const config = useMemo(() => {
    const city = mode === "city";
    return {
      city,
      title: city ? "Upper Vibe Academy" : "Vibe Retreat Academy",
      subtitle: city ? "Hologram classroom for real learning videos, daily lessons, and frequency education." : "Ocean reset lessons for breathwork, rest, grounding, and recovery.",
      intro: city ? "Enter the Academy classroom, watch the learning video playlist, or complete today’s focused lesson without leaving Upper Vibe City." : "Welcome to the beach retreat classroom: softer reset lessons for breath, emotional release, water energy, relaxation, and grounding.",
      lessons: city ? CITY_LESSONS : BEACH_LESSONS,
      bg: city ? "linear-gradient(180deg, rgba(6,8,22,0.98), rgba(10,6,28,0.98))" : "linear-gradient(180deg, rgba(9,18,24,0.98), rgba(8,16,22,0.98))",
      accent: city ? "#00E5FF" : "#7DEBFF",
      button: city ? "linear-gradient(135deg,#7C3AED,#00D4F0)" : "linear-gradient(135deg,#7DEBFF,#B58CFF)",
    };
  }, [mode]);

  useEffect(() => {
    if (!open) return;
    setView(initialView || "overview");
    if (config.city && (initialView === "videos" || initialView === "daily")) loadVideos(initialView);
  }, [open, initialView, config.city]);

  const loadVideos = async (targetView = "videos") => {
    setView(targetView);
    if (lessons.length) return;
    setLoadingVideos(true);
    const data = await base44.entities.AcademyLesson.filter({ status: "published" }, "display_order", 100);
    setLessons(data || []);
    if (targetView === "daily" && data?.length) {
      const daySeed = new Date().toLocaleDateString("en-CA").split("").reduce((n, ch) => n + ch.charCodeAt(0), 0);
      setCurrentIndex(daySeed % data.length);
    }
    setLoadingVideos(false);
  };

  if (!open) return null;

  const currentLesson = lessons[currentIndex] || null;
  const embedUrl = toEmbedUrl(currentLesson);

  const handleCompleteLesson = () => {
    setCompleted(true);
    if (config.city) window.dispatchEvent(new CustomEvent("uvcDailyAction", { detail: { action: "read_frequency_lesson" } }));
    else window.dispatchEvent(new CustomEvent("beachActivityCompleted", { detail: { type: "academy" } }));
  };

  const openLessonCard = (section) => {
    setSelectedLesson(section);
    if (config.city && section.title === "Learning Videos") loadVideos("videos");
    else if (config.city && section.title === "Daily Lesson") loadVideos("daily");
  };

  return (
    <div className="fixed inset-x-0 bottom-0 rounded-t-3xl overflow-hidden flex flex-col" style={{ zIndex: 72, height: isMobile ? "82dvh" : "74vh", background: config.bg, backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", border: `1px solid ${config.accent}30`, borderBottom: "none", pointerEvents: "auto" }}>
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `${config.accent}18`, border: `1px solid ${config.accent}38` }}><GraduationCap className="w-4 h-4" style={{ color: config.accent }} /></div>
          <div className="min-w-0"><h3 className="font-heading font-black text-white text-base leading-tight">{config.title}</h3><p className="text-[10px] text-white/35 truncate">{config.subtitle}</p></div>
        </div>
        <button onTouchStart={(e) => e.stopPropagation()} onClick={onClose} className="w-11 h-11 rounded-full flex items-center justify-center transition-all hover:bg-white/10" style={{ color: "rgba(255,255,255,0.6)", minWidth: 44, minHeight: 44, touchAction: "manipulation" }}><X className="w-5 h-5" /></button>
      </div>

      {config.city && (view === "videos" || view === "daily") ? (
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-4 p-4 overflow-y-auto">
          <div className="flex-1 min-w-0 rounded-3xl overflow-hidden" style={{ background: "rgba(0,0,0,0.45)", border: "1px solid rgba(0,229,255,0.18)" }}>
            <div className="aspect-video bg-black flex items-center justify-center">
              {loadingVideos ? <div className="w-6 h-6 border-2 border-cyan-300/20 border-t-cyan-300 rounded-full animate-spin" /> : embedUrl ? <iframe src={embedUrl} title={currentLesson?.title || "Academy Lesson"} className="w-full h-full" style={{ border: 0 }} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen /> : <p className="text-white/35 text-sm">No learning videos found yet.</p>}
            </div>
            <div className="p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: config.accent }}>{view === "daily" ? "Daily Lesson" : "Learning Video"}</p>
              <h4 className="font-heading font-black text-white text-lg mt-1 leading-tight">{currentLesson?.title || "Upper Vibe Academy"}</h4>
              {currentLesson?.description && <p className="text-xs text-white/42 mt-2 leading-relaxed">{currentLesson.description}</p>}
              <div className="flex flex-wrap items-center gap-2 mt-4">
                <button disabled={currentIndex <= 0} onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))} className="flex items-center gap-1 px-4 py-2 rounded-full font-black text-[10px] disabled:opacity-35" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", touchAction: "manipulation" }}><ChevronLeft className="w-3 h-3" /> Previous</button>
                <button disabled={currentIndex >= lessons.length - 1} onClick={() => setCurrentIndex((i) => Math.min(lessons.length - 1, i + 1))} className="flex items-center gap-1 px-4 py-2 rounded-full font-black text-[10px] disabled:opacity-35" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", touchAction: "manipulation" }}>Next <ChevronRight className="w-3 h-3" /></button>
                <button onClick={handleCompleteLesson} className="px-4 py-2 rounded-full font-black text-[10px]" style={{ background: config.button, color: "#fff", touchAction: "manipulation" }}>Mark Lesson Complete</button>
                {completed && <span className="text-[10px] font-black text-cyan-200/80">Complete ✓</span>}
              </div>
            </div>
          </div>
          <div className="lg:w-72 rounded-3xl p-3 overflow-y-auto" style={{ background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.07)", maxHeight: isMobile ? "none" : "100%" }}>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/35 mb-3">Lesson Playlist</p>
            <div className="space-y-2">
              {lessons.map((lesson, idx) => <button key={lesson.id} onClick={() => setCurrentIndex(idx)} className="w-full rounded-2xl p-3 text-left" style={{ background: idx === currentIndex ? "rgba(0,229,255,0.12)" : "rgba(255,255,255,0.035)", border: idx === currentIndex ? "1px solid rgba(0,229,255,0.28)" : "1px solid rgba(255,255,255,0.06)", touchAction: "manipulation" }}><p className="text-xs font-black text-white leading-tight line-clamp-2">{lesson.title}</p><p className="text-[9px] text-white/30 mt-1">Lesson {idx + 1}</p></button>)}
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="px-5 py-4 border-b border-white/5 flex-shrink-0" style={{ background: `radial-gradient(circle at 20% 0%, ${config.accent}1F, transparent 55%)` }}><p className="text-xs text-white/62 leading-relaxed">{config.intro}</p></div>
          <div className="flex-1 overflow-y-auto px-4 py-4"><div className="grid gap-3" style={{ gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))" }}>{config.lessons.map((section) => { const Icon = section.icon; return <button key={section.title} onClick={() => openLessonCard(section)} className="rounded-2xl p-4 text-left transition-all active:scale-[0.98]" style={{ background: selectedLesson?.title === section.title ? `${section.color}18` : "rgba(255,255,255,0.045)", border: `1px solid ${section.color}33`, boxShadow: `0 0 24px ${section.color}12`, touchAction: "manipulation" }}><div className="flex items-start gap-3"><div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${section.color}18`, border: `1px solid ${section.color}33` }}><Icon className="w-4 h-4" style={{ color: section.color }} /></div><div><h4 className="font-heading font-black text-white text-sm leading-tight">{section.title}</h4><p className="text-[11px] text-white/45 leading-relaxed mt-1.5">{section.copy}</p></div></div></button>; })}</div></div>
        </>
      )}

      <div className="flex-shrink-0 px-4 py-3 border-t border-white/5 flex flex-wrap items-center justify-center gap-2">
        {selectedLesson && !completed && view === "overview" && <button onClick={handleCompleteLesson} className="px-5 py-2 rounded-full font-black text-[10px] tracking-wider" style={{ background: config.button, color: config.city ? "#fff" : "#061018", minHeight: 44, touchAction: "manipulation" }}>Complete Lesson</button>}
        {config.city && view !== "overview" && <button onClick={() => setView("overview")} className="px-5 py-2 rounded-full font-black text-[10px] tracking-wider" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.65)", minHeight: 44, touchAction: "manipulation" }}>Back To Academy</button>}
        <button onClick={onClose} className="px-5 py-2 rounded-full font-black text-[10px] tracking-wider" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.55)", minHeight: 44, touchAction: "manipulation" }}>Return To City / Exit</button>
      </div>
    </div>
  );
}