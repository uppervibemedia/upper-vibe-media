/**
 * OrbRewardSystem
 *
 * Handles all Vibe Orb reward milestones, timers, persistence, and HUD display.
 * Receives orbCount from UpperVibeCity and manages:
 *   - Round orbs (every 10) → 60s Vibe Aura
 *   - Daily 25 orbs → Daily Sky Rider badge
 *   - Daily 50 orbs → 5-min Enhanced Energy Trail
 *   - Daily 100 orbs → 10-min Cosmic Surge Mode
 */
import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";

const STORAGE_KEY = "vibeOrbData";

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

function todayStr() {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

function getInitialState() {
  const saved = loadData();
  const today = todayStr();
  const daily = saved?.lastDailyResetDate === today ? (saved.dailyVibeOrbs ?? 0) : 0;

  return {
    roundVibeOrbs: saved?.roundVibeOrbs ?? 0,
    dailyVibeOrbs: daily,
    lifetimeVibeOrbs: saved?.lifetimeVibeOrbs ?? 0,
    lastDailyResetDate: today,
    activeAuraExpiresAt: saved?.activeAuraExpiresAt ?? null,
    activeTrailExpiresAt: saved?.activeTrailExpiresAt ?? null,
    activeCosmicSurgeExpiresAt: saved?.activeCosmicSurgeExpiresAt ?? null,
    cosmicSkyRiderBadgeProgress: saved?.cosmicSkyRiderBadgeProgress ?? 0,
    lastProcessedLifetime: saved?.lastProcessedLifetime ?? 0,
  };
}

function formatTimer(ms) {
  if (ms <= 0) return "0:00";
  const totalSec = Math.ceil(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function OrbRewardSystem({ orbCount, isMobile }) {
  const [state, setState] = useState(getInitialState);
  const [toast, setToast] = useState(null); // { msg, icon, color }
  const [now, setNow] = useState(Date.now());
  const prevOrbCountRef = useRef(orbCount);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Tick every second for timers
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const showToast = useCallback((msg, icon, color) => {
    setToast({ msg, icon, color });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // Persist state whenever it changes
  useEffect(() => {
    saveData(state);
  }, [state]);

  // Process new orbs collected
  useEffect(() => {
    const newCount = orbCount;
    const prevCount = prevOrbCountRef.current;
    if (newCount <= prevCount) return;
    const added = newCount - prevCount;
    prevOrbCountRef.current = newCount;

    setState((prev) => {
      const today = todayStr();
      // Reset daily if new day
      const isDailyReset = prev.lastDailyResetDate !== today;
      const prevDaily = isDailyReset ? 0 : prev.dailyVibeOrbs;
      const prevRound = prev.roundVibeOrbs;
      const prevLifetime = prev.lifetimeVibeOrbs;
      const lastProcessed = isDailyReset ? 0 : (prev.lastProcessedLifetime ?? prevLifetime);

      const newRound = prevRound + added;
      const newDaily = prevDaily + added;
      const newLifetime = prevLifetime + added;

      let auraExpiresAt = prev.activeAuraExpiresAt;
      let trailExpiresAt = prev.activeTrailExpiresAt;
      let cosmicExpiresAt = prev.activeCosmicSurgeExpiresAt;
      let cosmicBadge = prev.cosmicSkyRiderBadgeProgress;
      let roundRemainder = newRound;

      // ── Round reward: every 10 orbs → 60s Vibe Aura ──
      const auraActivations = Math.floor(newRound / 10);
      const prevAuraActivations = Math.floor(prevRound / 10);
      if (auraActivations > prevAuraActivations) {
        auraExpiresAt = Date.now() + 60_000;
        roundRemainder = newRound % 10;
        showToast("Vibe Aura Activated!", "✨", "#9B7EFF");
      } else {
        roundRemainder = newRound;
      }

      // ── Daily milestones — track what was last processed ──
      // Use lifetime as a cursor so we only award each milestone once per day
      const thresholds = [
        { daily: 25,  lifetime: lastProcessed, action: () => {
          showToast("Daily Sky Rider Complete! ✦", "🌟", "#00E5FF");
        }},
        { daily: 50,  action: () => {
          trailExpiresAt = Date.now() + 5 * 60_000;
          showToast("Energy Trail Boosted — 5 min!", "⚡", "#FFD700");
        }},
        { daily: 100, action: () => {
          cosmicExpiresAt = Date.now() + 10 * 60_000;
          cosmicBadge = Math.min(cosmicBadge + 1, 999);
          showToast("Cosmic Sky Rider Activated!", "🚀", "#FF4FC3");
        }},
      ];

      for (const t of thresholds) {
        if (prevDaily < t.daily && newDaily >= t.daily) {
          t.action();
        }
      }

      return {
        ...prev,
        roundVibeOrbs: roundRemainder,
        dailyVibeOrbs: newDaily,
        lifetimeVibeOrbs: newLifetime,
        lastDailyResetDate: today,
        activeAuraExpiresAt: auraExpiresAt,
        activeTrailExpiresAt: trailExpiresAt,
        activeCosmicSurgeExpiresAt: cosmicExpiresAt,
        cosmicSkyRiderBadgeProgress: cosmicBadge,
        lastProcessedLifetime: newLifetime,
      };
    });
  }, [orbCount, showToast]);

  // Derived active flags
  const auraActive = state.activeAuraExpiresAt && now < state.activeAuraExpiresAt;
  const trailActive = state.activeTrailExpiresAt && now < state.activeTrailExpiresAt;
  const cosmicActive = state.activeCosmicSurgeExpiresAt && now < state.activeCosmicSurgeExpiresAt;

  const auraMs = auraActive ? state.activeAuraExpiresAt - now : 0;
  const trailMs = trailActive ? state.activeTrailExpiresAt - now : 0;
  const cosmicMs = cosmicActive ? state.activeCosmicSurgeExpiresAt - now : 0;

  const hasAnyActive = auraActive || trailActive || cosmicActive;

  return (
    <>
      {/* ── Toast notification ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.msg}
            initial={{ opacity: 0, y: -16, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.92 }}
            transition={{ duration: 0.25 }}
            className="fixed z-[70] pointer-events-none"
            style={{
              top: isMobile ? "calc(env(safe-area-inset-top,0px) + 60px)" : "72px",
              left: "50%",
              transform: "translateX(-50%)",
            }}
          >
            <div
              className="flex items-center gap-2 px-4 py-2 rounded-full font-black text-white text-[11px] tracking-wider"
              style={{
                background: `rgba(0,0,0,0.75)`,
                border: `1px solid ${toast.color}55`,
                backdropFilter: "blur(12px)",
                boxShadow: `0 0 20px ${toast.color}40`,
                color: toast.color,
              }}
            >
              <span>{toast.icon}</span>
              <span>{toast.msg}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Active effects HUD (subtle, bottom-left) ── */}
      {hasAnyActive && (
        <div
          className="fixed z-[61] flex flex-col gap-1 pointer-events-none"
          style={{
            left: isMobile ? "8px" : "12px",
            bottom: isMobile
              ? "calc(env(safe-area-inset-bottom,0px) + 120px)"
              : "88px",
          }}
        >
          {cosmicActive && (
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black"
              style={{
                background: "rgba(255,64,195,0.12)",
                border: "1px solid rgba(255,64,195,0.3)",
                color: "#FF4FC3",
                backdropFilter: "blur(8px)",
              }}
            >
              🚀 Cosmic Surge {formatTimer(cosmicMs)}
            </div>
          )}
          {trailActive && !cosmicActive && (
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black"
              style={{
                background: "rgba(255,215,0,0.10)",
                border: "1px solid rgba(255,215,0,0.25)",
                color: "#FFD700",
                backdropFilter: "blur(8px)",
              }}
            >
              ⚡ Trail Boost {formatTimer(trailMs)}
            </div>
          )}
          {auraActive && (
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black"
              style={{
                background: "rgba(155,126,255,0.12)",
                border: "1px solid rgba(155,126,255,0.28)",
                color: "#9B7EFF",
                backdropFilter: "blur(8px)",
              }}
            >
              ✨ Vibe Aura {formatTimer(auraMs)}
            </div>
          )}
        </div>
      )}
    </>
  );
}