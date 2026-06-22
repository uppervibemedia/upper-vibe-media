/**
 * useWorldDJStream — clean zone-gated world DJ stream.
 *
 * RULES:
 * - Audio element is ALWAYS created at volume 0.
 * - Volume is ONLY raised when danceFloorMode === true.
 * - On spawn / outside dance floor: complete silence, no bleed possible.
 * - Uses a single Audio element; never multiple sources.
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";

const POLL_INTERVAL = 8000;
const SYNC_TOLERANCE = 2.5;
const FADE_IN_MS = 1000;
const MAX_VOL = 0.88;

// ── Smooth volume fade ────────────────────────────────────────────────────────
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

// ── AppSettings helpers ───────────────────────────────────────────────────────
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
  const currentRef = useRef(null); // { track, startTs, trackRecordId, tsRecordId }
  const danceFloorRef = useRef(false);
  const fadeCleanupRef = useRef(null);
  const pollTimerRef = useRef(null);
  const didInitRef = useRef(false);

  // Always keep ref in sync — used inside callbacks to avoid stale closures
  danceFloorRef.current = danceFloorMode;

  // ── Ensure audio element exists at volume 0 ─────────────────────────────────
  const getAudio = useCallback(() => {
    if (!djAudioRef.current) {
      const el = new Audio();
      el.volume = 0; // ALWAYS start silent
      el.preload = "auto";
      djAudioRef.current = el;
    }
    return djAudioRef.current;
  }, []);

  // ── Track pool ──────────────────────────────────────────────────────────────
  useEffect(() => {
    base44.entities.Track.filter({ status: "published" }, "-display_order", 60)
      .then((tracks) => { trackPoolRef.current = tracks.filter(t => t.audio_url); })
      .catch(() => {});
  }, []);

  const pickNextTrack = useCallback(() => {
    const pool = trackPoolRef.current;
    if (!pool.length) return null;
    const histSize = Math.min(8, Math.floor(pool.length / 2));
    const recentSet = new Set(recentIdsRef.current.slice(-histSize));
    let candidates = pool.filter(t => !recentSet.has(t.id));
    if (!candidates.length) candidates = pool.filter(t => t.id !== recentIdsRef.current[recentIdsRef.current.length - 1]);
    if (!candidates.length) candidates = pool;
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    recentIdsRef.current = [...recentIdsRef.current, pick.id].slice(-12);
    return pick;
  }, []);

  // ── Load track silently, seek to live position ──────────────────────────────
  const loadAndPlaySilent = useCallback((track, startTs) => {
    if (!track?.audio_url) return;
    const el = getAudio();

    // Cancel any running fade
    fadeCleanupRef.current?.();
    fadeCleanupRef.current = null;

    // Hard mute — volume is controlled exclusively by the danceFloor gate effect
    el.volume = 0;

    const elapsedSec = Math.max(0, (Date.now() - startTs) / 1000);

    if (el.src !== track.audio_url) {
      el.src = track.audio_url;
      el.load();
    }

    const begin = () => {
      el.volume = 0; // re-assert silence after canplay fires
      const dur = el.duration || 0;
      const target = dur > 0 ? Math.min(elapsedSec % dur, Math.max(0, dur - 0.5)) : 0;
      if (Math.abs(el.currentTime - target) > SYNC_TOLERANCE) {
        el.currentTime = target;
      }
      el.play().catch(() => {});
      setDjTrack(track);

      // If user is already on dance floor when track starts, fade in immediately
      if (danceFloorRef.current) {
        fadeCleanupRef.current = fadeVolume(el, MAX_VOL, FADE_IN_MS);
      }
    };

    if (el.readyState >= 2) {
      begin();
    } else {
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

  // ── Sync from AppSettings ───────────────────────────────────────────────────
  const syncFromSettings = useCallback(async () => {
    if (!enabled) return;
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
      // Same track — check drift
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

    // Pre-create audio element at volume 0 — must happen before any async work
    getAudio();

    const initTimer = setTimeout(async () => {
      // Wait for track pool
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
        const el = djAudioRef.current;
        if (el) {
          el.addEventListener("ended", () => advanceTrack());
        }
      }
    }, 800); // slightly longer delay to ensure spawn audio gate fires first

    pollTimerRef.current = setInterval(syncFromSettings, POLL_INTERVAL);

    return () => {
      clearTimeout(initTimer);
      clearInterval(pollTimerRef.current);
    };
  }, [enabled, syncFromSettings, advanceTrack, getAudio]);

  // ── DANCE FLOOR GATE — this is the ONLY place volume is ever raised ─────────
  // danceFloorMode=false at spawn → silence. Crossing boundary → fade in.
  // Leaving boundary → instant hard mute (no fade bleed).
  useEffect(() => {
    const el = djAudioRef.current;
    fadeCleanupRef.current?.();
    fadeCleanupRef.current = null;

    if (danceFloorMode) {
      // Entered dance floor — fade in
      if (el) {
        fadeCleanupRef.current = fadeVolume(el, MAX_VOL, FADE_IN_MS);
      }
    } else {
      // Outside dance floor — INSTANT hard mute, zero tolerance for bleed
      if (el) {
        el.volume = 0;
      }
    }
  }, [danceFloorMode]);

  // ── Fade out + stop when disabled ──────────────────────────────────────────
  useEffect(() => {
    if (!enabled) {
      const el = djAudioRef.current;
      if (el) {
        fadeCleanupRef.current?.();
        fadeCleanupRef.current = fadeVolume(el, 0, 600);
        setTimeout(() => { el.pause(); }, 700);
      }
    }
  }, [enabled]);

  // ── Cleanup on unmount ──────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      clearInterval(pollTimerRef.current);
      fadeCleanupRef.current?.();
      const el = djAudioRef.current;
      if (el) { el.pause(); el.src = ""; }
      djAudioRef.current = null;
    };
  }, []);

  return { djAudioRef, djTrack };
}