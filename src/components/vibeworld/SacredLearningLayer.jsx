import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Sparkles, X, Zap } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { claimRewardCooldown, REWARD_SAVED_MESSAGE } from "@/lib/rewardCooldown";
import { getState as getRadioState } from "@/lib/radioAudioManager";
import SymbolActivatorCard from "@/components/vibeworld/SymbolActivatorCard";

const DAILY_WISDOM = [
  "Your nervous system is part of your manifestation. A regulated state helps you make clearer choices.",
  "Energy is built through repetition. What you practice daily becomes your frequency.",
  "Calm is not weakness. Calm gives you control over your next move.",
  "Your attention is currency. Where you place it, your energy follows.",
  "Manifestation works better when your actions match your intention.",
  "Music can shift your state, but your habits keep the frequency stable.",
];

const SYMBOLS = [
  { id: "torus", title: "Torus Field", kind: "torus", x: 22, z: 1.5, r: 4.1, exitR: 5.0, teaching: "Choose the energy loop you want to strengthen today.", action: "Activate the symbol to set today’s frequency." },
  { id: "seed", title: "Seed of Life", kind: "seed", x: 22, z: -13.5, r: 4.0, exitR: 4.9, teaching: "Every result begins as a seed.", action: "Plant one clear daily intention." },
  { id: "tree", title: "Energy First", kind: "tree", x: -8, z: 4, r: 3.9, exitR: 4.8, teaching: "Your state changes how you move, speak, create, and decide.", action: "Choose the state you want to lead from." },
  { id: "metatron", title: "Metatron’s Cube", kind: "metatron", x: -24, z: 3, r: 4.05, exitR: 5.0, teaching: "Structure gives energy direction.", action: "Turn focus into form." },
  { id: "vesica", title: "Vesica Piscis", kind: "vesica", x: 5, z: -18, r: 3.7, exitR: 4.6, teaching: "New realities form where choice meets repetition.", action: "Step through one doorway today." },
  { id: "chakra", title: "Calm Is Power", kind: "chakra", x: -7.5, z: -21.5, r: 3.4, exitR: 4.25, teaching: "A regulated nervous system helps you respond instead of react.", action: "Reset your signal." },
  { id: "egg", title: "Merkaba Motion", kind: "egg", x: -25, z: 18, r: 3.6, exitR: 4.5, teaching: "Your energy moves with attention.", action: "Align before you accelerate." },
  { id: "sri", title: "Sri Yantra", kind: "sri", x: -31, z: -19, r: 3.55, exitR: 4.45, teaching: "Desire needs direction.", action: "Focus scattered energy into one signal." },
  { id: "flower", title: "Flower of Life", kind: "flower", x: 31, z: 20, r: 3.55, exitR: 4.45, teaching: "What you repeat becomes the pattern you live inside.", action: "Choose one pattern worth repeating." },
  { id: "stage_metatron", title: "Stage Metatron’s Cube", kind: "metatron", x: -9, z: -31, r: 3.65, exitR: 4.55, teaching: "Structure gives stage energy direction.", action: "Focus one sound or thought." },
  { id: "stage_seed", title: "Stage Seed of Life", kind: "seed", x: 10.5, z: -27.5, r: 3.25, exitR: 4.1, teaching: "A new sound can plant a new state.", action: "Let one rhythm reset your energy." },
  { id: "stage_vesica", title: "Stage Vesica Piscis", kind: "vesica", x: -16, z: -31, r: 3.15, exitR: 3.95, teaching: "Music opens the doorway between feeling and action.", action: "Notice what the song invites you to become." },
  { id: "stage_torus", title: "Stage Torus Field", kind: "torus", x: 16, z: -31, r: 3.15, exitR: 3.95, teaching: "The energy you bring to sound returns through your body.", action: "Receive the frequency with intention." },
  { id: "stage_merkaba", title: "Stage Merkaba", kind: "egg", x: -24, z: -11, r: 3.0, exitR: 3.8, teaching: "Aligned motion moves energy upward.", action: "Point your attention toward elevation." },
  { id: "stage_hex", title: "Stage Hex Geometry", kind: "hex", x: 30, z: -25, r: 3.0, exitR: 3.8, teaching: "Patterns make sound feel stable and alive.", action: "Find the pattern inside the beat." },
];

const ZONE_LESSONS = [
  { id: "stage", name: "Main Stage", x: 0, z: -32, r: 8, title: "Sound as Frequency", text: "Sound is not just entertainment here. It is a frequency tool for emotion, creativity, and state change.", action: "Notice how one song shifts your body." },
  { id: "dance", name: "Dance Floor", x: 0, z: -6, r: 7.2, title: "Movement Releases Energy", text: "Movement helps move stuck energy through the body and rebuild confidence from the inside out.", action: "Move for ten seconds without judging it." },
  { id: "crystal", name: "Crystal Zones", x: -30, z: -10, r: 6, title: "Energy Follows Attention", text: "Energy follows attention. Set a clear signal before you move.", action: "Choose your next step before taking it." },
  { id: "crystal_east", name: "Crystal Zones", x: 30, z: -10, r: 6, title: "Clarity Is Power", text: "A clear intention gives your energy somewhere useful to go.", action: "Name what you are focusing on right now." },
  { id: "vibecheck", name: "Daily Vibe Check", x: -16, z: -13, r: 5, title: "Information, Not Judgment", text: "Your score is not judgment. It is information that helps you adjust your frequency.", action: "Ask: what does my energy need next?" },
  { id: "dome", name: "Visualizer Dome", x: -13, z: 10, r: 8, title: "Future Self Vision", text: "Visualization trains your mind to recognize possibility before it becomes familiar.", action: "Picture one brave version of yourself." },
  { id: "academy", name: "Vibe Academy", x: -18, z: 16, r: 8, title: "Regulate. Align. Act.", text: "Deeper learning starts when your nervous system is steady enough to receive the lesson.", action: "Learn one thing, then apply one thing." },
  { id: "ferris", name: "Ferris Wheel", x: 0, z: 24, r: 10, title: "Perspective Shift", text: "A higher view can change how you see your current problem.", action: "Zoom out before you decide." },
  { id: "beachgate", name: "Beach Transporter", x: 22, z: 12.25, r: 7, title: "Rest Supports Mission", text: "Rest is not leaving the mission. Rest keeps the mission sustainable.", action: "Let reset be part of the plan." },
];

const INTENTIONS = [
  { id: "focus", label: "Stay focused", color: "#00E5FF", itemId: "symbol_focus_aura" },
  { id: "protect", label: "Protect my energy", color: "#A078FF", itemId: "symbol_protect_aura" },
  { id: "action", label: "Take action", color: "#FFD36E", itemId: "symbol_action_aura" },
  { id: "rest", label: "Rest and reset", color: "#4ADE80", itemId: "symbol_rest_aura" },
];

const MINI_QUESTS = [
  { id: "collect_orbs", label: "Collect 5 orbs", target: 5, unit: "orbs" },
  { id: "academy", label: "Visit Vibe Academy", target: 1, action: "academy", unit: "visit" },
  { id: "radio_60", label: "Listen to Upper Vibe Radio for 60 seconds", target: 60, unit: "sec" },
  { id: "crystal_10", label: "Stand in the Crystal Field for 10 seconds", target: 10, unit: "sec" },
  { id: "dance_20", label: "Dance on the dance floor for 20 seconds", target: 20, unit: "sec" },
];

const REFLECTIONS = [
  { question: "What does your energy need most right now?", answers: [{ id: "focus", label: "More focus", response: "Clear one distraction and move with precision." }, { id: "rest", label: "More rest", response: "Rest is a strategy, not a delay." }, { id: "action", label: "More action", response: "One brave step shifts the field." }] },
  { question: "What are you choosing today?", answers: [{ id: "peace", label: "Peace", response: "Protect the signal before you amplify it." }, { id: "clarity", label: "Clarity", response: "Make the next step simple." }, { id: "joy", label: "Joy", response: "Let your body remember lightness." }] },
];

const WEEKLY_THEMES = [
  { label: "Reset / Reflection / Rest", preferred: ["reflection", "streak", "boost"] },
  { label: "Grounding / Safety", preferred: ["intention", "boost", "community"] },
  { label: "Clarity / Focus", preferred: ["intention", "quest", "reflection"] },
  { label: "Action / Discipline", preferred: ["quest", "streak", "boost"] },
  { label: "Gratitude / Abundance", preferred: ["community", "reflection", "mystery"] },
  { label: "Social / Dance / Energy", preferred: ["community", "quest", "boost"] },
  { label: "Exploration / Mystery", preferred: ["mystery", "quest", "reflection"] },
];

const CRYSTAL_NODES = [{ x: -30, z: -10 }, { x: 30, z: -10 }];

function todayKey() { return new Date().toLocaleDateString("en-CA"); }
function hashString(value) { let h = 0; for (let i = 0; i < value.length; i++) h = Math.imul(31, h) + value.charCodeAt(i) | 0; return Math.abs(h); }
function dailyPick(items, salt = "") { return items[hashString(`${todayKey()}:${salt}`) % items.length]; }
function symbolRewardKey() { return `uvc_symbol_rewards_${todayKey()}`; }
function getRewardedSymbols() { try { return JSON.parse(localStorage.getItem(symbolRewardKey()) || "{}"); } catch { return {}; } }
function saveRewardedSymbols(data) { try { localStorage.setItem(symbolRewardKey(), JSON.stringify(data)); } catch {} }
function getTheme() { return WEEKLY_THEMES[new Date().getDay()]; }
function mysterySymbolId() { return SYMBOLS[hashString(`${todayKey()}:mystery-symbol`) % SYMBOLS.length].id; }

function grantVibeCoins(symbolId, claimedAt, amount = 5) {
  window.dispatchEvent(new CustomEvent("vibeCoinsCollected", { detail: { source: "daily_reward", coinIds: Array.from({ length: amount }, (_, i) => `symbol_${claimedAt}_${symbolId}_${i}`) } }));
}

function getSymbolActivation(symbol) {
  const theme = getTheme();
  if (symbol.id === mysterySymbolId()) {
    return { type: "mystery", label: "Mystery Symbol", theme: theme.label };
  }
  const pool = theme.preferred;
  const type = pool[hashString(`${todayKey()}:${symbol.id}:type`) % pool.length];
  if (type === "intention") return { type, label: "Daily Intention Symbol", theme: theme.label, choices: INTENTIONS };
  if (type === "quest") return { type, label: "Mini Quest Symbol", theme: theme.label, quest: dailyPick(MINI_QUESTS, symbol.id) };
  if (type === "boost") return { type, label: "Frequency Boost Symbol", theme: theme.label, boost: dailyPick(INTENTIONS, `boost:${symbol.id}`) };
  if (type === "reflection") return { type, label: "Reflection Symbol", theme: theme.label, ...dailyPick(REFLECTIONS, symbol.id) };
  if (type === "community") return { type, label: "Community Energy Symbol", theme: theme.label };
  return { type: "streak", label: "Streak Symbol", theme: theme.label };
}

function streakStorageKey(userId) { return `uvc_symbol_streak_${userId || "guest"}`; }
function nextStreak(userId) {
  const today = todayKey();
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  const yKey = yesterday.toLocaleDateString("en-CA");
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(streakStorageKey(userId)) || "null"); } catch {}
  if (saved?.date === today) return saved;
  const streak = saved?.date === yKey ? (saved.streak || 0) + 1 : 1;
  const next = { date: today, streak };
  try { localStorage.setItem(streakStorageKey(userId), JSON.stringify(next)); } catch {}
  return next;
}

export default function SacredLearningLayer({ playerPos, livePositionRef, worldMode, isMobile, mobileLayout, hidden, userId, isDancing, onOpenChange }) {
  const [wisdomOpen, setWisdomOpen] = useState(false);
  const [activeCard, setActiveCard] = useState(null);
  const [nearZone, setNearZone] = useState(null);
  const [candidate, setCandidate] = useState(null);
  const [activationStarted, setActivationStarted] = useState(null);
  const [holdTick, setHoldTick] = useState(0);
  const [activeQuest, setActiveQuest] = useState(null);
  const cooldownRef = useRef({});
  const settleTimerRef = useRef(null);
  const lastPosRef = useRef(null);
  const activeCardRef = useRef(null);
  const candidateRef = useRef(null);
  const activationStartedRef = useRef(null);
  const activeQuestRef = useRef(null);
  const activatedTodayRef = useRef(getRewardedSymbols());
  const wisdom = useMemo(() => dailyPick(DAILY_WISDOM, "wisdom"), []);

  useEffect(() => { activeCardRef.current = activeCard; }, [activeCard]);
  useEffect(() => {
    onOpenChange?.(!!(wisdomOpen || activeCard));
    return () => onOpenChange?.(false);
  }, [wisdomOpen, activeCard, onOpenChange]);
  useEffect(() => { candidateRef.current = candidate; }, [candidate]);
  useEffect(() => { activationStartedRef.current = activationStarted; }, [activationStarted]);
  useEffect(() => { activeQuestRef.current = activeQuest; }, [activeQuest]);

  useEffect(() => {
    const key = `uvc_wisdom_seen_${todayKey()}`;
    let seen = false;
    try { seen = localStorage.getItem(key) === "1"; } catch {}
    if (!seen) {
      setWisdomOpen(true);
      try { localStorage.setItem(key, "1"); } catch {}
      const t = setTimeout(() => setWisdomOpen(false), 9000);
      return () => clearTimeout(t);
    }
  }, []);

  const closeSymbolCard = () => {
    window.__uvcActiveSacredSymbol = null;
    window.__uvcChargingSacredSymbol = null;
    setActiveCard(null);
  };

  const markRewarded = (symbolId) => {
    const rewarded = { ...activatedTodayRef.current, [symbolId]: true };
    activatedTodayRef.current = rewarded;
    saveRewardedSymbols(rewarded);
  };

  const claimSymbolReward = async (symbol, amount, statusTitle, rewardMessage = "Daily reward saved — come back tomorrow") => {
    const claim = await claimRewardCooldown(userId, `sacred_symbol:${symbol.id}`);
    if (!claim.allowed) {
      setActiveCard((card) => card?.id === symbol.id ? { ...card, alreadyActivated: true, cooldownMessage: claim.message || REWARD_SAVED_MESSAGE } : card);
      return false;
    }
    markRewarded(symbol.id);
    if (amount > 0) grantVibeCoins(symbol.id, claim.claimedAt, amount);
    window.dispatchEvent(new CustomEvent("uvcFrequencyScoreAction", { detail: { action: "sacred_symbol_reward", symbolId: symbol.id } }));
    setActiveCard((card) => card?.id === symbol.id ? { ...card, reward: true, rewardMessage, statusTitle } : card);
    return true;
  };

  useEffect(() => {
    const clearSettle = () => { if (settleTimerRef.current) clearTimeout(settleTimerRef.current); settleTimerRef.current = null; };
    const resetSymbolState = () => {
      clearSettle();
      window.__uvcActiveSacredSymbol = null;
      window.__uvcChargingSacredSymbol = null;
      setNearZone(null);
      setCandidate(null);
      setActivationStarted(null);
      if (activeCardRef.current?.isSymbol) setActiveCard(null);
    };
    if (worldMode !== "city" || hidden) { resetSymbolState(); return; }
    const sample = () => {
      const live = livePositionRef?.current || playerPos;
      const x = Number.isFinite(live?.x) ? live.x : playerPos?.x;
      const z = Number.isFinite(live?.z) ? live.z : playerPos?.z;
      if (!Number.isFinite(x) || !Number.isFinite(z)) return;
      const now = performance.now();
      const zone = ZONE_LESSONS.find((zDef) => (x - zDef.x) ** 2 + (z - zDef.z) ** 2 < zDef.r ** 2) || null;
      setNearZone((current) => current?.id === zone?.id ? current : zone);
      lastPosRef.current = { x, z, t: now };
      const active = activeCardRef.current;
      const activeSymbolId = active?.isSymbol ? active.id : candidateRef.current?.id;
      const inRangeSymbol = SYMBOLS.find((s) => (x - s.x) ** 2 + (z - s.z) ** 2 < s.r ** 2) || null;
      let symbol = inRangeSymbol;
      if (!symbol && activeSymbolId) {
        const heldSymbol = SYMBOLS.find((s) => s.id === activeSymbolId);
        const leaveRadius = heldSymbol?.exitR || ((heldSymbol?.r || 0) + 0.75);
        if (heldSymbol && (x - heldSymbol.x) ** 2 + (z - heldSymbol.z) ** 2 < leaveRadius ** 2) symbol = heldSymbol;
      }
      if (active?.isSymbol) {
        clearSettle();
        window.__uvcChargingSacredSymbol = null;
        setCandidate(null);
        setActivationStarted(null);
        if (!symbol || symbol.id !== active.id) {
          window.__uvcActiveSacredSymbol = null;
          setActiveCard(null);
        } else {
          window.__uvcActiveSacredSymbol = { id: symbol.id, x: symbol.x, z: symbol.z, kind: symbol.kind, startedAt: now * 0.001, active: true };
        }
        return;
      }
      if (!symbol) {
        clearSettle();
        window.__uvcActiveSacredSymbol = null;
        window.__uvcChargingSacredSymbol = null;
        setCandidate(null);
        setActivationStarted(null);
        return;
      }
      if (cooldownRef.current[symbol.id] && cooldownRef.current[symbol.id] > now) {
        clearSettle();
        setCandidate(symbol);
        setActivationStarted(null);
        return;
      }
      setCandidate((current) => current?.id === symbol.id ? current : symbol);
      if (activationStartedRef.current) window.__uvcChargingSacredSymbol = { id: symbol.id, x: symbol.x, z: symbol.z, kind: symbol.kind, startedAt: activationStartedRef.current * 0.001, active: true };
      if (!activationStartedRef.current && !settleTimerRef.current) setActivationStarted(now);
    };
    sample();
    const id = setInterval(sample, 120);
    return () => { clearInterval(id); clearSettle(); };
  }, [playerPos, livePositionRef, worldMode, hidden]);

  useEffect(() => {
    if (!activationStarted) return;
    const id = setInterval(() => setHoldTick(performance.now()), 180);
    return () => clearInterval(id);
  }, [activationStarted]);

  useEffect(() => {
    if (!candidate || !activationStarted) return;
    const remaining = Math.max(0, 3000 - (performance.now() - activationStarted));
    const t = setTimeout(() => {
      const now = performance.now();
      if (!candidate || cooldownRef.current[candidate.id] > now) return;
      cooldownRef.current[candidate.id] = now + 20000;
      const activation = getSymbolActivation(candidate);
      const alreadyActivated = !!activatedTodayRef.current[candidate.id];
      setActiveCard({ ...candidate, teaching: candidate.teaching, action: candidate.action, activation, theme: activation.theme, reward: false, alreadyActivated, cooldownMessage: REWARD_SAVED_MESSAGE, isSymbol: true });
      setActivationStarted(null);
      window.__uvcChargingSacredSymbol = null;
      window.__uvcActiveSacredSymbol = { id: candidate.id, x: candidate.x, z: candidate.z, kind: candidate.kind, startedAt: performance.now() * 0.001, active: true };
      base44.entities.SacredSymbolActivation.create({ user_id: userId || "guest", symbol_id: candidate.id, symbol_title: candidate.title, activated_at: new Date().toISOString(), expires_at: new Date(Date.now() + 2 * 60 * 1000).toISOString() }).catch(() => {});
      window.dispatchEvent(new CustomEvent("uvcDailyAction", { detail: { action: "sacred_symbol_activated", symbolId: candidate.id } }));
    }, remaining);
    return () => clearTimeout(t);
  }, [candidate, activationStarted, userId]);

  const completeQuest = async (quest) => {
    const symbol = SYMBOLS.find((s) => s.id === quest.symbolId);
    if (!symbol) return;
    setActiveQuest(null);
    activeQuestRef.current = null;
    await claimSymbolReward(symbol, 15, "Mini Quest Complete", "+15 Vibe Coins — quest complete");
  };

  useEffect(() => {
    const onCoins = (e) => {
      const quest = activeQuestRef.current;
      if (!quest || quest.quest.id !== "collect_orbs") return;
      const next = { ...quest, progress: Math.min(quest.quest.target, (quest.progress || 0) + (e.detail?.coinIds?.length || 0)) };
      setActiveQuest(next);
      if (next.progress >= quest.quest.target) completeQuest(next);
    };
    const onAction = (e) => {
      const quest = activeQuestRef.current;
      if (!quest?.quest?.action) return;
      if (e.detail?.action === quest.quest.action) completeQuest({ ...quest, progress: quest.quest.target });
    };
    window.addEventListener("vibeCoinsCollected", onCoins);
    window.addEventListener("uvcDailyAction", onAction);
    return () => { window.removeEventListener("vibeCoinsCollected", onCoins); window.removeEventListener("uvcDailyAction", onAction); };
  }, []);

  useEffect(() => {
    if (!activeQuest) return;
    const id = setInterval(() => {
      const quest = activeQuestRef.current;
      if (!quest) return;
      let shouldTick = false;
      if (quest.quest.id === "radio_60") {
        const s = getRadioState();
        shouldTick = s.activeMode === "upperVibeRadio" && s.isPlaying;
      }
      if (quest.quest.id === "crystal_10") {
        const pos = livePositionRef?.current || playerPos;
        shouldTick = CRYSTAL_NODES.some((n) => (pos.x - n.x) ** 2 + (pos.z - n.z) ** 2 < 5.2 ** 2);
      }
      if (quest.quest.id === "dance_20") shouldTick = !!isDancing;
      if (!shouldTick) return;
      const next = { ...quest, progress: Math.min(quest.quest.target, (quest.progress || 0) + 1) };
      setActiveQuest(next);
      if (next.progress >= quest.quest.target) completeQuest(next);
    }, 1000);
    return () => clearInterval(id);
  }, [activeQuest?.symbolId, playerPos?.x, playerPos?.z, livePositionRef, isDancing]);

  useEffect(() => {
    if (!activeQuest || activeCard?.id !== activeQuest.symbolId) return;
    setActiveCard((card) => card?.id === activeQuest.symbolId ? { ...card, questStarted: true, questStatus: `${activeQuest.progress || 0}/${activeQuest.quest.target} ${activeQuest.quest.unit}` } : card);
  }, [activeQuest?.progress, activeQuest?.symbolId]);

  const openZoneLesson = () => {
    if (!nearZone) return;
    setActiveCard({ title: nearZone.title, teaching: nearZone.text, action: nearZone.action, zone: nearZone.name, reward: false });
    window.dispatchEvent(new CustomEvent("uvcDailyAction", { detail: { action: "read_frequency_lesson" } }));
  };

  const chooseIntention = async (card, choice) => {
    window.dispatchEvent(new CustomEvent("uvcTemporaryAuraBoost", { detail: { ...choice, durationMs: 10 * 60 * 1000 } }));
    await claimSymbolReward(card, 5, "Intention Locked", `Intention set: ${choice.label} — +5 Vibe Coins`);
  };

  const startQuest = (card) => {
    setActiveQuest({ symbolId: card.id, quest: card.activation.quest, progress: 0, startedAt: Date.now() });
    setActiveCard((c) => c?.id === card.id ? { ...c, questStarted: true, questStatus: "0/" + card.activation.quest.target + " " + card.activation.quest.unit } : c);
  };

  const claimBoost = async (card) => {
    const boost = card.activation.boost || INTENTIONS[0];
    window.dispatchEvent(new CustomEvent("uvcTemporaryAuraBoost", { detail: { ...boost, label: "10-Min Frequency Glow", durationMs: 10 * 60 * 1000 } }));
    await claimSymbolReward(card, 8, "Frequency Boost Active", "10-minute avatar glow active — +8 Vibe Coins");
  };

  const claimMystery = async (card) => {
    const reward = dailyPick(["coins", "xp", "badge", "aura", "message", "bonus"], card.id);
    if (reward === "aura") window.dispatchEvent(new CustomEvent("uvcTemporaryAuraBoost", { detail: { id: "mystery", label: "Rare Mystery Aura", color: "#C43BFF", itemId: "rare_mystery_aura", durationMs: 10 * 60 * 1000 } }));
    if (reward === "xp") window.dispatchEvent(new CustomEvent("uvcFrequencyScoreAction", { detail: { action: "mystery_symbol_xp", symbolId: card.id } }));
    if (reward === "badge" && userId) base44.entities.UserInventory.create({ user_id: userId, item_id: `mystery_badge_${todayKey()}`, item_name: "Daily Mystery Badge", item_category: "badge", equipped: false, acquired_at: new Date().toISOString() }).catch(() => {});
    const amount = reward === "coins" ? 25 : reward === "bonus" ? 18 : 10;
    await claimSymbolReward(card, amount, "Mystery Revealed", reward === "message" ? "Secret message: the city responds to your consistency." : `Mystery reward unlocked — +${amount} Vibe Coins`);
  };

  const answerReflection = async (card, answer) => {
    setActiveCard((c) => c?.id === card.id ? { ...c, teaching: answer.response, action: "Reflection saved for today." } : c);
    await claimSymbolReward(card, 5, "Reflection Complete", "+5 Vibe Coins — reflection complete");
  };

  const contributeEnergy = async (card) => {
    const ok = await claimSymbolReward(card, 3, "Energy Contributed", "+25 community energy added");
    if (!ok) return;
    const date = todayKey();
    const participant = userId || `guest_${date}`;
    const existing = await base44.entities.CommunityEnergy.filter({ date }, "-created_date", 1).catch(() => []);
    const current = existing?.[0];
    const participantIds = Array.from(new Set([...(current?.participant_ids || []), participant]));
    const energy = (current?.energy || 0) + 25;
    const goal = current?.goal || 500;
    const data = { date, goal, energy, participant_ids: participantIds, completed_at: energy >= goal ? (current?.completed_at || new Date().toISOString()) : current?.completed_at };
    if (current?.id) await base44.entities.CommunityEnergy.update(current.id, data).catch(() => {});
    else await base44.entities.CommunityEnergy.create(data).catch(() => {});
    if (energy >= goal) grantVibeCoins(card.id, Date.now(), 20);
    setActiveCard((c) => c?.id === card.id ? { ...c, communityEnergy: energy, communityGoal: goal, rewardMessage: energy >= goal ? "City goal reached — participant bonus paid" : "+25 city energy added" } : c);
  };

  const claimStreak = async (card) => {
    const streak = nextStreak(userId).streak;
    const amount = streak >= 30 ? 120 : streak >= 14 ? 60 : streak >= 7 ? 30 : streak >= 3 ? 15 : 5;
    await claimSymbolReward(card, amount, `Day ${streak} Streak`, `Day ${streak} return reward — +${amount} Vibe Coins`);
  };

  if (hidden) return null;
  const top = isMobile && mobileLayout ? mobileLayout.sa.top + (mobileLayout.isLandscape ? 56 : 210) : 220;
  const holdProgress = candidate && activationStarted ? Math.min(1, ((holdTick || performance.now()) - activationStarted) / 3000) : 0;

  return (
    <>
      <AnimatePresence>
        {wisdomOpen && (
          <motion.div initial={{ opacity: 0, y: -12, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.96 }} className="absolute left-1/2 z-[220] rounded-2xl pointer-events-auto" style={{ top, transform: "translateX(-50%)", width: isMobile ? "min(88vw, 340px)" : 360, background: "rgba(5,6,18,0.84)", border: "1px solid rgba(0,229,255,0.18)", backdropFilter: "blur(18px)", boxShadow: "0 16px 50px rgba(0,0,0,0.45)" }}>
            <div className="flex items-start gap-3 p-3"><div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(0,229,255,0.12)", color: "#00E5FF" }}><BookOpen className="w-4 h-4" /></div><div className="min-w-0 flex-1"><p className="text-[10px] font-black tracking-[0.18em] uppercase" style={{ color: "#00E5FF" }}>Today’s Frequency Lesson</p><p className="text-[12px] leading-relaxed text-white/68 mt-1">{wisdom}</p></div><button onClick={() => setWisdomOpen(false)} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.55)", touchAction: "manipulation" }}><X className="w-3 h-3" /></button></div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>{candidate && activationStarted && !activeCard && <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="absolute left-1/2 z-[66] pointer-events-none rounded-full px-3 py-2" style={{ transform: "translateX(-50%)", bottom: isMobile && mobileLayout ? mobileLayout.actionBottom + 72 : 136, background: "rgba(5,6,18,0.78)", border: "1px solid rgba(0,229,255,0.2)", backdropFilter: "blur(14px)" }}><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-white/65"><Zap className="w-3 h-3" style={{ color: "#00E5FF" }} /> Hold to activate {candidate.title}</div><div className="h-1 mt-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)", width: 170 }}><div className="h-full rounded-full" style={{ width: `${Math.max(8, holdProgress * 100)}%`, background: "linear-gradient(90deg,#00E5FF,#FFD36E)" }} /></div></motion.div>}</AnimatePresence>

      <AnimatePresence>{activeCard && <motion.div initial={{ opacity: 0, y: 16, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.96 }}><SymbolActivatorCard activeCard={activeCard} isMobile={isMobile} mobileLayout={mobileLayout} onClose={closeSymbolCard} onChooseIntention={chooseIntention} onStartQuest={startQuest} onClaimBoost={claimBoost} onClaimMystery={claimMystery} onAnswerReflection={answerReflection} onContributeEnergy={contributeEnergy} onClaimStreak={claimStreak} /></motion.div>}</AnimatePresence>
    </>
  );
}