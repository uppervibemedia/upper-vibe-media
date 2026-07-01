import { base44 } from "@/api/base44Client";

const COOLDOWN_MS = 24 * 60 * 60 * 1000;

function guestKey() {
  try {
    let key = localStorage.getItem("uvc_guest_reward_key");
    if (!key) {
      key = `guest_${Math.random().toString(36).slice(2)}_${Date.now()}`;
      localStorage.setItem("uvc_guest_reward_key", key);
    }
    return key;
  } catch {
    return "guest";
  }
}

function localStorageKey(userId, rewardKey) {
  return `uvc_reward_cooldown_${userId || guestKey()}_${rewardKey}`;
}

export const REWARD_SAVED_MESSAGE = "Daily Reward Saved - come back in 24 hrs";

export async function claimRewardCooldown(userId, rewardKey) {
  const now = Date.now();
  const claimedAt = new Date(now).toISOString();
  const effectiveUserId = userId || guestKey();

  if (!userId) {
    const key = localStorageKey(effectiveUserId, rewardKey);
    const last = Number(localStorage.getItem(key) || 0);
    if (last && now - last < COOLDOWN_MS) {
      return { allowed: false, remainingMs: COOLDOWN_MS - (now - last), message: REWARD_SAVED_MESSAGE };
    }
    localStorage.setItem(key, String(now));
    return { allowed: true, claimedAt };
  }

  try {
    const rows = await base44.entities.UserRewardCooldown.filter({ user_id: effectiveUserId, reward_key: rewardKey }, "-last_claimed_at", 1);
    const existing = rows?.[0];
    const lastMs = existing?.last_claimed_at ? new Date(existing.last_claimed_at).getTime() : 0;
    if (lastMs && now - lastMs < COOLDOWN_MS) {
      return { allowed: false, remainingMs: COOLDOWN_MS - (now - lastMs), message: REWARD_SAVED_MESSAGE };
    }
    if (existing?.id) {
      await base44.entities.UserRewardCooldown.update(existing.id, { last_claimed_at: claimedAt });
    } else {
      await base44.entities.UserRewardCooldown.create({ user_id: effectiveUserId, reward_key: rewardKey, last_claimed_at: claimedAt });
    }
    return { allowed: true, claimedAt };
  } catch {
    const key = localStorageKey(effectiveUserId, rewardKey);
    const last = Number(localStorage.getItem(key) || 0);
    if (last && now - last < COOLDOWN_MS) {
      return { allowed: false, remainingMs: COOLDOWN_MS - (now - last), message: REWARD_SAVED_MESSAGE };
    }
    localStorage.setItem(key, String(now));
    return { allowed: true, claimedAt };
  }
}