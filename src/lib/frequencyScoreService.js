import { base44 } from "@/api/base44Client";

export const FREQUENCY_SCORE_VALUES = {
  daily_city_quest_complete: 50,
  vibecheck: 20,
  sacred_symbol_activated: 10,
  academy_daily_lesson: 25,
  academy_learning_video: 15,
  stage_visualizer: 15,
  crystal_charge: 10,
  aura_zone: 10,
  ferris_wheel: 10,
  beach_visit: 5,
};

const COOLDOWN_MS = 24 * 60 * 60 * 1000;

export function frequencyTitle(score = 0) {
  if (score >= 25000) return "City Legend";
  if (score >= 10000) return "Frequency Master";
  if (score >= 5000) return "Vibe Scholar";
  if (score >= 2000) return "Alignment Seeker";
  if (score >= 500) return "Energy Builder";
  return "Frequency Starter";
}

function publicUsername(user) {
  return user?.world_username || user?.username || "Vibe User";
}

function actionKey(action, detail = {}) {
  if (action === "sacred_symbol_activated" && detail.symbolId) return `${action}:${detail.symbolId}`;
  if (action === "academy_learning_video" && detail.lessonId) return `${action}:${detail.lessonId}`;
  return action;
}

export async function awardFrequencyScore(user, action, detail = {}) {
  if (!user?.id || !FREQUENCY_SCORE_VALUES[action]) return { awarded: false };
  const key = actionKey(action, detail);
  const records = await base44.entities.FrequencyScore.filter({ user_id: user.id }, "-updated_at", 1);
  const now = new Date();
  const nowIso = now.toISOString();
  const current = records?.[0] || null;
  const timestamps = { ...(current?.action_timestamps || {}) };
  const last = timestamps[key] ? new Date(timestamps[key]).getTime() : 0;
  if (last && now.getTime() - last < COOLDOWN_MS) {
    window.dispatchEvent(new CustomEvent("uvcFrequencyScoreMessage", { detail: { message: "Daily Reward Saved - come back in 24 hrs" } }));
    return { awarded: false, cooldown: true };
  }
  timestamps[key] = nowIso;
  const amount = FREQUENCY_SCORE_VALUES[action];
  const nextScore = (current?.all_time_score || 0) + amount;
  const data = {
    user_id: user.id,
    username: publicUsername(user),
    avatar_type_key: user.avatar_type_key || user.avatar_type || "neutral",
    avatar_image_url: user.profile_image_url || user.avatar_url || "",
    all_time_score: nextScore,
    action_timestamps: timestamps,
    updated_at: nowIso,
  };
  if (current?.id) await base44.entities.FrequencyScore.update(current.id, data);
  else await base44.entities.FrequencyScore.create(data);
  window.dispatchEvent(new CustomEvent("uvcFrequencyScoreMessage", { detail: { message: `+${amount} Frequency Score` } }));
  return { awarded: true, amount, score: nextScore };
}

export async function loadFrequencyLeaderboard(userId) {
  const rows = await base44.entities.FrequencyScore.list("-all_time_score", 100);
  const sorted = (rows || []).sort((a, b) => (b.all_time_score || 0) - (a.all_time_score || 0));
  const ownIndex = userId ? sorted.findIndex((r) => r.user_id === userId) : -1;
  return { top: sorted.slice(0, 10), own: ownIndex >= 0 ? sorted[ownIndex] : null, ownRank: ownIndex >= 0 ? ownIndex + 1 : null };
}