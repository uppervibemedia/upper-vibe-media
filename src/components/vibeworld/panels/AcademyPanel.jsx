import React, { useEffect, useMemo, useRef, useState } from "react";
import { X, GraduationCap, Sparkles, Brain, Music4, Sun, Wallet, PlayCircle, BookOpen, CheckCircle2, ArrowLeft } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { claimRewardCooldown, REWARD_SAVED_MESSAGE } from "@/lib/rewardCooldown";
import AcademyVideoPlayer from "./AcademyVideoPlayer";
import { usePlayer } from "@/context/PlayerContext";
import { resumeMyVibe, resumeUpperVibeRadio } from "@/lib/radioAudioManager";

const TOPIC_TAGS = ["Sacred Geometry", "Frequency", "Nervous System", "Manifestation", "Mindset", "Music Energy", "Confidence", "Focus", "Emotional Reset"];

const DAILY_LESSONS = [
  { title: "Calm Is Power", topic: "Nervous System", teaching: "A regulated nervous system helps you respond instead of react.", action: "Take one slow breath before your next decision." },
  { title: "Frequency Leads", topic: "Frequency", teaching: "Your mood, music, words, and attention all shape the frequency you carry into the room.", action: "Play one high-vibe song and move your body for 30 seconds." },
  { title: "Protect Your Peace", topic: "Mindset", teaching: "Peace is not passive. It is a choice to stop giving every distraction access to your energy.", action: "Name one thing you will not overthink today." },
  { title: "Symbols Are Reminders", topic: "Sacred Geometry", teaching: "Sacred geometry gives your mind a visual anchor for order, harmony, and intention.", action: "Pause at one symbol and choose one word for your next chapter." },
  { title: "Focus Builds Power", topic: "Focus", teaching: "Focused energy becomes momentum. Scattered energy becomes exhaustion.", action: "Choose one task and give it your next five minutes." },
];

function dayIndex(length) {
  const seed = new Date().toLocaleDateString("en-CA").split("").reduce((n, ch) => n + ch.charCodeAt(0), 0);
  return length ? seed % length : 0;
}

function getProgress() {
  try { return JSON.parse(localStorage.getItem("uvc_academy_progress") || "{}"); } catch { return {}; }
}

function saveProgress(progress) {
  try { localStorage.setItem("uvc_academy_progress", JSON.stringify(progress)); } catch {}
}

function toWatchUrl(lesson) {
  const raw = lesson?.video_url || lesson?.embed_url || "";
  const id = lesson?.youtube_video_id || raw.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/)?.[1];
  return id ? `https://www.youtube.com/watch?v=${id}` : raw || null;
}

function toEmbedUrl(lesson) {
  const watchUrl = toWatchUrl(lesson);
  if (!watchUrl) return null;
  const id = lesson?.youtube_video_id || watchUrl.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/|v=)([A-Za-z0-9_-]{11})/)?.[1];
  if (!id) return null;
  const origin = typeof window !== "undefined" ? encodeURIComponent(window.location.origin) : "";
  return `https://www.youtube.com/embed/${id}?playsinline=1&rel=0&modestbranding=1&enablejsapi=1${origin ? `&origin=${origin}&widget_referrer=${origin}` : ""}`;
}

function academyTitle(score) {
  if (score >= 30) return "Frequency Master";
  if (score >= 18) return "Vibe Scholar";
  if (score >= 10) return "Alignment Seeker";
  if (score >= 4) return "Energy Builder";
  return "Frequency Student";
}

export default function AcademyPanel({ open, onClose, isMobile, mode = "beach", initialView = "overview" }) {
  const [view, setView] = useState(initialView);
  const [lessons, setLessons] = useState([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [rewardMessage, setRewardMessage] = useState("");
  const [progress, setProgress] = useState(() => getProgress());
  const playerCtx = usePlayer();
  const heldGlobalAudioRef = useRef(null);

  const handleAcademyGlobalPaused = (snapshot) => {
    heldGlobalAudioRef.current = snapshot;
  };

  const resumeHeldGlobalAudio = () => {
    const snapshot = heldGlobalAudioRef.current;
    if (!snapshot) return;
    if (snapshot.radioWasPlaying) {
      if (snapshot.radioMode === "myVibeRadio") resumeMyVibe();
      if (snapshot.radioMode === "upperVibeRadio") resumeUpperVibeRadio();
    } else if (snapshot.musicWasPlaying && playerCtx?.audioRef?.current) {
      playerCtx.safePlay?.(playerCtx.audioRef.current, "academy-exit");
    }
    heldGlobalAudioRef.current = null;
  };

  const handleCloseAcademy = () => {
    onClose?.();
    setTimeout(resumeHeldGlobalAudio, 80);
  };

  const config = useMemo(() => {
    const city = mode === "city";
    return {
      city,
      title: city ? "Upper Vibe Academy" : "Vibe Retreat Academy",
      subtitle: city ? "Daily lessons, learning videos, and wisdom progress." : "Simple reset lessons for breath, calm, and emotional recovery.",
      intro: city ? "Choose one clear path. Start with today’s lesson, watch the Academy playlist, or check your wisdom progress." : "Choose one clear retreat path: reset lesson, learning videos, or wisdom progress.",
      bg: city ? "linear-gradient(180deg, rgba(6,8,22,0.98), rgba(10,6,28,0.98))" : "linear-gradient(180deg, rgba(9,18,24,0.98), rgba(8,16,22,0.98))",
      accent: city ? "#00E5FF" : "#7DEBFF",
      button: city ? "linear-gradient(135deg,#7C3AED,#00D4F0)" : "linear-gradient(135deg,#7DEBFF,#B58CFF)",
    };
  }, [mode]);

  const dailyLesson = DAILY_LESSONS[dayIndex(DAILY_LESSONS.length)];
  const currentLesson = lessons[currentIndex] || null;
  const embedUrl = toEmbedUrl(currentLesson);
  const watchUrl = toWatchUrl(currentLesson);

  useEffect(() => {
    if (!open) return;
    setView(initialView || "overview");
    setRewardMessage("");
    setProgress(getProgress());
    if (config.city && (initialView === "videos" || initialView === "daily")) loadVideos(initialView);
  }, [open, initialView, config.city]);

  const loadVideos = async (targetView = "videos") => {
    setView(targetView);
    if (lessons.length) return;
    setLoadingVideos(true);
    const data = await base44.entities.AcademyLesson.filter({ status: "published" }, "display_order", 100);
    setLessons(data || []);
    if (targetView === "daily" && data?.length) setCurrentIndex(dayIndex(data.length));
    setLoadingVideos(false);
  };

  const loadSymbolProgress = async () => {
    const user = await base44.auth.me().catch(() => null);
    if (!user?.id) return;
    const records = await base44.entities.SacredSymbolActivation.filter({ user_id: user.id }, "-activated_at", 100).catch(() => []);
    const count = new Set((records || []).map((r) => r.symbol_id)).size;
    const next = { ...getProgress(), symbolsActivated: count };
    saveProgress(next);
    setProgress(next);
  };

  const openOption = (nextView) => {
    setRewardMessage("");
    if (nextView === "daily" || nextView === "videos") loadVideos(nextView);
    else setView(nextView);
    if (nextView === "progress") loadSymbolProgress();
  };

  const completeDailyLesson = async () => {
    const user = await base44.auth.me().catch(() => null);
    const claim = await claimRewardCooldown(user?.id, "academy:daily_lesson");
    if (!claim.allowed) {
      setRewardMessage(claim.message || REWARD_SAVED_MESSAGE);
      return;
    }
    window.dispatchEvent(new CustomEvent("vibeCoinsCollected", {
      detail: { source: "daily_reward", coinIds: Array.from({ length: 10 }, (_, i) => `academy_daily_${claim.claimedAt}_${i}`) },
    }));
    window.dispatchEvent(new CustomEvent("uvcDailyAction", { detail: { action: "read_frequency_lesson" } }));
    window.dispatchEvent(new CustomEvent("uvcFrequencyScoreAction", { detail: { action: "academy_daily_lesson" } }));
    const today = new Date().toLocaleDateString("en-CA");
    const next = { ...getProgress(), lessonsCompleted: (progress.lessonsCompleted || 0) + 1, lastDailyDate: today, dailyStreak: progress.lastDailyDate === today ? (progress.dailyStreak || 1) : (progress.dailyStreak || 0) + 1 };
    saveProgress(next);
    setProgress(next);
    setRewardMessage("Daily lesson complete — +10 Vibe Coins");
  };

  const completeVideoLesson = () => {
    window.dispatchEvent(new CustomEvent("uvcDailyAction", { detail: { action: "read_frequency_lesson" } }));
    window.dispatchEvent(new CustomEvent("uvcFrequencyScoreAction", { detail: { action: "academy_learning_video", lessonId: currentLesson?.id || `video_${currentIndex}` } }));
    const key = currentLesson?.id || `video_${currentIndex}`;
    const done = new Set(progress.completedVideoIds || []);
    done.add(key);
    const next = { ...progress, completedVideoIds: [...done], lessonsCompleted: done.size };
    saveProgress(next);
    setProgress(next);
  };

  if (!open) return null;

  const options = [
    { id: "daily", title: "Daily Lesson", icon: Sun, color: "#00E5FF", copy: "One focused lesson for today with a simple action step." },
    { id: "videos", title: "Watch Learning Videos", icon: PlayCircle, color: "#B58CFF", copy: "Fullscreen Academy player with global music auto-pause." },
    { id: "progress", title: "Wisdom Progress", icon: Wallet, color: "#EDB84A", copy: "Track completed lessons, streaks, symbols, and your Academy title." },
  ];
  const completedCount = progress.lessonsCompleted || progress.completedVideoIds?.length || 0;
  const symbolsActivated = progress.symbolsActivated || 0;
  const level = academyTitle(completedCount + (progress.dailyStreak || 0) + symbolsActivated);

  return (
    <div className="fixed inset-x-0 bottom-0 rounded-t-3xl overflow-hidden flex flex-col" style={{ zIndex: 72, height: isMobile ? "82dvh" : "74vh", background: config.bg, backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", border: `1px solid ${config.accent}30`, borderBottom: "none", pointerEvents: "auto" }}>
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `${config.accent}18`, border: `1px solid ${config.accent}38` }}><GraduationCap className="w-4 h-4" style={{ color: config.accent }} /></div>
          <div className="min-w-0"><h3 className="font-heading font-black text-white text-base leading-tight">{config.title}</h3><p className="text-[10px] text-white/35 truncate">{config.subtitle}</p></div>
        </div>
        <button onTouchStart={(e) => e.stopPropagation()} onClick={handleCloseAcademy} className="w-11 h-11 rounded-full flex items-center justify-center transition-all hover:bg-white/10" style={{ color: "rgba(255,255,255,0.6)", minWidth: 44, minHeight: 44, touchAction: "manipulation" }}><X className="w-5 h-5" /></button>
      </div>

      {view === "daily" ? (
        <div className="flex-1 overflow-y-auto p-5">
          <button onClick={() => setView("overview")} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-white/45 mb-4"><ArrowLeft className="w-3 h-3" /> Back to Academy</button>
          <div className="rounded-3xl p-5" style={{ background: "rgba(255,255,255,0.045)", border: `1px solid ${config.accent}30` }}>
            <p className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: config.accent }}>Daily Lesson • {dailyLesson.topic}</p>
            <h4 className="font-heading font-black text-white text-2xl mt-2">{dailyLesson.title}</h4>
            <div className="grid md:grid-cols-2 gap-4 mt-5">
              <div className="rounded-2xl p-4" style={{ background: "rgba(0,0,0,0.24)", border: "1px solid rgba(255,255,255,0.07)" }}><p className="text-[10px] font-black text-white/35 uppercase mb-2">Teaching</p><p className="text-sm text-white/70 leading-relaxed">{dailyLesson.teaching}</p></div>
              <div className="rounded-2xl p-4" style={{ background: "rgba(0,229,255,0.06)", border: "1px solid rgba(0,229,255,0.14)" }}><p className="text-[10px] font-black text-white/35 uppercase mb-2">Action Step</p><p className="text-sm text-white/70 leading-relaxed">{dailyLesson.action}</p></div>
            </div>
            {currentLesson && <p className="text-xs text-white/38 mt-4">Related video: <span className="text-white/70">{currentLesson.title}</span></p>}
            <button onClick={completeDailyLesson} className="mt-5 w-full sm:w-auto px-6 py-3 rounded-2xl font-black text-sm tracking-wider" style={{ background: config.button, color: "#fff", minHeight: 48, touchAction: "manipulation" }}>Complete Daily Lesson</button>
            {rewardMessage && <p className="text-xs font-black mt-3" style={{ color: rewardMessage === REWARD_SAVED_MESSAGE ? "#FFD36E" : "#7DEBFF" }}>{rewardMessage}</p>}
          </div>
        </div>
      ) : view === "videos" ? (
        <AcademyVideoPlayer
          loadingVideos={loadingVideos}
          embedUrl={embedUrl}
          watchUrl={watchUrl}
          currentLesson={currentLesson}
          currentIndex={currentIndex}
          lessons={lessons}
          setCurrentIndex={setCurrentIndex}
          completeVideoLesson={completeVideoLesson}
          config={config}
          isMobile={isMobile}
          onBackToAcademy={() => setView("overview")}
          onExitAcademy={handleCloseAcademy}
          onGlobalPaused={handleAcademyGlobalPaused}
        />
      ) : view === "progress" ? (
        <div className="flex-1 overflow-y-auto p-5">
          <button onClick={() => setView("overview")} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-white/45 mb-4"><ArrowLeft className="w-3 h-3" /> Back to Academy</button>
          <div className="rounded-3xl p-5" style={{ background: "rgba(255,255,255,0.045)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <p className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: "#EDB84A" }}>Academy Level</p>
            <h4 className="font-heading font-black text-white text-2xl mt-2">{level}</h4>
            <div className="grid sm:grid-cols-3 gap-3 mt-5">
              <div className="rounded-2xl p-4" style={{ background: "rgba(0,229,255,0.06)", border: "1px solid rgba(0,229,255,0.14)" }}><BookOpen className="w-5 h-5 text-cyan-300 mb-2" /><p className="text-2xl font-black text-white">{completedCount}</p><p className="text-[10px] text-white/42 uppercase font-black">Lessons Completed</p></div>
              <div className="rounded-2xl p-4" style={{ background: "rgba(255,211,110,0.07)", border: "1px solid rgba(255,211,110,0.16)" }}><CheckCircle2 className="w-5 h-5 text-yellow-300 mb-2" /><p className="text-2xl font-black text-white">{progress.dailyStreak || 0}</p><p className="text-[10px] text-white/42 uppercase font-black">Daily Lesson Streak</p></div>
              <div className="rounded-2xl p-4" style={{ background: "rgba(181,140,255,0.08)", border: "1px solid rgba(181,140,255,0.18)" }}><Sparkles className="w-5 h-5 text-purple-300 mb-2" /><p className="text-2xl font-black text-white">{symbolsActivated}</p><p className="text-[10px] text-white/42 uppercase font-black">Symbols Activated</p></div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="px-5 py-4 border-b border-white/5 flex-shrink-0" style={{ background: `radial-gradient(circle at 20% 0%, ${config.accent}1F, transparent 55%)` }}><p className="text-xs text-white/62 leading-relaxed">{config.intro}</p></div>
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <div className="grid gap-3" style={{ gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))" }}>
              {options.map((section) => { const Icon = section.icon; return <button key={section.title} onClick={() => openOption(section.id)} className="rounded-3xl p-5 text-left transition-all active:scale-[0.98]" style={{ background: "rgba(255,255,255,0.045)", border: `1px solid ${section.color}33`, boxShadow: `0 0 24px ${section.color}12`, touchAction: "manipulation" }}><div className="flex items-start gap-4"><div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: `${section.color}18`, border: `1px solid ${section.color}33` }}><Icon className="w-5 h-5" style={{ color: section.color }} /></div><div><h4 className="font-heading font-black text-white text-base leading-tight">{section.title}</h4><p className="text-xs text-white/45 leading-relaxed mt-2">{section.copy}</p></div></div></button>; })}
            </div>
            <div className="mt-5 flex flex-wrap gap-2">{TOPIC_TAGS.map((tag) => <span key={tag} className="px-3 py-1.5 rounded-full text-[10px] font-black" style={{ background: "rgba(255,255,255,0.045)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.52)" }}>{tag}</span>)}</div>
          </div>
        </>
      )}

      <div className="flex-shrink-0 px-4 py-3 border-t border-white/5 flex flex-wrap items-center justify-center gap-2">
        {view !== "overview" && <button onClick={() => setView("overview")} className="px-5 py-2 rounded-full font-black text-[10px] tracking-wider" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.65)", minHeight: 44, touchAction: "manipulation" }}>Back To Academy</button>}
        <button onClick={handleCloseAcademy} className="px-5 py-2 rounded-full font-black text-[10px] tracking-wider" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.55)", minHeight: 44, touchAction: "manipulation" }}>Return To City / Exit</button>
      </div>
    </div>
  );
}