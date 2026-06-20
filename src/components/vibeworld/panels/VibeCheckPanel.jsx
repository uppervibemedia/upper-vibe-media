import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { X, Sparkles, TrendingUp, TrendingDown, Zap, Clock, BarChart3, ArrowRight } from "lucide-react";
import { base44 } from "@/api/base44Client";

const CATEGORY_LABELS = {
  safety: "Safety",
  clarity: "Clarity",
  consistency: "Consistency",
  gratitude: "Gratitude",
  rest: "Rest",
  action: "Action",
};

function computeCategories(mood, moodScore) {
  const base = moodScore || 50;
  const variation = (m) => Math.max(5, Math.min(95, base + (Math.sin(m * 2.3) * 15) + (Math.cos(m * 1.7) * 10)));
  return {
    safety: Math.round(variation(1)),
    clarity: Math.round(variation(2)),
    consistency: Math.round(variation(3)),
    gratitude: Math.round(variation(4)),
    rest: Math.round(variation(5)),
    action: Math.round(variation(6)),
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

export default function VibeCheckPanel({ open, onClose, isMobile, onViewFullProgress }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const checkIns = await base44.entities.VibeCheckIn.list("-created_date", 30);
        if (cancelled) return;

        const latest = checkIns[0];
        const yesterday = checkIns.find((c) => {
          const d = new Date(c.check_in_date || c.created_date);
          const now = new Date();
          const target = new Date(now);
          target.setDate(target.getDate() - 1);
          return d.toDateString() === target.toDateString();
        });

        const categories = latest
          ? computeCategories(latest.mood, latest.mood_score)
          : computeCategories("neutral", 50);

        setData({
          score: latest?.vibe_score || latest?.mood_score || 50,
          status: getStatus(latest?.vibe_score || latest?.mood_score || 50),
          streak: latest?.streak_days || 0,
          yesterdayScore: yesterday?.vibe_score || yesterday?.mood_score || null,
          categories,
          mood: latest?.mood || "neutral",
          intention: latest?.intention || "",
        });
      } catch (e) {
        console.error("[VibeCheckPanel] fetch error:", e);
        setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [open]);

  const hapticTap = () => { try { navigator?.vibrate?.(10); } catch {} };

  if (!open) return null;

  const scoreDiff = data?.yesterdayScore != null ? data.score - data.yesterdayScore : null;

  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 30, stiffness: 300 }}
      className="fixed inset-x-0 bottom-0 rounded-t-3xl overflow-hidden flex flex-col"
      style={{
        zIndex: 70,
        height: isMobile ? "85dvh" : "70vh",
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
          <Sparkles className="w-5 h-5 text-cyan-400" />
          <h3 className="font-heading font-black text-lg text-white">Vibe Mirror</h3>
        </div>
        <button
          onTouchStart={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="w-11 h-11 rounded-full flex items-center justify-center transition-all hover:bg-white/10 active:bg-white/20"
          style={{
            color: "rgba(255,255,255,0.6)",
            minWidth: 44, minHeight: 44,
            touchAction: "manipulation", pointerEvents: "auto",
          }}
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Body — scrollable */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-cyan-400/20 border-t-cyan-400 rounded-full animate-spin" />
          </div>
        ) : !data ? (
          <div className="text-center py-16">
            <p className="text-white/30 text-sm font-medium">
              Step into the Vibe Mirror to see your energy.
            </p>
            <p className="text-white/15 text-xs mt-2">
              Your first check-in unlocks your full reflection.
            </p>
          </div>
        ) : (
          <>
            {/* Score circle */}
            <div className="flex flex-col items-center py-3">
              <div
                className="relative w-28 h-28 rounded-full flex items-center justify-center"
                style={{
                  background: `radial-gradient(circle at 30% 30%, ${data.status.color}22, transparent 70%)`,
                  border: `3px solid ${data.status.color}`,
                  boxShadow: `0 0 30px ${data.status.color}33`,
                }}
              >
                <span className="text-3xl font-heading font-black text-white">{data.score}</span>
              </div>
              <p className="text-sm font-bold mt-2" style={{ color: data.status.color }}>
                {data.status.label}
              </p>
              {scoreDiff != null && (
                <div className="flex items-center gap-1 mt-1">
                  {scoreDiff > 0 ? (
                    <TrendingUp className="w-3.5 h-3.5 text-green-400" />
                  ) : scoreDiff < 0 ? (
                    <TrendingDown className="w-3.5 h-3.5 text-red-400" />
                  ) : null}
                  <span className={`text-xs font-bold ${scoreDiff > 0 ? "text-green-400" : scoreDiff < 0 ? "text-red-400" : "text-white/30"}`}>
                    {scoreDiff > 0 ? `+${scoreDiff}` : scoreDiff}
                    {scoreDiff === 0 ? " no change" : ` vs yesterday`}
                  </span>
                </div>
              )}
            </div>

            {/* Streak */}
            <div
              className="flex items-center gap-3 p-3 rounded-xl"
              style={{ background: "rgba(0,229,255,0.05)", border: "1px solid rgba(0,229,255,0.1)" }}
            >
              <Zap className="w-5 h-5 text-cyan-400 flex-shrink-0" />
              <div>
                <p className="text-[11px] font-black tracking-wider text-cyan-400/70 uppercase">
                  Current Streak
                </p>
                <p className="text-lg font-heading font-black text-white">
                  {data.streak} {data.streak === 1 ? "day" : "days"}
                </p>
              </div>
            </div>

            {/* Category breakdown */}
            <div>
              <p className="text-[10px] font-black tracking-wider text-white/30 uppercase mb-3">
                Energy Breakdown
              </p>
              <div className="space-y-2.5">
                {Object.entries(data.categories).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-3">
                    <span className="text-[10px] font-bold text-white/40 w-20 text-right flex-shrink-0">
                      {CATEGORY_LABELS[key] || key}
                    </span>
                    <div className="flex-1 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${value}%`,
                          background: `linear-gradient(90deg, #00E5FF44, ${value > 60 ? "#4ADE80" : value > 35 ? "#FBBF24" : "#F87171"})`,
                        }}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-white/50 w-8 text-left">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Mood & Intention */}
            {data.intention && (
              <div
                className="p-3 rounded-xl"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <p className="text-[10px] font-black tracking-wider text-white/25 uppercase mb-1">
                  Today's Intention
                </p>
                <p className="text-sm text-white/60 italic">"{data.intention}"</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer buttons */}
      <div className="flex-shrink-0 px-5 py-4 border-t border-white/5 space-y-2">
        <button
          onTouchStart={(e) => e.stopPropagation()}
          onClick={() => { hapticTap(); onClose(); }}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-black text-xs tracking-wider transition-all hover:brightness-110 active:scale-95"
          style={{
            background: "linear-gradient(135deg,#00D4F0,#00E5FF)",
            color: "#000",
            minHeight: 48,
            touchAction: "manipulation",
            pointerEvents: "auto",
          }}
        >
          <Sparkles className="w-4 h-4" />
          Check In
        </button>
        {onViewFullProgress && (
          <button
            onTouchStart={(e) => e.stopPropagation()}
            onClick={() => { hapticTap(); onViewFullProgress(); }}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-black text-xs tracking-wider transition-all hover:bg-white/10 active:scale-95"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.6)",
              minHeight: 48,
              touchAction: "manipulation",
              pointerEvents: "auto",
            }}
          >
            <BarChart3 className="w-4 h-4" />
            View Full Progress
          </button>
        )}
        <button
          onTouchStart={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="w-full py-2.5 text-[10px] font-bold text-white/20 tracking-wider uppercase"
          style={{ minHeight: 44, touchAction: "manipulation", pointerEvents: "auto" }}
        >
          Close
        </button>
      </div>
    </motion.div>
  );
}