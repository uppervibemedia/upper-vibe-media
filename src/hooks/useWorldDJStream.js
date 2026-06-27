/**
 * useWorldDJStream — Shared Live DJ Stream for the Dance Floor.
 *
 * All users hear the same song at the same position because playback is
 * calculated from a deterministic global clock anchored at a fixed epoch.
 *
 * No shuffle — track order is stable so every user independently computes
 * the same current track index and seek position.
 *
 * Audio priority rules (hard):
 *   1. Stage watch mode  (managed by UpperVibeCity)
 *   2. Dance Floor DJ    (this hook, when danceFloorMode=true)
 *   3. Personal global   (managed by UpperVibeCity)
 *
 * The hook never touches the global player — the caller (UpperVibeCity) is
 * responsible for pausing/resuming it around dance floor entry/exit.
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";

// ─── Constants ────────────────────────────────────────────────────────────────
const MAX_VOL   = 0.82;
const FADE_MS   = 600;

// Epoch anchor: all clients compute elapsed time from this fixed timestamp.
// Change it only if you want to reset the DJ clock globally.
const DJ_EPOCH_MS = 1_700_000_000_000; // Nov 14 2023 — arbitrary but stable

// Singleton audio element — survives React re-renders and hook re-mounts.
// Using module-level scope prevents duplicate Audio() instances on iOS.
let _djAudio = null;
let _djTracksCache = null; // resolved track list (shared across mounts)
let _djLoadPromise = null; // in-flight load promise (deduplicates concurrent fetches)

function getDJAudio() {
  if (!_djAudio) {
    _djAudio = new Audio();
    _djAudio.preload = "auto";
    _djAudio.volume  = 0;
  }
  return _djAudio;
}

// ─── Shared clock helpers ─────────────────────────────────────────────────────

/** Total elapsed DJ milliseconds since the epoch. */
function djElapsedMs() {
  return Date.now() - DJ_EPOCH_MS;
}

/**
 * Given an ordered track list (with numeric `duration` fields in seconds),
 * returns { index, seekTime } for the current shared playback position.
 *
 * Falls back to a 210-second estimate if a track has no duration.
 */
function getDJPosition(tracks) {
  if (!tracks?.length) return { index: 0, seekTime: 0 };

  const DEFAULT_DURATION = 210; // 3.5 min fallback
  const elapsed = djElapsedMs() / 1000; // seconds

  // Build cumulative durations
  let total = 0;
  const durations = tracks.map(t => {
    const d = parseDuration(t.duration) || DEFAULT_DURATION;
    total += d;
    return d;
  });

  // Wrap elapsed into one full cycle
  const loopLen  = total;
  const loopTime = elapsed % loopLen;

  // Walk the list to find which track
  let acc = 0;
  for (let i = 0; i < tracks.length; i++) {
    acc += durations[i];
    if (loopTime < acc) {
      const seekTime = loopTime - (acc - durations[i]);
      return { index: i, seekTime: Math.max(0, seekTime) };
    }
  }

  return { index: 0, seekTime: 0 };
}

/** Parse "m:ss" or "mm:ss" or plain seconds into a number of seconds. */
function parseDuration(val) {
  if (!val) return 0;
  if (typeof val === "number") return val;
  const s = String(val).trim();
  const parts = s.split(":").map(Number);
  if (parts.length === 2) return (parts[0] || 0) * 60 + (parts[1] || 0);
  if (parts.length === 3) return (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

// ─── Playlist loader (deduplicated, cached) ───────────────────────────────────
async function loadDJTracks() {
  // Return from cache if already loaded
  if (_djTracksCache?.length) return _djTracksCache;
  // Deduplicate concurrent callers
  if (_djLoadPromise) return _djLoadPromise;

  _djLoadPromise = (async () => {
    try {
      const playlists = await base44.entities.DJPlaylist.list("-updated_date", 20);
      const active = playlists.find(p => p.isActive);

      if (active?.trackIds?.length) {
        const pool = await base44.entities.Track.filter({ status: "published" }, "-display_order", 500);
        const poolMap = Object.fromEntries(pool.filter(t => t.audio_url).map(t => [t.id, t]));
        const resolved = active.trackIds.map(id => poolMap[id]).filter(Boolean);
        if (resolved.length) {
          _djTracksCache = resolved;
          return resolved;
        }
      }

      // Fallback: published tracks ordered by display_order (stable, not shuffled)
      const fallback = await base44.entities.Track.filter({ status: "published" }, "display_order", 200);
      const withAudio = fallback.filter(t => t.audio_url);
      if (withAudio.length) {
        _djTracksCache = withAudio;
        return withAudio;
      }
    } catch (e) {
      console.warn("[DJStream] loadDJTracks error:", e);
    }
    return [];
  })();

  _djLoadPromise.finally(() => { _djLoadPromise = null; });
  return _djLoadPromise;
}

// ─── Fade helper ─────────────────────────────────────────────────────────────
function fadeTo(el, targetVol, ms, onDone) {
  if (!el) return;
  const startVol = el.volume;
  const start    = performance.now();
  const tick = (now) => {
    const t = Math.min(1, (now - start) / ms);
    el.volume = Math.max(0, Math.min(1, startVol + (targetVol - startVol) * t));
    if (t < 1) requestAnimationFrame(tick);
    else if (onDone) onDone();
  };
  requestAnimationFrame(tick);
}

// ─── Hook ────────────────────────────────────────────────────────────────────
export default function useWorldDJStream({ enabled = true, danceFloorMode = false }) {
  const [djTrack, setDjTrack] = useState(null);

  const tracksRef       = useRef([]); // resolved ordered track list
  const loadedRef       = useRef(false);
  const danceFloorRef   = useRef(false);
  danceFloorRef.current = danceFloorMode;

  // Track which src is loaded in the singleton audio element
  const loadedSrcRef    = useRef("");
  const playBlockedRef  = useRef(false);
  const endedListenerRef = useRef(null);

  // ── Load tracks (once) ──────────────────────────────────────────────────
  const ensureLoaded = useCallback(async () => {
    if (loadedRef.current) return tracksRef.current;
    const tracks = await loadDJTracks();
    tracksRef.current = tracks;
    loadedRef.current = tracks.length > 0;
    return tracks;
  }, []);

  // ── Sync to shared DJ clock and start/seek ───────────────────────────────
  const syncAndPlay = useCallback(async () => {
    const tracks = await ensureLoaded();
    if (!tracks.length) return;

    const el = getDJAudio();
    const { index, seekTime } = getDJPosition(tracks);
    const track = tracks[index];
    if (!track?.audio_url) return;

    setDjTrack(track);

    const needsNewSrc = loadedSrcRef.current !== track.audio_url;
    if (needsNewSrc) {
      // Switching tracks — load new src then seek
      el.src = track.audio_url;
      loadedSrcRef.current = track.audio_url;
      el.load();
    }

    const doPlay = () => {
      if (!danceFloorRef.current) return; // user left before audio was ready

      // Seek to shared position (allow ±3s tolerance to avoid unnecessary seeks)
      if (Math.abs(el.currentTime - seekTime) > 3) {
        el.currentTime = seekTime;
      }

      el.play()
        .then(() => {
          playBlockedRef.current = false;
          fadeTo(el, MAX_VOL, FADE_MS);
        })
        .catch((err) => {
          console.warn("[DJStream] play() blocked:", err.message);
          playBlockedRef.current = true;
        });
    };

    if (el.readyState >= 2) {
      doPlay();
    } else {
      const onReady = () => {
        el.removeEventListener("canplay", onReady);
        doPlay();
      };
      el.addEventListener("canplay", onReady);
    }
  }, [ensureLoaded]);

  // ── Handle track end → advance to next via shared clock ─────────────────
  const setupEndedListener = useCallback(() => {
    const el = getDJAudio();
    // Remove any previous listener first
    if (endedListenerRef.current) {
      el.removeEventListener("ended", endedListenerRef.current);
    }
    const onEnded = () => {
      // Re-sync: clock will naturally point to the next track now
      if (danceFloorRef.current) syncAndPlay();
      else {
        // Not on floor — just update track metadata for the DJ display
        ensureLoaded().then(tracks => {
          const { index } = getDJPosition(tracks);
          if (tracks[index]) setDjTrack(tracks[index]);
        });
      }
    };
    el.addEventListener("ended", onEnded);
    endedListenerRef.current = onEnded;
  }, [syncAndPlay, ensureLoaded]);

  // ── Init: set up ended listener + pre-load tracks ────────────────────────
  useEffect(() => {
    if (!enabled) return;
    setupEndedListener();
    // Pre-load playlist so first entry is instant
    ensureLoaded().then(tracks => {
      if (tracks.length) {
        const { index } = getDJPosition(tracks);
        setDjTrack(tracks[index] || null);
      }
    });
    return () => {
      const el = _djAudio;
      if (el && endedListenerRef.current) {
        el.removeEventListener("ended", endedListenerRef.current);
        endedListenerRef.current = null;
      }
    };
  }, [enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Dance floor gate ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled) return;
    const el = getDJAudio();

    if (danceFloorMode) {
      // Entering dance floor → sync to shared DJ clock and play
      syncAndPlay();
    } else {
      // Leaving dance floor → silence immediately, keep audio buffered
      // Use a quick fade-out to avoid a click/pop
      fadeTo(el, 0, 200, () => {
        // Don't pause — keeps the buffer warm for re-entry
        // (pausing forces a re-buffer seek on iOS which causes a delay)
      });
    }
  }, [danceFloorMode, enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Retry on user gesture if autoplay was blocked ─────────────────────────
  useEffect(() => {
    if (!enabled) return;
    const retry = () => {
      if (playBlockedRef.current && danceFloorRef.current) {
        playBlockedRef.current = false;
        syncAndPlay();
      }
    };
    window.addEventListener("click",    retry, { passive: true });
    window.addEventListener("touchend", retry, { passive: true });
    window.addEventListener("keydown",  retry, { passive: true });
    return () => {
      window.removeEventListener("click",    retry);
      window.removeEventListener("touchend", retry);
      window.removeEventListener("keydown",  retry);
    };
  }, [enabled, syncAndPlay]);

  // ── Expose audio ref so caller can duck/mute it ───────────────────────────
  // Return a stable ref object that always points to the singleton element
  const audioRefObj = useRef(null);
  audioRefObj.current = getDJAudio();

  return { djAudioRef: audioRefObj, djTrack };
}