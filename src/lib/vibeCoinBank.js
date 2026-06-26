/**
 * vibeCoinBank.js — Vibe Coin wallet/persistence
 *
 * Session: resets each city visit (lives in sessionStorage).
 * Bank: lifetime total saved to localStorage + user account.
 *
 * Wraps the existing orbBank.js so all sources (launch, surf, future games)
 * share a single spendable balance.
 */

import { getOrbBank, addToOrbBank } from "./orbBank";

// ── Session counters ─────────────────────────────────────────────
const SESSION_KEY = "uvc_vibe_session_coins";

/** Read the current session coin tally */
export function getSessionCoins() {
  try { return parseInt(sessionStorage.getItem(SESSION_KEY) || "0", 10); } catch { return 0; }
}

/** Reset session counter (called on city entry) */
export function resetSessionCoins() {
  try { sessionStorage.setItem(SESSION_KEY, "0"); } catch {}
}

/** Add to session tally, returns new total */
export function addSessionCoins(count) {
  const next = getSessionCoins() + count;
  try { sessionStorage.setItem(SESSION_KEY, String(next)); } catch {}
  return next;
}

// ── Lifetime bank ────────────────────────────────────────────────
/** Read the lifetime Bank total */
export function getVibeCoinBank() {
  return getOrbBank();
}

/** Add to lifetime bank AND session tally. Returns { total, session } */
export function addVibeCoins(count) {
  const combined = count;
  const total = addToOrbBank(combined);
  const session = addSessionCoins(combined);
  return { total, session };
}

/** Sync bank + session to the user's profile (best effort) */
export async function syncVibeCoinsToAccount(base44Client, force = false) {
  try {
    const total = getVibeCoinBank();
    const session = getSessionCoins();
    await base44Client.auth.updateMe({
      hb_total_orbs: total,
      vibe_session_coins: session,
    });
  } catch {}
}