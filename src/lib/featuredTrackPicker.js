/**
 * featuredTrackPicker — picks the featured track for the homepage player.
 *
 * Priority:
 * 1. If there are songs uploaded within the last 7 days, rotate between them
 *    across visits (session-seeded, never the same as last visit if avoidable).
 * 2. If no new songs, pick a random published track (weighted toward higher plays).
 *
 * "Never same song twice in a row" is enforced via localStorage.
 */

import { isNewTrack } from "@/lib/isNewTrack";

const LAST_KEY = "uvm_hp_last_featured_id";

function getLastId() {
  try { return localStorage.getItem(LAST_KEY) || null; } catch { return null; }
}

function setLastId(id) {
  try { localStorage.setItem(LAST_KEY, id); } catch {}
}

/**
 * pickFeaturedTrack(tracks: Track[]) → Track | null
 * tracks should be eligible (published, has audio_url + cover_url), sorted newest first.
 */
export function pickFeaturedTrack(tracks) {
  if (!tracks || tracks.length === 0) return null;

  const lastId = getLastId();

  // ── 1. Collect new tracks (last 7 days) ──────────────────────────────────
  const newTracks = tracks.filter(isNewTrack);

  let pool;
  if (newTracks.length > 0) {
    // Prefer new tracks; avoid last-played if we have more than one
    pool = newTracks.length > 1
      ? newTracks.filter((t) => t.id !== lastId)
      : newTracks;
    // If filtering left us empty (only 1 new track and it was last), show it anyway
    if (pool.length === 0) pool = newTracks;
  } else {
    // ── 2. No new tracks — use the full published pool ──────────────────────
    pool = tracks.length > 1
      ? tracks.filter((t) => t.id !== lastId)
      : tracks;
    if (pool.length === 0) pool = tracks;
  }

  // ── 3. Weighted random (plays count as a mild signal) ───────────────────
  // Use a session-stable seed so the pick doesn't change on every render,
  // but does change across page loads / visits.
  const sessionSeed = (() => {
    try {
      const k = "uvm_hp_seed";
      let s = sessionStorage.getItem(k);
      if (!s) { s = String(Math.random()); sessionStorage.setItem(k, s); }
      return parseFloat(s);
    } catch { return Math.random(); }
  })();

  // Simple weighted pick: slot count proportional to play rank within the pool
  // (most-played gets slightly higher chance, but it's kept subtle)
  const sorted = [...pool].sort((a, b) => (b.plays || 0) - (a.plays || 0));
  const weights = sorted.map((_, i) => Math.max(1, sorted.length - i)); // linear decay
  const totalWeight = weights.reduce((s, w) => s + w, 0);
  let rand = sessionSeed * totalWeight;
  let chosen = sorted[sorted.length - 1]; // fallback
  for (let i = 0; i < sorted.length; i++) {
    rand -= weights[i];
    if (rand <= 0) { chosen = sorted[i]; break; }
  }

  setLastId(chosen.id);
  return chosen;
}

/**
 * pickSmallCards(tracks, featuredId, count = 3) → Track[]
 * Returns the next N newest tracks excluding the featured one.
 * If new tracks exist, prefer showing more new tracks in the small card row.
 */
export function pickSmallCards(tracks, featuredId, count = 3) {
  const excluding = tracks.filter((t) => t.id !== featuredId);
  const newOnes = excluding.filter(isNewTrack);
  const rest = excluding.filter((t) => !isNewTrack(t));
  // Fill from new first, then pad with regular tracks
  return [...newOnes, ...rest].slice(0, count);
}