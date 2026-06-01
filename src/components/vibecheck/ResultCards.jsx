import React, { useState } from "react";
import { motion } from "framer-motion";
import { Flame, Sparkles, ArrowRight, Lock, Check, ChevronDown, ChevronUp, Trophy, Crown } from "lucide-react";

// ── Shared helpers ────────────────────────────────────────────────────────────
export function SectionCard({ children, centered = false, className = "" }) {
  return (
    <div className={`rounded-3xl p-5 ${centered ? "text-center" : ""} ${className}`}
      style={{ background: "rgba(8,8,24,0.85)", border: "1px solid rgba(255,255,255,0.07)", backdropFilter: "blur(20px)" }}>
      {children}
    </div>
  );
}

// ── Plus gate overlay ─────────────────────────────────────────────────────────
export function PlusGate({ rtPrimary }) {
  return (
    <div className="absolute inset-0 rounded-3xl flex flex-col items-center justify-center z-10"
      style={{ background: "rgba(8,8,24,0.88)", backdropFilter: "blur(8px)" }}>
      <Crown className="w-5 h-5 mb-2" style={{ color: `rgb(${rtPrimary})` }} />
      <p className="font-heading font-black text-white text-sm mb-1">Plus Feature</p>
      <p className="text-white/40 text-xs text-center px-6">Unlock deeper vibe tracking with Plus.</p>
      <a href="/membership"
        className="mt-3 px-4 py-2 rounded-xl font-black text-xs transition-all hover:brightness-110"
        style={{ background: `rgba(${rtPrimary},0.15)`, border: `1px solid rgba(${rtPrimary},0.35)`, color: `rgb(${rtPrimary})` }}>
        Upgrade to Plus
      </a>
    </div>
  );
}

export function BreakdownRow({ label, emoji, value, weight, rtPrimary, score, subtitle }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xl flex-shrink-0">{emoji}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-bold text-white/70">{label}</span>
          <span className="text-xs font-black" style={{ color: `rgb(${rtPrimary})` }}>
            {value}<span className="text-white/20 font-normal">/100 · {weight}</span>
          </span>
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

// ── Score label (updated ranges) ──────────────────────────────────────────────
export function scoreLabel(score) {
  if (score <= 39) return { label: "Reset Needed", color: "#F87171" };
  if (score <= 64) return { label: "Stabilizing",  color: "#FBBF24" };
  if (score <= 84) return { label: "Aligned",       color: "#34D399" };
  return              { label: "Locked In",          color: "#60A5FA" };
}

// ── Streak levels ─────────────────────────────────────────────────────────────
export const STREAK_LEVELS = [
  { days: 1,   label: "Vibe Starter",   emoji: "🔥" },
  { days: 7,   label: "Vibe Builder",   emoji: "⚡" },
  { days: 30,  label: "Vibe Locked In", emoji: "💎" },
  { days: 90,  label: "Vibe Master",    emoji: "👑" },
  { days: 365, label: "Vibe Legend",    emoji: "🌟" },
];

export function getStreakLevel(n) {
  let cur = STREAK_LEVELS[0];
  for (const lvl of STREAK_LEVELS) { if (n >= lvl.days) cur = lvl; }
  return cur;
}

export function getNextStreakLevel(n) {
  return STREAK_LEVELS.find((lvl) => n < lvl.days) || null;
}

// ── Daily Streak Card (free) ──────────────────────────────────────────────────
export function StreakCard({ streak }) {
  const current = getStreakLevel(streak);
  const next = getNextStreakLevel(streak);
  const daysToNext = next ? next.days - streak : 0;

  return (
    <SectionCard>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-black tracking-widest uppercase text-white/30">Current Streak</p>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full"
          style={{ background: "rgba(212,168,67,0.1)", border: "1px solid rgba(212,168,67,0.22)" }}>
          <Flame className="w-3.5 h-3.5 text-yellow-400" />
          <span className="text-xs font-black text-yellow-400">{streak} Day{streak !== 1 ? "s" : ""}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">{current.emoji}</span>
        <p className="font-heading font-black text-white text-base">{current.label}</p>
      </div>
      {next && (
        <p className="text-white/35 text-xs mb-4">
          Come back tomorrow — {daysToNext} more day{daysToNext !== 1 ? "s" : ""} to reach <span className="text-yellow-400 font-bold">{next.label}</span>.
        </p>
      )}
      <div className="flex items-center gap-1 justify-between">
        {STREAK_LEVELS.map((lvl) => {
          const reached = streak >= lvl.days;
          return (
            <div key={lvl.days} className="flex flex-col items-center gap-1 flex-1">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-base transition-all"
                style={reached
                  ? { background: "rgba(212,168,67,0.15)", border: "1px solid rgba(212,168,67,0.35)", filter: "drop-shadow(0 0 6px rgba(212,168,67,0.4))", opacity: 1 }
                  : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", opacity: 0.25 }}>
                {lvl.emoji}
              </div>
              <p className="text-[8px] font-bold text-center leading-tight"
                style={{ color: reached ? "rgba(212,168,67,0.8)" : "rgba(255,255,255,0.2)" }}>
                {lvl.days}d
              </p>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}

// ── Vibe Trend Card (Plus only) ───────────────────────────────────────────────
export function VibeTrendCard({ allCheckIns, todayScore, rtPrimary, isPlus }) {
  const sorted = [...allCheckIns].sort((a, b) => (a.check_in_date < b.check_in_date ? 1 : -1));
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);
  const yesterdayScore = sorted.find((c) => c.check_in_date === yesterdayStr)?.vibe_score ?? null;

  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
  const weekScores = sorted.filter((c) => c.check_in_date >= weekAgo.toISOString().slice(0, 10)).map((c) => c.vibe_score);
  const weekAvg = weekScores.length > 0 ? Math.round(weekScores.reduce((a, b) => a + b, 0) / weekScores.length) : null;

  const diff = yesterdayScore !== null ? todayScore - yesterdayScore : null;
  const hasData = yesterdayScore !== null || weekAvg !== null;

  return (
    <div className="relative">
      <SectionCard className={!isPlus ? "opacity-60 pointer-events-none select-none" : ""}>
        <p className="text-xs font-black tracking-widest uppercase text-white/30 mb-4">Vibe Trend</p>
        {!hasData ? (
          <p className="text-white/35 text-sm">Complete more daily check-ins to unlock your trend.</p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <TrendStat label="Today" value={todayScore} color={`rgb(${rtPrimary})`} />
              <TrendStat label="Yesterday" value={yesterdayScore ?? "—"} color="rgba(255,255,255,0.5)" />
              <TrendStat label="This Week" value={weekAvg ?? "—"} color="rgba(212,168,67,0.9)" />
            </div>
            {diff !== null && (
              <div className="rounded-2xl px-4 py-2.5 text-xs text-center font-bold"
                style={{
                  background: diff >= 0 ? "rgba(52,211,153,0.07)" : "rgba(248,113,113,0.07)",
                  border: `1px solid ${diff >= 0 ? "rgba(52,211,153,0.2)" : "rgba(248,113,113,0.2)"}`,
                  color: diff >= 0 ? "#34D399" : "#F87171",
                }}>
                {diff >= 0
                  ? `Your vibe increased ${diff} point${diff !== 1 ? "s" : ""} since yesterday. ⬆️`
                  : `Today is a reset opportunity. One aligned action can shift the day.`}
              </div>
            )}
          </>
        )}
      </SectionCard>
      {!isPlus && <PlusGate rtPrimary={rtPrimary} />}
    </div>
  );
}

function TrendStat({ label, value, color }) {
  return (
    <div className="text-center rounded-2xl py-3"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <p className="font-heading font-black text-xl" style={{ color }}>{value}</p>
      <p className="text-[10px] text-white/30 mt-0.5">{label}</p>
    </div>
  );
}

// ── Future Self Progress Card (Plus only) ─────────────────────────────────────
export function FutureSelfCard({ allCheckIns, rtPrimary, isPlus }) {
  const totalDays = allCheckIns.length;
  const current = getStreakLevel(totalDays);
  const next = getNextStreakLevel(totalDays);
  const daysToNext = next ? next.days - totalDays : 0;
  const progress = next ? ((totalDays - current.days) / (next.days - current.days)) * 100 : 100;

  return (
    <div className="relative">
      <SectionCard className={!isPlus ? "opacity-60 pointer-events-none select-none" : ""}>
        <p className="text-xs font-black tracking-widest uppercase text-white/30 mb-3">Future Self Progress</p>
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-[11px] text-white/40">Current Level</p>
            <p className="font-heading font-black text-white text-base">{current.emoji} {current.label}</p>
          </div>
          {next && (
            <div className="text-right">
              <p className="text-[11px] text-white/40">Next Level</p>
              <p className="font-heading font-black text-sm" style={{ color: `rgb(${rtPrimary})` }}>{next.emoji} {next.label}</p>
            </div>
          )}
        </div>
        <div className="h-2 rounded-full overflow-hidden mb-2" style={{ background: "rgba(255,255,255,0.06)" }}>
          <motion.div className="h-full rounded-full"
            initial={{ width: 0 }} animate={{ width: `${Math.min(progress, 100)}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            style={{ background: `linear-gradient(90deg,rgba(${rtPrimary},0.5),rgb(${rtPrimary}))` }} />
        </div>
        {next ? (
          <p className="text-white/35 text-xs">
            Need <span className="font-black text-white/60">{daysToNext}</span> more daily check-in{daysToNext !== 1 ? "s" : ""} to reach <span style={{ color: `rgb(${rtPrimary})` }}>{next.label}</span>.
          </p>
        ) : (
          <p className="text-yellow-400 text-xs font-black">You've reached the highest level. Vibe Legend. 🌟</p>
        )}
      </SectionCard>
      {!isPlus && <PlusGate rtPrimary={rtPrimary} />}
    </div>
  );
}

// ── Achievement Badges (Plus only) ────────────────────────────────────────────
const ALL_BADGES = [
  { id: "first_checkin",    emoji: "🏆", label: "First Check-In",        check: (ci) => ci.length >= 1 },
  { id: "streak_3",         emoji: "🔥", label: "3-Day Vibe Starter",    check: (ci, s, ls) => ls >= 3 },
  { id: "streak_7",         emoji: "⚡", label: "7-Day Vibe Builder",    check: (ci, s, ls) => ls >= 7 },
  { id: "streak_30",        emoji: "💎", label: "30-Day Vibe Locked In", check: (ci, s, ls) => ls >= 30 },
  { id: "streak_90",        emoji: "👑", label: "90-Day Vibe Master",    check: (ci, s, ls) => ls >= 90 },
  { id: "gratitude_master", emoji: "🌟", label: "Gratitude Master",      check: (ci) => ci.filter((c) => c.gratitude).length >= 7 },
  { id: "intention_setter", emoji: "🎯", label: "Intention Setter",      check: (ci) => ci.filter((c) => c.intention).length >= 7 },
  { id: "future_self",      emoji: "🚀", label: "Future Self Mode",      check: (ci) => ci.length >= 30 },
];

export function BadgesCard({ allCheckIns, streak, longestStreak, isPlus, rtPrimary }) {
  return (
    <div className="relative">
      <SectionCard className={!isPlus ? "opacity-60 pointer-events-none select-none" : ""}>
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-4 h-4 text-yellow-400" />
          <p className="text-xs font-black tracking-widest uppercase text-white/30">Achievement Badges</p>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {ALL_BADGES.map((badge) => {
            const unlocked = badge.check(allCheckIns, streak, longestStreak);
            return (
              <div key={badge.id} className="flex flex-col items-center gap-1.5 text-center">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl transition-all"
                  style={unlocked ? {
                    background: "rgba(212,168,67,0.1)",
                    border: "1px solid rgba(212,168,67,0.3)",
                    filter: "drop-shadow(0 0 8px rgba(212,168,67,0.4))",
                    opacity: 1,
                  } : {
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    opacity: 0.2,
                    filter: "grayscale(1)",
                  }}>
                  {badge.emoji}
                </div>
                <p className="text-[9px] font-bold leading-tight"
                  style={{ color: unlocked ? "rgba(212,168,67,0.85)" : "rgba(255,255,255,0.2)" }}>
                  {badge.label}
                </p>
              </div>
            );
          })}
        </div>
      </SectionCard>
      {!isPlus && <PlusGate rtPrimary={rtPrimary} />}
    </div>
  );
}

// ── Vibe History Card (Plus only) ─────────────────────────────────────────────
export function VibeHistoryCard({ allCheckIns, streak, longestStreak, rtPrimary, isPlus }) {
  const [open, setOpen] = useState(false);
  const sorted = [...allCheckIns].sort((a, b) => (a.check_in_date < b.check_in_date ? 1 : -1));
  const last7 = sorted.slice(0, 7);
  const bestScore = allCheckIns.length > 0 ? Math.max(...allCheckIns.map((c) => c.vibe_score || 0)) : null;
  const hasEnough = allCheckIns.length >= 2;

  return (
    <div className="relative">
      <SectionCard className={!isPlus ? "opacity-60 pointer-events-none select-none" : ""}>
        <button className="w-full flex items-center justify-between" onClick={() => isPlus && setOpen((v) => !v)}>
          <p className="text-xs font-black tracking-widest uppercase text-white/30">Vibe History</p>
          {open ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
        </button>
        <button onClick={() => isPlus && setOpen((v) => !v)}
          className="mt-3 w-full py-2.5 rounded-2xl font-black text-sm transition-all"
          style={{ background: `rgba(${rtPrimary},0.07)`, border: `1px solid rgba(${rtPrimary},0.2)`, color: `rgb(${rtPrimary})` }}>
          View My Vibe History
        </button>
        {open && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-4 overflow-hidden">
            {!hasEnough ? (
              <p className="text-white/35 text-sm text-center py-3">Vibe history unlocks after more daily check-ins.</p>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <HistoryStat label="Best Score" value={bestScore ?? "—"} color="rgba(212,168,67,0.9)" />
                  <HistoryStat label="Streak" value={`${streak}d`} color="#F87171" />
                  <HistoryStat label="Longest" value={`${longestStreak}d`} color={`rgb(${rtPrimary})`} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-white/25 uppercase tracking-widest mb-2">Last 7 Check-ins</p>
                  <div className="space-y-1.5">
                    {last7.map((c) => {
                      const info = scoreLabel(c.vibe_score || 0);
                      return (
                        <div key={c.id} className="flex items-center gap-3 py-1.5 px-3 rounded-xl"
                          style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.05)" }}>
                          <span className="text-[10px] text-white/30 w-20 flex-shrink-0">{c.check_in_date}</span>
                          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                            <div className="h-full rounded-full" style={{ width: `${c.vibe_score}%`, background: info.color }} />
                          </div>
                          <span className="text-xs font-black w-8 text-right" style={{ color: info.color }}>{c.vibe_score}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </SectionCard>
      {!isPlus && <PlusGate rtPrimary={rtPrimary} />}
    </div>
  );
}

function HistoryStat({ label, value, color }) {
  return (
    <div className="text-center rounded-xl py-2.5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <p className="font-heading font-black text-lg" style={{ color }}>{value}</p>
      <p className="text-[9px] text-white/30 mt-0.5">{label}</p>
    </div>
  );
}

// ── Affirmation Card ──────────────────────────────────────────────────────────
export function AffirmationCard({ rtPrimary }) {
  return (
    <div className="rounded-3xl p-5 text-center"
      style={{
        background: `linear-gradient(135deg,rgba(${rtPrimary},0.07),rgba(155,126,255,0.06))`,
        border: `1px solid rgba(${rtPrimary},0.18)`,
      }}>
      <div className="flex items-center justify-center gap-2 mb-3">
        <Sparkles className="w-4 h-4" style={{ color: `rgb(${rtPrimary})` }} />
        <p className="text-xs font-black tracking-[0.3em] uppercase" style={{ color: `rgba(${rtPrimary},0.8)` }}>Daily Vibe Message</p>
      </div>
      <p className="text-white/80 text-sm leading-relaxed italic">
        "I regulate my energy, protect my peace, and move like my future self is already here."
      </p>
    </div>
  );
}

// ── Manifest Mode CTA ─────────────────────────────────────────────────────────
export function ManifestModeCTA({ rtPrimary, email, setEmail, onJoin, done, userEmail }) {
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
        Manifest Mode is coming soon — deeper alignment tracking, guided resets, future-self tools, saved reflections, and full Daily Shift rituals.
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
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="Your email…"
              className="flex-1 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(155,126,255,0.2)" }} />
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