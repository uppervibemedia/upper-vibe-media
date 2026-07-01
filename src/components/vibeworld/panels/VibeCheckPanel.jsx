import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, TrendingUp, TrendingDown, Zap, BarChart3, ChevronLeft, Activity, ArrowLeft, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import {
  getTodaysQuestions,
  calcVibeScoreFromAnswers,
  vibeCategory,
  vibeMessage,
  CORE_QUESTIONS,
} from "@/lib/vibeCheckQuestions";

const CATEGORY_LABELS = {
  safety: "Safety", clarity: "Clarity", consistency: "Consistency",
  gratitude: "Gratitude", rest: "Rest", action: "Action",
};

// ── Score Meter — extracted outside to prevent re-creation on every render ──
function ScoreMeter({ value, color, size = 144 }) {
  const r = size * 0.39;
  const circ = 2 * Math.PI * r;
  const prog = Math.max(0, Math.min(100, value)) / 100 * circ;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
        <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ - prog }}
          transition={{ duration: 1.4, ease: "easeOut" }}
          style={{ filter: `drop-shadow(0 0 8px ${color})` }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span className="font-heading font-black text-3xl text-white leading-none"
          initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6, duration: 0.4 }}>{value}</motion.span>
        <span className="text-[8px] font-black text-white/25 tracking-widest uppercase mt-0.5">VIBE SCORE</span>
      </div>
    </div>
  );
}

function computeCategories(mood, moodScore) {
  const base = moodScore || 50;
  const variation = (m) => Math.max(5, Math.min(95, base + (Math.sin(m * 2.3) * 15) + (Math.cos(m * 1.7) * 10)));
  return {
    safety: Math.round(variation(1)), clarity: Math.round(variation(2)),
    consistency: Math.round(variation(3)), gratitude: Math.round(variation(4)),
    rest: Math.round(variation(5)), action: Math.round(variation(6)),
  };
}

const STATUS_LEVELS = [
  { min: 0, label: "Needs Reset", color: "#F87171" },
  { min: 30, label: "Rebuilding", color: "#FB923C" },
  { min: 50, label: "Steady", color: "#FBBF24" },
  { min: 70, label: "Locked In", color: "#4ADE80" },
  { min: 85, label: "Peak Vibe", color: "#00E5FF" },
];

function getStatus(score) {
  for (let i = STATUS_LEVELS.length - 1; i >= 0; i--) {
    if (score >= STATUS_LEVELS[i].min) return STATUS_LEVELS[i];
  }
  return STATUS_LEVELS[0];
}

function todayStr() { return new Date().toISOString().slice(0, 10); }
function yesterdayDateStr() { const y = new Date(); y.setDate(y.getDate() - 1); return y.toISOString().slice(0, 10); }

function streakToScore(days) {
  if (days >= 60) return 100;
  if (days >= 30) return Math.round(80 + ((days - 30) / 30) * 20);
  if (days >= 14) return Math.round(60 + ((days - 14) / 16) * 20);
  if (days >= 7)  return Math.round(40 + ((days - 7) / 7) * 20);
  if (days >= 3)  return Math.round(25 + ((days - 3) / 4) * 15);
  return Math.round(15 + ((Math.max(days, 1) - 1) * 5));
}

function calcStreak(dates, todayAlready) {
  const sorted = [...new Set(dates)].sort().reverse();
  let expected = todayAlready ? todayStr() : yesterdayDateStr();
  let s = 0;
  for (const d of sorted) {
    if (d === expected) { s++; const p = new Date(expected); p.setDate(p.getDate() - 1); expected = p.toISOString().slice(0, 10); }
    else if (d < expected) break;
  }
  return Math.max(s, todayAlready ? 1 : 0);
}

export default function VibeCheckPanel({ open, onClose, isMobile }) {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Phase: "view" | "assessment" | "result" | "fullReport"
  const [phase, setPhase] = useState("view");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [fullReport, setFullReport] = useState(false);

  // Assessment state
  const questions = useMemo(() => getTodaysQuestions(), []);
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [saving, setSaving] = useState(false);

  // Result state
  const [resultScore, setResultScore] = useState(null);
  const [resultStreak, setResultStreak] = useState(0);

  // Stable refs to avoid dependency churn
  const userRef = useRef(user);
  userRef.current = user;
  const fetchDataRef = useRef(null);
  const prevOpenRef = useRef(false);

  const fetchData = useCallback(async () => {
    const currentUser = userRef.current;
    if (!currentUser) return;
    setLoading(true);
    try {
      const all = await base44.entities.VibeCheckIn.filter({ user_id: currentUser.id }, "-check_in_date", 365);
      const latest = all.find((c) => c.check_in_date === todayStr());
      const yesterday = all.find((c) => c.check_in_date === yesterdayDateStr());
      const dates = [...new Set(all.map((c) => c.check_in_date))];
      const streak = calcStreak(dates, !!latest);

      const categories = latest
        ? computeCategories(latest.mood, latest.mood_score)
        : computeCategories("neutral", 50);

      setData({
        score: latest?.vibe_score || latest?.mood_score || 50,
        status: getStatus(latest?.vibe_score || latest?.mood_score || 50),
        streak,
        yesterdayScore: yesterday?.vibe_score || yesterday?.mood_score || null,
        categories,
        mood: latest?.mood || "neutral",
        intention: latest?.intention || "",
        hasTodayCheckIn: !!latest,
      });
      setHistory(all.slice(0, 14).reverse());
    } catch (e) {
      console.error("[VibeCheckPanel] fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Keep a stable ref for fetchData
  fetchDataRef.current = fetchData;

  // Reset state only when the panel actually opens (not on every dependency change)
  useEffect(() => {
    if (!open) {
      prevOpenRef.current = false;
      return;
    }
    // Only reset when transitioning from closed → open
    if (prevOpenRef.current) return;
    prevOpenRef.current = true;

    if (!user) { setLoading(false); return; }
    setPhase("view");
    setQIndex(0);
    setAnswers([]);
    setResultScore(null);
    setSaving(false);
    setSubmitError(null);
    fetchData();
  }, [open, user]);

  // Re-fetch when returning to view from result/report — use stable ref
  useEffect(() => {
    if (open && phase === "view") fetchDataRef.current?.();
  }, [open, phase]);

  const hapticTap = () => { try { navigator?.vibrate?.(10); } catch {} };

  const handleAnswer = (optionScore) => {
    const q = questions[qIndex];
    const newAnswers = [...answers.filter((a) => a.id !== q.id), { id: q.id, score: optionScore }];
    setAnswers(newAnswers);

    if (qIndex < questions.length - 1) {
      setTimeout(() => setQIndex(qIndex + 1), 200);
    } else {
      submitCheckIn(newAnswers);
    }
  };

  const handleBack = () => { if (qIndex > 0) setQIndex(qIndex - 1); };

  const [submitError, setSubmitError] = useState(null);

  const submitCheckIn = async (finalAnswers) => {
    if (saving) return;
    setSaving(true);
    setSubmitError(null);
    // Calculate score immediately — always show result even if save fails
    const currentStreak = data?.streak ?? 0;
    const ss = streakToScore(currentStreak);
    const score = calcVibeScoreFromAnswers(finalAnswers, ss, !!data?.yesterdayScore);
    const newStreak = currentStreak + 1;
    const cat = vibeCategory(score);

    // Show result immediately — don't block on network
    setResultScore(score);
    setResultStreak(newStreak);
    setSaving(false);
    setPhase("result");
    window.dispatchEvent(new CustomEvent("uvcDailyAction", { detail: { action: "vibecheck" } }));

    // Try to save in background — show non-blocking warning if it fails
    if (user) {
      try {
        await base44.entities.VibeCheckIn.create({
          user_id: user.id,
          user_email: user.email,
          check_in_date: todayStr(),
          mood: cat.moodTag,
          mood_score: score,
          streak_days: newStreak,
          vibe_score: score,
        });
        base44.analytics.track({ eventName: "vibe_check_submitted", properties: { vibe_score: score, mood: cat.moodTag } });
      } catch (e) {
        console.error("[VibeCheck] save error (score shown locally):", e);
        setSubmitError("Score shown locally. Tap Retry to save.");
      }
    }
  };

  if (!open) return null;

  const scoreDiff = data?.yesterdayScore != null ? (data?.score || 50) - data.yesterdayScore : null;
  const score = resultScore || data?.score || 50;
  const status = getStatus(score);
  const cat = vibeCategory(score);
  const streak = resultStreak || data?.streak || 0;

  const currentQ = questions[qIndex];
  const totalQ = questions.length;
  const progressPct = Math.round((qIndex / totalQ) * 100);
  const selectedScore = answers.find((a) => a.id === currentQ?.id)?.score;

  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 30, stiffness: 300 }}
      className="fixed inset-x-0 bottom-0 rounded-t-3xl overflow-hidden flex flex-col"
      style={{
        zIndex: 70,
        height: isMobile ? "min(90dvh, 100dvh)" : "75vh",
        maxHeight: "100dvh",
        background: "rgba(10,12,22,0.98)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderBottom: "none",
        pointerEvents: "auto",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center gap-2">
          {phase === "assessment" && qIndex > 0 ? (
            <button onClick={handleBack}
              className="w-8 h-8 rounded-lg flex items-center justify-center mr-1"
              style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.4)" }}>
              <ArrowLeft className="w-4 h-4" />
            </button>
          ) : (
            <Sparkles className="w-5 h-5 text-cyan-400" />
          )}
          <h3 className="font-heading font-black text-lg text-white">
            {phase === "assessment" ? `Q${qIndex + 1}/${totalQ}` : "Vibe Mirror"}
          </h3>
        </div>
        <button
          onTouchStart={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="w-11 h-11 rounded-full flex items-center justify-center transition-all hover:bg-white/10 active:bg-white/20"
          style={{
            color: "rgba(255,255,255,0.6)", minWidth: 44, minHeight: 44,
            touchAction: "manipulation", pointerEvents: "auto",
          }} aria-label="Close">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {!user ? (
          <div className="text-center py-16">
            <p className="text-white/30 text-sm font-medium">Sign in to access your Vibe Mirror.</p>
            <button onClick={() => { onClose(); navigate("/login"); }}
              className="mt-4 px-6 py-2.5 rounded-xl font-black text-xs tracking-wider"
              style={{ background: "rgba(0,229,255,0.12)", border: "1px solid rgba(0,229,255,0.3)", color: "#00E5FF" }}>
              Log In
            </button>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-cyan-400/20 border-t-cyan-400 rounded-full animate-spin" />
          </div>
        ) : phase === "assessment" ? (
          /* ── ASSESSMENT ───────────────────────────────────── */
          <AnimatePresence mode="wait">
            <motion.div key={`q-${qIndex}`}
              initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.2 }}>
              {/* Progress bar */}
              <div className="h-1 rounded-full mb-5 overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                <motion.div className="h-full rounded-full"
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  style={{ background: "linear-gradient(90deg,rgba(0,229,255,0.5),#00E5FF)" }} />
              </div>

              {/* Question */}
              <div className="flex items-start gap-3 mb-5">
                <span className="text-2xl flex-shrink-0 mt-0.5">{currentQ.emoji}</span>
                <h2 className="font-heading font-black text-white text-lg leading-snug">{currentQ.question}</h2>
              </div>

              {/* Options */}
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
                        background: isSelected ? "rgba(0,229,255,0.1)" : "rgba(255,255,255,0.03)",
                        border: `1px solid ${isSelected ? "rgba(0,229,255,0.4)" : "rgba(255,255,255,0.07)"}`,
                        boxShadow: isSelected ? "0 0 20px rgba(0,229,255,0.1)" : "none",
                        touchAction: "manipulation", pointerEvents: "auto",
                      }}>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white/85">{opt.label}</p>
                      </div>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ background: "#00E5FF" }}>
                          <Check className="w-3 h-3 text-black" />
                        </div>
                      )}
                    </motion.button>
                  );
                })}
              </div>

              {saving && (
                <div className="mt-5 flex items-center justify-center gap-2 text-xs text-white/40">
                  <div className="w-4 h-4 rounded-full animate-spin" style={{ border: "2px solid rgba(0,229,255,0.3)", borderTopColor: "#00E5FF" }} />
                  Calculating your vibe…
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        ) : phase === "result" ? (
          /* ── RESULT ────────────────────────────────────────── */
          <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex flex-col items-center py-3">
              <ScoreMeter value={score} color={cat.color} />
              <div className="flex items-center gap-2 mt-4 mb-1">
                <span className="text-xl">{cat.emoji}</span>
                <p className="font-heading font-black text-lg" style={{ color: cat.color }}>{cat.label}</p>
              </div>
              <p className="text-white/50 text-sm leading-relaxed max-w-xs text-center">
                {vibeMessage(score)}
              </p>
              <div className="flex items-center justify-center gap-5 mt-4">
                {scoreDiff !== null && (
                  <div className="text-center">
                    <p className="font-heading font-black text-lg" style={{ color: scoreDiff >= 0 ? "#4ADE80" : "#F87171" }}>
                      {scoreDiff >= 0 ? "+" : ""}{scoreDiff}
                    </p>
                    <p className="text-[10px] text-white/25">vs Yesterday</p>
                  </div>
                )}
                <div className="text-center">
                  <p className="font-heading font-black text-lg text-yellow-400">{streak}</p>
                  <p className="text-[10px] text-white/25">Day Streak</p>
                </div>
              </div>
            </div>

            {/* Category breakdown */}
            <div className="mt-5">
              <p className="text-[10px] font-black tracking-wider text-white/30 uppercase mb-3">Energy Breakdown</p>
              <div className="space-y-2.5">
                {Object.entries(data?.categories || computeCategories("neutral", 50)).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-3">
                    <span className="text-[10px] font-bold text-white/40 w-20 text-right flex-shrink-0">{CATEGORY_LABELS[key] || key}</span>
                    <div className="flex-1 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${value}%`, background: `linear-gradient(90deg, #00E5FF44, ${value > 60 ? "#4ADE80" : value > 35 ? "#FBBF24" : "#F87171"})` }} />
                    </div>
                    <span className="text-[10px] font-bold text-white/50 w-8 text-left">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        ) : !data || !data.hasTodayCheckIn ? (
          /* ── VIEW (no check-in yet) ───────────────────────── */
          <div className="text-center py-12 space-y-4">
            <p className="text-white/30 text-sm font-medium">Step into the Vibe Mirror to see your energy.</p>
            <p className="text-white/15 text-xs">Your first check-in unlocks your full reflection.</p>
            <button
              onTouchStart={(e) => e.stopPropagation()}
              onClick={() => { hapticTap(); setPhase("assessment"); }}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-black text-xs tracking-wider transition-all hover:brightness-110 active:scale-95 mt-4"
              style={{
                background: "linear-gradient(135deg,#00D4F0,#00E5FF)",
                color: "#000",
                minHeight: 48,
                touchAction: "manipulation",
                pointerEvents: "auto",
              }}>
              <Sparkles className="w-4 h-4" /> Start Check In
            </button>
          </div>
        ) : (
          /* ── VIEW (has check-in data) ─────────────────────── */
          <>
            <div className="flex flex-col items-center py-3">
              <div className="relative w-28 h-28 rounded-full flex items-center justify-center"
                style={{
                  background: `radial-gradient(circle at 30% 30%, ${status.color}22, transparent 70%)`,
                  border: `3px solid ${status.color}`,
                  boxShadow: `0 0 30px ${status.color}33`,
                }}>
                <span className="text-3xl font-heading font-black text-white">{data.score}</span>
              </div>
              <p className="text-sm font-bold mt-2" style={{ color: status.color }}>{status.label}</p>
              {scoreDiff != null && (
                <div className="flex items-center gap-1 mt-1">
                  {scoreDiff > 0 ? <TrendingUp className="w-3.5 h-3.5 text-green-400" /> : scoreDiff < 0 ? <TrendingDown className="w-3.5 h-3.5 text-red-400" /> : null}
                  <span className={`text-xs font-bold ${scoreDiff > 0 ? "text-green-400" : scoreDiff < 0 ? "text-red-400" : "text-white/30"}`}>
                    {scoreDiff > 0 ? `+${scoreDiff}` : scoreDiff}{scoreDiff === 0 ? " no change" : ` vs yesterday`}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl"
              style={{ background: "rgba(0,229,255,0.05)", border: "1px solid rgba(0,229,255,0.1)" }}>
              <Zap className="w-5 h-5 text-cyan-400 flex-shrink-0" />
              <div>
                <p className="text-[11px] font-black tracking-wider text-cyan-400/70 uppercase">Current Streak</p>
                <p className="text-lg font-heading font-black text-white">{data.streak} {data.streak === 1 ? "day" : "days"}</p>
              </div>
            </div>

            <div>
              <p className="text-[10px] font-black tracking-wider text-white/30 uppercase mb-3">Energy Breakdown</p>
              <div className="space-y-2.5">
                {Object.entries(data.categories).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-3">
                    <span className="text-[10px] font-bold text-white/40 w-20 text-right flex-shrink-0">{CATEGORY_LABELS[key] || key}</span>
                    <div className="flex-1 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${value}%`, background: `linear-gradient(90deg, #00E5FF44, ${value > 60 ? "#4ADE80" : value > 35 ? "#FBBF24" : "#F87171"})` }} />
                    </div>
                    <span className="text-[10px] font-bold text-white/50 w-8 text-left">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Footer buttons */}
      {(phase === "view" || phase === "result") && (
        <div className="flex-shrink-0 px-5 py-4 border-t border-white/5 space-y-2">
          {phase === "view" && (
            <button
              onTouchStart={(e) => e.stopPropagation()}
              onClick={() => { hapticTap(); setPhase(data?.hasTodayCheckIn ? "result" : "assessment"); }}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-black text-xs tracking-wider transition-all hover:brightness-110 active:scale-95"
              style={{
                background: !data?.hasTodayCheckIn
                  ? "linear-gradient(135deg,#00D4F0,#00E5FF)"
                  : "rgba(255,255,255,0.08)",
                color: !data?.hasTodayCheckIn ? "#000" : "rgba(255,255,255,0.7)",
                minHeight: 48,
                touchAction: "manipulation",
                pointerEvents: "auto",
              }}>
              <Sparkles className="w-4 h-4" />
              {data?.hasTodayCheckIn ? "View Today's Score" : "Check In"}
            </button>
          )}
          {phase === "result" && submitError && (
            <div className="p-3 rounded-xl text-center mb-1"
              style={{ background: "rgba(248,113,113,0.07)", border: "1px solid rgba(248,113,113,0.2)" }}>
              <p className="text-[10px] text-red-400 mb-1.5">{submitError}</p>
              <button
                onClick={() => { setSubmitError(null); submitCheckIn(answers); }}
                className="px-4 py-1.5 rounded-full font-black text-[10px] transition-all hover:brightness-110 active:scale-95"
                style={{ background: "rgba(248,113,113,0.18)", border: "1px solid rgba(248,113,113,0.35)", color: "#F87171", touchAction: "manipulation" }}>
                Retry Save
              </button>
            </div>
          )}
          {phase === "result" && (
            <button
              onTouchStart={(e) => e.stopPropagation()}
              onClick={() => { hapticTap(); setPhase("view"); setResultScore(null); fetchDataRef.current?.(); }}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-black text-xs tracking-wider transition-all hover:brightness-110 active:scale-95"
              style={{
                background: "linear-gradient(135deg,#4ADE80,#22C55E)",
                color: "#000",
                minHeight: 48,
                touchAction: "manipulation",
                pointerEvents: "auto",
              }}>
              <Check className="w-4 h-4" />
              Done — Back to Mirror
            </button>
          )}
          <button
            onTouchStart={(e) => e.stopPropagation()}
            onClick={() => { hapticTap(); setFullReport(true); }}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-black text-xs tracking-wider transition-all hover:bg-white/10 active:scale-95"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.6)",
              minHeight: 48,
              touchAction: "manipulation",
              pointerEvents: "auto",
            }}>
            <BarChart3 className="w-4 h-4" />
            View Full Progress
          </button>
          <button
            onTouchStart={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="w-full py-2.5 text-[10px] font-bold text-white/20 tracking-wider uppercase"
            style={{ minHeight: 44, touchAction: "manipulation", pointerEvents: "auto" }}>
            Close
          </button>
        </div>
      )}

      {/* ── Full Progress Report (nested view) ────────────────── */}
      {fullReport && (
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 30, stiffness: 300 }}
          className="absolute inset-0 rounded-t-3xl overflow-hidden flex flex-col"
          style={{ background: "rgba(10,12,22,0.99)", pointerEvents: "auto" }}>
          <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5 flex-shrink-0">
            <button onClick={() => setFullReport(false)}
              className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:bg-white/10"
              style={{ color: "rgba(255,255,255,0.6)", touchAction: "manipulation" }}>
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h3 className="font-heading font-black text-base text-white">Full Progress</h3>
              <p className="text-[10px] text-white/30">Last 14 days</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
            {history.length >= 2 && (
              <div>
                <p className="text-[10px] font-black tracking-wider text-white/30 uppercase mb-3">Score Trend</p>
                <div className="flex items-end gap-1.5 h-32 px-1"
                  style={{ background: "rgba(255,255,255,0.02)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.05)" }}>
                  {history.map((h, i) => {
                    const s = h.vibe_score || h.mood_score || 50;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center justify-end h-full pb-1">
                        <div className="w-full rounded-t transition-all"
                          style={{
                            height: `${Math.max(4, (s / 100) * 100)}%`,
                            background: s >= 70 ? "linear-gradient(180deg,#4ADE80,#4ADE8044)" : s >= 50 ? "linear-gradient(180deg,#FBBF24,#FBBF2444)" : "linear-gradient(180deg,#F87171,#F8717144)",
                            minHeight: 4,
                          }} />
                        <span className="text-[8px] text-white/25 mt-1">{s}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {data && (
              <div className="grid grid-cols-3 gap-2">
                <div className="p-3 rounded-xl text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <Activity className="w-4 h-4 mx-auto mb-1 text-cyan-400" />
                  <p className="text-lg font-heading font-black text-white">{data.score}</p>
                  <p className="text-[9px] font-bold text-white/25 uppercase">Current</p>
                </div>
                <div className="p-3 rounded-xl text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <Zap className="w-4 h-4 mx-auto mb-1 text-cyan-400" />
                  <p className="text-lg font-heading font-black text-white">{data.streak}</p>
                  <p className="text-[9px] font-bold text-white/25 uppercase">Streak</p>
                </div>
                <div className="p-3 rounded-xl text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  {scoreDiff != null && scoreDiff > 0 ? <TrendingUp className="w-4 h-4 mx-auto mb-1 text-green-400" />
                    : scoreDiff != null && scoreDiff < 0 ? <TrendingDown className="w-4 h-4 mx-auto mb-1 text-red-400" />
                    : <BarChart3 className="w-4 h-4 mx-auto mb-1 text-white/30" />}
                  <p className="text-lg font-heading font-black text-white">{scoreDiff != null ? (scoreDiff > 0 ? `+${scoreDiff}` : scoreDiff) : "-"}</p>
                  <p className="text-[9px] font-bold text-white/25 uppercase">vs Yest.</p>
                </div>
              </div>
            )}

            {data && (
              <div>
                <p className="text-[10px] font-black tracking-wider text-white/30 uppercase mb-3">Energy Breakdown</p>
                <div className="space-y-2.5">
                  {Object.entries(data.categories).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-3">
                      <span className="text-[10px] font-bold text-white/40 w-20 text-right flex-shrink-0">{CATEGORY_LABELS[key] || key}</span>
                      <div className="flex-1 h-2 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${value}%`, background: `linear-gradient(90deg, #00E5FF44, ${value > 60 ? "#4ADE80" : value > 35 ? "#FBBF24" : "#F87171"})` }} />
                      </div>
                      <span className="text-[10px] font-bold text-white/50 w-8 text-left">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data && scoreDiff != null && (
              <div className="p-4 rounded-xl" style={{ background: scoreDiff >= 0 ? "rgba(74,222,128,0.05)" : "rgba(248,113,113,0.05)", border: `1px solid ${scoreDiff >= 0 ? "rgba(74,222,128,0.15)" : "rgba(248,113,113,0.15)"}` }}>
                <div className="flex items-center gap-2 mb-1">
                  {scoreDiff >= 0 ? <TrendingUp className="w-4 h-4 text-green-400" /> : <TrendingDown className="w-4 h-4 text-red-400" />}
                  <span className="text-sm font-heading font-black" style={{ color: scoreDiff >= 0 ? "#4ADE80" : "#F87171" }}>
                    {scoreDiff >= 0 ? "You're improving!" : "Needs attention"}
                  </span>
                </div>
                <p className="text-xs text-white/40">
                  {scoreDiff >= 0
                    ? `Your vibe score is trending up (+${scoreDiff} vs yesterday). Keep your daily check-in streak going!`
                    : `Your score dropped ${Math.abs(scoreDiff)} points from yesterday. A quick check-in can help reset your energy.`}
                </p>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}