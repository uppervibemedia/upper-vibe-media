import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Check, Flame, TrendingUp, Target, Heart, Lock, Sparkles, ArrowLeft } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { RADIO_THEMES } from "@/components/radio/RadioThemePicker";
import { usePlayer } from "@/context/PlayerContext";
import Footer from "@/components/shared/Footer";
import {
  SectionCard, BreakdownRow, AffirmationCard, ManifestModeCTA,
  StreakCard, VibeTrendCard, FutureSelfCard, BadgesCard, VibeHistoryCard,
} from "@/components/vibecheck/ResultCards";
import VibeFrequencyRecs from "@/components/vibecheck/VibeFrequencyRecs";
import {
  getTodaysQuestions,
  calcVibeScoreFromAnswers,
  vibeCategory,
  vibeMessage,
} from "@/lib/vibeCheckQuestions";

// ── Streak helpers ────────────────────────────────────────────────────────────
function streakToScore(days) {
  if (days >= 60) return 100;
  if (days >= 30) return Math.round(80 + ((days - 30) / 30) * 20);
  if (days >= 14) return Math.round(60 + ((days - 14) / 16) * 20);
  if (days >= 7)  return Math.round(40 + ((days - 7) / 7) * 20);
  if (days >= 3)  return Math.round(25 + ((days - 3) / 4) * 15);
  return Math.round(15 + ((Math.max(days, 1) - 1) * 5));
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayDateStr() {
  const y = new Date(); y.setDate(y.getDate() - 1);
  return y.toISOString().slice(0, 10);
}

function calcLongestStreak(dates) {
  if (!dates.length) return 0;
  let longest = 1, current = 1;
  const sorted = [...dates].sort();
  for (let i = 1; i < sorted.length; i++) {
    const diff = (new Date(sorted[i]) - new Date(sorted[i - 1])) / 86400000;
    if (diff === 1) { current++; longest = Math.max(longest, current); }
    else current = 1;
  }
  return longest;
}

function streakLabel(days) {
  if (days <= 1)  return "Day 1 — Vibe Starter 🔥";
  if (days < 7)   return `Day ${days} — Building Consistency`;
  if (days < 14)  return `${days}-Day Streak — Vibe Builder ⚡`;
  if (days < 30)  return `${days}-Day Streak — Vibe Locked In 💎`;
  if (days < 60)  return `${days}-Day Streak — Vibe Master 👑`;
  return `${days}-Day Streak — Vibe Legend ⭐`;
}

export default function VibeCheck() {
  const { user, isPlus, isAdmin } = useAuth();
  const isPlusUser = isPlus || isAdmin;
  const { accentId } = useTheme();
  const radioTheme = RADIO_THEMES[accentId] || RADIO_THEMES.cyan;
  const rtPrimary  = radioTheme.vars["--rt-primary"];
  const rtAmbient1 = radioTheme.vars["--rt-ambient1"];
  const rtAmbient2 = radioTheme.vars["--rt-ambient2"];

  // Player context for music recs
  const playerCtx = usePlayer();
  const currentTrack = playerCtx?.currentTrack;
  const isPlaying    = playerCtx?.isPlaying;
  const handlePlay   = (track) => playerCtx?.playTrack(track);

  // ── Assessment state ──────────────────────────────────────────────────────
  const questions    = useMemo(() => getTodaysQuestions(), []);
  const [qIndex, setQIndex]   = useState(0);      // current question index
  const [answers, setAnswers] = useState([]);      // [{ id, score }]
  const [phase, setPhase]     = useState("check"); // "check" | "result"
  const [saving, setSaving]   = useState(false);

  // ── Historical data ───────────────────────────────────────────────────────
  const [todayCheckIn, setTodayCheckIn]         = useState(null);
  const [allCheckIns, setAllCheckIns]           = useState([]);
  const [streak, setStreak]                     = useState(1);
  const [longestStreak, setLongestStreak]       = useState(1);
  const [yesterdayCompleted, setYesterdayCompleted] = useState(false);
  const [loading, setLoading]                   = useState(true);

  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [waitlistDone, setWaitlistDone]   = useState(false);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    setWaitlistEmail(user.email || "");
    const load = async () => {
      try {
        const all = await base44.entities.VibeCheckIn.filter({ user_id: user.id }, "-check_in_date", 365);
        setAllCheckIns(all);

        const today = all.find((c) => c.check_in_date === todayStr());
        if (today) {
          setTodayCheckIn(today);
          setPhase("result");
        }

        const yest = all.find((c) => c.check_in_date === yesterdayDateStr());
        setYesterdayCompleted(!!yest);

        const dates = [...new Set(all.map((c) => c.check_in_date))].sort().reverse();
        let s = 0;
        let expected = today ? todayStr() : yesterdayDateStr();
        for (const d of dates) {
          if (d === expected) { s++; const p = new Date(expected); p.setDate(p.getDate() - 1); expected = p.toISOString().slice(0, 10); }
          else if (d < expected) break;
        }
        setStreak(Math.max(s, today ? 1 : 0));
        setLongestStreak(calcLongestStreak(dates));
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    load();
  }, [user]);

  // ── Derived score values (used in result screen) ──────────────────────────
  const streakScore = streakToScore(streak);
  const vibeScore = todayCheckIn?.vibe_score ?? calcVibeScoreFromAnswers(answers, streakScore, yesterdayCompleted);
  const cat = vibeCategory(vibeScore);
  const msg = vibeMessage(vibeScore);

  // Change from yesterday
  const yesterdayCheckIn = allCheckIns.find((c) => c.check_in_date === yesterdayDateStr());
  const scoreChange = yesterdayCheckIn?.vibe_score != null
    ? vibeScore - yesterdayCheckIn.vibe_score
    : null;

  // Weekly average
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
  const weekScores = allCheckIns
    .filter((c) => c.check_in_date >= weekAgo.toISOString().slice(0, 10) && c.vibe_score != null)
    .map((c) => c.vibe_score);
  const weekAvg = weekScores.length >= 3
    ? Math.round(weekScores.reduce((a, b) => a + b, 0) / weekScores.length)
    : null;

  // ── Answer a question ─────────────────────────────────────────────────────
  const handleAnswer = (optionScore) => {
    const q = questions[qIndex];
    const newAnswers = [...answers.filter((a) => a.id !== q.id), { id: q.id, score: optionScore }];
    setAnswers(newAnswers);

    if (qIndex < questions.length - 1) {
      setTimeout(() => setQIndex(qIndex + 1), 220);
    } else {
      // All questions answered — save
      submitCheckIn(newAnswers);
    }
  };

  const handleBack = () => {
    if (qIndex > 0) setQIndex(qIndex - 1);
  };

  const submitCheckIn = async (finalAnswers) => {
    if (!user || saving) return;
    setSaving(true);
    const ss = streakToScore(streak);
    const score = calcVibeScoreFromAnswers(finalAnswers, ss, yesterdayCompleted);
    const newStreak = streak + 1;
    // Derive overall mood from score
    const moodId = score <= 34 ? "low_energy" : score <= 59 ? "neutral" : score <= 79 ? "intentional" : "high_vibe";
    try {
      const record = await base44.entities.VibeCheckIn.create({
        user_id: user.id,
        user_email: user.email,
        check_in_date: todayStr(),
        mood: moodId,
        mood_score: score,
        streak_days: newStreak,
        vibe_score: score,
      });
      setTodayCheckIn(record);
      setAllCheckIns((prev) => [record, ...prev]);
      setStreak(newStreak);
      setLongestStreak((prev) => Math.max(prev, newStreak));
      base44.analytics.track({ eventName: "vibe_check_submitted", properties: { vibe_score: score, mood: moodId } });
      setPhase("result");
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const handleWaitlist = async () => {
    if (!waitlistEmail.trim()) return;
    try {
      await base44.entities.ContactMessage.create({
        name: user?.full_name || "Vibe Check User",
        email: waitlistEmail.trim(),
        message: "Manifest Mode Waitlist",
        type: "newsletter",
      });
      base44.analytics.track({ eventName: "manifest_mode_waitlist_joined" });
      setWaitlistDone(true);
    } catch (e) { console.error(e); }
  };

  // ── Unauthenticated preview ───────────────────────────────────────────────
  if (!loading && !user) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: "hsl(240 50% 2%)" }}>
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full opacity-[0.07] blur-[130px]"
            style={{ background: rtAmbient1 }} />
          <div className="absolute top-32 right-0 w-[300px] h-[300px] rounded-full opacity-[0.05] blur-[100px]"
            style={{ background: "#9B7EFF" }} />
          <div className="absolute bottom-0 left-0 w-[250px] h-[250px] rounded-full opacity-[0.04] blur-[100px]"
            style={{ background: "#D4A843" }} />
        </div>

        <div className="relative z-10 flex-1 max-w-lg mx-auto w-full px-5 pb-24">
          <div className="pt-16 pb-8 text-center">
            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-5"
                style={{ background: `rgba(${rtPrimary},0.08)`, border: `1px solid rgba(${rtPrimary},0.25)` }}>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: `rgb(${rtPrimary})` }} />
                <span className="text-[9px] font-black tracking-[0.3em] uppercase" style={{ color: `rgb(${rtPrimary})` }}>Free Feature</span>
              </div>
              <h1 className="font-heading font-black text-3xl md:text-4xl text-white mb-3 leading-tight">
                Check your vibe.<br />Build your streak.<br />Track your growth.
              </h1>
              <p className="text-white/40 text-sm max-w-xs mx-auto leading-relaxed">
                A daily ritual to measure your energy, focus, and alignment — then reveal your Vibe Score.
              </p>
            </motion.div>
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="relative mb-5 rounded-3xl p-6 text-center overflow-hidden"
            style={{ background: "rgba(8,8,24,0.85)", border: `1px solid rgba(${rtPrimary},0.2)`, backdropFilter: "blur(20px)" }}>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full blur-[50px] pointer-events-none"
              style={{ background: `rgba(${rtPrimary},0.18)` }} />
            <p className="text-[10px] font-black tracking-[0.3em] uppercase mb-4 relative z-10"
              style={{ color: `rgba(${rtPrimary},0.7)` }}>Daily Vibe Score</p>
            <div className="relative inline-flex items-center justify-center mb-4" style={{ width: 144, height: 144 }}>
              <svg width="144" height="144" style={{ transform: "rotate(-90deg)" }}>
                <circle cx="72" cy="72" r="56" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
                <circle cx="72" cy="72" r="56" fill="none" stroke={`rgb(${rtPrimary})`} strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 56}`}
                  strokeDashoffset={`${2 * Math.PI * 56 * (1 - 0.75)}`}
                  style={{ filter: `drop-shadow(0 0 10px rgb(${rtPrimary}))`, opacity: 0.8 }} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-heading font-black text-4xl text-white leading-none" style={{ filter: "blur(4px)", opacity: 0.5 }}>??</span>
                <span className="text-[9px] font-black text-white/30 tracking-widest uppercase mt-0.5">VIBE SCORE</span>
              </div>
            </div>
            <p className="text-white/40 text-xs relative z-10 max-w-[220px] mx-auto leading-relaxed">
              Answer 8 daily questions — your score is revealed at the end.
            </p>
            <div className="absolute inset-0 rounded-3xl pointer-events-none"
              style={{ background: "linear-gradient(180deg,transparent 40%,rgba(8,8,24,0.4) 100%)" }} />
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="grid grid-cols-2 gap-3 mb-5">
            {[
              { icon: Flame,      color: "#FB923C", label: "Vibe Streak",     desc: "Build levels like Vibe Starter, Builder & Vibe Master." },
              { icon: TrendingUp, color: `rgb(${rtPrimary})`, label: "Score History", desc: "Track progress over time and see your weekly average." },
              { icon: Target,     color: "#9B7EFF", label: "8 Questions",     desc: "Core + rotating questions for consistent daily tracking." },
              { icon: Heart,      color: "#D4A843", label: "Music Recs",      desc: "Get song recommendations matched to your vibe." },
            ].map(({ icon: Icon, color, label, desc }) => (
              <div key={label} className="rounded-2xl p-4"
                style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-2.5"
                  style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
                  <Icon className="w-4 h-4" style={{ color }} />
                </div>
                <p className="text-xs font-black text-white mb-1">{label}</p>
                <p className="text-[10px] text-white/35 leading-relaxed">{desc}</p>
              </div>
            ))}
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="rounded-2xl p-4 mb-7 flex items-start gap-3"
            style={{ background: "linear-gradient(135deg,rgba(124,58,237,0.1),rgba(155,126,255,0.06))", border: "1px solid rgba(155,126,255,0.2)" }}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(155,126,255,0.12)", border: "1px solid rgba(155,126,255,0.25)" }}>
              <Sparkles className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-xs font-black text-white">Manifest Mode</p>
                <span className="text-[8px] font-black px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(155,126,255,0.15)", color: "#c4aaff" }}>COMING SOON</span>
              </div>
              <p className="text-[10px] text-white/35 leading-relaxed">Get early access to the full Daily Shift system when Manifest Mode launches.</p>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="text-center">
            <button onClick={() => base44.auth.redirectToLogin()}
              className="w-full py-4 rounded-2xl font-black text-sm tracking-wider transition-all hover:brightness-110 mb-3"
              style={{ background: `linear-gradient(135deg,rgba(${rtPrimary},0.85),rgb(${rtPrimary}))`, color: "#000", boxShadow: `0 0 30px rgba(${rtPrimary},0.25)` }}>
              Get Started Free
            </button>
            <p className="text-white/25 text-xs">Takes less than 2 minutes.</p>
          </motion.div>
        </div>
        <Footer />
      </div>
    );
  }

  // ── Current question ──────────────────────────────────────────────────────
  const currentQ   = questions[qIndex];
  const totalQ     = questions.length;
  const progressPct = Math.round(((qIndex) / totalQ) * 100);
  const selectedScore = answers.find((a) => a.id === currentQ?.id)?.score;

  return (
    <div className="min-h-screen flex flex-col" style={{ WebkitOverflowScrolling: "touch" }}>
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full opacity-[0.05] blur-[120px]"
          style={{ background: rtAmbient1 }} />
        <div className="absolute bottom-48 right-0 w-[260px] h-[260px] rounded-full opacity-[0.03] blur-[100px]"
          style={{ background: rtAmbient2 }} />
      </div>

      <div className="relative z-10 flex-1 max-w-lg mx-auto w-full px-5 pb-24">
        {/* Header */}
        <div className="pt-20 pb-6 text-center">
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4"
              style={{ background: `rgba(${rtPrimary},0.08)`, border: `1px solid rgba(${rtPrimary},0.22)` }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: `rgb(${rtPrimary})` }} />
              <span className="text-[9px] font-black tracking-[0.3em] uppercase" style={{ color: `rgb(${rtPrimary})` }}>Daily</span>
            </div>
            <h1 className="font-heading font-black text-4xl md:text-5xl text-white mb-2">Vibe Check</h1>
            <p className="text-white/40 text-sm">
              {phase === "check" ? "Answer honestly. Your score is revealed at the end." : "Today's results"}
            </p>
          </motion.div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-6 h-6 rounded-full animate-spin"
              style={{ border: `2px solid rgba(${rtPrimary},0.2)`, borderTopColor: `rgb(${rtPrimary})` }} />
          </div>
        ) : (
          <AnimatePresence mode="wait">

            {/* ── ASSESSMENT PHASE ── */}
            {phase === "check" && currentQ && (
              <motion.div key={`q-${qIndex}`}
                initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.22 }}>
                <SectionCard>
                  {/* Progress header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {qIndex > 0 && (
                        <button onClick={handleBack}
                          className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:opacity-70"
                          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)" }}>
                          <ArrowLeft className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <span className="text-xs font-black tracking-widest uppercase" style={{ color: `rgba(${rtPrimary},0.7)` }}>
                        Question {qIndex + 1} of {totalQ}
                      </span>
                    </div>
                    <span className="text-xs font-black" style={{ color: `rgba(${rtPrimary},0.6)` }}>
                      {progressPct}%
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="h-1 rounded-full mb-5 overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <motion.div className="h-full rounded-full"
                      animate={{ width: `${progressPct}%` }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                      style={{ background: `linear-gradient(90deg,rgba(${rtPrimary},0.5),rgb(${rtPrimary}))` }} />
                  </div>

                  {/* Question */}
                  <div className="flex items-start gap-3 mb-5">
                    <span className="text-2xl flex-shrink-0 mt-0.5">{currentQ.emoji}</span>
                    <h2 className="font-heading font-black text-white text-lg leading-snug">{currentQ.question}</h2>
                  </div>

                  {/* Answer options */}
                  <div className="space-y-2.5">
                    {currentQ.options.map((opt, i) => {
                      const isSelected = selectedScore === opt.score;
                      return (
                        <motion.button key={i}
                          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.04 }}
                          onClick={() => handleAnswer(opt.score)}
                          disabled={saving}
                          className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all text-left"
                          style={{
                            background: isSelected ? `rgba(${rtPrimary},0.1)` : "rgba(255,255,255,0.03)",
                            border: `1px solid ${isSelected ? `rgba(${rtPrimary},0.4)` : "rgba(255,255,255,0.07)"}`,
                            boxShadow: isSelected ? `0 0 20px rgba(${rtPrimary},0.1)` : "none",
                          }}>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white/85">{opt.label}</p>
                          </div>
                          {isSelected && (
                            <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                              style={{ background: `rgb(${rtPrimary})` }}>
                              <Check className="w-3 h-3 text-black" />
                            </div>
                          )}
                        </motion.button>
                      );
                    })}
                  </div>

                  {/* Last question saving indicator */}
                  {saving && (
                    <div className="mt-5 flex items-center justify-center gap-2 text-xs text-white/40">
                      <div className="w-4 h-4 rounded-full animate-spin" style={{ border: `2px solid rgba(${rtPrimary},0.3)`, borderTopColor: `rgb(${rtPrimary})` }} />
                      Calculating your vibe…
                    </div>
                  )}
                </SectionCard>
              </motion.div>
            )}

            {/* ── RESULT PHASE ── */}
            {phase === "result" && (
              <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">

                {/* ── Score Reveal Card ── */}
                <SectionCard centered>
                  <p className="text-[10px] font-black tracking-[0.3em] uppercase text-white/40 mb-4">Today's Vibe Score</p>

                  {/* Score ring */}
                  <ScoreMeter score={vibeScore} color={cat.color} />

                  {/* Category label */}
                  <div className="flex items-center justify-center gap-2 mt-4 mb-2">
                    <span className="text-2xl">{cat.emoji}</span>
                    <p className="font-heading font-black text-xl" style={{ color: cat.color }}>{cat.label}</p>
                  </div>

                  {/* Personalized message */}
                  <p className="text-white/55 text-sm leading-relaxed max-w-xs mx-auto">{msg}</p>

                  {/* Change from yesterday + weekly avg */}
                  <div className="flex items-center justify-center gap-5 mt-5">
                    {scoreChange !== null && (
                      <div className="text-center">
                        <p className="font-heading font-black text-lg"
                          style={{ color: scoreChange >= 0 ? "#4ADE80" : "#F87171" }}>
                          {scoreChange >= 0 ? "+" : ""}{scoreChange}
                        </p>
                        <p className="text-[10px] text-white/30">vs Yesterday</p>
                      </div>
                    )}
                    {weekAvg !== null && (
                      <div className="text-center">
                        <p className="font-heading font-black text-lg" style={{ color: "rgba(212,168,67,0.9)" }}>{weekAvg}</p>
                        <p className="text-[10px] text-white/30">7-Day Avg</p>
                      </div>
                    )}
                    <div className="text-center">
                      <p className="font-heading font-black text-lg text-yellow-400">{streak}</p>
                      <p className="text-[10px] text-white/30">Day Streak 🔥</p>
                    </div>
                  </div>
                </SectionCard>

                {/* ── Music Recommendations ── */}
                <VibeFrequencyRecs
                  moodTag={cat.moodTag}
                  rtPrimary={rtPrimary}
                  currentTrack={currentTrack}
                  isPlaying={isPlaying}
                  onPlay={handlePlay}
                />

                {/* ── Vibe Progress (free) ── */}
                <VibeTrendCard allCheckIns={allCheckIns} todayScore={vibeScore} rtPrimary={rtPrimary} isPlus={isPlusUser} />

                {/* ── Daily Streak ── */}
                <StreakCard streak={streak} />

                {/* ── Future Self Progress (Plus) ── */}
                <FutureSelfCard allCheckIns={allCheckIns} rtPrimary={rtPrimary} isPlus={isPlusUser} />

                {/* ── Achievement Badges (Plus) ── */}
                <BadgesCard allCheckIns={allCheckIns} streak={streak} longestStreak={longestStreak} isPlus={isPlusUser} rtPrimary={rtPrimary} />

                {/* ── Vibe History (Plus) ── */}
                <VibeHistoryCard allCheckIns={allCheckIns} streak={streak} longestStreak={longestStreak} rtPrimary={rtPrimary} isPlus={isPlusUser} />

                {/* ── Affirmation ── */}
                <AffirmationCard rtPrimary={rtPrimary} />

                {/* ── Manifest Mode CTA ── */}
                <ManifestModeCTA
                  rtPrimary={rtPrimary}
                  email={waitlistEmail}
                  setEmail={setWaitlistEmail}
                  onJoin={handleWaitlist}
                  done={waitlistDone}
                  userEmail={user?.email}
                />

                <p className="text-center text-white/20 text-xs pb-4">Come back tomorrow to keep your streak going. 🔥</p>
              </motion.div>
            )}

          </AnimatePresence>
        )}
      </div>
      <Footer />
    </div>
  );
}

// ── Score Meter ───────────────────────────────────────────────────────────────
function ScoreMeter({ score, color }) {
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: 144, height: 144 }}>
      <svg width="144" height="144" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="72" cy="72" r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
        <motion.circle cx="72" cy="72" r={radius} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - progress }}
          transition={{ duration: 1.4, ease: "easeOut" }}
          style={{ filter: `drop-shadow(0 0 8px ${color})` }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span className="font-heading font-black text-4xl text-white leading-none"
          initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.8, duration: 0.4 }}>
          {score}
        </motion.span>
        <span className="text-[9px] font-black text-white/30 tracking-widest uppercase mt-0.5">VIBE SCORE</span>
      </div>
    </div>
  );
}