import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronLeft, Flame, Sparkles, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { claimRewardCooldown, REWARD_SAVED_MESSAGE } from "@/lib/rewardCooldown";

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

const FREQUENCY_SCORE_ACTIONS = new Set(["aura_zone", "crystal_charge", "stage_visualizer", "ferris_wheel"]);

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

function hasQuestLock(saved) {
  if (!saved?.questRewardClaimed || !saved?.questCompletedAt) return false;
  return Date.now() - new Date(saved.questCompletedAt).getTime() < 24 * 60 * 60 * 1000;
}

function buildDaily(userId) {
  const date = todayKey();
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(storageKey(userId)) || "null"); } catch {}
  if (hasQuestLock(saved)) return saved;
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
    questCompletedAt: null,
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
  onOpenChange,
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

  useEffect(() => {
    onOpenChange?.(expanded);
    return () => onOpenChange?.(false);
  }, [expanded, onOpenChange]);

  useEffect(() => {
    if (!expanded) return;
    const body = document.body;
    const html = document.documentElement;
    const previous = {
      bodyOverflow: body.style.overflow,
      bodyOverscroll: body.style.overscrollBehavior,
      bodyTouchAction: body.style.touchAction,
      bodyUserSelect: body.style.userSelect,
      htmlOverscroll: html.style.overscrollBehavior,
    };
    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";
    body.style.touchAction = "none";
    body.style.userSelect = "none";
    html.style.overscrollBehavior = "none";
    return () => {
      body.style.overflow = previous.bodyOverflow;
      body.style.overscrollBehavior = previous.bodyOverscroll;
      body.style.touchAction = previous.bodyTouchAction;
      body.style.userSelect = previous.bodyUserSelect;
      html.style.overscrollBehavior = previous.htmlOverscroll;
    };
  }, [expanded]);

  useEffect(() => {
    if (daily?.questRewardClaimed && hasQuestLock(daily)) setMessage(REWARD_SAVED_MESSAGE);
  }, [daily?.questRewardClaimed, daily?.questCompletedAt]);

  useEffect(() => {
    const openDailyQuest = () => setExpanded(true);
    window.addEventListener("uvcOpenDailyQuest", openDailyQuest);
    return () => window.removeEventListener("uvcOpenDailyQuest", openDailyQuest);
  }, []);

  const grantCoins = useCallback(async (amount, reason) => {
    if (!amount) return false;
    const claim = await claimRewardCooldown(userId, `city:${reason}`);
    if (!claim.allowed) {
      setMessage(claim.message || REWARD_SAVED_MESSAGE);
      return false;
    }
    window.dispatchEvent(new CustomEvent("vibeCoinsCollected", {
      detail: {
        source: "daily_reward",
        coinIds: Array.from({ length: amount }, (_, i) => `daily_${claim.claimedAt}_${reason}_${i}`),
      },
    }));
    return true;
  }, [userId]);

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
      if (FREQUENCY_SCORE_ACTIONS.has(action)) {
        window.dispatchEvent(new CustomEvent("uvcFrequencyScoreAction", { detail: { action } }));
      }
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
      next.questCompletedAt = new Date().toISOString();
      window.dispatchEvent(new CustomEvent("uvcFrequencyScoreAction", { detail: { action: "daily_city_quest_complete" } }));
      rewards.push([50, "daily_city_quest"]);
      if (event.id === "abundance") rewards.push([5, "abundance_event_bonus"]);
      changed = true;
    }

    if (!changed) return;
    saveNext(next);
    rewards.forEach(([amount, reason]) => grantCoins(amount, reason));
    if (rewards.some(([, reason]) => reason === "daily_city_quest")) {
      setMessage(REWARD_SAVED_MESSAGE);
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
  }, [completeAction, saveNext]);

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
      grantCoins(5, `aura:${intention.id}`);
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

  const tapQuestRow = (task) => {
    completeAction(task.id);
    try { navigator?.vibrate?.(8); } catch {}
  };

  const stopBubble = (e) => e.stopPropagation();
  const stopBackdropScroll = (e) => {
    if (e.target === e.currentTarget) e.preventDefault();
    e.stopPropagation();
  };

  const questItems = (daily?.quest || []).map((id) => TASKS.find((t) => t.id === id)).filter(Boolean);
  const completedCount = questItems.filter((t) => daily?.completed?.[t.id]).length;

  if (!daily) return null;

  return (
    <AnimatePresence mode="wait">
      {expanded && (
        <motion.div
          key="daily-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          data-camera-scroll-lock="true"
          onClick={stopBubble}
          onPointerDown={stopBubble}
          onTouchStart={stopBubble}
          onTouchMove={stopBackdropScroll}
          className="fixed inset-0 flex items-center justify-center"
          style={{
            zIndex: 100000,
            pointerEvents: "auto",
            touchAction: "none",
            overscrollBehavior: "none",
            userSelect: "none",
            WebkitUserSelect: "none",
            boxSizing: "border-box",
            paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)",
            paddingRight: "max(3vw, env(safe-area-inset-right, 0px))",
            paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)",
            paddingLeft: "max(3vw, env(safe-area-inset-left, 0px))",
            background: "rgba(0, 0, 8, 0.56)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
          }}
        >
          <motion.div
            key="daily-card"
            initial={{ opacity: 0, y: -10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            data-camera-scroll-lock="true"
            onClick={stopBubble}
            onPointerDown={stopBubble}
            onTouchStart={stopBubble}
            onTouchMove={stopBubble}
            className="flex flex-col"
            style={{
              width: "min(94vw, 900px)",
              maxWidth: "100%",
              maxHeight: "calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 24px)",
              overflow: "hidden",
              overflowX: "hidden",
              boxSizing: "border-box",
              borderRadius: "clamp(18px, 4vw, 28px)",
              background: "rgba(5,6,18,0.97)",
              border: "1px solid rgba(0,229,255,0.22)",
              backdropFilter: "blur(22px)",
              WebkitBackdropFilter: "blur(22px)",
              boxShadow: "0 18px 60px rgba(0,0,0,0.52), 0 0 34px rgba(0,229,255,0.16)",
            }}
          >
            <div
              className="flex items-center justify-between gap-3 border-b border-white/5"
              style={{
                flexShrink: 0,
                minHeight: 64,
                padding: "8px 10px",
                background: "rgba(5,6,18,0.98)",
                boxSizing: "border-box",
              }}
            >
              <button
                type="button"
                onClick={closePanel}
                className="flex items-center justify-center gap-1 rounded-full font-black text-[11px] uppercase tracking-wider active:scale-95"
                style={{
                  minWidth: 48,
                  width: 72,
                  height: 48,
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  color: "rgba(255,255,255,0.76)",
                  touchAction: "manipulation",
                  cursor: "pointer",
                  userSelect: "none",
                  WebkitUserSelect: "none",
                }}
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>

              <div className="min-w-0 flex-1 text-center px-1">
                <p
                  className="font-black tracking-[0.13em] uppercase"
                  style={{
                    color: "#00E5FF",
                    fontSize: isMobile ? 10 : 11,
                    lineHeight: 1.25,
                    overflow: "hidden",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                  }}
                >
                  {message}
                </p>
                <div className="flex items-center justify-center gap-2 mt-1 text-[10px] text-white/45 flex-wrap">
                  <span className="inline-flex items-center gap-1"><Flame className="w-3 h-3 text-yellow-400" /> {daily.streak} day streak</span>
                  <span>{daily.questRewardClaimed ? "Quest reward claimed" : "Quest reward optional"}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={closePanel}
                className="rounded-full flex items-center justify-center flex-shrink-0 active:scale-95"
                style={{
                  width: 48,
                  height: 48,
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  color: "rgba(255,255,255,0.76)",
                  touchAction: "manipulation",
                  cursor: "pointer",
                  userSelect: "none",
                  WebkitUserSelect: "none",
                }}
                aria-label="Close Daily Quest"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div
              data-daily-modal-scroll="true"
              className="space-y-4"
              style={{
                flex: "1 1 auto",
                minHeight: 0,
                overflowY: "auto",
                overflowX: "hidden",
                WebkitOverflowScrolling: "touch",
                overscrollBehavior: "contain",
                touchAction: "pan-y",
                boxSizing: "border-box",
                padding: isMobile ? "12px" : "18px",
              }}
            >
              <div style={{ width: "100%", maxWidth: "100%", boxSizing: "border-box" }}>
                <p className="text-[10px] font-black text-white/35 uppercase tracking-wider mb-3">Today's intention</p>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 136px), 1fr))",
                    gap: 12,
                    width: "100%",
                    maxWidth: "100%",
                    boxSizing: "border-box",
                  }}
                >
                  {INTENTIONS.map((item) => {
                    const selected = daily?.intention === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => chooseIntention(item)}
                        className="rounded-2xl text-left font-black transition-all active:scale-[0.98]"
                        style={{
                          minHeight: 52,
                          padding: "12px 14px",
                          width: "100%",
                          maxWidth: "100%",
                          background: selected ? `${item.color}24` : `${item.color}12`,
                          border: `1px solid ${selected ? item.color : `${item.color}33`}`,
                          color: item.color,
                          touchAction: "manipulation",
                          cursor: "pointer",
                          userSelect: "none",
                          WebkitUserSelect: "none",
                          boxShadow: selected ? `0 0 18px ${item.color}22` : "none",
                        }}
                      >
                        <span className="block text-sm leading-snug break-words">{item.label}</span>
                        {selected && <span className="block text-[10px] mt-1 text-white/50">Selected aura</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ width: "100%", maxWidth: "100%", boxSizing: "border-box" }}>
                <div className="flex items-center justify-between mb-2 gap-3">
                  <p className="text-[10px] font-black text-white/35 uppercase tracking-wider">Daily city quest</p>
                  <p className="text-[10px] font-black whitespace-nowrap" style={{ color: completedCount === 3 ? "#4ADE80" : "#FFD36E" }}>{completedCount}/3{completedCount === 3 ? " Complete" : " Optional"}</p>
                </div>
                <div className="space-y-2">
                  {questItems.map((task) => {
                    const done = !!daily.completed?.[task.id];
                    return (
                      <button
                        key={task.id}
                        type="button"
                        onClick={() => tapQuestRow(task)}
                        className="flex items-center gap-3 rounded-2xl text-left transition-all active:scale-[0.99]"
                        style={{
                          width: "100%",
                          minHeight: 52,
                          padding: "12px 14px",
                          background: done ? "rgba(74,222,128,0.09)" : "rgba(255,255,255,0.04)",
                          border: `1px solid ${done ? "rgba(74,222,128,0.24)" : "rgba(255,255,255,0.08)"}`,
                          touchAction: "manipulation",
                          cursor: "pointer",
                          userSelect: "none",
                          WebkitUserSelect: "none",
                          boxSizing: "border-box",
                        }}
                      >
                        <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: done ? "#4ADE80" : "transparent", border: done ? "1px solid #4ADE80" : "1px solid rgba(255,255,255,0.24)", color: done ? "#001008" : "transparent" }}>
                          {done && <Check className="w-3 h-3" />}
                        </span>
                        <span className="text-xs font-bold leading-snug break-words" style={{ color: done ? "rgba(255,255,255,0.86)" : "rgba(255,255,255,0.62)" }}>{task.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl" style={{ width: "100%", maxWidth: "100%", padding: "12px", background: "rgba(155,126,255,0.07)", border: "1px solid rgba(155,126,255,0.16)", boxSizing: "border-box" }}>
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider" style={{ color: "#C4AAFF" }}>
                  <Sparkles className="w-3 h-3 flex-shrink-0" /> <span className="break-words">{event.name}</span>
                </div>
                <p className="text-[10px] text-white/40 mt-1 leading-relaxed break-words">{event.bonus}</p>
              </div>

              <div className="rounded-2xl" style={{ width: "100%", maxWidth: "100%", padding: "12px", background: "rgba(0,229,255,0.055)", border: "1px solid rgba(0,229,255,0.14)", boxSizing: "border-box" }}>
                <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: "#00E5FF" }}>Upper Vibe Beach Preview</p>
                <p className="text-[10px] leading-relaxed text-white/38 mt-1 break-words">Beach activities are optional and stay inside the world experience when you choose to visit.</p>
              </div>

              <p className="text-[9px] leading-relaxed text-white/25 break-words" style={{ width: "100%", maxWidth: "100%" }}>Vibe Coins are in-app reward points only and have no real-world cash value. Spend them in Upper Vibe Shop for aura, hoverboard, badge, and nameplate cosmetics.</p>
            </div>

            <div
              className="grid gap-2 border-t border-white/5"
              style={{
                flexShrink: 0,
                padding: "10px",
                background: "rgba(5,6,18,0.98)",
                gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
              }}
            >
              <button
                type="button"
                onClick={closePanel}
                className="rounded-2xl font-black tracking-wide active:scale-[0.99]"
                style={{
                  minHeight: 52,
                  background: "linear-gradient(135deg,#00B8D4,#00E5FF)",
                  border: "1px solid rgba(0,229,255,0.45)",
                  color: "#001018",
                  touchAction: "manipulation",
                  cursor: "pointer",
                  userSelect: "none",
                  WebkitUserSelect: "none",
                }}
              >
                Enter Upper Vibe City
              </button>
              <button
                type="button"
                onClick={closePanel}
                className="rounded-2xl font-black tracking-wide active:scale-[0.99]"
                style={{
                  minHeight: 52,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "rgba(255,255,255,0.78)",
                  touchAction: "manipulation",
                  cursor: "pointer",
                  userSelect: "none",
                  WebkitUserSelect: "none",
                }}
              >
                Skip for Now
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}