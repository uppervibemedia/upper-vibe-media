/**
 * orbBank.js — Global Orb Bank (lifetime spendable currency)
 *
 * Total Orb Bank  = lifetime sum of ALL orbs collected across every game/source.
 * Session Orbs    = orbs collected in the CURRENT run of a specific zone.
 * Zone Best Score = highest session orbs ever in a given zone (persisted).
 *
 * Sources (all add to the same bank):
 *   - Vibe Launch Zone   (zone: "launch")
 *   - Neon Surf Beach    (zone: "beach")
 *   - Future mini-games  (zone: any string key)
 *   - Daily challenge rewards (zone: "daily")
 */

const BANK_KEY  = "uvc_orb_bank_total";
const BEST_KEY  = "uvc_orb_zone_best";

/** Read the lifetime total */
export function getOrbBank() {
  try { return parseInt(localStorage.getItem(BANK_KEY) || "0", 10); } catch { return 0; }
}

/** Add `count` orbs and persist. Returns new total. */
export function addToOrbBank(count) {
  const next = getOrbBank() + count;
  try { localStorage.setItem(BANK_KEY, String(next)); } catch {}
  return next;
}

/** Zone best scores map: { launch: 12, beach: 8, ... } */
export function getZoneBests() {
  try { return JSON.parse(localStorage.getItem(BEST_KEY) || "{}"); } catch { return {}; }
}

/** Update zone best if newScore is higher. Returns updated best for that zone. */
export function updateZoneBest(zone, newScore) {
  const bests = getZoneBests();
  if ((newScore ?? 0) > (bests[zone] ?? 0)) {
    bests[zone] = newScore;
    try { localStorage.setItem(BEST_KEY, JSON.stringify(bests)); } catch {}
  }
  return bests[zone] ?? 0;
}

/** Sync bank total to the user's account (best-effort, non-blocking) */
export async function syncBankToAccount(base44Client, extraFields = {}) {
  try {
    const total = getOrbBank();
    const bests = getZoneBests();
    await base44Client.auth.updateMe({
      hb_total_orbs: total,
      orb_zone_bests: JSON.stringify(bests),
      ...extraFields,
    });
  } catch {}
}