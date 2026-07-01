/**
 * Vibe Check — stricter shared scoring system
 * Single source of truth for questions, score math, levels, colors, and messages.
 */

export const CORE_QUESTIONS = [
  { id: "energy", question: "How would you describe your energy right now?", emoji: "⚡", options: [
    { label: "Drained / exhausted", score: 10 }, { label: "Low — going through motions", score: 30 }, { label: "Neutral — okay", score: 50 }, { label: "Good — activated", score: 75 }, { label: "High — fully charged", score: 100 },
  ] },
  { id: "focus", question: "How focused are you feeling today?", emoji: "🎯", options: [
    { label: "Scattered and distracted", score: 10 }, { label: "Struggling to stay on task", score: 30 }, { label: "Somewhat focused", score: 50 }, { label: "Clear and locked in", score: 75 }, { label: "Laser focused", score: 100 },
  ] },
  { id: "mood", question: "What best describes your mood right now?", emoji: "😐", options: [
    { label: "Heavy / negative", score: 10 }, { label: "Down or unmotivated", score: 30 }, { label: "Neutral — nothing special", score: 50 }, { label: "Positive and open", score: 75 }, { label: "Elevated — genuinely great", score: 100 },
  ] },
  { id: "stress", question: "How is your stress level today?", emoji: "🌡️", options: [
    { label: "Overwhelmed — hard to breathe", score: 10 }, { label: "High — a lot on my plate", score: 30 }, { label: "Moderate — manageable", score: 50 }, { label: "Low — feeling in control", score: 75 }, { label: "Minimal — calm and clear", score: 100 },
  ] },
  { id: "gratitude", question: "Can you name something you are genuinely grateful for today?", emoji: "🙏", options: [
    { label: "Not right now — hard day", score: 10 }, { label: "Struggling to think of one", score: 30 }, { label: "Sort of — nothing big", score: 50 }, { label: "Yes — one thing comes to mind", score: 75 }, { label: "Easily — multiple things", score: 100 },
  ] },
  { id: "confidence", question: "How confident do you feel in yourself today?", emoji: "💪", options: [
    { label: "Doubtful and unsure", score: 10 }, { label: "Low — second-guessing a lot", score: 30 }, { label: "Neutral — okay self-image", score: 50 }, { label: "Solid — trust my instincts", score: 75 }, { label: "Strong — fully in my power", score: 100 },
  ] },
];

const ROTATING_BANKS = {
  0: [
    { id: "weekly_reflection", question: "Looking back at this week, how aligned were your actions with your goals?", emoji: "🌀", options: [
      { label: "Completely off track", score: 10 }, { label: "Mostly drifting", score: 30 }, { label: "Neutral — some wins, some not", score: 50 }, { label: "Mostly on track", score: 75 }, { label: "Fully aligned", score: 100 },
    ] },
    { id: "rest_quality", question: "How rested did you feel going into this week?", emoji: "😴", options: [
      { label: "No rest at all", score: 10 }, { label: "Sleep deprived", score: 30 }, { label: "Average sleep", score: 50 }, { label: "Pretty rested", score: 75 }, { label: "Fully recharged", score: 100 },
    ] },
  ],
  1: [
    { id: "goals_clarity", question: "How clear are you on what you want to accomplish this week?", emoji: "🗺️", options: [
      { label: "No idea — no plan", score: 10 }, { label: "Vague direction", score: 30 }, { label: "Some goals in mind", score: 50 }, { label: "Clear goals set", score: 75 }, { label: "Fully mapped — locked and loaded", score: 100 },
    ] },
    { id: "fresh_start", question: "How ready do you feel to start fresh today?", emoji: "🌅", options: [
      { label: "Not at all — carrying last week", score: 10 }, { label: "Still dragging", score: 30 }, { label: "Neutral — it's just Monday", score: 50 }, { label: "Fairly ready", score: 75 }, { label: "Fully reset — new energy", score: 100 },
    ] },
  ],
  2: [
    { id: "discipline", question: "How disciplined have you been with your habits recently?", emoji: "🔩", options: [
      { label: "No consistency at all", score: 10 }, { label: "Very inconsistent", score: 30 }, { label: "Mixed — some days better", score: 50 }, { label: "Mostly consistent", score: 75 }, { label: "Locked in — no excuses", score: 100 },
    ] },
    { id: "follow_through", question: "How well have you followed through on commitments lately?", emoji: "✅", options: [
      { label: "Barely at all", score: 10 }, { label: "Kept dropping the ball", score: 30 }, { label: "Average follow-through", score: 50 }, { label: "Mostly followed through", score: 75 }, { label: "Full integrity — did what I said", score: 100 },
    ] },
  ],
  3: [
    { id: "purpose", question: "How connected do you feel to your purpose or bigger vision today?", emoji: "🌠", options: [
      { label: "Completely disconnected", score: 10 }, { label: "Barely feeling it", score: 30 }, { label: "Somewhere in the middle", score: 50 }, { label: "Feeling the pull", score: 75 }, { label: "Fully on fire for it", score: 100 },
    ] },
    { id: "meaning", question: "How meaningful did your work feel yesterday?", emoji: "💡", options: [
      { label: "Completely hollow", score: 10 }, { label: "Just tasks — no meaning", score: 30 }, { label: "Neutral — it was work", score: 50 }, { label: "Some meaning in it", score: 75 }, { label: "Deeply fulfilling", score: 100 },
    ] },
  ],
  4: [
    { id: "resilience", question: "When challenges hit lately, how have you responded?", emoji: "🛡️", options: [
      { label: "Fell apart — totally derailed", score: 10 }, { label: "Struggled a lot", score: 30 }, { label: "Held on but felt shaky", score: 50 }, { label: "Bounced back fairly well", score: 75 }, { label: "Stayed grounded — adapted fast", score: 100 },
    ] },
    { id: "mental_strength", question: "How mentally strong do you feel today?", emoji: "🧠", options: [
      { label: "Fragile and reactive", score: 10 }, { label: "Easily affected by things", score: 30 }, { label: "Average — getting by", score: 50 }, { label: "Solid and stable", score: 75 }, { label: "Unshakeable — full mind control", score: 100 },
    ] },
  ],
  5: [
    { id: "optimism", question: "How optimistic do you feel about the near future?", emoji: "🌟", options: [
      { label: "Very pessimistic", score: 10 }, { label: "Doubtful — can't see it yet", score: 30 }, { label: "Cautiously hopeful", score: 50 }, { label: "Genuinely optimistic", score: 75 }, { label: "Completely confident in the path", score: 100 },
    ] },
    { id: "wins", question: "How many wins — big or small — can you acknowledge this week?", emoji: "🏆", options: [
      { label: "None I can think of", score: 10 }, { label: "Barely any", score: 30 }, { label: "A couple", score: 50 }, { label: "Several solid wins", score: 75 }, { label: "A strong week — many wins", score: 100 },
    ] },
  ],
  6: [
    { id: "presence", question: "How present have you been in your daily moments this week?", emoji: "🎋", options: [
      { label: "Completely in my head", score: 10 }, { label: "Mostly distracted", score: 30 }, { label: "Half present, half elsewhere", score: 50 }, { label: "Mostly present", score: 75 }, { label: "Fully here — mindful all week", score: 100 },
    ] },
    { id: "joy", question: "How much genuine joy did you experience today or yesterday?", emoji: "😄", options: [
      { label: "None — going through motions", score: 10 }, { label: "Very little", score: 30 }, { label: "Some moments", score: 50 }, { label: "Quite a bit", score: 75 }, { label: "Genuinely joyful", score: 100 },
    ] },
  ],
};

const REVERSE_QUESTION_VARIANTS = {
  energy: { question: "What is pulling your energy down the most right now?", emoji: "🧲", options: [
    { label: "Everything feels heavy", score: 10 }, { label: "Low sleep or low fuel", score: 30 }, { label: "A few distractions", score: 50 }, { label: "Nothing major — I can redirect", score: 75 }, { label: "Very little — my energy feels protected", score: 100 },
  ] },
  focus: { question: "What is scattering your focus the most today?", emoji: "🧭", options: [
    { label: "Too many open loops", score: 10 }, { label: "Phone, noise, or outside pressure", score: 30 }, { label: "Some mental clutter", score: 50 }, { label: "Only minor distractions", score: 75 }, { label: "Nothing serious — I know my priority", score: 100 },
  ] },
  stress: { question: "Where does your nervous system feel least supported today?", emoji: "🛡️", options: [
    { label: "I do not feel safe or steady", score: 10 }, { label: "I feel tense most of the time", score: 30 }, { label: "I am managing, but not relaxed", score: 50 }, { label: "I can settle myself when needed", score: 75 }, { label: "I feel calm, safe, and grounded", score: 100 },
  ] },
  gratitude: { question: "What makes gratitude feel difficult today?", emoji: "🌧️", options: [
    { label: "I cannot access it right now", score: 10 }, { label: "I am forcing it", score: 30 }, { label: "I can find one small thing", score: 50 }, { label: "I can feel real appreciation", score: 75 }, { label: "Gratitude feels natural today", score: 100 },
  ] },
};

function todayKey() {
  return new Date().toLocaleDateString("en-CA");
}

function hashString(value) {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = Math.imul(31, h) + value.charCodeAt(i) | 0;
  return Math.abs(h);
}

function shuffleWithSeed(items, seed) {
  const arr = [...items];
  let s = hashString(seed) || 1;
  for (let i = arr.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const j = s % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function prepareQuestion(question, index) {
  const useReverse = REVERSE_QUESTION_VARIANTS[question.id] && hashString(`${todayKey()}:reverse:${question.id}`) % 3 === 0;
  const source = useReverse ? { ...question, ...REVERSE_QUESTION_VARIANTS[question.id] } : question;
  return {
    ...source,
    options: shuffleWithSeed(
      source.options.map((opt, optIndex) => ({ ...opt, optionId: `${source.id}_${optIndex}_${opt.score}` })),
      `${todayKey()}:options:${source.id}:${index}:${Math.random()}`
    ),
  };
}

export function getTodaysQuestions() {
  const dow = new Date().getDay();
  const rotating = ROTATING_BANKS[dow] || ROTATING_BANKS[1];
  return [...CORE_QUESTIONS, ...rotating].map(prepareQuestion);
}

export const VIBE_SCORE_WEIGHTS = {
  safety: 0.25,
  clarity: 0.20,
  consistency: 0.20,
  rest: 0.15,
  action: 0.10,
  gratitude: 0.10,
};

const CATEGORY_QUESTION_IDS = {
  safety: ["stress", "resilience", "mental_strength"],
  clarity: ["focus", "goals_clarity", "purpose", "meaning"],
  consistency: ["confidence", "discipline", "follow_through", "weekly_reflection", "presence"],
  gratitude: ["gratitude", "joy", "wins", "optimism"],
  rest: ["energy", "rest_quality", "fresh_start"],
  action: ["mood"],
};

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
}

function normalizeAnswerScore(score) {
  const value = clampScore(score);
  if (value >= 100) return 92;
  if (value >= 75) return 70;
  if (value >= 50) return 48;
  if (value >= 30) return 28;
  return 8;
}

export function consistencyScoreFromStreak(days = 0) {
  const n = Math.max(0, Number(days) || 0);
  if (n <= 0) return 0;
  if (n === 1) return 40;
  if (n <= 3) return 55;
  if (n <= 6) return 70;
  if (n <= 13) return 80;
  if (n <= 29) return 90;
  return 100;
}

function scoreFromRecord(record) {
  return record?.today_score ?? record?.mood_score ?? record?.overall_vibe_score ?? record?.vibe_score ?? null;
}

export function calcRollingAverageScore(checkIns = [], todayScore = null) {
  const byDate = new Map();
  for (const checkIn of checkIns || []) {
    if (!checkIn?.check_in_date) continue;
    byDate.set(checkIn.check_in_date, scoreFromRecord(checkIn));
  }
  if (todayScore != null) byDate.set(todayKey(), clampScore(todayScore));
  const scores = [...byDate.entries()]
    .filter(([, score]) => Number.isFinite(score))
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .slice(0, 7)
    .map(([, score]) => clampScore(score));
  if (!scores.length) return clampScore(todayScore ?? 0);
  return clampScore(scores.reduce((sum, score) => sum + score, 0) / scores.length);
}

export function calcOverallVibeScore({ todayScore = 0, averageScore = 0, consistencyScore = 0 } = {}) {
  return clampScore((clampScore(todayScore) * 0.45) + (clampScore(averageScore) * 0.35) + (clampScore(consistencyScore) * 0.20));
}

export function buildVibeScoreSummary({ todayScore = 0, checkIns = [], streak = 0 } = {}) {
  const safeToday = clampScore(todayScore);
  const averageScore = calcRollingAverageScore(checkIns, safeToday);
  const consistencyScore = consistencyScoreFromStreak(streak);
  const overallScore = calcOverallVibeScore({ todayScore: safeToday, averageScore, consistencyScore });
  return { todayScore: safeToday, averageScore, consistencyScore, overallScore };
}

export function calcVibeCategoryScoresFromAnswers(answers = []) {
  const byId = Object.fromEntries((answers || []).map((a) => [a.id, normalizeAnswerScore(a.score)]));
  return Object.fromEntries(Object.entries(CATEGORY_QUESTION_IDS).map(([category, ids]) => {
    const values = ids.map((id) => byId[id]).filter((v) => Number.isFinite(v));
    const score = values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : 50;
    return [category, clampScore(score)];
  }));
}

export function deriveVibeCategoryScoresFromScore(score = 50) {
  const base = clampScore(score);
  return Object.fromEntries(Object.keys(VIBE_SCORE_WEIGHTS).map((category) => [category, base]));
}

export function calcVibeScoreFromAnswers(answers) {
  if (!answers?.length) return 0;
  const categories = calcVibeCategoryScoresFromAnswers(answers);
  const raw = Object.entries(VIBE_SCORE_WEIGHTS).reduce((sum, [key, weight]) => sum + (categories[key] || 0) * weight, 0);
  const score = clampScore(raw);
  const coreReadiness = [categories.safety, categories.clarity, categories.consistency, categories.rest];
  const strongCoreCount = coreReadiness.filter((value) => value >= 80).length;
  if (score >= 85 && strongCoreCount < 3) return 84;
  if (score >= 85 && Math.min(...coreReadiness) < 70) return 84;
  if (score >= 75 && Math.min(categories.safety, categories.clarity, categories.rest) < 55) return 74;
  return score;
}

export function vibeCategory(score) {
  const value = clampScore(score);
  if (value <= 39) return { label: "Low Frequency", color: "#F87171", emoji: "🌑", moodTag: "low_energy" };
  if (value <= 59) return { label: "Rebuilding", color: "#FB923C", emoji: "🧱", moodTag: "neutral" };
  if (value <= 74) return { label: "Intentional", color: "#FBBF24", emoji: "🎯", moodTag: "intentional" };
  if (value <= 84) return { label: "Locked In", color: "#00E5FF", emoji: "🔒", moodTag: "intentional" };
  if (value <= 94) return { label: "High Vibe", color: "#4ADE80", emoji: "⚡", moodTag: "high_vibe" };
  return { label: "Legend Mode", color: "#9B7EFF", emoji: "👑", moodTag: "high_vibe" };
}

export function vibeMessage(score) {
  const level = vibeCategory(score).label;
  if (level === "Low Frequency") return "Your frequency needs care today. Start with safety, breath, and one small aligned action.";
  if (level === "Rebuilding") return "You are rebuilding your signal. Protect your peace and choose one clear next step.";
  if (level === "Intentional") return "You are moving with intention. Keep your focus clean and your actions steady.";
  if (level === "Locked In") return "You are locked in. Stay consistent and let your energy lead with structure.";
  if (level === "High Vibe") return "Your frequency is high. Use the momentum with gratitude, clarity, and grounded action.";
  return "Legend Mode is active. Keep leading your day from alignment, discipline, and purpose.";
}

export const MOOD_MUSIC_MAP = {
  low_energy: ["uplifting", "grounding", "healing"],
  neutral: ["activation", "motivation", "focus"],
  intentional: ["focus", "manifestation", "432hz"],
  high_vibe: ["high_vibe", "celebration", "hiphop"],
};