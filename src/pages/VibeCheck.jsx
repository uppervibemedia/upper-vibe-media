import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Flame, ChevronRight, Sparkles, Check, ArrowRight, Lock } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { RADIO_THEMES } from "@/components/radio/RadioThemePicker";
import Footer from "@/components/shared/Footer";

// ── Mood options ──────────────────────────────────────────────────────────────
const MOODS = [
  { id: "scattered",    label: "Scattered",    emoji: "😵‍💫", desc: "Distracted, not centered",         score: 10  },
  { id: "low_energy",   label: "Low Energy",   emoji: "😶", desc: "Moving through the motions",        score: 25  },
  { id: "neutral",      label: "Neutral",      emoji: "😐", desc: "Present but not activated",         score: 50  },
  { id: "intentional",  label: "Intentional",  emoji: "🎯", desc: "Focused and clear",                 score: 75  },
  { id: "high_vibe",    label: "High Vibe",    emoji: "⚡", desc: "Aligned, energized, locked in",     score: 100 },
];

// ── Streak → score ────────────────────────────────────────────────────────────
function streakToScore(days) {
  if (days >= 30) return 100;
  if (days >= 7)  return Math.round(75 + ((days - 7) / 23) * 25);
  if (days >= 3)  return Math.round(50 + ((days - 3) / 4) * 25);
  if (days >= 1)  return Math.round(20 + ((days - 1) / 2) * 30);
  return 20;
}

// ── Score → label + message ───────────────────────────────────────────────────
function scoreLabel(score) {
  if (score <= 30) return { label: "Reset Needed",  color: "#F87171", msg: "Your energy may need a reset today. Start small, breathe, and choose one aligned action." };
  if (score <= 60) return { label: "Stabilizing",   color: "#FBBF24", msg: "You're not off track. You're recalibrating. Choose one clear move today." };
  if (score <= 80) return { label: "Aligned",        color: "#34D399", msg: "You're moving with intention. Keep your energy clean and your actions focused." };
  return              { label: "Locked In",          color: "#60A5FA", msg: "You're in a strong state today. Protect the frequency and move with purpose." };
}

// ── Today's date string ───────────────────────────────────────────────────────
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function VibeCheck() {
  const { user } = useAuth();
  const { accentId } = useTheme();
  const radioTheme = RADIO_THEMES[accentId] || RADIO_THEMES.cyan;
  const rtPrimary = radioTheme.vars["--rt-primary"];
  const rtAmbient1 = radioTheme.vars["--rt-ambient1"];
  const rtAmbient2 = radioTheme.vars["--rt-ambient2"];

  // ── Form state ──────────────────────────────────────────────────────────────
  const [step, setStep] = useState("mood"); // "mood" | "intention" | "gratitude" | "result"
  const [mood, setMood] = useState(null);
  const [intention, setIntention] = useState("");
  const [gratitude, setGratitude] = useState("");
  const [saving, setSaving] = useState(false);

  // ── Loaded from DB ──────────────────────────────────────────────────────────
  const [todayCheckIn, setTodayCheckIn] = useState(null);
  const [streak, setStreak]             = useState(1);
  const [loading, setLoading]           = useState(true);

  // ── Waitlist email ──────────────────────────────────────────────────────────
  const [waitlistEmail, setWaitlistEmail] = useState(user?.email || "");
  const [waitlistDone, setWaitlistDone]   = useState(false);

  // ── Load today's check-in + calculate streak ────────────────────────────────
  useEffect(() => {
    if (!user) { setLoading(false); return; }

    const load = async () => {
      try {
        const all = await base44.entities.VibeCheckIn.filter(
          { user_id: user.id },
          "-check_in_date",
          90
        );

        // Find today
        const today = all.find((c) => c.check_in_date === todayStr());
        if (today) {
          setTodayCheckIn(today);
          setMood(today.mood);
          setIntention(today.intention || "");
          setGratitude(today.gratitude || "");
          setStep("result");
        }

        // Calculate streak: consecutive days ending today or yesterday
        const dates = [...new Set(all.map((c) => c.check_in_date))].sort().reverse();
        let s = 0;
        let expected = todayStr();
        // If no check-in today, start counting from yesterday
        if (!today) {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          expected = yesterday.toISOString().slice(0, 10);
        }
        for (const d of dates) {
          if (d === expected) {
            s++;
            const prev = new Date(expected);
            prev.setDate(prev.getDate() - 1);
            expected = prev.toISOString().slice(0, 10);
          } else if (d < expected) {
            break;
          }
        }
        // If we have today's check-in, add 1 to ongoing streak
        setStreak(Math.max(today ? s : s, 1));
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };

    load();
  }, [user]);

  // ── Vibe score calculation ──────────────────────────────────────────────────
  const moodScore      = MOODS.find((m) => m.id === mood)?.score ?? 0;
  const intentionScore = intention.trim() ? 100 : 0;
  const streakScore    = streakToScore(streak);
  const vibeScore      = todayCheckIn
    ? todayCheckIn.vibe_score
    : Math.round(moodScore * 0.4 + intentionScore * 0.3 + streakScore * 0.3);
  const scoreInfo = scoreLabel(vibeScore);

  // ── Submit check-in ─────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!mood || !user || saving) return;
    setSaving(true);
    const score = Math.round(moodScore * 0.4 + intentionScore * 0.3 + streakToScore(streak) * 0.3);
    const newStreak = streak + 1; // +1 because today's new check-in extends it
    try {
      const record = await base44.entities.VibeCheckIn.create({
        user_id:       user.id,
        user_email:    user.email,
        check_in_date: todayStr(),
        mood,
        mood_score:    moodScore,
        intention:     intention.trim() || null,
        gratitude:     gratitude.trim() || null,
        streak_days:   newStreak,
        vibe_score:    score,
      });
      setTodayCheckIn(record);
      setStreak(newStreak);
      base44.analytics.track({ eventName: "vibe_check_submitted", properties: { vibe_score: score, mood } });
      setStep("result");
    } catch (e) {
      console.error(e);
    }
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
    } catch (e) {
      console.error(e);
    }
  };

  // ── Unauthenticated state ───────────────────────────────────────────────────
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
            Create a free account to start your daily Vibe Check and track your frequency.
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
            <p className="text-white/40 text-sm">What frequency are you moving in today?</p>
          </motion.div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-6 h-6 rounded-full animate-spin"
              style={{ border: `2px solid rgba(${rtPrimary},0.2)`, borderTopColor: `rgb(${rtPrimary})` }} />
          </div>
        ) : (
          <AnimatePresence mode="wait">

            {/* ── STEP: MOOD ─────────────────────────────────────────────── */}
            {step === "mood" && (
              <motion.div key="mood" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-4">
                <SectionCard>
                  <p className="text-xs font-black tracking-widest uppercase mb-1" style={{ color: `rgba(${rtPrimary},0.7)` }}>Step 1 of 3 — Mood Check · 40%</p>
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

            {/* ── STEP: INTENTION ────────────────────────────────────────── */}
            {step === "intention" && (
              <motion.div key="intention" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-4">
                <SectionCard>
                  <p className="text-xs font-black tracking-widest uppercase mb-1" style={{ color: `rgba(${rtPrimary},0.7)` }}>Step 2 of 3 — Daily Intention · 30%</p>
                  <h2 className="font-heading font-black text-white text-xl mb-1">What one action would make today feel aligned?</h2>
                  <p className="text-white/35 text-xs mb-4">Optional — but adds 30 points to your Vibe Score.</p>
                  <textarea
                    value={intention}
                    onChange={(e) => setIntention(e.target.value)}
                    placeholder="Today I will…"
                    maxLength={200}
                    rows={3}
                    className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 resize-none focus:outline-none"
                    style={{ background: "rgba(255,255,255,0.04)", border: `1px solid rgba(${rtPrimary},0.18)` }}
                  />
                  <div className="flex gap-2 mt-4">
                    <button onClick={() => setStep("gratitude")}
                      className="flex-1 py-3.5 rounded-2xl font-black text-sm tracking-wide transition-all"
                      style={{ background: `linear-gradient(135deg,rgba(${rtPrimary},0.7),rgb(${rtPrimary}))`, color: "#000" }}>
                      {intention.trim() ? "Next" : "Skip"} <ChevronRight className="inline w-4 h-4 ml-1" />
                    </button>
                  </div>
                </SectionCard>
              </motion.div>
            )}

            {/* ── STEP: GRATITUDE ────────────────────────────────────────── */}
            {step === "gratitude" && (
              <motion.div key="gratitude" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-4">
                <SectionCard>
                  <p className="text-xs font-black tracking-widest uppercase mb-1" style={{ color: "rgba(212,168,67,0.8)" }}>Step 3 of 3 — Gratitude</p>
                  <h2 className="font-heading font-black text-white text-xl mb-1">Name one thing you are grateful for today.</h2>
                  <p className="text-white/35 text-xs mb-4">Optional — sets your mindset before you review your score.</p>
                  <textarea
                    value={gratitude}
                    onChange={(e) => setGratitude(e.target.value)}
                    placeholder="I am grateful for…"
                    maxLength={200}
                    rows={3}
                    className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 resize-none focus:outline-none"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(212,168,67,0.18)" }}
                  />
                  <button onClick={handleSubmit} disabled={saving}
                    className="mt-4 w-full py-3.5 rounded-2xl font-black text-sm tracking-wide transition-all disabled:opacity-50"
                    style={{ background: "linear-gradient(135deg,rgba(212,168,67,0.8),#D4A843)", color: "#000" }}>
                    {saving ? "Calculating…" : "See My Vibe Score ⚡"}
                  </button>
                </SectionCard>
              </motion.div>
            )}

            {/* ── STEP: RESULT ───────────────────────────────────────────── */}
            {step === "result" && (
              <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">

                {/* Score Meter */}
                <SectionCard centered>
                  <p className="text-[10px] font-black tracking-[0.3em] uppercase text-white/40 mb-3">Today's Frequency</p>
                  <ScoreMeter score={vibeScore} rtPrimary={rtPrimary} color={scoreInfo.color} />
                  <p className="font-heading font-black text-xl mt-4" style={{ color: scoreInfo.color }}>{scoreInfo.label}</p>
                  <p className="text-white/50 text-sm mt-2 max-w-xs text-center leading-relaxed">{scoreInfo.msg}</p>
                  {streak > 1 && (
                    <div className="mt-4 flex items-center gap-2 px-4 py-2 rounded-full"
                      style={{ background: "rgba(212,168,67,0.08)", border: "1px solid rgba(212,168,67,0.22)" }}>
                      <Flame className="w-4 h-4 text-yellow-400" />
                      <span className="text-xs font-black text-yellow-400">{streak}-Day Streak</span>
                    </div>
                  )}
                </SectionCard>

                {/* Score breakdown */}
                <SectionCard>
                  <p className="text-xs font-black tracking-widest uppercase text-white/30 mb-3">Score Breakdown</p>
                  <div className="space-y-2.5">
                    <BreakdownRow label="Mood Check" emoji="😐" value={`${todayCheckIn?.mood_score ?? moodScore}`} weight="40%" rtPrimary={rtPrimary} score={todayCheckIn?.mood_score ?? moodScore} />
                    <BreakdownRow label="Daily Intention" emoji="🎯" value={intention.trim() ? "100" : "0"} weight="30%" rtPrimary={rtPrimary} score={intention.trim() ? 100 : 0} />
                    <BreakdownRow label="Consistency" emoji="🔥" value={`${streakScore}`} weight="30%" rtPrimary={rtPrimary} score={streakScore} subtitle={`${streak}-day streak`} />
                  </div>
                </SectionCard>

                {/* Affirmation Card */}
                <AffirmationCard rtPrimary={rtPrimary} />

                {/* Gratitude display */}
                {(gratitude || todayCheckIn?.gratitude) && (
                  <SectionCard>
                    <p className="text-xs font-black tracking-widest uppercase text-white/30 mb-2">Today's Gratitude</p>
                    <p className="text-white/70 text-sm italic leading-relaxed">"{gratitude || todayCheckIn?.gratitude}"</p>
                  </SectionCard>
                )}

                {/* Manifest Mode CTA */}
                <ManifestModeCTA
                  rtPrimary={rtPrimary}
                  email={waitlistEmail}
                  setEmail={setWaitlistEmail}
                  onJoin={handleWaitlist}
                  done={waitlistDone}
                  userEmail={user?.email}
                />

                {/* Reset / re-check tomorrow */}
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

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionCard({ children, centered = false }) {
  return (
    <div className={`rounded-3xl p-5 ${centered ? "text-center" : ""}`}
      style={{ background: "rgba(8,8,24,0.85)", border: "1px solid rgba(255,255,255,0.07)", backdropFilter: "blur(20px)" }}>
      {children}
    </div>
  );
}

function ScoreMeter({ score, rtPrimary, color }) {
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: 144, height: 144 }}>
      <svg width="144" height="144" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="72" cy="72" r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
        <motion.circle
          cx="72" cy="72" r={radius}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - progress }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          style={{ filter: `drop-shadow(0 0 8px ${color})` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="font-heading font-black text-4xl text-white leading-none"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6, duration: 0.4 }}>
          {score}
        </motion.span>
        <span className="text-[10px] font-bold text-white/30 tracking-widest uppercase mt-0.5">Score</span>
      </div>
    </div>
  );
}

function BreakdownRow({ label, emoji, value, weight, rtPrimary, score, subtitle }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xl flex-shrink-0">{emoji}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-bold text-white/70">{label}</span>
          <span className="text-xs font-black" style={{ color: `rgb(${rtPrimary})` }}>{value}<span className="text-white/20 font-normal">/100 · {weight}</span></span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
          <motion.div
            className="h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${score}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            style={{ background: `linear-gradient(90deg,rgba(${rtPrimary},0.6),rgb(${rtPrimary}))` }}
          />
        </div>
        {subtitle && <p className="text-[10px] text-white/25 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

function AffirmationCard({ rtPrimary }) {
  return (
    <div className="rounded-3xl p-5 text-center"
      style={{
        background: `linear-gradient(135deg,rgba(${rtPrimary},0.07),rgba(155,126,255,0.06))`,
        border: `1px solid rgba(${rtPrimary},0.18)`,
      }}>
      <div className="flex items-center justify-center gap-2 mb-3">
        <Sparkles className="w-4 h-4" style={{ color: `rgb(${rtPrimary})` }} />
        <p className="text-xs font-black tracking-[0.3em] uppercase" style={{ color: `rgba(${rtPrimary},0.8)` }}>Today's Frequency</p>
      </div>
      <p className="text-white/80 text-sm leading-relaxed italic">
        "I regulate my energy, protect my peace, and move like my future self is already here."
      </p>
    </div>
  );
}

function ManifestModeCTA({ rtPrimary, email, setEmail, onJoin, done, userEmail }) {
  return (
    <div className="rounded-3xl p-5"
      style={{
        background: "linear-gradient(135deg,rgba(124,58,237,0.12),rgba(155,126,255,0.07))",
        border: "1px solid rgba(155,126,255,0.22)",
      }}>
      <div className="flex items-center gap-2 mb-2">
        <Lock className="w-4 h-4 text-purple-400" />
        <p className="text-xs font-black tracking-widest uppercase text-purple-400">Coming Soon</p>
      </div>
      <h3 className="font-heading font-black text-white text-lg mb-2">Want the full Daily Shift experience?</h3>
      <p className="text-white/45 text-xs leading-relaxed mb-4">
        Manifest Mode is coming soon with deeper alignment tracking, guided resets, future-self tools, vibe history, affirmations, and full Daily Shift rituals.
      </p>
      {done ? (
        <div className="flex items-center gap-2 py-3 justify-center rounded-2xl"
          style={{ background: "rgba(155,126,255,0.12)", border: "1px solid rgba(155,126,255,0.25)" }}>
          <Check className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-black text-purple-300">You're on the waitlist!</span>
        </div>
      ) : (
        <div className="flex gap-2">
          {!userEmail && (
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Your email…"
              className="flex-1 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(155,126,255,0.2)" }}
            />
          )}
          <button onClick={onJoin}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-2xl font-black text-sm transition-all hover:brightness-110 whitespace-nowrap"
            style={{ background: "linear-gradient(135deg,#7C3AED,#9B7EFF)", color: "#fff" }}>
            Join the Waitlist <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}