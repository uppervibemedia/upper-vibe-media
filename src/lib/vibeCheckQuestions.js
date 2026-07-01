/**
 * Vibe Check — Hybrid Question System
 * 70% core questions (same every day) + 30% rotating by day-of-week
 */

// ── Core questions (6) — measured daily for score consistency ─────────────────
export const CORE_QUESTIONS = [
  {
    id: "energy",
    question: "How would you describe your energy right now?",
    emoji: "⚡",
    options: [
      { label: "Drained / exhausted",         score: 10 },
      { label: "Low — going through motions",  score: 30 },
      { label: "Neutral — okay",               score: 50 },
      { label: "Good — activated",             score: 75 },
      { label: "High — fully charged",         score: 100 },
    ],
  },
  {
    id: "focus",
    question: "How focused are you feeling today?",
    emoji: "🎯",
    options: [
      { label: "Scattered and distracted",     score: 10 },
      { label: "Struggling to stay on task",   score: 30 },
      { label: "Somewhat focused",             score: 50 },
      { label: "Clear and locked in",          score: 75 },
      { label: "Laser focused",                score: 100 },
    ],
  },
  {
    id: "mood",
    question: "What best describes your mood right now?",
    emoji: "😐",
    options: [
      { label: "Heavy / negative",             score: 10 },
      { label: "Down or unmotivated",          score: 30 },
      { label: "Neutral — nothing special",    score: 50 },
      { label: "Positive and open",            score: 75 },
      { label: "Elevated — genuinely great",   score: 100 },
    ],
  },
  {
    id: "stress",
    question: "How is your stress level today?",
    emoji: "🌡️",
    options: [
      { label: "Overwhelmed — hard to breathe", score: 10 },
      { label: "High — a lot on my plate",       score: 30 },
      { label: "Moderate — manageable",          score: 50 },
      { label: "Low — feeling in control",       score: 75 },
      { label: "Minimal — calm and clear",       score: 100 },
    ],
  },
  {
    id: "gratitude",
    question: "Can you name something you are genuinely grateful for today?",
    emoji: "🙏",
    options: [
      { label: "Not right now — hard day",      score: 10 },
      { label: "Struggling to think of one",    score: 30 },
      { label: "Sort of — nothing big",         score: 50 },
      { label: "Yes — one thing comes to mind", score: 75 },
      { label: "Easily — multiple things",      score: 100 },
    ],
  },
  {
    id: "confidence",
    question: "How confident do you feel in yourself today?",
    emoji: "💪",
    options: [
      { label: "Doubtful and unsure",           score: 10 },
      { label: "Low — second-guessing a lot",   score: 30 },
      { label: "Neutral — okay self-image",     score: 50 },
      { label: "Solid — trust my instincts",    score: 75 },
      { label: "Strong — fully in my power",    score: 100 },
    ],
  },
];

// ── Rotating questions — one bank per day of week ────────────────────────────
const ROTATING_BANKS = {
  // Sunday (0)
  0: [
    { id: "weekly_reflection", question: "Looking back at this week, how aligned were your actions with your goals?", emoji: "🌀",
      options: [
        { label: "Completely off track",          score: 10 },
        { label: "Mostly drifting",               score: 30 },
        { label: "Neutral — some wins, some not", score: 50 },
        { label: "Mostly on track",               score: 75 },
        { label: "Fully aligned",                 score: 100 },
      ],
    },
    { id: "rest_quality", question: "How rested did you feel going into this week?", emoji: "😴",
      options: [
        { label: "No rest at all",                score: 10 },
        { label: "Sleep deprived",                score: 30 },
        { label: "Average sleep",                 score: 50 },
        { label: "Pretty rested",                 score: 75 },
        { label: "Fully recharged",               score: 100 },
      ],
    },
  ],
  // Monday (1)
  1: [
    { id: "goals_clarity", question: "How clear are you on what you want to accomplish this week?", emoji: "🗺️",
      options: [
        { label: "No idea — no plan",             score: 10 },
        { label: "Vague direction",               score: 30 },
        { label: "Some goals in mind",            score: 50 },
        { label: "Clear goals set",               score: 75 },
        { label: "Fully mapped — locked and loaded", score: 100 },
      ],
    },
    { id: "fresh_start", question: "How ready do you feel to start fresh today?", emoji: "🌅",
      options: [
        { label: "Not at all — carrying last week", score: 10 },
        { label: "Still dragging",                score: 30 },
        { label: "Neutral — it's just Monday",   score: 50 },
        { label: "Fairly ready",                  score: 75 },
        { label: "Fully reset — new energy",      score: 100 },
      ],
    },
  ],
  // Tuesday (2)
  2: [
    { id: "discipline", question: "How disciplined have you been with your habits recently?", emoji: "🔩",
      options: [
        { label: "No consistency at all",         score: 10 },
        { label: "Very inconsistent",             score: 30 },
        { label: "Mixed — some days better",      score: 50 },
        { label: "Mostly consistent",             score: 75 },
        { label: "Locked in — no excuses",        score: 100 },
      ],
    },
    { id: "follow_through", question: "How well have you followed through on commitments lately?", emoji: "✅",
      options: [
        { label: "Barely at all",                 score: 10 },
        { label: "Kept dropping the ball",        score: 30 },
        { label: "Average follow-through",        score: 50 },
        { label: "Mostly followed through",       score: 75 },
        { label: "Full integrity — did what I said", score: 100 },
      ],
    },
  ],
  // Wednesday (3)
  3: [
    { id: "purpose", question: "How connected do you feel to your purpose or bigger vision today?", emoji: "🌠",
      options: [
        { label: "Completely disconnected",       score: 10 },
        { label: "Barely feeling it",             score: 30 },
        { label: "Somewhere in the middle",       score: 50 },
        { label: "Feeling the pull",              score: 75 },
        { label: "Fully on fire for it",          score: 100 },
      ],
    },
    { id: "meaning", question: "How meaningful did your work feel yesterday?", emoji: "💡",
      options: [
        { label: "Completely hollow",             score: 10 },
        { label: "Just tasks — no meaning",       score: 30 },
        { label: "Neutral — it was work",         score: 50 },
        { label: "Some meaning in it",            score: 75 },
        { label: "Deeply fulfilling",             score: 100 },
      ],
    },
  ],
  // Thursday (4)
  4: [
    { id: "resilience", question: "When challenges hit lately, how have you responded?", emoji: "🛡️",
      options: [
        { label: "Fell apart — totally derailed", score: 10 },
        { label: "Struggled a lot",               score: 30 },
        { label: "Held on but felt shaky",        score: 50 },
        { label: "Bounced back fairly well",      score: 75 },
        { label: "Stayed grounded — adapted fast", score: 100 },
      ],
    },
    { id: "mental_strength", question: "How mentally strong do you feel today?", emoji: "🧠",
      options: [
        { label: "Fragile and reactive",          score: 10 },
        { label: "Easily affected by things",     score: 30 },
        { label: "Average — getting by",          score: 50 },
        { label: "Solid and stable",              score: 75 },
        { label: "Unshakeable — full mind control", score: 100 },
      ],
    },
  ],
  // Friday (5)
  5: [
    { id: "optimism", question: "How optimistic do you feel about the near future?", emoji: "🌟",
      options: [
        { label: "Very pessimistic",              score: 10 },
        { label: "Doubtful — can't see it yet",   score: 30 },
        { label: "Cautiously hopeful",            score: 50 },
        { label: "Genuinely optimistic",          score: 75 },
        { label: "Completely confident in the path", score: 100 },
      ],
    },
    { id: "wins", question: "How many wins — big or small — can you acknowledge this week?", emoji: "🏆",
      options: [
        { label: "None I can think of",           score: 10 },
        { label: "Barely any",                    score: 30 },
        { label: "A couple",                      score: 50 },
        { label: "Several solid wins",            score: 75 },
        { label: "A strong week — many wins",     score: 100 },
      ],
    },
  ],
  // Saturday (6)
  6: [
    { id: "presence", question: "How present have you been in your daily moments this week?", emoji: "🎋",
      options: [
        { label: "Completely in my head",         score: 10 },
        { label: "Mostly distracted",             score: 30 },
        { label: "Half present, half elsewhere",  score: 50 },
        { label: "Mostly present",                score: 75 },
        { label: "Fully here — mindful all week", score: 100 },
      ],
    },
    { id: "joy", question: "How much genuine joy did you experience today or yesterday?", emoji: "😄",
      options: [
        { label: "None — going through motions",  score: 10 },
        { label: "Very little",                   score: 30 },
        { label: "Some moments",                  score: 50 },
        { label: "Quite a bit",                   score: 75 },
        { label: "Genuinely joyful",              score: 100 },
      ],
    },
  ],
};

/**
 * Build today's question list: 6 core + 2 rotating = 8 questions total
 * The rotating 2 are picked by day of week.
 */
export function getTodaysQuestions() {
  const dow = new Date().getDay(); // 0=Sun … 6=Sat
  const rotating = ROTATING_BANKS[dow] || ROTATING_BANKS[1];
  return [...CORE_QUESTIONS, ...rotating];
}

export const VIBE_SCORE_WEIGHTS = {
  safety: 0.25,
  clarity: 0.20,
  consistency: 0.20,
  gratitude: 0.15,
  rest: 0.10,
  action: 0.10,
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

export function calcVibeCategoryScoresFromAnswers(answers = []) {
  const byId = Object.fromEntries((answers || []).map((a) => [a.id, clampScore(a.score)]));
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

/** Calculate Vibe Score from the six shared weighted categories */
export function calcVibeScoreFromAnswers(answers) {
  if (!answers?.length) return 0;
  const categories = calcVibeCategoryScoresFromAnswers(answers);
  const raw = Object.entries(VIBE_SCORE_WEIGHTS).reduce((sum, [key, weight]) => sum + (categories[key] || 0) * weight, 0);
  return clampScore(raw);
}

/** Vibe category from score — single source of truth across every screen */
export function vibeCategory(score) {
  const value = clampScore(score);
  if (value <= 39) return { label: "Low Frequency", color: "#F87171", emoji: "🌑", moodTag: "low_energy" };
  if (value <= 59) return { label: "Rebuilding", color: "#FB923C", emoji: "🧱", moodTag: "neutral" };
  if (value <= 69) return { label: "Intentional", color: "#FBBF24", emoji: "🎯", moodTag: "intentional" };
  if (value <= 84) return { label: "Locked In", color: "#4ADE80", emoji: "🔒", moodTag: "intentional" };
  if (value <= 94) return { label: "High Vibe", color: "#00E5FF", emoji: "⚡", moodTag: "high_vibe" };
  return { label: "Legend Mode", color: "#D4A843", emoji: "👑", moodTag: "high_vibe" };
}

/** Short personalized message for results screen */
export function vibeMessage(score) {
  const level = vibeCategory(score).label;
  if (level === "Low Frequency") return "Your frequency needs care today. Start with safety, breath, and one small aligned action.";
  if (level === "Rebuilding") return "You are rebuilding your signal. Protect your peace and choose one clear next step.";
  if (level === "Intentional") return "You are moving with intention. Keep your focus clean and your actions steady.";
  if (level === "Locked In") return "You are locked in. Stay consistent and let your energy lead with structure.";
  if (level === "High Vibe") return "Your frequency is high. Use the momentum with gratitude, clarity, and grounded action.";
  return "Legend Mode is active. Keep leading your day from alignment, discipline, and purpose.";
}

/** Mood tags mapped to music recommendation query */
export const MOOD_MUSIC_MAP = {
  low_energy: ["uplifting", "grounding", "healing"],
  neutral: ["activation", "motivation", "focus"],
  intentional: ["focus", "manifestation", "432hz"],
  high_vibe: ["high_vibe", "celebration", "hiphop"],
};