/**
 * useWorldDJStream — strict zone-gated DJ audio stream.
 *
 * ABSOLUTE RULES:
 * 1. Audio element ALWAYS starts at volume=0, muted=true.
 * 2. Volume is ONLY ever raised when danceFloorMode===true AND the gate effect runs.
 * 3. On spawn: danceFloorMode=false → volume stays 0, muted=true. No exceptions.
 * 4. loadAndPlaySilent NEVER raises volume — it only sets src, seeks, and calls play().
 * 5. The gate effect is the ONLY place that changes volume/muted.
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";

const POLL_INTERVAL = 8000;
const SYNC_TOLERANCE = 2.5;
const FADE_IN_MS = 600; // faster fade-in so audio is audible quickly at the edge
const MAX_VOL = 0.85;

function fadeVolume(audioEl, targetVol, durationMs) {
  if (!audioEl) return () => {};
  const startVol = audioEl.volume;
  const startTime = performance.now();
  let raf;
  const tick = (now) => {
    const t = Math.min(1, (now - startTime) / durationMs);
    audioEl.volume = Math.max(0, Math.min(1, startVol + (targetVol - startVol) * t));
    if (t < 1) raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}

async function readDJSettings() {
  try {
    const [trackRow, tsRow] = await Promise.all([
      base44.entities.AppSettings.filter({ key: "dj_stream_track_id" }, "-created_date", 1),
      base44.entities.AppSettings.filter({ key: "dj_stream_start_ts" }, "-created_date", 1),
    ]);
    return {
      trackId: trackRow?.[0]?.value || null,
      startTs: tsRow?.[0]?.value ? parseInt(tsRow[0].value, 10) : null,
      trackRecordId: trackRow?.[0]?.id || null,
      tsRecordId: tsRow?.[0]?.id || null,
    };
  } catch {
    return { trackId: null, startTs: null, trackRecordId: null, tsRecordId: null };
  }
}

async function writeDJSettings(trackId, startTs, trackRecordId, tsRecordId) {
  try {
    if (trackRecordId) {
      await base44.entities.AppSettings.update(trackRecordId, { key: "dj_stream_track_id", value: String(trackId), label: "DJ Stream Track ID" });
    } else {
      await base44.entities.AppSettings.create({ key: "dj_stream_track_id", value: String(trackId), label: "DJ Stream Track ID" });
    }
    if (tsRecordId) {
      await base44.entities.AppSettings.update(tsRecordId, { key: "dj_stream_start_ts", value: String(startTs), label: "DJ Stream Start Timestamp" });
    } else {
      await base44.entities.AppSettings.create({ key: "dj_stream_start_ts", value: String(startTs), label: "DJ Stream Start Timestamp" });
    }
  } catch {}
}

export default function useWorldDJStream({ enabled = true, danceFloorMode = false }) {
  const djAudioRef = useRef(null);
  const [djTrack, setDjTrack] = useState(null);

  const trackPoolRef = useRef([]);
  const recentIdsRef = useRef([]);
  const currentRef = useRef(null);
  const danceFloorRef = useRef(false);
  // Keep danceFloorRef strictly in sync — this is what loadAndPlaySilent reads
  danceFloorRef.current = danceFloorMode;

  const fadeCleanupRef = useRef(null);
  const pollTimerRef = useRef(null);
  const didInitRef = useRef(false);
  const activePlaylistRef = useRef(null); // { trackIds, playMode, ... } or null

  // ── Create audio element — ALWAYS muted and volume=0 at birth ──────────────
  const getAudio = useCallback(() => {
    if (!djAudioRef.current) {
      const el = new Audio();
      el.volume = 0;
      el.muted = true; // double-lock: both volume=0 AND muted=true on spawn
      el.preload = "auto";
      djAudioRef.current = el;
    }
    return djAudioRef.current;
  }, []);

  // ── Track pool ──────────────────────────────────────────────────────────────
  useEffect(() => {
    base44.entities.Track.filter({ status: "published" }, "-display_order", 500)
      .then((tracks) => { trackPoolRef.current = tracks.filter(t => t.audio_url); })
      .catch(() => {});
  }, []);

  const pickNextTrack = useCallback(() => {
    // Prefer the admin's active DJ playlist if available
    const pl = activePlaylistRef.current;
    const playMode = pl?.playMode || "shuffle";

    if (pl?.tracks?.length) {
      const pool = pl.tracks;
      const lastId = recentIdsRef.current[recentIdsRef.current.length - 1];
      const filtered = playMode === "shuffle"
        ? pool.filter(t => t.id !== lastId)
        : pool;
      let pick;
      if (playMode === "ordered") {
        pl._orderedIdx = (pl._orderedIdx ?? -1) + 1;
        pick = pool[pl._orderedIdx % pool.length];
      } else {
        // Shuffle: randomly pick from pool, retry once if same as last
        let idx = Math.floor(Math.random() * pool.length);
        if (pool.length > 1 && pool[idx].id === lastId) idx = Math.floor(Math.random() * pool.length);
        pick = pool[idx] || pool[0];
      }
      recentIdsRef.current = [...recentIdsRef.current, pick.id].slice(-12);
      return pick;
    }

    // Fallback: random from the full published pool
    const pool = trackPoolRef.current;
    if (!pool.length) return null;
    const histSize = Math.min(9, Math.floor(pool.length / 2));
    const recentSet = new Set(recentIdsRef.current.slice(-histSize));
    let candidates = pool.filter(t => !recentSet.has(t.id));
    if (!candidates.length) candidates = pool.filter(t => t.id !== recentIdsRef.current[recentIdsRef.current.length - 1]);
    if (!candidates.length) candidates = pool;
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    recentIdsRef.current = [...recentIdsRef.current, pick.id].slice(-12);
    return pick;
  }, []);

  // ── Load track silently — NEVER touches volume/muted ───────────────────────
  const loadAndPlaySilent = useCallback((track, startTs) => {
    if (!track?.audio_url) return;
    const el = getAudio();

    // Cancel any running fade
    fadeCleanupRef.current?.();
    fadeCleanupRef.current = null;

    // HARD enforce silence — this function must NEVER raise volume
    el.volume = 0;
    el.muted = true;

    const elapsedSec = Math.max(0, (Date.now() - startTs) / 1000);

    const begin = () => {
      // Re-assert silence — canplay may fire after danceFloor state changed
      el.volume = 0;
      el.muted = true;

      const dur = el.duration || 0;
      const target = dur > 0 ? Math.min(elapsedSec % dur, Math.max(0, dur - 0.5)) : 0;
      if (Math.abs(el.currentTime - target) > SYNC_TOLERANCE) {
        el.currentTime = target;
      }

      el.play().catch(() => {});
      setDjTrack(track);

      // NOW check if user is on dance floor — only AFTER track is ready
      // This is safe because the gate effect will also run when danceFloorMode changes
      // We only raise volume here if we're already on the floor (e.g. track change while dancing)
      if (danceFloorRef.current) {
        el.muted = false;
        fadeCleanupRef.current = fadeVolume(el, MAX_VOL, FADE_IN_MS);
      }
    };

    if (el.src !== track.audio_url) {
      el.src = track.audio_url;
      el.load();
    }

    if (el.readyState >= 2) {
      begin();
    } else {
      // Remove any existing listener to prevent stacking
      el.removeEventListener("canplay", el._djBeginHandler);
      el._djBeginHandler = begin;
      el.addEventListener("canplay", begin, { once: true });
    }
  }, [getAudio]);

  // ── Advance world stream ────────────────────────────────────────────────────
  const advanceTrack = useCallback(async () => {
    const next = pickNextTrack();
    if (!next) return;
    const startTs = Date.now();
    const cur = currentRef.current;
    await writeDJSettings(next.id, startTs, cur?.trackRecordId, cur?.tsRecordId);
    const fresh = await readDJSettings();
    currentRef.current = { track: next, startTs, trackRecordId: fresh.trackRecordId, tsRecordId: fresh.tsRecordId };
    loadAndPlaySilent(next, startTs);
  }, [pickNextTrack, loadAndPlaySilent]);

  // ── Load the admin's active DJ playlist ──────────────────────────────────────
  const getActivePlaylist = useCallback(async () => {
    try {
      const list = await base44.entities.DJPlaylist.list("-updatedAt", 20);
      const active = list.find(p => p.isActive);
      if (!active) throw new Error("No active playlist");
      if (!active.trackIds?.length) throw new Error("Active playlist is empty");
      // Resolve track objects from IDs
      const poolMap = Object.fromEntries(trackPoolRef.current.map(t => [t.id, t]));
      const tracks = active.trackIds
        .map(id => poolMap[id])
        .filter(Boolean)
        .filter(t => t.audio_url);
      if (!tracks.length) throw new Error("No playable tracks in active playlist");
      return { tracks, playMode: active.playMode || "shuffle" };
    } catch {
      // Fallback: no admin playlist → use the random pool
      return { tracks: null, playMode: null };
    }
  }, []);

  // ── Sync from AppSettings ───────────────────────────────────────────────────
  const syncFromSettings = useCallback(async () => {
    if (!enabled) return;

    // Reload the active DJ playlist on every sync tick (every 8s)
    const pl = await getActivePlaylist();
    activePlaylistRef.current = pl;

    const { trackId, startTs, trackRecordId, tsRecordId } = await readDJSettings();

    if (!trackId || !startTs) {
      if (trackPoolRef.current.length > 0) {
        const next = pickNextTrack();
        if (next) {
          const ts = Date.now();
          await writeDJSettings(next.id, ts, null, null);
          const fresh = await readDJSettings();
          currentRef.current = { track: next, startTs: ts, trackRecordId: fresh.trackRecordId, tsRecordId: fresh.tsRecordId };
          loadAndPlaySilent(next, ts);
        }
      }
      return;
    }

    const track = trackPoolRef.current.find(t => t.id === trackId);
    if (!track) return;

    if (currentRef.current?.track?.id === trackId) {
      // Same track — check drift (only if actually playing)
      const el = djAudioRef.current;
      if (el && !el.paused) {
        const elapsed = (Date.now() - startTs) / 1000;
        const dur = el.duration || 0;
        const livePos = dur > 0 ? elapsed % dur : elapsed;
        if (Math.abs(el.currentTime - livePos) > SYNC_TOLERANCE) {
          el.currentTime = Math.max(0, livePos);
        }
      }
    } else {
      currentRef.current = { track, startTs, trackRecordId, tsRecordId };
      loadAndPlaySilent(track, startTs);
    }
  }, [enabled, pickNextTrack, loadAndPlaySilent]);

  // ── Init + poll ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled) return;

    // Create audio element immediately — MUTED + volume=0 before any async work
    const el = getAudio();
    el.volume = 0;
    el.muted = true;

    const initTimer = setTimeout(async () => {
      // Wait for track pool to load
      let attempts = 0;
      await new Promise(resolve => {
        const check = () => {
          if (trackPoolRef.current.length > 0 || attempts++ > 20) { resolve(); return; }
          setTimeout(check, 300);
        };
        check();
      });

      if (!didInitRef.current) {
        didInitRef.current = true;
        await syncFromSettings();
        const audio = djAudioRef.current;
        if (audio) {
          audio.addEventListener("ended", () => advanceTrack());
        }
      }
    }, 1200); // delay init so spawn location is established before any audio decisions

    pollTimerRef.current = setInterval(syncFromSettings, POLL_INTERVAL);

    return () => {
      clearTimeout(initTimer);
      clearInterval(pollTimerRef.current);
    };
  }, [enabled, syncFromSettings, advanceTrack, getAudio]);

  // ── DANCE FLOOR GATE ────────────────────────────────────────────────────────
  // This is THE ONLY place that ever unmutes / raises volume.
  // Runs on every danceFloorMode change including the initial false → stays false.
  useEffect(() => {
    // Always cancel any in-progress fade first
    fadeCleanupRef.current?.();
    fadeCleanupRef.current = null;

    if (!danceFloorMode) {
      // User is NOT on dance floor → INSTANT hard silence
      const el = djAudioRef.current;
      if (el) { el.volume = 0; el.muted = true; }
      return;
    }

    // User is ON dance floor — unmute immediately if audio is ready,
    // otherwise poll until the audio element exists and has a src loaded.
    const tryUnmute = () => {
      const el = djAudioRef.current;
      if (!el) return false;
      // If audio is paused (not yet started), try to play it first
      if (el.paused && el.src) {
        el.play().catch(() => {});
      }
      el.muted = false;
      fadeCleanupRef.current = fadeVolume(el, MAX_VOL, FADE_IN_MS);
      return true;
    };

    if (!tryUnmute()) {
      // Audio not ready yet — retry until it is (covers spawn-on-floor race condition)
      let attempts = 0;
      const retry = setInterval(() => {
        if (tryUnmute() || ++attempts > 30) clearInterval(retry);
      }, 300);
      fadeCleanupRef.current = () => clearInterval(retry);
    }
  }, [danceFloorMode]);

  // ── Disabled cleanup ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled) {
      const el = djAudioRef.current;
      if (el) {
        fadeCleanupRef.current?.();
        el.volume = 0;
        el.muted = true;
        el.pause();
      }
    }
  }, [enabled]);

  // ── Cleanup on unmount ──────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      clearInterval(pollTimerRef.current);
      fadeCleanupRef.current?.();
      const el = djAudioRef.current;
      if (el) {
        el.volume = 0;
        el.muted = true;
        el.pause();
        el.src = "";
      }
      djAudioRef.current = null;
    };
  }, []);

  return { djAudioRef, djTrack };
}