/**
 * useWorldDJStream — Shared live DJ audio for the dance floor.
 *
 * KEY DESIGN: The audio element keeps playing at all times once started.
 * Entering/exiting the dance floor only controls the VOLUME for this user.
 * This means:
 *   • All users hear the same epoch-synced position (shared timeline).
 *   • Exiting the floor mutes the DJ for that user only — does NOT pause/reset.
 *   • Re-entering fades back in at the current live position (no restart).
 *   • Songs advance naturally via the "ended" event — no repeat on re-entry.
 *
 * Transition state machine: "idleOutside" | "entering" | "inside" | "leaving"
 * Only one ramp runs at a time; switching direction cancels the current ramp.
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { LIVE_STREAM_URL } from "@/lib/liveStreamConfig";

const MAX_VOL = 0.82;
const FADE_IN_MS = 500;
const FADE_OUT_MS = 500;

// Shared epoch — all users compute the same position from this timestamp
const DJ_EPOCH = 1700000000000;

function computeSharedPosition(tracks) {
  if (!tracks?.length) return { idx: 0, offset: 0 };
  const durations = tracks.map(t => {
    if (typeof t.duration === "string" && t.duration.includes(":")) {
      const parts = t.duration.split(":");
      return parseInt(parts[0]) * 60 + parseInt(parts[1] || "0");
    }
    return Math.max(30, parseFloat(t.duration) || 210);
  });
  const total = durations.reduce((s, d) => s + d, 0);
  if (total <= 0) return { idx: 0, offset: 0 };
  const elapsedSec = ((Date.now() - DJ_EPOCH) % (total * 1000)) / 1000;
  let cum = 0;
  for (let i = 0; i < durations.length; i++) {
    if (elapsedSec < cum + durations[i]) return { idx: i, offset: elapsedSec - cum };
    cum += durations[i];
  }
  return { idx: 0, offset: 0 };
}

// Ramp volume from current level to target, returns cancel fn
function rampVolume(el, targetVol, ms, onDone) {
  if (!el) { onDone?.(); return () => {}; }
  const startVol = el.volume;
  const startTime = performance.now();
  let rafId = null;
  let cancelled = false;
  const tick = (now) => {
    if (cancelled) return;
    const t = Math.min(1, (now - startTime) / ms);
    el.volume = Math.max(0, Math.min(1, startVol + (targetVol - startVol) * t));
    if (t < 1) {
      rafId = requestAnimationFrame(tick);
    } else {
      el.volume = targetVol;
      onDone?.();
    }
  };
  rafId = requestAnimationFrame(tick);
  return () => { cancelled = true; if (rafId) cancelAnimationFrame(rafId); };
}

export default function useWorldDJStream({ enabled = true, danceFloorMode = false }) {
  const audioRef = useRef(null);
  const [djTrack, setDjTrack] = useState(null);
  const tracksRef = useRef([]);
  const loadedRef = useRef(false);
  const useLiveStreamRef = useRef(false);
  const mountedRef = useRef(true);

  // Has the audio element ever started playing? Once true, we never restart — only fade in/out.
  const hasStartedRef = useRef(false);

  // Transition state: "idleOutside" | "entering" | "inside" | "leaving"
  const transitionStateRef = useRef("idleOutside");
  const cancelRampRef = useRef(null);

  const danceFloorRef = useRef(false);
  danceFloorRef.current = danceFloorMode;

  const cancelRamp = useCallback(() => {
    if (cancelRampRef.current) { cancelRampRef.current(); cancelRampRef.current = null; }
  }, []);

  // ── Single audio element, always volume=0 on creation ───────────────────
  const getAudio = useCallback(() => {
    if (!audioRef.current) {
      const el = new Audio();
      el.volume = 0;
      el.preload = "auto";
      el.style.cssText = "position:absolute;width:0;height:0;opacity:0;pointer-events:none;";
      el.setAttribute("aria-hidden", "true");
      document.body.appendChild(el);
      audioRef.current = el;
    }
    return audioRef.current;
  }, []);

  // ── Load tracks from active DJ playlist ─────────────────────────────────
  const loadPlaylist = useCallback(async () => {
    try {
      const playlists = await base44.entities.DJPlaylist.list("-updatedAt", 20);
      const active = playlists.find(p => p.isActive);
      if (active?.trackIds?.length) {
        const pool = await base44.entities.Track.filter({ status: "published" }, "-display_order", 500);
        const poolMap = Object.fromEntries(pool.filter(t => t.audio_url).map(t => [t.id, t]));
        const resolved = active.trackIds.map(id => poolMap[id]).filter(Boolean);
        if (resolved.length) {
          tracksRef.current = resolved;
          loadedRef.current = true;
          return;
        }
      }
      console.log("[DJStream] No active playlist — using live stream");
      useLiveStreamRef.current = true;
      loadedRef.current = true;
    } catch (e) {
      console.warn("[DJStream] loadPlaylist error:", e);
      useLiveStreamRef.current = true;
      loadedRef.current = true;
    }
  }, []);

  // ── Preload on mount: prime audio pipeline, stay silent ─────────────────
  const preloadRef = useRef(false);
  const preloadDJSource = useCallback(async () => {
    if (preloadRef.current) return;
    preloadRef.current = true;
    await loadPlaylist();
    if (!mountedRef.current) return;

    const el = getAudio();
    if (el.dataset.djSrc) return; // already set

    if (useLiveStreamRef.current) {
      el.src = LIVE_STREAM_URL;
      el.dataset.djSrc = LIVE_STREAM_URL;
      el.volume = 0;
      console.log("[DJStream] Preloaded live stream source (silent)");
    } else {
      const tracks = tracksRef.current;
      if (!tracks.length) return;
      const { idx } = computeSharedPosition(tracks);
      const track = tracks[idx];
      if (!track?.audio_url) return;
      el.src = track.audio_url;
      el.dataset.djSrc = track.audio_url;
      el.volume = 0;
      el.load();
      setDjTrack(track);
      console.log("[DJStream] Preloaded DJ track:", track.title, "(silent)");
    }
  }, [loadPlaylist, getAudio]);

  // ── Start initial playback (first ever dance floor entry) ────────────────
  // After this call, hasStartedRef=true and we NEVER restart the audio.
  const startInitialPlayback = useCallback(() => {
    const el = getAudio();
    el.volume = 0; // must be silent before play()

    if (useLiveStreamRef.current) {
      if (!el.dataset.djSrc || el.dataset.djSrc !== LIVE_STREAM_URL) {
        el.src = LIVE_STREAM_URL;
        el.dataset.djSrc = LIVE_STREAM_URL;
        el.load();
      }
      setDjTrack({ title: "Upper Vibe Radio", artist_display: "Live Stream" });
      el.play().then(() => {
        if (!mountedRef.current) return;
        hasStartedRef.current = true;
        transitionStateRef.current = "inside";
        cancelRampRef.current = rampVolume(el, MAX_VOL, FADE_IN_MS, () => { cancelRampRef.current = null; });
        console.log("[DJStream] ✅ Live stream started — fading in");
      }).catch(err => {
        console.warn("[DJStream] live stream play() blocked:", err.message);
        transitionStateRef.current = "idleOutside";
      });
      return;
    }

    // Playlist mode — seek to shared position
    const tracks = tracksRef.current;
    if (!tracks.length) { transitionStateRef.current = "idleOutside"; return; }
    const { idx, offset } = computeSharedPosition(tracks);
    const track = tracks[idx];
    if (!track?.audio_url) { transitionStateRef.current = "idleOutside"; return; }

    const srcChanged = el.dataset.djSrc !== track.audio_url;
    if (srcChanged) {
      el.src = track.audio_url;
      el.dataset.djSrc = track.audio_url;
      el.load();
    }
    setDjTrack(track);

    const seekAndPlay = () => {
      if (!mountedRef.current || !danceFloorRef.current) {
        transitionStateRef.current = "idleOutside";
        return;
      }
      // Recalc shared position in case loading took time
      const { idx: newIdx, offset: newOffset } = computeSharedPosition(tracks);
      const latestTrack = tracks[newIdx];
      if (latestTrack?.audio_url && latestTrack.audio_url !== el.dataset.djSrc) {
        el.src = latestTrack.audio_url;
        el.dataset.djSrc = latestTrack.audio_url;
        el.load();
        setDjTrack(latestTrack);
        el.addEventListener("canplay", seekAndPlay, { once: true });
        return;
      }
      try { if (newOffset > 0) el.currentTime = newOffset; } catch {}
      el.volume = 0;
      el.play().then(() => {
        if (!mountedRef.current) return;
        hasStartedRef.current = true;
        transitionStateRef.current = "inside";
        cancelRampRef.current = rampVolume(el, MAX_VOL, FADE_IN_MS, () => { cancelRampRef.current = null; });
        console.log("[DJStream] ✅ Playlist track started at shared position:", latestTrack?.title);
      }).catch(err => {
        console.warn("[DJStream] playlist play() blocked:", err.message);
        transitionStateRef.current = "idleOutside";
      });
    };

    if (el.readyState >= 2) {
      seekAndPlay();
    } else {
      el.addEventListener("canplay", seekAndPlay, { once: true });
    }
  }, [getAudio]);

  // ── Enter dance floor ────────────────────────────────────────────────────
  const enterDanceFloor = useCallback(() => {
    const state = transitionStateRef.current;
    if (state === "inside" || state === "entering") return;

    cancelRamp();
    transitionStateRef.current = "entering";

    const el = getAudio();

    if (!loadedRef.current) {
      // Playlist not loaded yet — wait
      const wait = setInterval(() => {
        if (loadedRef.current) { clearInterval(wait); enterDanceFloor(); }
      }, 100);
      return;
    }

    if (!hasStartedRef.current) {
      // First ever entry — must start playback (needs user gesture context)
      console.log("[DJStream] 🕺 First dance floor entry — starting playback from silence");
      startInitialPlayback();
      return;
    }

    // Already started before — audio is still running (just silent), fade back in
    console.log("[DJStream] 🕺 Re-entering dance floor — fading in at current position (no restart)");
    const isActuallyPlaying = !el.paused;

    if (!isActuallyPlaying) {
      // Audio got paused somehow (e.g. browser tab suspension) — resume it
      el.volume = 0;
      el.play().then(() => {
        if (!mountedRef.current) return;
        transitionStateRef.current = "inside";
        cancelRampRef.current = rampVolume(el, MAX_VOL, FADE_IN_MS, () => { cancelRampRef.current = null; });
      }).catch(() => {
        transitionStateRef.current = "idleOutside";
      });
    } else {
      // Still playing silently — just fade in
      transitionStateRef.current = "inside";
      cancelRampRef.current = rampVolume(el, MAX_VOL, FADE_IN_MS, () => { cancelRampRef.current = null; });
    }
  }, [cancelRamp, getAudio, startInitialPlayback]);

  // ── Exit dance floor — fade out ONLY, do NOT pause or reset ─────────────
  const exitDanceFloor = useCallback(() => {
    const state = transitionStateRef.current;
    if (state === "idleOutside" || state === "leaving") return;

    cancelRamp();
    transitionStateRef.current = "leaving";
    console.log("[DJStream] 🔇 Exiting dance floor — fading out (audio keeps playing silently)");

    const el = audioRef.current;
    if (!el || el.volume <= 0.01) {
      if (el) el.volume = 0;
      transitionStateRef.current = "idleOutside";
      return;
    }

    cancelRampRef.current = rampVolume(el, 0, FADE_OUT_MS, () => {
      cancelRampRef.current = null;
      if (!mountedRef.current) return;
      // DO NOT pause — keep audio running at volume=0 so position advances
      transitionStateRef.current = "idleOutside";
      console.log("[DJStream] ✅ DJ faded to silent (still running at shared position)");
    });
  }, [cancelRamp]);

  // ── Track ended → advance to next shared position ────────────────────────
  useEffect(() => {
    if (!enabled) return;
    const el = getAudio();
    const onEnded = () => {
      if (!danceFloorRef.current) return; // outside floor — audio shouldn't have been audible
      const tracks = tracksRef.current;
      if (!tracks.length) return;
      const { idx, offset } = computeSharedPosition(tracks);
      const track = tracks[idx];
      if (!track?.audio_url) return;
      el.src = track.audio_url;
      el.dataset.djSrc = track.audio_url;
      el.volume = 0;
      el.load();
      setDjTrack(track);
      el.addEventListener("canplay", () => {
        try { if (offset > 0) el.currentTime = offset; } catch {}
        el.play().then(() => {
          if (danceFloorRef.current) {
            cancelRampRef.current = rampVolume(el, MAX_VOL, FADE_IN_MS, () => { cancelRampRef.current = null; });
          }
          // If outside floor, keep at volume 0 — audio just keeps running silently
        }).catch(() => {});
      }, { once: true });
    };
    el.addEventListener("ended", onEnded);
    return () => el.removeEventListener("ended", onEnded);
  }, [enabled, getAudio]);

  // ── Init: preload on mount ───────────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;
    if (!enabled) return;
    preloadDJSource();
    return () => { mountedRef.current = false; };
  }, [enabled, preloadDJSource]);

  // ── Dance floor gate ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled) return;
    if (danceFloorMode) {
      enterDanceFloor();
    } else {
      exitDanceFloor();
    }
  }, [danceFloorMode, enabled, enterDanceFloor, exitDanceFloor]);

  // ── Retry on user gesture if autoplay was blocked ────────────────────────
  useEffect(() => {
    if (!enabled) return;
    const retry = () => {
      if (!danceFloorRef.current) return;
      const el = audioRef.current;
      if (!el) return;
      if (el.paused && !hasStartedRef.current) {
        if (transitionStateRef.current !== "idleOutside") transitionStateRef.current = "idleOutside";
        enterDanceFloor();
      } else if (el.paused && hasStartedRef.current) {
        el.play().catch(() => {});
      }
    };
    window.addEventListener("click", retry, { passive: true });
    window.addEventListener("touchend", retry, { passive: true });
    return () => {
      window.removeEventListener("click", retry);
      window.removeEventListener("touchend", retry);
    };
  }, [enabled, enterDanceFloor]);

  // ── Cleanup on unmount — silence, stop, remove element ──────────────────
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      cancelRamp();
      const el = audioRef.current;
      if (el) {
        el.volume = 0;
        el.pause();
        el.src = "";
        try { if (el.parentNode) el.parentNode.removeChild(el); } catch {}
      }
      audioRef.current = null;
      hasStartedRef.current = false;
    };
  }, [cancelRamp]);

  return { djAudioRef: audioRef, djTrack };
}