/**
 * OrbRewardSystem
 *
 * Tracks Vibe Orb milestones and rewards per session.
 * Trail Boost (50 orbs) is saved to the user's account so it persists across sessions.
 * Non-member users who hit the threshold see a "membership required" message instead.
 */
import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";

const STORAGE_KEY = "vibeOrbData";

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveData(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
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
  };
}

function formatTimer(ms) {
  if (ms <= 0) return "0:00";
  const totalSec = Math.ceil(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// Check if user has a premium membership (role=premium or role=vip or role=admin)
function isMember(user) {
  if (!user) return false;
  const role = user.role?.toLowerCase() || "";
  return role === "admin" || role === "premium" || role === "vip" || role === "supporter";
}

export default function OrbRewardSystem({ orbCount, isMobile, user }) {
  const [state, setState] = useState(getInitialState);
  const [toast, setToast] = useState(null); // { msg, icon, color, type? }
  const [now, setNow] = useState(Date.now());
  const prevOrbCountRef = useRef(orbCount);
  const stateRef = useRef(state);
  stateRef.current = state;
  const savingTrailRef = useRef(false);

  // Tick every second for timers
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const showToast = useCallback((msg, icon, color, type) => {
    setToast({ msg, icon, color, type });
    setTimeout(() => setToast(null), 5000);
  }, []);

  // Persist state whenever it changes
  useEffect(() => {
    saveData(state);
  }, [state]);

  // Save trail boost unlock to user account
  const saveTrailBoostToAccount = useCallback(async () => {
    if (savingTrailRef.current || !user?.id) return;
    savingTrailRef.current = true;
    try {
      await base44.auth.updateMe({
        trail_boost_unlocked: true,
        trail_boost_unlocked_at: new Date().toISOString(),
      });
    } catch {
      // Non-critical — local state still works
    }
    savingTrailRef.current = false;
  }, [user?.id]);

  // On load: restore trail boost from user account if they earned it before
  useEffect(() => {
    if (!user?.trail_boost_unlocked) return;
    setState((prev) => {
      // If they have the account flag but no active trail in local state, restore it
      if (!prev.activeTrailExpiresAt || Date.now() >= prev.activeTrailExpiresAt) {
        // Grant a fresh 5-min trail on login if they previously unlocked it today
        const today = todayStr();
        if (prev.lastDailyResetDate === today && prev.dailyVibeOrbs >= 50) {
          return { ...prev, activeTrailExpiresAt: Date.now() + 5 * 60_000 };
        }
      }
      return prev;
    });
  }, [user?.trail_boost_unlocked]);

  // Process new orbs collected
  useEffect(() => {
    const newCount = orbCount;
    const prevCount = prevOrbCountRef.current;
    if (newCount <= prevCount) return;
    const added = newCount - prevCount;
    prevOrbCountRef.current = newCount;

    setState((prev) => {
      const today = todayStr();
      const isDailyReset = prev.lastDailyResetDate !== today;
      const prevDaily = isDailyReset ? 0 : prev.dailyVibeOrbs;
      const prevRound = prev.roundVibeOrbs;
      const prevLifetime = prev.lifetimeVibeOrbs;

      const newRound = prevRound + added;
      const newDaily = prevDaily + added;
      const newLifetime = prevLifetime + added;

      let auraExpiresAt = prev.activeAuraExpiresAt;
      let trailExpiresAt = prev.activeTrailExpiresAt;
      let cosmicExpiresAt = prev.activeCosmicSurgeExpiresAt;
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

      // ── Daily 25 orbs → Sky Rider badge ──
      if (prevDaily < 25 && newDaily >= 25) {
        showToast("Daily Sky Rider Complete!", "🌟", "#00E5FF");
      }

      // ── Daily 50 orbs → Trail Boost (member-gated) ──
      if (prevDaily < 50 && newDaily >= 50) {
        if (isMember(user)) {
          trailExpiresAt = Date.now() + 5 * 60_000;
          showToast("⚡ Trail Boost Unlocked — 5 min!", "⚡", "#FFD700", "trail_boost");
          // Save to account in background
          saveTrailBoostToAccount();
        } else {
          showToast("Trail Boost earned! Upgrade to member to activate.", "🔒", "#FFD700", "trail_locked");
        }
      }

      // ── Daily 100 orbs → Cosmic Surge Mode ──
      if (prevDaily < 100 && newDaily >= 100) {
        cosmicExpiresAt = Date.now() + 10 * 60_000;
        showToast("Cosmic Sky Rider Activated!", "🚀", "#FF4FC3");
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
      };
    });
  }, [orbCount, showToast, saveTrailBoostToAccount, user]);

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
            initial={{ opacity: 0, y: -20, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.92 }}
            transition={{ duration: 0.25 }}
            className="fixed z-[70] pointer-events-none"
            style={{
              top: isMobile ? "calc(env(safe-area-inset-top,0px) + 60px)" : "72px",
              left: "50%",
              transform: "translateX(-50%)",
              maxWidth: "88vw",
            }}
          >
            <div
              className="flex flex-col items-center gap-1 px-5 py-3 rounded-2xl text-center"
              style={{
                background: "rgba(0,0,0,0.82)",
                border: `1px solid ${toast.color}55`,
                backdropFilter: "blur(16px)",
                boxShadow: `0 0 28px ${toast.color}40`,
              }}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{toast.icon}</span>
                <span className="font-black text-[12px] tracking-wider" style={{ color: toast.color }}>
                  {toast.msg}
                </span>
              </div>
              {toast.type === "trail_boost" && (
                <p className="text-[10px] text-white/50">
                  Active in Vibe Suit editor → Rewards tab
                </p>
              )}
              {toast.type === "trail_locked" && (
                <p className="text-[10px] text-white/50">
                  Upgrade to Upper Vibe Plus to activate Trail Boost
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Active effects HUD (bottom-left) ── */}
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