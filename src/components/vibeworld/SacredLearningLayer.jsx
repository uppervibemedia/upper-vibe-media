import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, CheckCircle2, Sparkles, X, Zap } from "lucide-react";
import { claimRewardCooldown, REWARD_SAVED_MESSAGE } from "@/lib/rewardCooldown";

const DAILY_WISDOM = [
  "Your nervous system is part of your manifestation. A regulated state helps you make clearer choices.",
  "Energy is built through repetition. What you practice daily becomes your frequency.",
  "Calm is not weakness. Calm gives you control over your next move.",
  "Your attention is currency. Where you place it, your energy follows.",
  "Manifestation works better when your actions match your intention.",
  "Music can shift your state, but your habits keep the frequency stable.",
];

const SYMBOLS = [
  { id: "torus", title: "Torus Field", kind: "torus", x: 22, z: 1.5, r: 3.25, teaching: "What you give energy to returns through your field. Choose your loop wisely.", action: "Name one loop you are ready to upgrade today." },
  { id: "seed", title: "Seed of Life", kind: "seed", x: 22, z: -13.5, r: 3.15, teaching: "Every result begins as a seed. Choose the thought you keep watering.", action: "Pick one thought that supports your next move." },
  { id: "tree", title: "Energy First", kind: "tree", x: -8, z: 4, r: 3.05, teaching: "Your state changes how you move, speak, create, and decide.", action: "Choose one state you want to embody today." },
  { id: "metatron", title: "Metatron’s Cube", kind: "metatron", x: -24, z: 3, r: 3.2, teaching: "Structure gives energy direction. Focus turns potential into form.", action: "Choose one priority before you take action." },
  { id: "vesica", title: "Vesica Piscis", kind: "vesica", x: 5, z: -18, r: 2.85, teaching: "New realities form where two worlds meet: who you are and who you are becoming.", action: "Take one action from your future-self identity." },
  { id: "chakra", title: "Calm Is Power", kind: "chakra", x: -7.5, z: -21.5, r: 2.55, teaching: "A regulated nervous system helps you respond instead of react.", action: "Take one slow breath before your next decision." },
  { id: "egg", title: "Merkaba Motion", kind: "egg", x: -25, z: 18, r: 2.8, teaching: "Your energy moves with your attention. Align your direction before you accelerate.", action: "Point your attention at the outcome you actually want." },
  { id: "sri", title: "Sri Yantra", kind: "sri", x: -31, z: -19, r: 2.75, teaching: "Desire needs direction. Focus turns scattered energy into a clear signal.", action: "Write one clean intention in your mind." },
  { id: "flower", title: "Flower of Life", kind: "flower", x: 31, z: 20, r: 2.75, teaching: "All things are connected. What you repeat becomes the pattern you live inside.", action: "Repeat one habit that supports your highest pattern." },
  { id: "stage_metatron", title: "Stage Metatron’s Cube", kind: "metatron", x: -10.5, z: -27.5, r: 2.15, teaching: "Structure gives stage energy direction.", action: "Choose one sound or thought to focus on." },
  { id: "stage_seed", title: "Stage Seed of Life", kind: "seed", x: 10.5, z: -27.5, r: 2.15, teaching: "A new sound can plant a new state.", action: "Let one rhythm reset your energy." },
  { id: "stage_vesica", title: "Stage Vesica Piscis", kind: "vesica", x: -16, z: -31, r: 2.0, teaching: "Music opens the doorway between feeling and action.", action: "Notice what the song invites you to become." },
  { id: "stage_torus", title: "Stage Torus Field", kind: "torus", x: 16, z: -31, r: 2.0, teaching: "The energy you bring to sound returns through your body.", action: "Receive the frequency with intention." },
  { id: "stage_merkaba", title: "Stage Merkaba", kind: "egg", x: -6.5, z: -24.5, r: 1.95, teaching: "Aligned motion moves energy upward.", action: "Point your attention toward elevation." },
  { id: "stage_hex", title: "Stage Hex Geometry", kind: "hex", x: 6.5, z: -24.5, r: 1.95, teaching: "Patterns make sound feel stable and alive.", action: "Find the pattern inside the beat." },
];

const SYMBOL_LESSONS = {
  torus: [["Energy loops return what you keep circulating. Choose what you feed.", "Notice one habit loop and decide what energy you want it to return."], ["Giving and receiving are one field. Blocking either side slows your flow.", "Name one thing you can receive without guilt today."], ["What you focus on expands through your field and returns as pattern.", "Redirect your attention toward one outcome you actually want."]],
  seed: [["Beginnings carry the pattern of what comes next.", "Plant one small habit that matches your future self."], ["Intention is a seed. Repetition is the water.", "Repeat one supportive thought before your next action."], ["Small starts still count. Energy grows when you keep showing up.", "Take the first tiny step instead of waiting for perfect timing."]],
  tree: [["Your energy has roots. Stable roots create stronger expression.", "Choose one grounding action before you move forward."], ["Growth needs both structure and nourishment.", "Give your body one supportive signal right now."], ["Your state changes the fruit of your choices.", "Name the state you want your next choice to come from."]],
  metatron: [["Structure gives energy direction. Focus turns potential into form.", "Choose one priority before you take action."], ["Order gives your magic a channel.", "Clear one distraction from your next ten minutes."], ["Discipline is devotion made visible.", "Pick one boundary that protects your focus today."]],
  vesica: [["Transition is the space where your old self and new self overlap.", "Take one action from your becoming-self identity."], ["Balance is not standing still. It is moving with awareness.", "Name what needs less energy and what needs more."], ["New realities form through the doorway between choice and repetition.", "Step through one small doorway today."]],
  chakra: [["A regulated nervous system helps you respond instead of react.", "Take one slow breath before your next decision."], ["Calm is power because it keeps your signal clear.", "Relax your jaw and reset your shoulders."], ["Your body is a frequency instrument. Tune it before you transmit.", "Pause for ten seconds and listen inward."]],
  egg: [["Your energy moves with your attention. Align direction before speed.", "Point your attention at the outcome you actually want."], ["Elevation requires direction. Motion without alignment scatters power.", "Choose the direction your energy is moving today."], ["Protection and movement can exist together.", "Move forward without abandoning your peace."]],
  sri: [["Desire needs direction. Focus turns scattered energy into a clear signal.", "Write one clean intention in your mind."], ["Manifestation strengthens when desire meets discipline.", "Pair one desire with one practical next step."], ["Beauty becomes power when your focus is precise.", "Simplify your intention to one sentence."]],
  flower: [["All things are connected. What you repeat becomes the pattern you live inside.", "Repeat one habit that supports your highest pattern."], ["Creation grows through repetition, connection, and rhythm.", "Choose one pattern worth repeating today."], ["Your life pattern changes when your daily pattern changes.", "Upgrade one small repeated action."]],
};

function getDailySymbolLesson(symbol) {
  const lessons = SYMBOL_LESSONS[symbol.id] || [[symbol.teaching, symbol.action]];
  const [teaching, action] = lessons[hashString(`${todayKey()}:${symbol.id}`) % lessons.length];
  return { teaching, action };
}

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

function todayKey() {
  return new Date().toLocaleDateString("en-CA");
}

function hashString(value) {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = Math.imul(31, h) + value.charCodeAt(i) | 0;
  return Math.abs(h);
}

function dailyPick(items, salt = "") {
  return items[hashString(`${todayKey()}:${salt}`) % items.length];
}

function symbolRewardKey() {
  return `uvc_symbol_rewards_${todayKey()}`;
}

function getRewardedSymbols() {
  try { return JSON.parse(localStorage.getItem(symbolRewardKey()) || "{}"); } catch { return {}; }
}

function saveRewardedSymbols(data) {
  try { localStorage.setItem(symbolRewardKey(), JSON.stringify(data)); } catch {}
}

function grantVibeCoins(symbolId, claimedAt) {
  window.dispatchEvent(new CustomEvent("vibeCoinsCollected", {
    detail: {
      source: "daily_reward",
      coinIds: Array.from({ length: 5 }, (_, i) => `symbol_${claimedAt}_${symbolId}_${i}`),
    },
  }));
}

export default function SacredLearningLayer({ playerPos, livePositionRef, worldMode, isMobile, mobileLayout, hidden, userId }) {
  const [wisdomOpen, setWisdomOpen] = useState(false);
  const [activeCard, setActiveCard] = useState(null);
  const [nearZone, setNearZone] = useState(null);
  const [candidate, setCandidate] = useState(null);
  const [activationStarted, setActivationStarted] = useState(null);
  const [holdTick, setHoldTick] = useState(0);
  const cooldownRef = useRef({});
  const settleTimerRef = useRef(null);
  const lastPosRef = useRef(null);
  const activeCardRef = useRef(null);
  const activationStartedRef = useRef(null);
  const activatedTodayRef = useRef(getRewardedSymbols());
  const wisdom = useMemo(() => dailyPick(DAILY_WISDOM, "wisdom"), []);


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

  useEffect(() => { activeCardRef.current = activeCard; }, [activeCard]);
  useEffect(() => { activationStartedRef.current = activationStarted; }, [activationStarted]);

  useEffect(() => {
    const clearSettle = () => {
      if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
      settleTimerRef.current = null;
    };

    const resetSymbolState = () => {
      clearSettle();
      window.__uvcActiveSacredSymbol = null;
      setNearZone(null);
      setCandidate(null);
      setActivationStarted(null);
      if (activeCardRef.current?.isSymbol) setActiveCard(null);
    };

    if (worldMode !== "city" || hidden) {
      resetSymbolState();
      return;
    }

    const sample = () => {
      const live = livePositionRef?.current || playerPos;
      const x = Number.isFinite(live?.x) ? live.x : playerPos?.x;
      const z = Number.isFinite(live?.z) ? live.z : playerPos?.z;
      if (!Number.isFinite(x) || !Number.isFinite(z)) return;

      const now = performance.now();
      const zone = ZONE_LESSONS.find((zDef) => (x - zDef.x) ** 2 + (z - zDef.z) ** 2 < zDef.r ** 2) || null;
      setNearZone((current) => current?.id === zone?.id ? current : zone);

      const last = lastPosRef.current;
      const moveDist = last ? Math.hypot(x - last.x, z - last.z) : 0;
      lastPosRef.current = { x, z, t: now };
      const isMoving = moveDist > 0.045;
      const symbol = SYMBOLS.find((s) => (x - s.x) ** 2 + (z - s.z) ** 2 < s.r ** 2) || null;
      const active = activeCardRef.current;

      if (active?.isSymbol) {
        clearSettle();
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

      if (!symbol || isMoving) {
        clearSettle();
        window.__uvcActiveSacredSymbol = null;
        setCandidate(symbol || null);
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
      if (!activationStartedRef.current && !settleTimerRef.current) {
        settleTimerRef.current = setTimeout(() => {
          settleTimerRef.current = null;
          setActivationStarted(performance.now());
        }, 550);
      }
    };

    sample();
    const id = setInterval(sample, 120);
    return () => {
      clearInterval(id);
      clearSettle();
    };
  }, [playerPos, livePositionRef, worldMode, hidden]);

  useEffect(() => {
    if (!activationStarted) return;
    const id = setInterval(() => setHoldTick(performance.now()), 180);
    return () => clearInterval(id);
  }, [activationStarted]);

  useEffect(() => {
    if (!candidate || !activationStarted) return;
    const remaining = Math.max(0, 3000 - (performance.now() - activationStarted));
    const t = setTimeout(async () => {
      const now = performance.now();
      if (!candidate || cooldownRef.current[candidate.id] > now) return;
      cooldownRef.current[candidate.id] = now + 20000;
      const claim = await claimRewardCooldown(userId, `sacred_symbol:${candidate.id}`);
      const firstToday = claim.allowed;
      if (firstToday) {
        const rewarded = activatedTodayRef.current;
        rewarded[candidate.id] = true;
        activatedTodayRef.current = rewarded;
        saveRewardedSymbols(rewarded);
        grantVibeCoins(candidate.id, claim.claimedAt);
      }
      const dailyLesson = getDailySymbolLesson(candidate);
      setActiveCard({ ...candidate, teaching: dailyLesson.teaching, action: dailyLesson.action, reward: firstToday, alreadyActivated: !firstToday, cooldownMessage: claim.message || REWARD_SAVED_MESSAGE, isSymbol: true });
      setActivationStarted(null);
      window.__uvcActiveSacredSymbol = { id: candidate.id, x: candidate.x, z: candidate.z, kind: candidate.kind, startedAt: performance.now() * 0.001, active: true };
      window.dispatchEvent(new CustomEvent("uvcDailyAction", { detail: { action: "sacred_symbol_activated", symbolId: candidate.id } }));
    }, remaining);
    return () => clearTimeout(t);
  }, [candidate, activationStarted, userId]);

  const openZoneLesson = () => {
    if (!nearZone) return;
    setActiveCard({ title: nearZone.title, teaching: nearZone.text, action: nearZone.action, zone: nearZone.name, reward: false });
    window.dispatchEvent(new CustomEvent("uvcDailyAction", { detail: { action: "read_frequency_lesson" } }));
  };

  if (hidden) return null;

  const top = isMobile && mobileLayout ? mobileLayout.sa.top + 250 : 220;
  const holdProgress = candidate && activationStarted ? Math.min(1, ((holdTick || performance.now()) - activationStarted) / 3000) : 0;

  return (
    <>
      <AnimatePresence>
        {wisdomOpen && (
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.96 }}
            className="absolute left-1/2 z-[67] rounded-2xl pointer-events-auto"
            style={{ top, transform: "translateX(-50%)", width: isMobile ? "min(88vw, 340px)" : 360, background: "rgba(5,6,18,0.84)", border: "1px solid rgba(0,229,255,0.18)", backdropFilter: "blur(18px)", boxShadow: "0 16px 50px rgba(0,0,0,0.45)" }}
          >
            <div className="flex items-start gap-3 p-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(0,229,255,0.12)", color: "#00E5FF" }}><BookOpen className="w-4 h-4" /></div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black tracking-[0.18em] uppercase" style={{ color: "#00E5FF" }}>Today’s Frequency Lesson</p>
                <p className="text-[12px] leading-relaxed text-white/68 mt-1">{wisdom}</p>
              </div>
              <button onClick={() => setWisdomOpen(false)} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.55)", touchAction: "manipulation" }}><X className="w-3 h-3" /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {nearZone && !activeCard && (
          <motion.button
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            onClick={openZoneLesson}
            className="absolute right-3 z-[66] pointer-events-auto flex items-center gap-2 px-3 py-2 rounded-full text-[10px] font-black tracking-wider uppercase"
            style={{ top: isMobile && mobileLayout ? mobileLayout.sa.top + 76 : 84, background: "rgba(5,6,18,0.78)", border: "1px solid rgba(255,211,110,0.22)", color: "#FFD36E", backdropFilter: "blur(14px)", touchAction: "manipulation" }}
          >
            <Sparkles className="w-3 h-3" /> Learn
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {candidate && activationStarted && !activeCard && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="absolute left-1/2 z-[66] pointer-events-none rounded-full px-3 py-2"
            style={{ transform: "translateX(-50%)", bottom: isMobile && mobileLayout ? mobileLayout.actionBottom + 72 : 136, background: "rgba(5,6,18,0.78)", border: "1px solid rgba(0,229,255,0.2)", backdropFilter: "blur(14px)" }}
          >
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-white/65">
              <Zap className="w-3 h-3" style={{ color: "#00E5FF" }} /> Hold to activate {candidate.title}
            </div>
            <div className="h-1 mt-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)", width: 170 }}>
              <div className="h-full rounded-full" style={{ width: `${Math.max(8, holdProgress * 100)}%`, background: "linear-gradient(90deg,#00E5FF,#FFD36E)" }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeCard && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            className="absolute left-1/2 z-[68] pointer-events-auto rounded-3xl overflow-hidden"
            style={{ transform: "translateX(-50%)", bottom: isMobile && mobileLayout ? mobileLayout.actionBottom + 132 : 190, width: isMobile ? "min(88vw, 350px)" : 380, maxHeight: isMobile ? "42dvh" : "48vh", overflowY: "auto", background: "rgba(5,6,18,0.92)", border: "1px solid rgba(0,229,255,0.22)", backdropFilter: "blur(22px)", boxShadow: "0 18px 60px rgba(0,0,0,0.5), 0 0 34px rgba(0,229,255,0.14)" }}
          >
            <div className="flex items-start gap-3 p-4">
              <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(0,229,255,0.12)", color: "#00E5FF" }}><Sparkles className="w-4 h-4" /></div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: activeCard.reward ? "#FFD36E" : activeCard.alreadyActivated ? "#C4AAFF" : "#00E5FF" }}>{activeCard.reward ? "+5 Vibe Coins — Symbol Activated" : activeCard.alreadyActivated ? "Daily Reward Saved - come back in 24 hrs" : activeCard.zone || "Frequency Lesson"}</p>
                <h3 className="font-heading font-black text-white text-base mt-1">{activeCard.title}</h3>
                <p className="text-[12px] leading-relaxed text-white/66 mt-2">“{activeCard.teaching}”</p>
                <p className="text-[11px] leading-relaxed mt-2" style={{ color: "#FFD36E" }}><b>Action:</b> {activeCard.action}</p>
              </div>
              <button onClick={() => { window.__uvcActiveSacredSymbol = null; setActiveCard(null); }} className="w-10 h-10 min-w-10 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)", touchAction: "manipulation" }}><X className="w-4 h-4" /></button>
            </div>
            {activeCard.reward && <div className="px-4 py-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-wider border-t border-white/5" style={{ color: "#4ADE80" }}><CheckCircle2 className="w-3 h-3" /> Daily Reward Saved - come back in 24 hrs</div>}
            {activeCard.alreadyActivated && <div className="px-4 py-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-wider border-t border-white/5" style={{ color: "#C4AAFF" }}><CheckCircle2 className="w-3 h-3" /> {activeCard.cooldownMessage || "Daily Reward Saved - come back in 24 hrs"}</div>}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}