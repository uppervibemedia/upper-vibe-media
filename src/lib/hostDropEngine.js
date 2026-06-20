/**
 * hostDropEngine.js — Upper Vibe Radio Host Drop System
 *
 * Manages loading, caching, and playback of radio host drop interstitials.
 * Drops play via the same audio element as regular tracks.
 */

import { base44 } from "@/api/base44Client";

let _cachedDrops = [];
let _lastPlayed  = null;
let _dropsLoaded = false;
let _dropsLoading = null; // share in-flight promise

export async function loadHostDrops() {
  if (_dropsLoaded && _cachedDrops.length > 0) return _cachedDrops;
  if (_dropsLoading) return _dropsLoading; // share in-flight
  
  _dropsLoading = base44.entities.RadioHostDrop.filter({ is_active: true })
    .then((drops) => {
      _cachedDrops = drops || [];
      _dropsLoaded = true;
      _dropsLoading = null;
      return _cachedDrops;
    })
    .catch((e) => {
      console.warn("[hostDropEngine] Failed to load drops:", e.message);
      _cachedDrops = [];
      _dropsLoaded = true;
      _dropsLoading = null;
      return _cachedDrops;
    });
  
  return _dropsLoading;
}

export function pickRandomDrop() {
  if (!_cachedDrops.length) return null;
  const eligible = _cachedDrops.length > 1
    ? _cachedDrops.filter((d) => d.id !== _lastPlayed)
    : _cachedDrops;
  const drop = eligible[Math.floor(Math.random() * eligible.length)];
  _lastPlayed = drop?.id || null;
  return drop || null;
}

export function hostDropAsTrack(drop) {
  return {
    id:             `drop_${drop.id}`,
    title:          drop.title || "Radio Check-In",
    artist_display: "Upper Vibe Radio Host",
    audio_url:      drop.audio_url,
    cover_url:      null,
    _isHostDrop:    true,
    _dropId:        drop.id,
  };
}

// ── Analytics helpers (fire-and-forget) ──────────────────────────────────────
function trackDropEvent(eventType, drop) {
  try {
    base44.entities.AnalyticsEvent.create({
      event_type: eventType,
      song_id:    drop.id,
      song_title: drop.title,
    }).catch(() => {});
  } catch {}
}

export function trackDropStarted(drop)   { trackDropEvent("radio_host_drop_started",   drop); }
export function trackDropCompleted(drop) {
  trackDropEvent("radio_host_drop_completed", drop);
  // Increment play_count
  try {
    base44.entities.RadioHostDrop.update(drop.id, { play_count: (drop.play_count || 0) + 1 }).catch(() => {});
  } catch {}
}
export function trackDropSkipped(drop)   { trackDropEvent("radio_host_drop_skipped",   drop); }
export function trackDropFailed(drop)    { trackDropEvent("radio_host_drop_failed",    drop); }