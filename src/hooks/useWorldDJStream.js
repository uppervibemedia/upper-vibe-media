/**
 * useWorldDJStream — Shared live DJ audio for the dance floor.
 *
 * Transition state machine:
 *   "idleOutside" → "entering" → "inside" → "leaving" → "idleOutside"
 *
 * Rules:
 *  • DJ audio ALWAYS starts at volume 0 before play() is called.
 *  • Fade-in happens only AFTER playback is confirmed running.
 *  • If a transition is already in progress for the same direction, it is ignored.
 *  • Reversing direction cleanly cancels the in-progress transition.
 *  • DJ is never audible outside the dance floor.
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { LIVE_STREAM_URL } from "@/lib/liveStreamConfig";

const MAX_VOL = 0.82;
const FADE_IN_MS = 500;
const FADE_OUT_MS = 500;

// ── Shared epoch: fixed reference point in ms ────────────────────────────────
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

// Ramp volume from current level to target over ms, return cancel fn
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
      if (targetVol === 0) { try { el.pause(); } catch {} }
      onDone?.();
    }
  };
  rafId = requestAnimationFrame(tick);

  return () => {
    cancelled = true;
    if (rafId) cancelAnimationFrame(rafId);
  };
}

export default function useWorldDJStream({ enabled = true, danceFloorMode = false }) {
  const audioRef = useRef(null);
  const [djTrack, setDjTrack] = useState(null);
  const tracksRef = useRef([]);
  const loadedRef = useRef(false);
  const useLiveStreamRef = useRef(false);
  const mountedRef = useRef(true);

  // Transition state machine: "idleOutside" | "entering" | "inside" | "leaving"
  const transitionStateRef = useRef("idleOutside");
  // Cancel function for any in-progress volume ramp
  const cancelRampRef = useRef(null);

  const danceFloorRef = useRef(false);
  danceFloorRef.current = danceFloorMode;

  // ── Create ONE audio element, always volume=0 on creation ───────────────
  const getAudio = useCallback(() => {
    if (!audioRef.current) {
      const el = new Audio();
      el.volume = 0; // ALWAYS start silent
      el.preload = "auto";
      el.style.cssText = "position:absolute;width:0;height:0;opacity:0;pointer-events:none;";
      el.setAttribute("aria-hidden", "true");
      document.body.appendChild(el);
      audioRef.current = el;
    }
    return audioRef.current;
  }, []);

  // ── Cancel any in-progress ramp ─────────────────────────────────────────
  const cancelRamp = useCallback(() => {
    if (cancelRampRef.current) {
      cancelRampRef.current();
      cancelRampRef.current = null;
    }
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
      console.log("[DJStream] No active DJ playlist — using Citrus3 live stream");
      useLiveStreamRef.current = true;
      loadedRef.current = true;
    } catch (e) {
      console.warn("[DJStream] loadPlaylist error:", e);
      useLiveStreamRef.current = true;
      loadedRef.current = true;
    }
  }, []);

  // ── Preload: warm up audio pipeline on mount ─────────────────────────────
  const preloadRef = useRef(false);
  const preloadDJSource = useCallback(async () => {
    if (preloadRef.current) return;
    preloadRef.current = true;
    await loadPlaylist();
    if (!mountedRef.current) return;

    const el = getAudio();
    if (el.dataset.djSrc) return; // already preloaded

    if (useLiveStreamRef.current) {
      el.src = LIVE_STREAM_URL;
      el.dataset.djSrc = LIVE_STREAM_URL;
      el.volume = 0; // keep silent
      console.log("[DJStream] Preloaded live stream source (muted)");
    } else {
      const tracks = tracksRef.current;
      if (!tracks.length) return;
      const { idx } = computeSharedPosition(tracks);
      const track = tracks[idx];
      if (!track?.audio_url) return;
      el.src = track.audio_url;
      el.dataset.djSrc = track.audio_url;
      el.volume = 0; // keep silent
      el.load();
      console.log("[DJStream] Preloaded DJ track:", track.title, "(muted)");
    }
  }, [loadPlaylist, getAudio]);

  // ── Enter dance floor: start DJ at volume=0 then fade in ────────────────
  const enterDanceFloor = useCallback(() => {
    const state = transitionStateRef.current;
    // Already inside or already entering — do nothing
    if (state === "inside" || state === "entering") return;

    cancelRamp();
    transitionStateRef.current = "entering";
    console.log("[DJStream] 🕺 Entering dance floor — starting DJ from silence");

    const el = getAudio();

    // CRITICAL: force volume to 0 BEFORE any play() call
    el.volume = 0;

    const startPlayback = () => {
      if (!mountedRef.current || !danceFloorRef.current) {
        transitionStateRef.current = "idleOutside";
        return;
      }

      if (useLiveStreamRef.current) {
        if (el.dataset.djSrc !== LIVE_STREAM_URL) {
          el.src = LIVE_STREAM_URL;
          el.dataset.djSrc = LIVE_STREAM_URL;
          el.load();
        }
        setDjTrack({ title: "Upper Vibe Radio", artist_display: "Live Stream" });
        el.volume = 0; // must be 0 right before play
        el.play().then(() => {
          if (!mountedRef.current || !danceFloorRef.current) {
            el.pause(); el.volume = 0;
            transitionStateRef.current = "idleOutside";
            return;
          }
          transitionStateRef.current = "inside";
          cancelRampRef.current = rampVolume(el, MAX_VOL, FADE_IN_MS, () => {
            cancelRampRef.current = null;
          });
          console.log("[DJStream] ✅ Live stream playing — fading in from 0");
        }).catch(err => {
          console.warn("[DJStream] live stream play() blocked:", err.message);
          transitionStateRef.current = "idleOutside";
        });
        return;
      }

      // Playlist mode
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
        // Re-check shared position (time may have passed while loading)
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
        el.volume = 0; // ensure silent right before play
        el.play().then(() => {
          if (!mountedRef.current || !danceFloorRef.current) {
            el.pause(); el.volume = 0;
            transitionStateRef.current = "idleOutside";
            return;
          }
          transitionStateRef.current = "inside";
          cancelRampRef.current = rampVolume(el, MAX_VOL, FADE_IN_MS, () => {
            cancelRampRef.current = null;
          });
          console.log("[DJStream] ✅ Playlist track playing:", latestTrack?.title);
        }).catch(err => {
          console.warn("[DJStream] play() blocked:", err.message);
          transitionStateRef.current = "idleOutside";
        });
      };

      if (el.readyState >= 2) {
        seekAndPlay();
      } else {
        el.addEventListener("canplay", seekAndPlay, { once: true });
      }
    };

    if (!loadedRef.current) {
      // Poll until preload finishes (rare path — preload starts on mount)
      console.log("[DJStream] Waiting for preload...");
      const wait = setInterval(() => {
        if (loadedRef.current) {
          clearInterval(wait);
          startPlayback();
        }
      }, 100);
    } else {
      startPlayback();
    }
  }, [cancelRamp, getAudio]);

  // ── Exit dance floor: fade out then pause ───────────────────────────────
  const exitDanceFloor = useCallback(() => {
    const state = transitionStateRef.current;
    // Already outside or already leaving — do nothing
    if (state === "idleOutside" || state === "leaving") return;

    cancelRamp();
    transitionStateRef.current = "leaving";
    console.log("[DJStream] 🔇 Leaving dance floor — fading out DJ");

    const el = audioRef.current;
    if (!el || el.paused || el.volume <= 0) {
      el && (el.volume = 0);
      transitionStateRef.current = "idleOutside";
      return;
    }

    cancelRampRef.current = rampVolume(el, 0, FADE_OUT_MS, () => {
      cancelRampRef.current = null;
      if (!mountedRef.current) return;
      transitionStateRef.current = "idleOutside";
      console.log("[DJStream] ✅ DJ faded out and paused");
    });
  }, [cancelRamp]);

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

  // ── Track ended → advance ────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled) return;
    const el = getAudio();
    const onEnded = () => {
      if (danceFloorRef.current && tracksRef.current.length > 0) {
        const { idx, offset } = computeSharedPosition(tracksRef.current);
        const track = tracksRef.current[idx];
        if (track?.audio_url) {
          el.src = track.audio_url;
          el.dataset.djSrc = track.audio_url;
          el.volume = 0; // start silent before fade
          el.load();
          setDjTrack(track);
          el.addEventListener("canplay", () => {
            try { if (offset > 0) el.currentTime = offset; } catch {}
            el.play().then(() => {
              if (danceFloorRef.current) {
                cancelRampRef.current = rampVolume(el, MAX_VOL, FADE_IN_MS, () => { cancelRampRef.current = null; });
              } else {
                el.volume = 0; el.pause();
              }
            }).catch(() => {});
          }, { once: true });
        }
      }
    };
    el.addEventListener("ended", onEnded);
    return () => el.removeEventListener("ended", onEnded);
  }, [enabled, getAudio]);

  // ── Retry on user gesture if autoplay was blocked ────────────────────────
  useEffect(() => {
    if (!enabled) return;
    const retry = () => {
      if (!danceFloorRef.current) return;
      const el = audioRef.current;
      if (!el) return;
      if (el.paused || el.volume < 0.01) {
        // Reset state to allow re-entry
        if (transitionStateRef.current === "entering") transitionStateRef.current = "idleOutside";
        enterDanceFloor();
      }
    };
    window.addEventListener("click", retry, { passive: true });
    window.addEventListener("touchend", retry, { passive: true });
    return () => {
      window.removeEventListener("click", retry);
      window.removeEventListener("touchend", retry);
    };
  }, [enabled, enterDanceFloor]);

  // ── Cleanup on unmount ───────────────────────────────────────────────────
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
    };
  }, [cancelRamp]);

  return { djAudioRef: audioRef, djTrack };
}