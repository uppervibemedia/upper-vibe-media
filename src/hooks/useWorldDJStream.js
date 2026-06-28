/**
 * useWorldDJStream — Shared live DJ audio for the dance floor.
 *
 * FIXED FOR iOS: Uses Upper Vibe Live Stream as the single shared source.
 *   • All users hear the exact same live broadcast at the same position.
 *   • Audio element is created once and keeps playing silently when outside.
 *   • Entering/exiting the floor only controls VOLUME for this user.
 *   • No track playlist mode — live stream means everyone is natively synced.
 *   • iOS: audio unlocked on first user gesture; auto-retry if Safari blocks.
 *   • Safety: 100ms interval clamps volume=0 outside floor on iOS.
 *
 * Transition state machine: "idleOutside" | "entering" | "inside" | "leaving"
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { LIVE_STREAM_URL, LIVE_STREAM_NAME } from "@/lib/liveStreamConfig";

const MAX_VOL = 0.82;
const FADE_IN_MS = 500;
const FADE_OUT_MS = 400;
const IOS_SAFETY_INTERVAL_MS = 100;

// ── Debug logs for iOS testing ──────────────────────────────────────────────
const DBG = (msg, data) => console.log(`[DJStream] ${msg}`, data || "");

// ── Ramp volume from current level to target, returns cancel fn ────
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
  const mountedRef = useRef(true);
  const isIOSRef = useRef(false);

  // Single audio lifecycle — once started, never restart, only fade in/out
  const hasStartedRef = useRef(false);
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
      // iOS: prevent audio ducking from system sounds
      el.mediaSession?.setActionHandler?.("play", () => {});
      el.style.cssText =
        "position:absolute;width:0;height:0;opacity:0;pointer-events:none;";
      el.setAttribute("aria-hidden", "true");
      document.body.appendChild(el);
      audioRef.current = el;
      isIOSRef.current = /iPhone|iPad|iPod/i.test(navigator.userAgent);
      DBG("📱 iOS:", isIOSRef.current);
    }
    return audioRef.current;
  }, []);

  // ── Initialize audio with live stream source ────────────────────────────
  // Always uses LIVE_STREAM_URL so every user hears the same broadcast.
  const initAudio = useCallback(() => {
    const el = getAudio();
    if (el.dataset.djSrc === LIVE_STREAM_URL) return; // already set
    el.src = LIVE_STREAM_URL;
    el.dataset.djSrc = LIVE_STREAM_URL;
    el.volume = 0;
    el.loop = false;
    el.load();
    setDjTrack({
      title: LIVE_STREAM_NAME,
      artist_display: "Live DJ · Dance Floor",
    });
    DBG("🎵 Audio source set to live stream:", LIVE_STREAM_URL);
  }, [getAudio]);

  // ── Start initial playback (first ever dance floor entry) ────────────────
  const startInitialPlayback = useCallback(() => {
    const el = getAudio();
    initAudio();
    el.volume = 0;

    el.play().then(() => {
      if (!mountedRef.current) return;
      hasStartedRef.current = true;
      DBG("✅ Audio.play() succeeded");

      if (!danceFloorRef.current) {
        el.volume = 0;
        transitionStateRef.current = "idleOutside";
        return;
      }
      transitionStateRef.current = "inside";
      cancelRampRef.current = rampVolume(el, MAX_VOL, FADE_IN_MS, () => {
        cancelRampRef.current = null;
      });
      DBG("🎶 Live stream started — fading in", {
        ios: isIOSRef.current,
        volume: el.volume,
        muted: el.muted,
        paused: el.paused,
      });
    }).catch((err) => {
      DBG("⛔ play() blocked:", err.message);
      transitionStateRef.current = "idleOutside";
    });
  }, [getAudio, initAudio]);

  // ── Enter dance floor ────────────────────────────────────────────────────
  const enterDanceFloor = useCallback(() => {
    const state = transitionStateRef.current;
    if (state === "inside" || state === "entering") return;

    DBG("🕺 Enter dance floor (current state:", state, ")");
    cancelRamp();
    transitionStateRef.current = "entering";

    const el = getAudio();

    if (!hasStartedRef.current) {
      // First ever entry — must start playback (needs user gesture context)
      DBG("🕺 First dance floor entry — starting playback from silence");
      startInitialPlayback();
      return;
    }

    // Already started before — audio is still running (just silent), fade back in
    DBG("🕺 Re-entering dance floor — fading in at current position");
    const isActuallyPlaying = !el.paused;

    // iOS Safari: unlock audio context on re-entry gesture
    if (isIOSRef.current && el.paused) {
      el.play().then(() => {
        if (!mountedRef.current || !danceFloorRef.current) {
          el.volume = 0;
          transitionStateRef.current = "idleOutside";
          return;
        }
        transitionStateRef.current = "inside";
        cancelRampRef.current = rampVolume(
          el, MAX_VOL, FADE_IN_MS, () => { cancelRampRef.current = null; }
        );
        DBG("✅ iOS audio unlocked & faded in");
      }).catch(() => {
        DBG("⛔ iOS audio unlock failed");
        transitionStateRef.current = "idleOutside";
      });
      return;
    }

    if (!isActuallyPlaying) {
      // Audio got paused (tab suspension or other) — resume silently then fade
      el.volume = 0;
      el.play().then(() => {
        if (!mountedRef.current || !danceFloorRef.current) {
          el.volume = 0;
          transitionStateRef.current = "idleOutside";
          return;
        }
        transitionStateRef.current = "inside";
        cancelRampRef.current = rampVolume(
          el, MAX_VOL, FADE_IN_MS, () => { cancelRampRef.current = null; }
        );
      }).catch(() => {
        transitionStateRef.current = "idleOutside";
      });
    } else {
      // Still playing silently — just fade in
      transitionStateRef.current = "inside";
      cancelRampRef.current = rampVolume(el, MAX_VOL, FADE_IN_MS, () => {
        cancelRampRef.current = null;
        if (!danceFloorRef.current && audioRef.current) {
          audioRef.current.volume = 0;
          transitionStateRef.current = "idleOutside";
        }
      });
    }
  }, [cancelRamp, getAudio, startInitialPlayback]);

  // ── Exit dance floor ─────────────────────────────────────────────────────
  const exitDanceFloor = useCallback(() => {
    cancelRamp();
    transitionStateRef.current = "leaving";
    DBG("🔇 Exiting dance floor — fading out");

    const el = audioRef.current;
    if (!el) { transitionStateRef.current = "idleOutside"; return; }

    if (el.volume <= 0.01) {
      el.volume = 0;
      el.muted = true;
      transitionStateRef.current = "idleOutside";
      DBG("✅ Already silent, set muted=true");
      return;
    }

    cancelRampRef.current = rampVolume(el, 0, FADE_OUT_MS, () => {
      cancelRampRef.current = null;
      if (!mountedRef.current) return;
      el.volume = 0;
      el.muted = true; // iOS safety — mute gate
      transitionStateRef.current = "idleOutside";
      DBG("✅ DJ faded to silent (shared timeline keeps running)");
    });
  }, [cancelRamp]);

  // ── Dance floor gate ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled) return;
    if (danceFloorMode) {
      enterDanceFloor();
    } else {
      exitDanceFloor();
    }
  }, [danceFloorMode, enabled, enterDanceFloor, exitDanceFloor]);

  // ── iOS Safety clamp: force volume=0 & muted outside floor (100ms) ───────
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => {
      if (danceFloorRef.current) return;
      const el = audioRef.current;
      if (!el) return;
      if (el.volume > 0.01 || !el.muted) {
        el.volume = 0;
        el.muted = true;
        DBG("⚠️ Safety clamp: vol=0, muted=true (outside dance floor)");
      }
    }, IOS_SAFETY_INTERVAL_MS);
    return () => clearInterval(id);
  }, [enabled]);

  // ── Init: create audio, set source, keep silent ──────────────────────────
  useEffect(() => {
    mountedRef.current = true;
    if (!enabled) return;

    const el = getAudio();
    initAudio();

    return () => { mountedRef.current = false; };
  }, [enabled, getAudio, initAudio]);

  // ── Retry on user gesture if autoplay was blocked ────────────────────────
  useEffect(() => {
    if (!enabled) return;
    const retry = (e) => {
      if (!danceFloorRef.current) return;
      const el = audioRef.current;
      if (!el) return;

      if (el.paused && !hasStartedRef.current) {
        DBG("👆 Gesture detected — retrying audio start");
        transitionStateRef.current = "idleOutside";
        enterDanceFloor();
      } else if (el.paused && hasStartedRef.current) {
        DBG("👆 Gesture detected — resuming paused DJ audio");
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

  // ── Periodic iOS debug logging ───────────────────────────────────────────
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => {
      const el = audioRef.current;
      if (!el) return;
      DBG("📊 DJ state", {
        ios: isIOSRef.current,
        insideFloor: danceFloorRef.current,
        transitionState: transitionStateRef.current,
        hasStarted: hasStartedRef.current,
        paused: el.paused,
        volume: el.volume,
        muted: el.muted,
        src: el.dataset.djSrc?.substring(0, 40),
        currentTime: el.currentTime?.toFixed(1),
      });
    }, 5000);
    return () => clearInterval(id);
  }, [enabled]);

  // ── Cleanup on unmount ───────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      DBG("🧹 Unmount — cleaning up DJ audio");
      mountedRef.current = false;
      cancelRamp();
      const el = audioRef.current;
      if (el) {
        el.volume = 0;
        el.muted = true;
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