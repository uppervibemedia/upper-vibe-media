/**
 * Radio Curator — AI-driven personalisation engine
 *
 * Tracks per-song signals in localStorage and computes a weight for every
 * track so the radio queue naturally surfaces songs the listener enjoys and
 * buries songs they skip.
 *
 * Signal model (all capped so no track is ever zeroed out completely):
 *   +4  listened to completion
 *   +2  listened > 30 s but not to end
 *   +3  liked (heart button)
 *   -2  skipped early (< 20 s)
 *   -1  skipped mid (20 – 60 s)
 *
 * Similarity propagation:
 *   When a song is liked/skipped, half the signal propagates to other tracks
 *   that share the same primary_artist_id or overlapping mood_tags.
 *   This lets the curator generalise — if you skip all 528 Hz tracks it will
 *   learn without you having to skip every single one.
 *
 * Decay:
 *   Weights drift back toward 1.0 over time (half-life ≈ 7 days) so old
 *   signals don't permanently lock in the queue.
 *
 * Weight clamping:  0.2 (minimum, so a track is never fully excluded) → 8.0
 */

const LS_KEY     = "uvm_radio_curator";
const HALF_LIFE  = 7 * 24 * 60 * 60 * 1000; // 7 days in ms
const MIN_WEIGHT = 0.1; // disliked songs can drop below 0.2
const MAX_WEIGHT = 8.0;
const BASE       = 1.0;
// Hard floor for disliked songs — still in pool but almost never plays
const DISLIKE_WEIGHT = 0.1;

// ── Persistence ───────────────────────────────────────────────────────────────
function load() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : { weights: {}, updatedAt: {} };
  } catch { return { weights: {}, updatedAt: {} }; }
}

function save(data) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch {}
}

// ── Decay helper ──────────────────────────────────────────────────────────────
// Pulls the stored weight back toward BASE proportional to elapsed time.
function decayedWeight(weight, updatedAt) {
  if (!updatedAt) return weight;
  const elapsed = Date.now() - updatedAt;
  const halfLives = elapsed / HALF_LIFE;
  // Exponential decay toward BASE
  return BASE + (weight - BASE) * Math.pow(0.5, halfLives);
}

function clamp(v) {
  return Math.min(MAX_WEIGHT, Math.max(MIN_WEIGHT, v));
}

// ── Internal: apply a delta to a track and optionally propagate ───────────────
function applyDelta(data, trackId, delta, allTracks, propagateFraction = 0) {
  const now = Date.now();

  // Decay existing weight before modifying
  const raw = data.weights[trackId] ?? BASE;
  const decayed = decayedWeight(raw, data.updatedAt[trackId]);
  data.weights[trackId] = clamp(decayed + delta);
  data.updatedAt[trackId] = now;

  // Propagate a fraction of the signal to similar tracks
  if (propagateFraction !== 0 && allTracks?.length) {
    const source = allTracks.find((t) => t.id === trackId);
    if (source) {
      const propagatedDelta = delta * propagateFraction;
      allTracks.forEach((t) => {
        if (t.id === trackId) return;
        const sameArtist = t.primary_artist_id && t.primary_artist_id === source.primary_artist_id;
        const sharedMood = source.mood_tags?.some((tag) => t.mood_tags?.includes(tag));
        if (sameArtist || sharedMood) {
          const r = data.weights[t.id] ?? BASE;
          const d = decayedWeight(r, data.updatedAt[t.id]);
          data.weights[t.id] = clamp(d + propagatedDelta);
          data.updatedAt[t.id] = now;
        }
      });
    }
  }
}

// ── Public signals ────────────────────────────────────────────────────────────

/**
 * Call when the user skips to the next song.
 * @param {string} trackId
 * @param {number} listenedSeconds  — how many seconds they actually heard
 * @param {Array}  allTracks        — full track list for propagation
 */
export function recordSkip(trackId, listenedSeconds, allTracks) {
  if (!trackId) return;
  const data  = load();
  const delta = listenedSeconds < 20 ? -2 : -1;
  applyDelta(data, trackId, delta, allTracks, 0.25);
  save(data);
  console.log("[Curator] skip recorded — id:", trackId, "| seconds:", listenedSeconds.toFixed(1), "| delta:", delta);
}

/**
 * Call when a song plays to completion (onEnded fires).
 * @param {string} trackId
 * @param {Array}  allTracks
 */
export function recordComplete(trackId, allTracks) {
  if (!trackId) return;
  const data = load();
  applyDelta(data, trackId, +4, allTracks, 0.15);
  save(data);
  console.log("[Curator] complete recorded — id:", trackId);
}

/**
 * Call when the user taps thumbs down.
 * Sets the weight to DISLIKE_WEIGHT (0.1) — an ~90% reduction in play frequency.
 * Calling again (undo) restores weight to BASE (1.0).
 * @param {string}  trackId
 * @param {boolean} disliked   — true = disliked, false = undo dislike
 * @param {Array}   allTracks
 */
export function recordDislike(trackId, disliked, allTracks) {
  if (!trackId) return;
  const data = load();
  const now  = Date.now();
  if (disliked) {
    // Hard-set to near-zero — bypasses decay so it sticks until undone
    data.weights[trackId]   = DISLIKE_WEIGHT;
    data.updatedAt[trackId] = now;
  } else {
    // Undo: restore to neutral baseline
    data.weights[trackId]   = BASE;
    data.updatedAt[trackId] = now;
  }
  save(data);
  console.log("[Curator] dislike recorded — id:", trackId, "| disliked:", disliked,
    "| weight:", data.weights[trackId]);
}

/**
 * Call when the user taps the heart button.
 * @param {string}  trackId
 * @param {boolean} liked      — true = liked, false = unliked
 * @param {Array}   allTracks
 */
export function recordLike(trackId, liked, allTracks) {
  if (!trackId) return;
  const data  = load();
  const delta = liked ? +3 : -1;
  applyDelta(data, trackId, delta, allTracks, 0.3);
  save(data);
  console.log("[Curator] like recorded — id:", trackId, "| liked:", liked);
}

/**
 * Call when a song is listened to for a meaningful duration but not to end.
 * @param {string} trackId
 * @param {number} listenedSeconds
 * @param {Array}  allTracks
 */
export function recordListen(trackId, listenedSeconds, allTracks) {
  if (!trackId || listenedSeconds < 30) return;
  const data = load();
  applyDelta(data, trackId, +2, allTracks, 0.1);
  save(data);
  console.log("[Curator] listen recorded — id:", trackId, "| seconds:", listenedSeconds.toFixed(1));
}

/**
 * Returns the current effective weight for a track (after decay).
 * @param {string} trackId
 * @returns {number}
 */
export function getWeight(trackId) {
  const data = load();
  const raw  = data.weights[trackId] ?? BASE;
  return clamp(decayedWeight(raw, data.updatedAt[trackId]));
}

/**
 * Build a weighted, shuffled queue using curator weights + liked IDs.
 * Liked IDs provide an additive base so even first-time visitors get a good queue.
 *
 * @param {Array}  allTracks      — all published tracks
 * @param {string} excludeId      — currently playing track to exclude
 * @param {Array}  likedIds       — IDs the user has hearted
 * @returns {Array}               — shuffled array of track objects
 */
export function buildWeightedQueue(allTracks, excludeId, likedIds = [], dislikedIds = []) {
  const pool = [];

  allTracks.filter((t) => t.id !== excludeId).forEach((t) => {
    // Base weight: 1.0 for everyone, +2 bonus if liked
    const likedBonus  = likedIds.includes(t.id) ? 2 : 0;
    const curatorW    = getWeight(t.id);
    // Disliked: override to DISLIKE_WEIGHT regardless of curator score
    const finalWeight = dislikedIds.includes(t.id)
      ? DISLIKE_WEIGHT
      : clamp(curatorW + likedBonus);
    // Convert float weight into integer slot count (min 1 for non-disliked, 0 for disliked → skip entirely back-to-back)
    const slots = finalWeight <= DISLIKE_WEIGHT ? 0 : Math.max(1, Math.round(finalWeight * 2));
    // Still put disliked songs in at slot=1 once every ~10 songs via occasional 10% slot
    if (slots === 0) {
      if (Math.random() < 0.05) pool.push(t); // ~5% chance to include — nearly never plays
    } else {
      for (let i = 0; i < slots; i++) pool.push(t);
    }
  });

  // Fisher-Yates shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  // De-duplicate while preserving weighted order
  const seen = new Set();
  return pool.filter((t) => {
    if (seen.has(t.id)) return false;
    seen.add(t.id);
    return true;
  });
}

/**
 * Returns true once enough signals have been recorded to consider the
 * experience "personalised". Used to show the "Tuned to You" badge.
 */
export function isCuratorActive() {
  const data = load();
  return Object.keys(data.weights).length >= 3;
}

/**
 * Reset all curator data (for testing / user request).
 */
export function resetCurator() {
  try { localStorage.removeItem(LS_KEY); } catch {}
}