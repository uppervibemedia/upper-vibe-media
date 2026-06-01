import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, ChevronRight, Check } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { RADIO_THEMES } from "@/components/radio/RadioThemePicker";
import Footer from "@/components/shared/Footer";
import {
  SectionCard, BreakdownRow, AffirmationCard, ManifestModeCTA,
  StreakCard, VibeTrendCard, FutureSelfCard, BadgesCard, VibeHistoryCard,
  scoreLabel,
} from "@/components/vibecheck/ResultCards";

// ── Mood options ──────────────────────────────────────────────────────────────
const MOODS = [
  { id: "scattered",   label: "Scattered",   emoji: "😵‍💫", desc: "Distracted, not centered",      score: 10  },
  { id: "low_energy",  label: "Low Energy",  emoji: "😶",  desc: "Moving through the motions",    score: 25  },
  { id: "neutral",     label: "Neutral",     emoji: "😐",  desc: "Present but not activated",     score: 50  },
  { id: "intentional", label: "Intentional", emoji: "🎯",  desc: "Focused and clear",             score: 75  },
  { id: "high_vibe",   label: "High Vibe",   emoji: "⚡",  desc: "Aligned, energized, locked in", score: 100 },
];

function streakToScore(days) {
  if (days >= 30) return 100;
  if (days >= 7)  return Math.round(75 + ((days - 7) / 23) * 25);
  if (days >= 3)  return Math.round(50 + ((days - 3) / 4) * 25);
  return Math.round(20 + ((Math.max(days, 1) - 1) / 2) * 30);
}

// New 5-factor formula
function calcVibeScore({ moodScore, intentionScore, gratitudeScore, streakScore, yesterdayCompletionScore }) {
  return Math.round(
    moodScore * 0.30 +
    intentionScore * 0.20 +
    gratitudeScore * 0.20 +
    streakScore * 0.20 +
    yesterdayCompletionScore * 0.10
  );
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

export default function VibeCheck() {
  const { user, isPlus, isAdmin } = useAuth();
  const isPlusUser = isPlus || isAdmin;
  const { accentId } = useTheme();
  const radioTheme = RADIO_THEMES[accentId] || RADIO_THEMES.cyan;
  const rtPrimary  = radioTheme.vars["--rt-primary"];
  const rtAmbient1 = radioTheme.vars["--rt-ambient1"];
  const rtAmbient2 = radioTheme.vars["--rt-ambient2"];

  const [step, setStep]           = useState("mood");
  const [mood, setMood]           = useState(null);
  const [intention, setIntention] = useState("");
  const [gratitude, setGratitude] = useState("");
  const [saving, setSaving]       = useState(false);

  const [todayCheckIn, setTodayCheckIn]   = useState(null);
  const [allCheckIns, setAllCheckIns]     = useState([]);
  const [streak, setStreak]               = useState(1);
  const [longestStreak, setLongestStreak] = useState(1);
  const [yesterdayHadIntention, setYesterdayHadIntention] = useState(false);
  const [loading, setLoading]             = useState(true);

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
          setMood(today.mood);
          setIntention(today.intention || "");
          setGratitude(today.gratitude || "");
          setStep("result");
        }

        // Yesterday's check-in — did they set an intention?
        const yest = all.find((c) => c.check_in_date === yesterdayDateStr());
        setYesterdayHadIntention(!!(yest?.intention));

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

  // ── Score factors ────────────────────────────────────────────────────────────
  const moodScore      = MOODS.find((m) => m.id === mood)?.score ?? 0;
  const intentionScore = intention.trim() ? 100 : 0;
  const gratitudeScore = gratitude.trim() ? 100 : 0;
  const streakScore    = streakToScore(streak);
  // Yesterday completion: 100 if yesterday had an intention (assumed completed today by checking in)
  const yesterdayCompletionScore = yesterdayHadIntention ? 100 : 0;

  const vibeScore = todayCheckIn?.vibe_score ?? calcVibeScore({
    moodScore, intentionScore, gratitudeScore, streakScore, yesterdayCompletionScore,
  });
  const si = scoreLabel(vibeScore);

  // Fix label for "Protect the frequency" → "Protect your vibe"
  const siMsg = si.label === "Locked In"
    ? "You're in a strong state today. Protect your vibe and move with purpose."
    : si.label === "Aligned"
    ? "You're moving with intention. Keep your energy clean and your actions focused."
    : si.label === "Stabilizing"
    ? "You're not off track. You're recalibrating. Choose one clear move today."
    : "Your energy may need a reset today. Start small, breathe, and choose one aligned action.";

  const handleSubmit = async () => {
    if (!mood || !user || saving) return;
    setSaving(true);
    const score = calcVibeScore({ moodScore, intentionScore, gratitudeScore, streakScore, yesterdayCompletionScore });
    const newStreak = streak + 1;
    try {
      const record = await base44.entities.VibeCheckIn.create({
        user_id: user.id, user_email: user.email,
        check_in_date: todayStr(), mood, mood_score: moodScore,
        intention: intention.trim() || null, gratitude: gratitude.trim() || null,
        streak_days: newStreak, vibe_score: score,
      });
      setTodayCheckIn(record);
      setAllCheckIns((prev) => [record, ...prev]);
      setStreak(newStreak);
      setLongestStreak((prev) => Math.max(prev, newStreak));
      base44.analytics.track({ eventName: "vibe_check_submitted", properties: { vibe_score: score, mood } });
      setStep("result");
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

  if (!loading && !user) {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center py-24">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
            style={{ background: "rgba(155,126,255,0.12)", border: "1px solid rgba(155,126,255,0.25)" }}>
            <Zap className="w-8 h-8" style={{ color: "#9B7EFF" }} />
          </div>
          <h1 className="font-heading font-black text-3xl md:text-4xl text-white mb-3">Vibe Check</h1>
          <p className="text-white/40 text-sm max-w-sm leading-relaxed mb-8">
            Create a free account to start your daily Vibe Check and track your vibe.
          </p>
          <button onClick={() => base44.auth.redirectToLogin()}
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full font-black text-sm tracking-wider transition-all hover:brightness-110"
            style={{ background: `linear-gradient(135deg,rgba(${rtPrimary},0.8),rgb(${rtPrimary}))`, color: "#000" }}>
            Get Started Free
          </button>
        </div>
        <Footer />
      </div>
    );
  }

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
            <p className="text-white/40 text-sm">What vibe are you moving in today?</p>
          </motion.div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-6 h-6 rounded-full animate-spin"
              style={{ border: `2px solid rgba(${rtPrimary},0.2)`, borderTopColor: `rgb(${rtPrimary})` }} />
          </div>
        ) : (
          <AnimatePresence mode="wait">

            {/* ── MOOD ── */}
            {step === "mood" && (
              <motion.div key="mood" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-4">
                <SectionCard>
                  <p className="text-xs font-black tracking-widest uppercase mb-1" style={{ color: `rgba(${rtPrimary},0.7)` }}>Step 1 of 3 — Vibe Check · 30%</p>
                  <h2 className="font-heading font-black text-white text-xl mb-4">How are you feeling today?</h2>
                  <div className="space-y-2.5">
                    {MOODS.map((m) => (
                      <button key={m.id} onClick={() => setMood(m.id)}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all text-left"
                        style={{
                          background: mood === m.id ? `rgba(${rtPrimary},0.1)` : "rgba(255,255,255,0.03)",
                          border: `1px solid ${mood === m.id ? `rgba(${rtPrimary},0.4)` : "rgba(255,255,255,0.07)"}`,
                          boxShadow: mood === m.id ? `0 0 20px rgba(${rtPrimary},0.1)` : "none",
                        }}>
                        <span className="text-2xl flex-shrink-0">{m.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-white">{m.label}</p>
                          <p className="text-[11px] text-white/35">{m.desc}</p>
                        </div>
                        {mood === m.id && (
                          <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ background: `rgb(${rtPrimary})` }}>
                            <Check className="w-3 h-3 text-black" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => mood && setStep("intention")} disabled={!mood}
                    className="mt-5 w-full py-3.5 rounded-2xl font-black text-sm tracking-wide transition-all disabled:opacity-30"
                    style={{ background: mood ? `linear-gradient(135deg,rgba(${rtPrimary},0.7),rgb(${rtPrimary}))` : "rgba(255,255,255,0.05)", color: mood ? "#000" : "rgba(255,255,255,0.3)" }}>
                    Next <ChevronRight className="inline w-4 h-4 ml-1" />
                  </button>
                </SectionCard>
              </motion.div>
            )}

            {/* ── INTENTION ── */}
            {step === "intention" && (
              <motion.div key="intention" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-4">
                <SectionCard>
                  <p className="text-xs font-black tracking-widest uppercase mb-1" style={{ color: `rgba(${rtPrimary},0.7)` }}>Step 2 of 3 — Daily Intention · 20%</p>
                  <h2 className="font-heading font-black text-white text-xl mb-1">What one action would make today feel aligned?</h2>
                  <p className="text-white/35 text-xs mb-4">Optional — adds 20 points to your Vibe Score.</p>
                  <textarea value={intention} onChange={(e) => setIntention(e.target.value)}
                    placeholder="Today I will…" maxLength={200} rows={3}
                    className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 resize-none focus:outline-none"
                    style={{ background: "rgba(255,255,255,0.04)", border: `1px solid rgba(${rtPrimary},0.18)` }} />
                  <button onClick={() => setStep("gratitude")}
                    className="mt-4 w-full py-3.5 rounded-2xl font-black text-sm tracking-wide transition-all"
                    style={{ background: `linear-gradient(135deg,rgba(${rtPrimary},0.7),rgb(${rtPrimary}))`, color: "#000" }}>
                    {intention.trim() ? "Next" : "Skip"} <ChevronRight className="inline w-4 h-4 ml-1" />
                  </button>
                </SectionCard>
              </motion.div>
            )}

            {/* ── GRATITUDE ── */}
            {step === "gratitude" && (
              <motion.div key="gratitude" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-4">
                <SectionCard>
                  <p className="text-xs font-black tracking-widest uppercase mb-1" style={{ color: "rgba(212,168,67,0.8)" }}>Step 3 of 3 — Gratitude · 20%</p>
                  <h2 className="font-heading font-black text-white text-xl mb-1">Name one thing you are grateful for today.</h2>
                  <p className="text-white/35 text-xs mb-4">Optional — adds 20 points to your Vibe Score.</p>
                  <textarea value={gratitude} onChange={(e) => setGratitude(e.target.value)}
                    placeholder="I am grateful for…" maxLength={200} rows={3}
                    className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 resize-none focus:outline-none"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(212,168,67,0.18)" }} />
                  <button onClick={handleSubmit} disabled={saving}
                    className="mt-4 w-full py-3.5 rounded-2xl font-black text-sm tracking-wide transition-all disabled:opacity-50"
                    style={{ background: "linear-gradient(135deg,rgba(212,168,67,0.8),#D4A843)", color: "#000" }}>
                    {saving ? "Calculating…" : "See My Vibe Score ⚡"}
                  </button>
                </SectionCard>
              </motion.div>
            )}

            {/* ── RESULT ── */}
            {step === "result" && (
              <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">

                {/* Score Meter */}
                <SectionCard centered>
                  <p className="text-[10px] font-black tracking-[0.3em] uppercase text-white/40 mb-3">Today's Vibe</p>
                  <ScoreMeter score={vibeScore} color={si.color} />
                  <p className="font-heading font-black text-xl mt-4" style={{ color: si.color }}>{si.label}</p>
                  <p className="text-white/50 text-sm mt-2 max-w-xs text-center leading-relaxed">{siMsg}</p>
                </SectionCard>

                {/* Score breakdown (free) */}
                <SectionCard>
                  <p className="text-xs font-black tracking-widest uppercase text-white/30 mb-3">Score Breakdown</p>
                  <div className="space-y-2.5">
                    <BreakdownRow label="Vibe Check" emoji="😐" value={`${todayCheckIn?.mood_score ?? moodScore}`} weight="30%" rtPrimary={rtPrimary} score={todayCheckIn?.mood_score ?? moodScore} />
                    <BreakdownRow label="Daily Intention" emoji="🎯" value={intention.trim() ? "100" : "0"} weight="20%" rtPrimary={rtPrimary} score={intention.trim() ? 100 : 0} />
                    <BreakdownRow label="Gratitude" emoji="🙏" value={gratitude.trim() ? "100" : "0"} weight="20%" rtPrimary={rtPrimary} score={gratitude.trim() ? 100 : 0} />
                    <BreakdownRow label="Consistency" emoji="🔥" value={`${streakScore}`} weight="20%" rtPrimary={rtPrimary} score={streakScore} subtitle={`${streak}-day streak`} />
                    <BreakdownRow label="Yesterday's Intention" emoji="✅" value={yesterdayCompletionScore ? "100" : "0"} weight="10%" rtPrimary={rtPrimary} score={yesterdayCompletionScore} subtitle={yesterdayCompletionScore ? "Completed" : "No entry yesterday"} />
                  </div>
                </SectionCard>

                {/* Daily Streak (free) */}
                <StreakCard streak={streak} />

                {/* Vibe Trend (Plus) */}
                <VibeTrendCard allCheckIns={allCheckIns} todayScore={vibeScore} rtPrimary={rtPrimary} isPlus={isPlusUser} />

                {/* Future Self Progress (Plus) */}
                <FutureSelfCard allCheckIns={allCheckIns} rtPrimary={rtPrimary} isPlus={isPlusUser} />

                {/* Achievement Badges (Plus) */}
                <BadgesCard allCheckIns={allCheckIns} streak={streak} longestStreak={longestStreak} isPlus={isPlusUser} rtPrimary={rtPrimary} />

                {/* Vibe History (Plus) */}
                <VibeHistoryCard allCheckIns={allCheckIns} streak={streak} longestStreak={longestStreak} rtPrimary={rtPrimary} isPlus={isPlusUser} />

                {/* Affirmation (free) */}
                <AffirmationCard rtPrimary={rtPrimary} />

                {/* Gratitude display (free) */}
                {(gratitude || todayCheckIn?.gratitude) && (
                  <SectionCard>
                    <p className="text-xs font-black tracking-widest uppercase text-white/30 mb-2">Today's Gratitude</p>
                    <p className="text-white/70 text-sm italic leading-relaxed">"{gratitude || todayCheckIn?.gratitude}"</p>
                  </SectionCard>
                )}

                {/* Manifest Mode CTA (free) */}
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
          transition={{ duration: 1.2, ease: "easeOut" }}
          style={{ filter: `drop-shadow(0 0 8px ${color})` }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span className="font-heading font-black text-4xl text-white leading-none"
          initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6, duration: 0.4 }}>
          {score}
        </motion.span>
        <span className="text-[9px] font-black text-white/30 tracking-widest uppercase mt-0.5">VIBE SCORE</span>
      </div>
    </div>
  );
}