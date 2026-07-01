import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronDown, Flame, Sparkles, X, Zap } from "lucide-react";
import { base44 } from "@/api/base44Client";

const INTENTIONS = [
  { id: "peace", label: "Peace", color: "#4CC9FF", itemId: "daily_intention_peace" },
  { id: "focus", label: "Focus", color: "#F8FAFC", itemId: "daily_intention_focus" },
  { id: "abundance", label: "Abundance", color: "#FFD36E", itemId: "daily_intention_abundance" },
  { id: "confidence", label: "Confidence", color: "#FF7A3D", itemId: "daily_intention_confidence" },
  { id: "love", label: "Love", color: "#FF6EC7", itemId: "daily_intention_love" },
  { id: "creativity", label: "Creativity", color: "#A078FF", itemId: "daily_intention_creativity" },
  { id: "healing", label: "Healing", color: "#4ADE80", itemId: "daily_intention_healing" },
];

const TASKS = [
  { id: "vibecheck", label: "Complete Daily Vibe Check" },
  { id: "aura_zone", label: "Activate one Aura Zone" },
  { id: "stage_visualizer", label: "Watch one Music Stage visualizer" },
  { id: "crystal_charge", label: "Charge at a Crystal Zone" },
  { id: "ferris_wheel", label: "Ride the Ferris Wheel" },
  { id: "dance_60", label: "Dance for 60 seconds" },
  { id: "academy", label: "Visit Vibe Academy" },
  { id: "sacred_symbol", label: "Activate one sacred geometry symbol" },
  { id: "symbol_activation_3", label: "Activate 3 sacred geometry symbols" },
  { id: "read_frequency_lesson", label: "Read 1 Frequency Lesson" },
  { id: "visualizer_dome", label: "Enter Visualizer Dome" },
  { id: "beach_visit", label: "Visit Upper Vibe Beach" },
];

const ACTION_REWARDS = {
  vibecheck: 10,
  aura_zone: 0,
  crystal_charge: 5,
  stage_visualizer: 10,
  ferris_wheel: 5,
  academy: 10,
};

const WEEKLY_EVENTS = [
  { id: "abundance", name: "Abundance Week", bonus: "+5 bonus coins on completed city quest" },
  { id: "crystal", name: "Crystal Charge Weekend", bonus: "+5 bonus coins on crystal charge" },
  { id: "reset", name: "432 Hz Reset Day", bonus: "Reset-focused affirmations highlighted" },
  { id: "music", name: "New Music Drop Mission", bonus: "+5 bonus coins on stage discovery" },
  { id: "fullmoon", name: "Full Moon Frequency Event", bonus: "Moonlit aura reward structure ready" },
  { id: "aura", name: "Aura Activation Day", bonus: "+5 bonus coins on intention aura" },
];

const CRYSTAL_NODES = [{ x: -30, z: -10 }, { x: 30, z: -10 }];
const SACRED_SYMBOLS = [
  { x: 22, z: 1.5 }, { x: 22, z: -13.5 }, { x: -8, z: 4 }, { x: -24, z: 3 },
  { x: 5, z: -18 }, { x: -7.5, z: -21.5 }, { x: -25, z: 18 }, { x: -31, z: -19 }, { x: 31, z: 20 },
];

function todayKey() {
  return new Date().toLocaleDateString("en-CA");
}

function isYesterday(date) {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return date === d.toLocaleDateString("en-CA");
}

function hashString(value) {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = Math.imul(31, h) + value.charCodeAt(i) | 0;
  return Math.abs(h);
}

function pickQuest(date, userId) {
  const pool = [...TASKS];
  const selected = [];
  let seed = hashString(`${date}:${userId || "guest"}`);
  while (selected.length < 3 && pool.length) {
    seed = (seed * 9301 + 49297) % 233280;
    const idx = seed % pool.length;
    selected.push(pool.splice(idx, 1)[0].id);
  }
  return selected;
}

function streakCoinReward(streak) {
  if (streak === 1) return 10;
  if (streak === 2) return 15;
  if (streak === 3) return 20;
  return 0;
}

function milestoneFor(streak) {
  if (streak === 7) return { id: "badge_streak_7", name: "7-Day Aura Badge", category: "badge" };
  if (streak === 14) return { id: "streak_glow_14", name: "14-Day Hoverboard Glow", category: "avatar_glow" };
  if (streak === 30) return { id: "badge_streak_30", name: "30-Day Rare Frequency Badge", category: "badge" };
  return null;
}

function eventForDate(date) {
  const week = Math.floor(hashString(date.slice(0, 8)) / 7);
  return WEEKLY_EVENTS[week % WEEKLY_EVENTS.length];
}

function storageKey(userId) {
  return `uvc_daily_city_${userId || "guest"}`;
}

function buildDaily(userId) {
  const date = todayKey();
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(storageKey(userId)) || "null"); } catch {}
  if (saved?.date === date) return saved;
  const streak = saved?.date && isYesterday(saved.date) ? (saved.streak || 0) + 1 : 1;
  return {
    date,
    streak,
    intention: null,
    quest: pickQuest(date, userId),
    completed: {},
    rewardedActions: {},
    loginRewardClaimed: false,
    streakRewardClaimed: false,
    questRewardClaimed: false,
    milestoneRewards: {},
    symbolActivations: {},
    welcomeDismissed: false,
  };
}

export default function DailyCityEngagement({
  userId,
  isMobile,
  mobileLayout,
  worldMode,
  playerPos,
  isDancing,
  stageWatching,
  domeOpen,
  ferrisRiding,
  onSetIntentionAura,
}) {
  const [daily, setDaily] = useState(() => buildDaily(userId));
  const [expanded, setExpanded] = useState(() => !buildDaily(userId).welcomeDismissed);
  const [message, setMessage] = useState("Welcome back. Your frequency is ready.");
  const [danceSeconds, setDanceSeconds] = useState(0);
  const dailyRef = useRef(daily);
  const grantedItemsRef = useRef(new Set());
  const event = useMemo(() => eventForDate(todayKey()), []);

  useEffect(() => {
    const next = buildDaily(userId);
    setDaily(next);
    dailyRef.current = next;
    setExpanded(!next.welcomeDismissed);
  }, [userId]);

  useEffect(() => {
    dailyRef.current = daily;
    try { localStorage.setItem(storageKey(userId), JSON.stringify(daily)); } catch {}
  }, [daily, userId]);

  const grantCoins = useCallback((amount, reason) => {
    if (!amount) return;
    window.dispatchEvent(new CustomEvent("vibeCoinsCollected", {
      detail: {
        source: "daily_reward",
        coinIds: Array.from({ length: amount }, (_, i) => `daily_${dailyRef.current.date}_${reason}_${i}`),
      },
    }));
  }, []);

  const grantMilestoneItem = useCallback(async (item) => {
    if (!userId || !item || grantedItemsRef.current.has(item.id)) return;
    grantedItemsRef.current.add(item.id);
    try {
      const existing = await base44.entities.UserInventory.filter({ user_id: userId, item_id: item.id });
      if (existing?.length) return;
      await base44.entities.UserInventory.create({
        user_id: userId,
        item_id: item.id,
        item_name: item.name,
        item_category: item.category,
        equipped: false,
        acquired_at: new Date().toISOString(),
      });
    } catch {}
  }, [userId]);

  const saveNext = useCallback((next) => {
    dailyRef.current = next;
    setDaily(next);
  }, []);

  const completeAction = useCallback((action) => {
    const prev = dailyRef.current;
    if (!prev) return;
    let next = { ...prev, completed: { ...prev.completed }, rewardedActions: { ...prev.rewardedActions }, milestoneRewards: { ...prev.milestoneRewards } };
    let changed = false;
    const rewards = [];

    if (!next.completed[action]) {
      next.completed[action] = true;
      changed = true;
    }

    const actionReward = ACTION_REWARDS[action] || 0;
    if (actionReward && !next.rewardedActions[action]) {
      next.rewardedActions[action] = true;
      rewards.push([actionReward, action]);
      changed = true;
    }

    const allDone = next.quest.every((id) => next.completed[id]);
    if (allDone && !next.questRewardClaimed) {
      next.questRewardClaimed = true;
      rewards.push([50, "daily_city_quest"]);
      if (event.id === "abundance") rewards.push([5, "abundance_event_bonus"]);
      changed = true;
    }

    if (!changed) return;
    saveNext(next);
    rewards.forEach(([amount, reason]) => grantCoins(amount, reason));
    if (rewards.some(([, reason]) => reason === "daily_city_quest")) {
      setMessage("Daily City Quest Complete — +50 Vibe Coins");
    }
  }, [event.id, grantCoins, saveNext]);

  useEffect(() => {
    const prev = dailyRef.current;
    if (!prev || prev.loginRewardClaimed) return;
    const next = { ...prev, loginRewardClaimed: true };
    saveNext(next);
    grantCoins(10, "daily_login");
  }, [grantCoins, saveNext, daily?.date]);

  useEffect(() => {
    const prev = dailyRef.current;
    if (!prev || prev.streakRewardClaimed) return;
    const reward = streakCoinReward(prev.streak);
    const milestone = milestoneFor(prev.streak);
    const next = { ...prev, streakRewardClaimed: true, milestoneRewards: { ...prev.milestoneRewards } };
    if (milestone && !next.milestoneRewards[milestone.id]) next.milestoneRewards[milestone.id] = true;
    saveNext(next);
    if (reward) grantCoins(reward, `streak_day_${prev.streak}`);
    if (milestone) grantMilestoneItem(milestone);
  }, [daily?.date, grantCoins, grantMilestoneItem, saveNext]);

  useEffect(() => {
    const onAction = (e) => {
      const action = e.detail?.action;
      if (action === "sacred_symbol_activated") {
        const symbolId = e.detail?.symbolId;
        const prev = dailyRef.current;
        const activations = { ...(prev?.symbolActivations || {}) };
        if (symbolId) activations[symbolId] = true;
        saveNext({ ...prev, symbolActivations: activations });
        completeAction("sacred_symbol");
        if (Object.keys(activations).length >= 3) completeAction("symbol_activation_3");
        return;
      }
      if (action) completeAction(action);
    };
    window.addEventListener("uvcDailyAction", onAction);
    return () => window.removeEventListener("uvcDailyAction", onAction);
  }, [completeAction]);

  useEffect(() => { if (worldMode === "beach") completeAction("beach_visit"); }, [worldMode, completeAction]);
  useEffect(() => { if (stageWatching) completeAction("stage_visualizer"); }, [stageWatching, completeAction]);
  useEffect(() => { if (domeOpen) completeAction("visualizer_dome"); }, [domeOpen, completeAction]);
  useEffect(() => { if (ferrisRiding) completeAction("ferris_wheel"); }, [ferrisRiding, completeAction]);

  useEffect(() => {
    if (!playerPos || worldMode !== "city") return;
    if (CRYSTAL_NODES.some((n) => (playerPos.x - n.x) ** 2 + (playerPos.z - n.z) ** 2 < 5.2 ** 2)) {
      completeAction("crystal_charge");
    }
  }, [playerPos?.x, playerPos?.z, worldMode, completeAction]);

  useEffect(() => {
    if (!isDancing) return;
    const id = setInterval(() => {
      setDanceSeconds((s) => {
        const next = s + 1;
        if (next >= 60) completeAction("dance_60");
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [isDancing, completeAction]);

  const chooseIntention = (intention) => {
    const next = { ...dailyRef.current, intention: intention.id };
    saveNext(next);
    onSetIntentionAura?.(intention);
    completeAction("aura_zone");
    const afterAura = dailyRef.current;
    if (event.id === "aura" && !afterAura.rewardedActions?.aura_activation_day) {
      saveNext({ ...afterAura, rewardedActions: { ...(afterAura.rewardedActions || {}), aura_activation_day: true } });
      grantCoins(5, "aura_activation_day");
      setMessage("Intention aura set — +5 Aura Activation Day bonus");
    } else {
      setMessage("Intention aura set — daily quest progress is separate");
    }
  };

  const closePanel = () => {
    const next = { ...dailyRef.current, welcomeDismissed: true };
    saveNext(next);
    setExpanded(false);
  };

  const questItems = (daily?.quest || []).map((id) => TASKS.find((t) => t.id === id)).filter(Boolean);
  const completedCount = questItems.filter((t) => daily?.completed?.[t.id]).length;
  const intention = INTENTIONS.find((i) => i.id === daily?.intention);
  const top = isMobile && mobileLayout ? mobileLayout.sa.top + 92 : 92;

  if (!daily) return null;

  return (
    <div className="absolute left-1/2 z-[66] pointer-events-none" style={{ top, transform: "translateX(-50%)", width: isMobile ? "min(92vw, 360px)" : 360 }}>
      <AnimatePresence mode="wait">
        {expanded ? (
          <motion.div
            key="daily-card"
            initial={{ opacity: 0, y: -12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.96 }}
            className="pointer-events-auto rounded-3xl overflow-hidden"
            style={{ background: "rgba(5,6,18,0.86)", border: "1px solid rgba(0,229,255,0.18)", backdropFilter: "blur(22px)", boxShadow: "0 18px 60px rgba(0,0,0,0.45), 0 0 34px rgba(0,229,255,0.12)" }}
          >
            <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-white/5">
              <div>
                <p className="text-[11px] font-black tracking-[0.18em] uppercase" style={{ color: "#00E5FF" }}>{message}</p>
                <div className="flex items-center gap-3 mt-2 text-[10px] text-white/45">
                  <span className="inline-flex items-center gap-1"><Flame className="w-3 h-3 text-yellow-400" /> {daily.streak} day streak</span>
                  <span>{daily.questRewardClaimed ? "Quest reward claimed" : "Quest reward unlocks at 3/3"}</span>
                </div>
              </div>
              <button onClick={closePanel} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.55)", touchAction: "manipulation" }}>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="px-4 py-3 space-y-3">
              <div>
                <p className="text-[10px] font-black text-white/35 uppercase tracking-wider mb-2">Today's intention</p>
                {intention ? (
                  <div className="flex items-center justify-between rounded-2xl px-3 py-2" style={{ background: `${intention.color}18`, border: `1px solid ${intention.color}40` }}>
                    <span className="text-sm font-black" style={{ color: intention.color }}>{intention.label}</span>
                    <span className="text-[10px] font-bold text-white/45">session aura active</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-1.5">
                    {INTENTIONS.map((item) => (
                      <button key={item.id} onClick={() => chooseIntention(item)} className="rounded-xl px-2 py-2 text-[10px] font-black transition-all active:scale-95" style={{ background: `${item.color}14`, border: `1px solid ${item.color}33`, color: item.color, touchAction: "manipulation" }}>
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-black text-white/35 uppercase tracking-wider">Daily city quest</p>
                  <p className="text-[10px] font-black" style={{ color: completedCount === 3 ? "#4ADE80" : "#FFD36E" }}>{completedCount}/3{completedCount === 3 ? " Complete" : ""}</p>
                </div>
                <div className="space-y-1.5">
                  {questItems.map((task) => {
                    const done = !!daily.completed?.[task.id];
                    return (
                      <div key={task.id} className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: done ? "rgba(74,222,128,0.08)" : "rgba(255,255,255,0.035)", border: `1px solid ${done ? "rgba(74,222,128,0.18)" : "rgba(255,255,255,0.06)"}` }}>
                        <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: done ? "#4ADE80" : "transparent", border: done ? "1px solid #4ADE80" : "1px solid rgba(255,255,255,0.22)", color: done ? "#001008" : "transparent" }}>
                          {done && <Check className="w-2.5 h-2.5" />}
                        </div>
                        <span className="text-[11px] font-bold" style={{ color: done ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.52)" }}>{task.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl px-3 py-2" style={{ background: "rgba(155,126,255,0.07)", border: "1px solid rgba(155,126,255,0.16)" }}>
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider" style={{ color: "#C4AAFF" }}>
                  <Sparkles className="w-3 h-3" /> {event.name}
                </div>
                <p className="text-[10px] text-white/35 mt-1">{event.bonus}</p>
              </div>

              <p className="text-[9px] leading-relaxed text-white/25">Vibe Coins are in-app reward points only and have no real-world cash value. Spend them in Upper Vibe Shop for aura, hoverboard, badge, and nameplate cosmetics.</p>
            </div>
          </motion.div>
        ) : (
          <motion.button
            key="daily-chip"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            onClick={() => setExpanded(true)}
            className="pointer-events-auto mx-auto flex items-center gap-2 px-3 py-2 rounded-full text-[10px] font-black tracking-wider uppercase"
            style={{ background: "rgba(5,6,18,0.76)", border: "1px solid rgba(0,229,255,0.18)", color: "rgba(255,255,255,0.62)", backdropFilter: "blur(14px)", touchAction: "manipulation" }}
          >
            <Zap className="w-3 h-3" style={{ color: "#FFD36E" }} /> Daily Quest {completedCount}/3{completedCount === 3 ? " Complete" : ""} <ChevronDown className="w-3 h-3" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}