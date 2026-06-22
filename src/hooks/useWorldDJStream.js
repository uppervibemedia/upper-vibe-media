/**
 * useWorldDJStream — persistent, clock-synced world DJ stream.
 *
 * One shared "world clock" DJ stream. All users hear the same song
 * at the same playback position. The stream advances via AppSettings:
 *   key="dj_stream_track_id"   → current track ID
 *   key="dj_stream_start_ts"   → unix ms when that track started playing
 *
 * When the current track ends (locally), the first user to notice
 * writes the next track to AppSettings. Everyone else polls and syncs.
 *
 * Returns:
 *   { djAudioRef, djTrack, djVolume, setDjProximityVol }
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";

const POLL_INTERVAL = 8000;      // poll AppSettings every 8s
const SYNC_TOLERANCE = 2.5;      // seconds — resync if drift > this
const FADE_DURATION = 1200;      // ms for volume crossfade
const MAX_VOL = 0.88;            // max DJ audio volume (proximity scaled)

// ─── Volume crossfade utility ─────────────────────────────────────────────────
function crossfadeVol(audioEl, targetVol, durationMs, onDone) {
  if (!audioEl) { onDone?.(); return; }
  const start = audioEl.volume;
  const startTime = performance.now();
  let raf;
  const tick = (now) => {
    const t = Math.min(1, (now - startTime) / durationMs);
    const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    audioEl.volume = Math.max(0, Math.min(1, start + (targetVol - start) * ease));
    if (t < 1) { raf = requestAnimationFrame(tick); }
    else { onDone?.(); }
  };
  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}

// ─── Read / write AppSettings helpers ────────────────────────────────────────
async function readDJSettings() {
  try {
    const [trackRow, tsRow] = await Promise.all([
      base44.entities.AppSettings.filter({ key: "dj_stream_track_id" }, "-created_date", 1),
      base44.entities.AppSettings.filter({ key: "dj_stream_start_ts" }, "-created_date", 1),
    ]);
    const trackId = trackRow?.[0]?.value || null;
    const startTs = tsRow?.[0]?.value ? parseInt(tsRow[0].value, 10) : null;
    const trackRecordId = trackRow?.[0]?.id || null;
    const tsRecordId = tsRow?.[0]?.id || null;
    return { trackId, startTs, trackRecordId, tsRecordId };
  } catch {
    return { trackId: null, startTs: null, trackRecordId: null, tsRecordId: null };
  }
}

async function writeDJSettings(trackId, startTs, trackRecordId, tsRecordId) {
  try {
    const now = Date.now();
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
  } catch {
    // Non-critical — local playback continues
  }
}

export default function useWorldDJStream({ enabled = true, danceFloorMode = false }) {
  const djAudioRef = useRef(null);
  const [djTrack, setDjTrack] = useState(null);
  const [djVolume, setDjVolume] = useState(0);

  // Internal state refs (avoid stale closures in callbacks)
  const trackPoolRef = useRef([]);      // all available DJ tracks
  const recentTrackIdsRef = useRef([]); // history to avoid repeats (last 8 played)
  const currentTrackRef = useRef(null); // { track, startTs, settingsTrackRecId, settingsTsRecId }
  const danceFloorModeRef = useRef(false);
  danceFloorModeRef.current = danceFloorMode;
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const fadeCleanupRef = useRef(null);
  const pollTimerRef = useRef(null);
  const didInitRef = useRef(false);

  // ── Load track pool once ──────────────────────────────────────────
  useEffect(() => {
    base44.entities.Track.filter({ status: "published" }, "-display_order", 60)
      .then((tracks) => {
        const withAudio = tracks.filter((t) => t.audio_url);
        trackPoolRef.current = withAudio;
      })
      .catch(() => {});
  }, []);

  // ── Pick next track from pool, avoiding recent repeats ───────────
  const pickNextTrack = useCallback(() => {
    const pool = trackPoolRef.current;
    if (!pool.length) return null;
    const recent = recentTrackIdsRef.current;
    // Exclude last 8 played tracks (or half the pool size, whichever is smaller)
    const historySize = Math.min(8, Math.floor(pool.length / 2));
    const recentSet = new Set(recent.slice(-historySize));
    let candidates = pool.filter((t) => !recentSet.has(t.id));
    // Fallback: if all tracks are in recent history, just avoid the most recent one
    if (!candidates.length) {
      const lastId = recent[recent.length - 1];
      candidates = pool.filter((t) => t.id !== lastId);
    }
    if (!candidates.length) candidates = pool;
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    // Record in history
    recentTrackIdsRef.current = [...recent, pick.id].slice(-12);
    return pick;
  }, []);



  // ── Load + play a track, seeking to the live position ─────────────
  const loadAndPlay = useCallback((track, startTs) => {
    if (!track?.audio_url) return;

    // Create audio element lazily
    if (!djAudioRef.current) {
      djAudioRef.current = new Audio();
      djAudioRef.current.volume = 0;
    }
    const el = djAudioRef.current;
    const nowMs = Date.now();
    const elapsedSec = Math.max(0, (nowMs - startTs) / 1000);

    // Swap src only if different track
    if (el.src !== track.audio_url) {
      el.src = track.audio_url;
      el.load();
    }

    const startPlayback = () => {
      // Seek to live position (clamp to duration)
      const dur = el.duration || 0;
      const targetTime = dur > 0 ? Math.min(elapsedSec % (dur || 1), dur - 0.5) : elapsedSec;
      if (Math.abs(el.currentTime - targetTime) > SYNC_TOLERANCE) {
        el.currentTime = targetTime;
      }
      el.play().catch(() => {});
      setDjTrack(track);
      // Only fade in if user is currently on the dance floor; otherwise stay silent
      const vol = danceFloorModeRef.current ? MAX_VOL : 0;
      fadeCleanupRef.current?.();
      fadeCleanupRef.current = crossfadeVol(el, vol, FADE_DURATION);
      setDjVolume(vol);
    };

    if (el.readyState >= 2) {
      startPlayback();
    } else {
      el.addEventListener("canplay", startPlayback, { once: true });
    }
  }, []);

  // ── Advance to next track (write to world, then load locally) ─────
  const advanceTrack = useCallback(async () => {
    const next = pickNextTrack();
    if (!next) return;
    const startTs = Date.now();
    const cur = currentTrackRef.current;
    const { trackRecordId, tsRecordId } = cur || {};
    await writeDJSettings(next.id, startTs, trackRecordId, tsRecordId);
    currentTrackRef.current = {
      track: next,
      startTs,
      settingsTrackRecId: trackRecordId,
      settingsTsRecId: tsRecordId,
    };
    loadAndPlay(next, startTs);
  }, [pickNextTrack, loadAndPlay]);

  // ── Sync from AppSettings ─────────────────────────────────────────
  const syncFromSettings = useCallback(async () => {
    if (!enabledRef.current) return;
    const { trackId, startTs, trackRecordId, tsRecordId } = await readDJSettings();

    // If no world stream exists yet, start one
    if (!trackId || !startTs) {
      if (trackPoolRef.current.length > 0) {
        const next = pickNextTrack();
        if (next) {
          const ts = Date.now();
          await writeDJSettings(next.id, ts, null, null);
          const freshSettings = await readDJSettings();
          currentTrackRef.current = {
            track: next,
            startTs: ts,
            settingsTrackRecId: freshSettings.trackRecordId,
            settingsTsRecId: freshSettings.tsRecordId,
          };
          loadAndPlay(next, ts);
        }
      }
      return;
    }

    // Find the track in pool
    const pool = trackPoolRef.current;
    const track = pool.find((t) => t.id === trackId);
    if (!track) return;

    // Check if this is already what we're playing
    const cur = currentTrackRef.current;
    if (cur?.track?.id === trackId) {
      // Same track — just check sync drift
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
      // Different track — switch to it
      currentTrackRef.current = {
        track,
        startTs,
        settingsTrackRecId: trackRecordId,
        settingsTsRecId: tsRecordId,
      };
      loadAndPlay(track, startTs);
    }
  }, [pickNextTrack, loadAndPlay]);

  // ── Handle track end → advance world stream ───────────────────────
  useEffect(() => {
    const el = djAudioRef.current;
    if (!el) return;
    const onEnded = () => { advanceTrack(); };
    el.addEventListener("ended", onEnded);
    return () => el.removeEventListener("ended", onEnded);
  }, [advanceTrack]);

  // ── Init + poll ───────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled) return;

    // Initial sync after pool loads (slight delay)
    const initTimer = setTimeout(async () => {
      // Wait for pool
      let attempts = 0;
      const waitForPool = () => new Promise((resolve) => {
        const check = () => {
          if (trackPoolRef.current.length > 0 || attempts++ > 20) { resolve(); return; }
          setTimeout(check, 300);
        };
        check();
      });
      await waitForPool();
      if (!didInitRef.current) {
        didInitRef.current = true;
        await syncFromSettings();
        // Wire ended handler after audio created
        const el = djAudioRef.current;
        if (el) {
          el.addEventListener("ended", () => advanceTrack());
        }
      }
    }, 600);

    // Periodic poll
    pollTimerRef.current = setInterval(syncFromSettings, POLL_INTERVAL);

    return () => {
      clearTimeout(initTimer);
      clearInterval(pollTimerRef.current);
    };
  }, [enabled, syncFromSettings, advanceTrack]);

  // ── Dance floor gating: DJ audio ONLY plays when on dance floor ─────────────
  useEffect(() => {
    // djAudioRef.current may be null on first render (lazily created in loadAndPlay).
    // We always set the target volume; loadAndPlay reads danceFloorModeRef.current so
    // newly started tracks already respect the gate. For an already-running element,
    // apply the change now.
    const el = djAudioRef.current;
    if (danceFloorMode) {
      if (el) {
        fadeCleanupRef.current?.();
        fadeCleanupRef.current = crossfadeVol(el, MAX_VOL, FADE_DURATION);
      }
      setDjVolume(MAX_VOL);
    } else {
      if (el) {
        // Off dance floor → fast mute
        fadeCleanupRef.current?.();
        el.volume = 0; // instant silence — no fade bleed
      }
      setDjVolume(0);
    }
  }, [danceFloorMode]);

  // ── Fade out + stop when disabled ────────────────────────────────
  useEffect(() => {
    if (!enabled) {
      const el = djAudioRef.current;
      if (!el) return;
      fadeCleanupRef.current?.();
      fadeCleanupRef.current = crossfadeVol(el, 0, 800, () => {
        el.pause();
      });
    }
  }, [enabled]);

  // ── Cleanup on unmount ─────────────────────────────────────────────
  useEffect(() => {
    return () => {
      clearInterval(pollTimerRef.current);
      fadeCleanupRef.current?.();
      const el = djAudioRef.current;
      if (el) { el.pause(); el.src = ""; }
      djAudioRef.current = null;
    };
  }, []);

  return { djAudioRef, djTrack, djVolume };
}