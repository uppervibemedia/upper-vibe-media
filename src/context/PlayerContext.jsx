/**
 * PlayerContext — Upper Vibe Media
 * ─────────────────────────────────────────────────────────────────────────────
 * SINGLE GLOBAL AUDIO CONTROLLER
 *
 * iOS Safari lock-screen design:
 *  - <audio> element is THE source of truth. React state follows the element.
 *  - We listen to native audio events (play, pause, suspend, stalled, waiting,
 *    playing) to sync React state — not the other way around.
 *  - On resume (lock screen play / page show): call play() directly on the
 *    existing element. Never call load(), never reset src, never seek.
 *  - playbackRate is enforced to 1 at every touch point.
 *  - All lock-screen play/pause go through a single serialised op queue with
 *    a pending-play guard to prevent duplicate calls.
 *  - savedTimeRef is updated on every timeupdate tick for accurate position.
 *
 * Debug logs use these prefixes:
 *   [Player]    general lifecycle
 *   [LS]        lock-screen MediaSession commands
 *   [WD:*]      watchdog alerts
 *   [iOS]       iOS-specific events
 */

import React, {
  createContext, useContext, useState,
  useRef, useEffect, useCallback,
} from "react";
import {
  trackSongPlay, trackSongPause, trackSongComplete,
  streamStart, streamPause, streamEnd, streamSetMeta,
} from "@/lib/analytics";

const PlayerContext = createContext(null);

// ─────────────────────────────────────────────────────────────────────────────
// Environment detection — computed once at module load
// ─────────────────────────────────────────────────────────────────────────────
const isPWA = (() => {
  if (typeof window === "undefined") return false;
  return (
    window.navigator.standalone === true ||
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches
  );
})();

const isIOS = (() => {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
})();

const isSafariOnly = (() => {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return (
    /Safari\//.test(ua) &&
    !/Chrome\//.test(ua) &&
    !/Chromium\//.test(ua) &&
    !/EdgA?\//.test(ua) &&
    !/Firefox\//.test(ua) &&
    !/FxiOS\//.test(ua)
  );
})();

// Only pause on hide for desktop Safari tabs. iOS handles background audio natively.
const shouldPauseOnHide = !isPWA && !isIOS && isSafariOnly;

console.log("[Player] cold_launch | isPWA:", isPWA, "| isIOS:", isIOS,
  "| isSafari:", isSafariOnly, "| shouldPauseOnHide:", shouldPauseOnHide,
  "| analyserAttached=false | analyserDetachedForIOSBackground=false",
  "| iosBackgroundAudioStrategy:", isIOS ? "detach-webaudio-on-hide" : "standard",
  "| ua:", navigator.userAgent.substring(0, 80));

// ─────────────────────────────────────────────────────────────────────────────
// Global audio instance tracker
// ─────────────────────────────────────────────────────────────────────────────
let _globalAudioInstanceCount = 0;

export const sharedHiddenRef = { current: false };

// ─────────────────────────────────────────────────────────────────────────────
// AudioContext + Analyser
// ─────────────────────────────────────────────────────────────────────────────
let _audioCtx   = null;
let _analyser   = null;
let _sourceNode = null;
let _sourceEl   = null;
let _analyserDisabled  = false;
let _analyserFailCount = 0;

// iOS background state — when true, the Web Audio graph is intentionally
// detached so the <audio> element routes directly to hardware (no AudioContext
// dependency). Re-attached only on explicit user gesture while page is visible.
let _iosGraphDetached = false;

async function resumeAudioContext() {
  // On iOS: never call audioCtx.resume() from a background/MediaSession context.
  // Only resume when the page is visible — caller must enforce this.
  if (!_audioCtx) return;
  if (_audioCtx.state !== "running") {
    try { await _audioCtx.resume(); } catch {}
  }
}
function suspendAudioContext() {
  if (!_audioCtx || _audioCtx.state !== "running") return;
  try { _audioCtx.suspend(); } catch {}
}

/**
 * detachAnalyserGraph — disconnect Web Audio graph from <audio> on iOS background.
 * Audio continues playing via the native pipeline; AudioContext is left suspended.
 * Does NOT pause audio, reset src, or call load().
 */
export function detachAnalyserGraph() {
  if (!_sourceNode && !_audioCtx) return;
  try {
    if (_sourceNode) {
      _sourceNode.disconnect();
      console.log("[Player] detachAnalyserGraph | sourceNode disconnected | iOS:", isIOS,
        "| ctxState:", _audioCtx?.state);
    }
    // Do NOT close the AudioContext — just leave it suspended so we can reuse it.
    // Do NOT call _audioCtx.suspend() here — iOS may already be handling that.
    _sourceNode = null;
    _sourceEl   = null;
    _iosGraphDetached = true;
    window._uvAnalyser = null; // signal to visualizer: use fallback
    console.log("[Player] analyserDetachedForIOSBackground=true | visualizerFallbackActive=true");
  } catch (e) {
    console.warn("[Player] detachAnalyserGraph error:", e.name, e.message);
  }
}

function setupAnalyserGraph(audioElement) {
  if (!audioElement || _analyserDisabled) return null;
  // On iOS, do not reconnect if the page is hidden — wait for user gesture on show
  if (isIOS && document.visibilityState === "hidden") {
    console.log("[Player] setupAnalyserGraph SKIPPED — iOS + page hidden");
    return null;
  }
  try {
    if (!_audioCtx || _audioCtx.state === "closed") {
      _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      window._uvAudioCtx = _audioCtx;
      _analyser   = null;
      _sourceNode = null;
      _sourceEl   = null;
      _iosGraphDetached = false;
    }
    // Only resume AudioContext when page is visible and we have a user gesture
    if (_audioCtx.state === "suspended" && document.visibilityState === "visible") {
      _audioCtx.resume().catch(() => {});
    }
    if (!_analyser) {
      _analyser = _audioCtx.createAnalyser();
      _analyser.fftSize = 2048;
      _analyser.smoothingTimeConstant = 0.75;
      window._uvAnalyser = _analyser;
    }
    if (!_sourceNode || _sourceEl !== audioElement) {
      if (_sourceNode) { try { _sourceNode.disconnect(); } catch {} _sourceNode = null; _sourceEl = null; }
      _sourceNode = _audioCtx.createMediaElementSource(audioElement);
      _sourceEl   = audioElement;
      _sourceNode.connect(_analyser);
      _analyser.connect(_audioCtx.destination);
      _iosGraphDetached = false;
      console.log("[Player] AudioGraph connected | iOS:", isIOS, "| ctxState:", _audioCtx.state,
        "| analyserAttached=true | analyserDetachedForIOSBackground=false");
    }
    return _analyser;
  } catch (e) {
    _analyserFailCount++;
    console.warn("[Player] setupAnalyserGraph failed |", e.name, e.message, "| failCount:", _analyserFailCount);
    _sourceNode = null; _sourceEl = null;
    if (_analyserFailCount >= 3) { console.warn("[Player] analyser disabled after 3 failures"); _analyserDisabled = true; }
    return null;
  }
}

export function resetAnalyserDisabled() {
  if (_analyserDisabled || _analyserFailCount > 0) {
    _analyserDisabled = false;
    _analyserFailCount = 0;
  }
}
export function resumeGlobalAudioContext() {
  // Only resume if page is visible — do not fight iOS background suspension
  if (isIOS && document.visibilityState !== "visible") {
    console.log("[Player] resumeGlobalAudioContext SKIPPED — iOS + page not visible | audioContextState:", _audioCtx?.state);
    return Promise.resolve();
  }
  return resumeAudioContext().catch(() => {});
}
export function requestAnalyser(audioElement) {
  if (!audioElement || _analyserDisabled) return null;
  // On iOS: if page is hidden or graph was detached for background, return null
  // so the visualizer uses its fallback animation instead of trying to analyse.
  if (isIOS && (document.visibilityState === "hidden" || _iosGraphDetached)) {
    console.log("[Player] requestAnalyser — returning null | iosGraphDetached:", _iosGraphDetached,
      "| pageHidden:", document.visibilityState === "hidden",
      "| visualizerFallbackActive=true");
    return null;
  }
  const an = setupAnalyserGraph(audioElement);
  if (!an) return null;
  return { analyser: an, ctx: _audioCtx, sourceNode: _sourceNode };
}

// ─────────────────────────────────────────────────────────────────────────────
// enforceRate — called at every audio touch point
// ─────────────────────────────────────────────────────────────────────────────
function enforceRate(audio) {
  if (!audio) return;
  if (audio.defaultPlaybackRate !== 1) audio.defaultPlaybackRate = 1;
  if (audio.playbackRate !== 1) {
    console.warn("[WD:rate] playbackRate was", audio.playbackRate, "→ forcing 1.0");
    audio.playbackRate = 1;
  }
  if ("preservesPitch" in audio) audio.preservesPitch = true;
}

// ─────────────────────────────────────────────────────────────────────────────
// createFreshAudio
// ─────────────────────────────────────────────────────────────────────────────
function createFreshAudio() {
  _globalAudioInstanceCount++;
  if (_globalAudioInstanceCount > 1) {
    console.error("[WD:dup] duplicate audio instance! count:", _globalAudioInstanceCount);
  }
  const a = new Audio();
  a.crossOrigin = "anonymous";
  a.preload = "auto";
  enforceRate(a);
  a.setAttribute("x-webkit-airplay", "allow");
  a.setAttribute("playsinline", "");
  if ("disableRemotePlayback" in a) a.disableRemotePlayback = false;
  a.style.cssText = "position:absolute;width:0;height:0;opacity:0;pointer-events:none;";
  a.setAttribute("aria-hidden", "true");
  document.body.appendChild(a);
  console.log("[Player] audio_created | instance #", _globalAudioInstanceCount, "| iOS:", isIOS);
  return a;
}

function destroyAudio(audio) {
  if (!audio) return;
  _globalAudioInstanceCount = Math.max(0, _globalAudioInstanceCount - 1);
  audio.pause();
  audio.src = "";
  try { audio.load(); } catch {}
  try { if (audio.parentNode) audio.parentNode.removeChild(audio); } catch {}
}

// ─────────────────────────────────────────────────────────────────────────────
// OPERATION QUEUE — serialises all play/pause requests
// ─────────────────────────────────────────────────────────────────────────────
class AudioOpQueue {
  constructor() { this._running = false; this._queue = []; this._lockTime = 0; }
  push(fn) {
    return new Promise((resolve) => {
      this._queue.push(async () => {
        try { await fn(); } catch (e) {
          if (e.name !== "AbortError") console.warn("[Player] op error:", e.name, e.message);
        }
        resolve();
      });
      this._drain();
    });
  }
  _drain() {
    if (this._running || this._queue.length === 0) return;
    this._running = true; this._lockTime = Date.now();
    const next = this._queue.shift();
    Promise.resolve().then(next).finally(() => { this._running = false; this._lockTime = 0; this._drain(); });
  }
  get isRunning() { return this._running; }
  get lockAge()   { return this._lockTime ? Date.now() - this._lockTime : 0; }
  clearQueue()    { this._queue = []; }
}

// ─────────────────────────────────────────────────────────────────────────────
// MEDIA SESSION HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const FALLBACK_ART = "https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?w=512&h=512&fit=crop&q=80";

function resolveArtworkUrl(url) {
  if (!url) return FALLBACK_ART;
  if (url.startsWith("https://")) return url;
  return FALLBACK_ART;
}

function setMediaSessionMetadata(track) {
  if (!("mediaSession" in navigator) || !track) return;
  const artSrc = resolveArtworkUrl(track.cover_url);
  navigator.mediaSession.metadata = new MediaMetadata({
    title:   track.title          || "Unknown",
    artist:  track.artist_display || track.artist || "Upper Vibe Media",
    album:   "Upper Vibe Media",
    artwork: [
      { src: artSrc, sizes: "512x512",   type: "image/jpeg" },
      { src: artSrc, sizes: "1024x1024", type: "image/jpeg" },
    ],
  });
}

function setMediaSessionState(playing) {
  if (!("mediaSession" in navigator)) return;
  navigator.mediaSession.playbackState = playing ? "playing" : "paused";
}

// ─────────────────────────────────────────────────────────────────────────────
// PLAYER PROVIDER
// ─────────────────────────────────────────────────────────────────────────────
export function PlayerProvider({ children }) {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying,    setIsPlaying]    = useState(false);
  const [queue,        setQueue]        = useState([]);
  const [sourceType,   setSourceType]   = useState("song");

  // Core refs
  const audioRef         = useRef(null);
  const currentTrackRef  = useRef(null);
  const loadedSrcRef     = useRef("");
  const savedTimeRef     = useRef(0);
  const lastTimeRef      = useRef(0);
  const onNextRef        = useRef(null);
  const onPrevRef        = useRef(null);

  // Op queue
  const opQueueRef = useRef(new AudioOpQueue());

  // ── Pending play guard ────────────────────────────────────────────────────
  // Prevents duplicate play() calls while a play promise is in-flight.
  // This is the primary fix for iOS lock-screen double-tap and sped-up audio.
  const pendingPlayRef   = useRef(false);  // true while play() promise is in-flight
  const pendingPlayTimer = useRef(null);   // safety timeout to clear the flag

  // ── Lock-screen command debounce ──────────────────────────────────────────
  // 400ms window — longer than before to absorb iOS double-fire on lock screen
  const lsDebounceTimer = useRef(null);
  const lsLastCommand   = useRef(null);   // "play" | "pause"
  const lsLastTime      = useRef(0);

  // Watchdog refs
  const watchdogRef      = useRef(null);
  const watchdogTimeRef  = useRef(0);
  const watchdogStampRef = useRef(0);
  const watchdogLockRef  = useRef(null);

  // ── Bootstrap ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const audio = createFreshAudio();
    audioRef.current = audio;
    registerMediaSessionHandlers();

    watchdogLockRef.current = setInterval(() => {
      const q = opQueueRef.current;
      if (q.isRunning && q.lockAge > 3000) {
        console.warn("[WD:lock] op-queue blocked for", q.lockAge, "ms — clearing");
        q.clearQueue();
      }
    }, 2000);

    return () => {
      clearInterval(watchdogLockRef.current);
      destroyAudio(audio);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep currentTrackRef in sync
  useEffect(() => {
    currentTrackRef.current = currentTrack;
    if (currentTrack) {
      try { streamSetMeta(currentTrack); } catch {}
      setMediaSessionMetadata(currentTrack);
    }
  }, [currentTrack]);

  // ── Watchdog: stall detector ──────────────────────────────────────────────
  const stopWatchdog = useCallback(() => {
    if (watchdogRef.current) { clearInterval(watchdogRef.current); watchdogRef.current = null; }
  }, []);

  const startWatchdog = useCallback((audio) => {
    stopWatchdog();
    watchdogTimeRef.current  = audio.currentTime;
    watchdogStampRef.current = Date.now();
    watchdogRef.current = setInterval(() => {
      if (!isPWA && document.visibilityState === "hidden") return;
      if (audio.paused || audio.ended || !audio.src) { stopWatchdog(); return; }
      const elapsed  = (Date.now() - watchdogStampRef.current) / 1000;
      const ct       = audio.currentTime;
      const advanced = ct - watchdogTimeRef.current;
      if (audio.playbackRate !== 1) { console.warn("[WD:rate]", audio.playbackRate, "→ 1.0"); enforceRate(audio); }
      if (elapsed >= 1.5 && advanced < 0.05) {
        console.warn("[WD:stall] not advancing — ct:", ct.toFixed(2), "elapsed:", elapsed.toFixed(1));
        savedTimeRef.current = ct;
        lastTimeRef.current  = ct;
        suspendAudioContext();
        audio.pause();
        setMediaSessionState(false);
        setIsPlaying(false);
        stopWatchdog();
        return;
      }
      watchdogTimeRef.current  = ct;
      watchdogStampRef.current = Date.now();
    }, 800);
  }, [stopWatchdog]);

  // ── MediaSession desync watchdog (5s) ─────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => {
      const audio = audioRef.current;
      if (!audio || !("mediaSession" in navigator)) return;
      const msPlaying     = navigator.mediaSession.playbackState === "playing";
      const actualPlaying = !audio.paused && !audio.ended && !!audio.src;
      if (msPlaying !== actualPlaying) {
        console.warn("[WD:desync] MediaSession:", navigator.mediaSession.playbackState,
          "vs audio.paused:", audio.paused, "— correcting");
        setMediaSessionState(actualPlaying);
        // Also sync React state
        setIsPlaying(actualPlaying);
      }
    }, 5000);
    return () => clearInterval(t);
  }, []);

  // ── clearPendingPlay ──────────────────────────────────────────────────────
  const clearPendingPlay = useCallback(() => {
    pendingPlayRef.current = false;
    clearTimeout(pendingPlayTimer.current);
  }, []);

  // Forward ref for safePlay so safeLockscreenPlay can reference it before definition
  const safePlayRef = useRef(null);

  // Stable refs so MediaSession handlers (registered once) always call latest callbacks
  const safeLockscreenPlayRef  = useRef(null);
  const safeLockscreenPauseRef = useRef(null);

  // ── safeLockscreenPlay — the ONLY function called for lock-screen resume ──
  //
  // Requirements:
  //  - Uses existing audio element only (never recreates)
  //  - Checks audio.paused and readyState before calling play()
  //  - Blocks duplicate calls while play promise is pending
  //  - Does NOT call load() or reset src
  //  - Does NOT seek
  //  - Sets React isPlaying ONLY after play() resolves
  //  - Debounced: ignores repeated commands within 400ms
  const safeLockscreenPlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const now = Date.now();
    console.log("[LS] safeLockscreenPlay | pendingPlay:", pendingPlayRef.current,
      "| paused:", audio.paused, "| rs:", audio.readyState,
      "| ct:", audio.currentTime.toFixed(2), "| rate:", audio.playbackRate,
      "| src:", audio.src ? "set" : "MISSING",
      "| isIOS:", isIOS, "| isSafari:", isSafariOnly, "| isPWA:", isPWA,
      "| visibility:", document.visibilityState);

    // Block duplicate: if a play() is already in-flight, ignore
    if (pendingPlayRef.current) {
      console.log("[LS] safeLockscreenPlay BLOCKED — play already pending (duplicatePlayBlocked=true)");
      return;
    }

    // No src — need full reload via safePlay
    if (!audio.src && !loadedSrcRef.current) {
      console.log("[LS] safeLockscreenPlay — no src, falling back to safePlay");
      safePlayRef.current?.(audio, "lockscreen-play-nosrc");
      return;
    }
    if (!audio.src && loadedSrcRef.current) {
      console.log("[LS] safeLockscreenPlay — src lost, reloading | audioLoadCalledDuringResume=true");
      audio.src = loadedSrcRef.current;
      enforceRate(audio);
      audio.load();
      // After reload, fall through to play
    }

    // Already playing — just enforce rate
    if (!audio.paused && !audio.ended && audio.readyState >= 2) {
      enforceRate(audio);
      setIsPlaying(true);
      setMediaSessionState(true);
      startWatchdog(audio);
      console.log("[LS] safeLockscreenPlay — already playing, rate enforced");
      return;
    }

    // readyState 0 (HAVE_NOTHING) — buffer fully evicted, need reload
    if (audio.readyState === 0 && audio.src) {
      console.log("[LS] safeLockscreenPlay — readyState=0, reloading | audioLoadCalledDuringResume=true");
      const restoreTime = savedTimeRef.current;
      enforceRate(audio);
      audio.load();
      audio.addEventListener("canplay", function onCp() {
        audio.removeEventListener("canplay", onCp);
        enforceRate(audio);
        if (restoreTime > 1) {
          try { audio.currentTime = restoreTime; } catch {}
        }
        const pp = audio.play();
        if (pp && typeof pp.then === "function") {
          pp.then(() => {
            enforceRate(audio);
            setIsPlaying(true);
            setMediaSessionState(true);
            startWatchdog(audio);
            console.log("[LS] safeLockscreenPlay (after reload) — play resolved | rate:", audio.playbackRate);
          }).catch((e) => {
            if (e.name !== "AbortError") console.warn("[LS] play after reload error:", e.name, e.message);
          });
        } else {
          setIsPlaying(true);
          setMediaSessionState(true);
          startWatchdog(audio);
        }
      }, { once: true });
      return;
    }

    // Normal resume path: audio is paused with valid buffer
    // CRITICAL: enforce rate BEFORE play(), do NOT seek, do NOT load.
    // Do NOT call resumeAudioContext() here — on iOS lock screen there is no
    // user gesture, so AudioContext.resume() silently fails / is a no-op.
    // The native <audio> element plays directly to hardware without AudioContext.
    enforceRate(audio);
    console.log("[Player] safeLockscreenPlay — native resume path | audioContextState:", _audioCtx?.state ?? "none",
      "| analyserDetachedForIOSBackground:", _iosGraphDetached,
      "| nativeAudioStillPlaying:", !audio.paused,
      "| audioCurrentTime:", audio.currentTime.toFixed(2),
      "| mediaSessionState:", ("mediaSession" in navigator) ? navigator.mediaSession.playbackState : "N/A");

    pendingPlayRef.current = true;
    // Safety: clear pending flag after 3s max regardless
    pendingPlayTimer.current = setTimeout(() => {
      console.warn("[LS] safeLockscreenPlay — pendingPlay safety timeout cleared");
      pendingPlayRef.current = false;
    }, 3000);

    console.log("[LS] safeLockscreenPlay — calling play() | audioLoadCalledDuringResume=false | audioSrcChangedDuringResume=false");

    const p = audio.play();
    if (p && typeof p.then === "function") {
      p.then(() => {
        clearPendingPlay();
        enforceRate(audio); // iOS may reset rate AFTER play() resolves
        setIsPlaying(true);
        setMediaSessionState(true);
        startWatchdog(audio);
        console.log("[LS] safeLockscreenPlay — play() RESOLVED | rate:", audio.playbackRate,
          "| paused:", audio.paused, "| ct:", audio.currentTime.toFixed(2),
          "| confirmation: load()=false, src_changed=false, playbackRate=1");
      }).catch((e) => {
        clearPendingPlay();
        if (e.name === "AbortError") {
          console.log("[LS] safeLockscreenPlay — AbortError (superseded)");
          return;
        }
        console.warn("[LS] safeLockscreenPlay — play() error:", e.name, e.message);
        // If NotAllowedError: user gesture required — update UI to paused
        setIsPlaying(false);
        setMediaSessionState(false);
      });
    } else {
      // Old iOS: no promise — assume playing
      clearPendingPlay();
      enforceRate(audio);
      setIsPlaying(true);
      setMediaSessionState(true);
      startWatchdog(audio);
    }
  }, [startWatchdog, clearPendingPlay]);

  // ── safeLockscreenPause ───────────────────────────────────────────────────
  const safeLockscreenPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    console.log("[LS] safeLockscreenPause | ct:", audio.currentTime.toFixed(2),
      "| paused:", audio.paused);
    clearPendingPlay();
    stopWatchdog();
    if (audio.currentTime > 0) {
      savedTimeRef.current = audio.currentTime;
      lastTimeRef.current  = audio.currentTime;
    }
    if (!audio.paused) {
      suspendAudioContext();
      audio.pause();
    }
    setIsPlaying(false);
    setMediaSessionState(false);
    console.log("[LS] safeLockscreenPause — done | savedTime:", savedTimeRef.current.toFixed(2));
  }, [stopWatchdog, clearPendingPlay]);

  // ── CORE: safePlay (queue-based, for new tracks / error recovery) ─────────
  // eslint-disable-next-line prefer-const
  const safePlay = useCallback(async (audio, reason) => {
    if (!audio) return;
    return opQueueRef.current.push(async () => {
      const src = audio.src || loadedSrcRef.current;
      if (!src) { console.warn("[Player] safePlay blocked — no src | reason:", reason); return; }

      console.log("[Player] safePlay | reason:", reason,
        "| paused:", audio.paused, "| rs:", audio.readyState,
        "| ct:", audio.currentTime.toFixed(2), "| rate:", audio.playbackRate);

      if (!audio.paused && !audio.ended && audio.readyState >= 2) {
        enforceRate(audio); startWatchdog(audio);
        return;
      }

      enforceRate(audio);
      await resumeAudioContext();

      const needsReload = audio.readyState < 2 || audio.error || !audio.src;
      if (needsReload) {
        console.log("[Player] safePlay — buffer evicted, reloading | audioLoadCalledDuringResume=true | rs:", audio.readyState);
        const restoreTime = savedTimeRef.current;
        const reloadSrc   = src;
        audio.src = "";
        await new Promise(r => setTimeout(r, 30));
        if (!audio.src) {
          audio.src = reloadSrc;
          enforceRate(audio);
          audio.load();
        }
        await new Promise((resolve, reject) => {
          let done = false;
          const finish = (ok) => { if (done) return; done = true; cleanup(); ok ? resolve() : reject(new Error("load failed")); };
          const onCanPlay = () => finish(true);
          const onError   = () => finish(false);
          const cleanup   = () => { audio.removeEventListener("canplay", onCanPlay); audio.removeEventListener("error", onError); };
          audio.addEventListener("canplay", onCanPlay);
          audio.addEventListener("error",   onError);
          setTimeout(() => finish(false), 8000);
        }).catch((e) => { console.warn("[Player] safePlay reload timeout:", e.message); });
        enforceRate(audio);
        if (restoreTime > 1) {
          try { audio.currentTime = restoreTime; await new Promise(r => setTimeout(r, 60)); } catch {}
        }
      }
      // Do NOT seek on resume — resume from real audio.currentTime

      if (!audio.paused) { enforceRate(audio); startWatchdog(audio); return; }

      enforceRate(audio);
      const p = audio.play();
      if (p && typeof p.then === "function") {
        await p;
        enforceRate(audio);
      }
      startWatchdog(audio);
    });
  }, [startWatchdog]);

  // Wire stable refs so MediaSession handlers always call latest callbacks
  useEffect(() => { safePlayRef.current = safePlay; }, [safePlay]);
  useEffect(() => { safeLockscreenPlayRef.current  = safeLockscreenPlay;  }, [safeLockscreenPlay]);
  useEffect(() => { safeLockscreenPauseRef.current = safeLockscreenPause; }, [safeLockscreenPause]);

  // ── safePause ─────────────────────────────────────────────────────────────
  const safePause = useCallback(async (audio, reason = "pause") => {
    if (!audio) return;
    return opQueueRef.current.push(async () => {
      console.log("[Player] safePause | reason:", reason, "| ct:", audio.currentTime.toFixed(2));
      clearPendingPlay();
      stopWatchdog();
      if (audio.currentTime > 0) { savedTimeRef.current = audio.currentTime; lastTimeRef.current = audio.currentTime; }
      if (!audio.paused) { suspendAudioContext(); audio.pause(); }
      setMediaSessionState(false);
    });
  }, [stopWatchdog, clearPendingPlay]);

  // ── Register MediaSession handlers — ONCE at mount ─────────────────────── 
  function registerMediaSessionHandlers() {
    if (!("mediaSession" in navigator)) return;

    navigator.mediaSession.setActionHandler("play", () => {
      const now = Date.now();
      lsLastCommand.current = "play";
      lsLastTime.current = now;
      clearTimeout(lsDebounceTimer.current);
      lsDebounceTimer.current = setTimeout(() => {
        console.log("[LS] MediaSession PLAY fired | ts:", now,
          "| isIOS:", isIOS, "| isSafari:", isSafariOnly,
          "| resumeSource: lockscreen-play",
          "| paused:", audioRef.current?.paused,
          "| ct:", audioRef.current?.currentTime?.toFixed(2),
          "| rs:", audioRef.current?.readyState);
        safeLockscreenPlayRef.current?.();
      }, 50);
    });

    navigator.mediaSession.setActionHandler("pause", () => {
      lsLastCommand.current = "pause";
      lsLastTime.current = Date.now();
      clearTimeout(lsDebounceTimer.current);
      lsDebounceTimer.current = setTimeout(() => {
        console.log("[LS] MediaSession PAUSE fired");
        safeLockscreenPauseRef.current?.();
      }, 50);
    });

    navigator.mediaSession.setActionHandler("nexttrack", () => {
      console.log("[LS] MediaSession NEXT");
      opQueueRef.current.push(async () => { onNextRef.current?.(); });
    });

    navigator.mediaSession.setActionHandler("previoustrack", () => {
      console.log("[LS] MediaSession PREV");
      opQueueRef.current.push(async () => { onPrevRef.current?.(); });
    });

    // Disable seek actions — prevent iOS from changing currentTime externally
    try { navigator.mediaSession.setActionHandler("seekforward",  null); } catch {}
    try { navigator.mediaSession.setActionHandler("seekbackward", null); } catch {}
    try { navigator.mediaSession.setActionHandler("seekto",       null); } catch {}

    console.log("[Player] MediaSession handlers registered");
  }

  // ── Native audio events → React state sync ────────────────────────────────
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // play: audio element confirmed started
    const onPlay = () => {
      enforceRate(audio);
      setIsPlaying(true);
      setMediaSessionState(true);
      const track = currentTrackRef.current;
      if (track) {
        setMediaSessionMetadata(track);
        try { trackSongPlay(track); streamStart(track); } catch {}
      }
      if ("mediaSession" in navigator && "setPositionState" in navigator.mediaSession) {
        try {
          if (audio.duration && isFinite(audio.duration)) {
            navigator.mediaSession.setPositionState({ duration: audio.duration, playbackRate: 1, position: audio.currentTime });
          }
        } catch {}
      }
      startWatchdog(audio);
      console.log("[iOS] audio 'play' event | ct:", audio.currentTime.toFixed(2), "| rate:", audio.playbackRate);
    };

    // playing: audio actually producing frames (after buffering)
    const onPlaying = () => {
      enforceRate(audio);
      setIsPlaying(true);
      setMediaSessionState(true);
      console.log("[iOS] audio 'playing' event | ct:", audio.currentTime.toFixed(2), "| rate:", audio.playbackRate);
    };

    // pause: audio element confirmed paused — THIS is the source of truth
    const onPause = () => {
      setIsPlaying(false);
      setMediaSessionState(false);
      stopWatchdog();
      // Save position immediately so resume knows where to return
      if (audio.currentTime > 0) {
        savedTimeRef.current = audio.currentTime;
        lastTimeRef.current  = audio.currentTime;
      }
      const track = currentTrackRef.current;
      try { if (track) { trackSongPause(track); streamPause(); } } catch {}
      console.log("[iOS] audio 'pause' event | ct:", audio.currentTime.toFixed(2),
        "| savedTime:", savedTimeRef.current.toFixed(2));
    };

    const onEnded = () => {
      setIsPlaying(false);
      setMediaSessionState(false);
      stopWatchdog();
      savedTimeRef.current = 0;
      lastTimeRef.current  = 0;
      const track = currentTrackRef.current;
      try { if (track) { trackSongComplete(track); streamEnd(true); } } catch {}
      onNextRef.current?.();
    };

    // suspend: iOS paused the audio buffer (lock screen, interrupt, background)
    // This fires BEFORE 'pause' on iOS — it's the earliest signal iOS audio stopped
    const onSuspend = () => {
      if (audio.currentTime > 0) {
        savedTimeRef.current = audio.currentTime;
        lastTimeRef.current  = audio.currentTime;
      }
      console.log("[iOS] audio 'suspend' event | paused:", audio.paused,
        "| rs:", audio.readyState, "| ct:", audio.currentTime.toFixed(2),
        "| isIOS:", isIOS);
      // If audio.paused is true, sync React state immediately
      if (audio.paused) {
        setIsPlaying(false);
        setMediaSessionState(false);
        stopWatchdog();
      }
    };

    // waiting/stalled: buffering — do not change isPlaying, just log
    const onWaiting = () => {
      console.log("[iOS] audio 'waiting' event | rs:", audio.readyState, "| ct:", audio.currentTime.toFixed(2));
    };
    const onStalled = () => {
      console.warn("[WD:stall] audio 'stalled' event | rs:", audio.readyState, "| ct:", audio.currentTime.toFixed(2));
      if (audio.paused) { setIsPlaying(false); setMediaSessionState(false); }
    };

    const onRateChange = () => {
      if (audio.playbackRate !== 1) {
        console.warn("[WD:rate] ratechange | rate:", audio.playbackRate, "→ 1.0");
        enforceRate(audio);
      }
    };

    const onSeeked = () => { enforceRate(audio); };

    let lastPosUpdate = 0;
    const onTimeUpdate = () => {
      // Always save current position — this makes savedTimeRef accurate for resume
      savedTimeRef.current = audio.currentTime;
      lastTimeRef.current  = audio.currentTime;
      // Enforce rate on every tick — catches iOS rate corruption mid-playback
      if (audio.playbackRate !== 1) {
        console.warn("[WD:rate] timeupdate: rate =", audio.playbackRate, "→ 1.0");
        enforceRate(audio);
      }
      // Update lock screen progress bar (throttled to 1/s)
      const now = Date.now();
      if (!audio.paused && now - lastPosUpdate >= 1000 &&
          "mediaSession" in navigator && "setPositionState" in navigator.mediaSession) {
        lastPosUpdate = now;
        try {
          if (audio.duration && isFinite(audio.duration)) {
            navigator.mediaSession.setPositionState({ duration: audio.duration, playbackRate: 1, position: audio.currentTime });
          }
        } catch {}
      }
    };

    const onError = () => {
      console.error("[Player] audio error | code:", audio.error?.code, "msg:", audio.error?.message);
      clearPendingPlay();
      setIsPlaying(false);
      setMediaSessionState(false);
      stopWatchdog();
    };

    audio.addEventListener("play",       onPlay);
    audio.addEventListener("playing",    onPlaying);
    audio.addEventListener("pause",      onPause);
    audio.addEventListener("ended",      onEnded);
    audio.addEventListener("suspend",    onSuspend);
    audio.addEventListener("waiting",    onWaiting);
    audio.addEventListener("stalled",    onStalled);
    audio.addEventListener("ratechange", onRateChange);
    audio.addEventListener("seeked",     onSeeked);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("error",      onError);

    return () => {
      audio.removeEventListener("play",       onPlay);
      audio.removeEventListener("playing",    onPlaying);
      audio.removeEventListener("pause",      onPause);
      audio.removeEventListener("ended",      onEnded);
      audio.removeEventListener("suspend",    onSuspend);
      audio.removeEventListener("waiting",    onWaiting);
      audio.removeEventListener("stalled",    onStalled);
      audio.removeEventListener("ratechange", onRateChange);
      audio.removeEventListener("seeked",     onSeeked);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("error",      onError);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startWatchdog, stopWatchdog, clearPendingPlay]);

  // ── Visibility / page lifecycle ───────────────────────────────────────────
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    let showTimer = null;

    const doHide = (event) => {
      sharedHiddenRef.current = true;
      // Always save position on hide
      if (audio.currentTime > 0) {
        savedTimeRef.current = audio.currentTime;
        lastTimeRef.current  = audio.currentTime;
      }
      console.log("[Player] PAGE HIDE | event:", event,
        "| isPWA:", isPWA, "| isIOS:", isIOS, "| isSafari:", isSafariOnly,
        "| shouldPauseOnHide:", shouldPauseOnHide,
        "| ct:", audio.currentTime.toFixed(2), "| paused:", audio.paused,
        "| audioContextState:", _audioCtx?.state ?? "none",
        "| visibilityState:", document.visibilityState);

      stopWatchdog();

      if (shouldPauseOnHide) {
        // Desktop Safari tab only
        if (!audio.paused) {
          suspendAudioContext();
          audio.pause();
          setMediaSessionState(false);
        }
      } else if (isIOS) {
        // iOS Safari / PWA: detach Web Audio graph so native <audio> plays
        // directly to hardware without depending on AudioContext state.
        // CRITICAL: do NOT pause, do NOT reset src, do NOT call load().
        detachAnalyserGraph();
        console.log("[Player] iOS PAGE HIDE — analyser detached | nativeAudioStillPlaying:", !audio.paused,
          "| audioPaused:", audio.paused, "| audioCurrentTime:", audio.currentTime.toFixed(2),
          "| mediaSessionState:", ("mediaSession" in navigator) ? navigator.mediaSession.playbackState : "N/A");
      }
    };

    const doShow = (persisted, event) => {
      clearTimeout(showTimer);
      sharedHiddenRef.current = false;

      // Read ACTUAL state from audio element — this is always the source of truth
      const actuallyPlaying = !audio.paused && !audio.ended && !!audio.src;
      // On iOS, audio.currentTime is reliable immediately after show
      const realTime = audio.currentTime;

      console.log("[Player] PAGE SHOW | event:", event, "| persisted:", persisted,
        "| isPWA:", isPWA, "| isIOS:", isIOS, "| isSafari:", isSafariOnly,
        "| audio.paused:", audio.paused, "| audio.currentTime:", realTime.toFixed(2),
        "| audio.readyState:", audio.readyState, "| audio.playbackRate:", audio.playbackRate,
        "| isPlayingReactState (stale):", "→ updating to:", actuallyPlaying,
        "| mediaSessionPlaybackState:", ("mediaSession" in navigator) ? navigator.mediaSession.playbackState : "N/A",
        "| visibilityState:", document.visibilityState);

      if (!audio.src && !loadedSrcRef.current) {
        setIsPlaying(false);
        return;
      }

      // ALWAYS enforce rate on show — iOS may have changed it
      enforceRate(audio);

      // Sync React state to actual audio element state
      setIsPlaying(actuallyPlaying);
      setMediaSessionState(actuallyPlaying);

      // Update saved time from real audio element position (not stale ref)
      if (realTime > 0) {
        savedTimeRef.current = realTime;
        lastTimeRef.current  = realTime;
      }

      if (actuallyPlaying) {
        // Only resume AudioContext when page is visible (never from background)
        if (document.visibilityState === "visible") {
          resumeAudioContext().catch(() => {});
        }
        startWatchdog(audio);
        console.log("[Player] PAGE SHOW — audio WAS playing (continued in background)",
          "| isIOS:", isIOS, "| analyserWillReconnectOnUserGesture:", isIOS,
          "| audioCurrentTime:", audio.currentTime.toFixed(2),
          "| mediaSessionState:", ("mediaSession" in navigator) ? navigator.mediaSession.playbackState : "N/A");
      } else if (audio.src) {
        // Audio is paused — update UI, don't auto-resume, let user tap
        // NOTE: do not call resumeAudioContext here on iOS — requires user gesture
        if (!isIOS && document.visibilityState === "visible") {
          resumeAudioContext().catch(() => {});
        }
        console.log("[Player] PAGE SHOW — audio is PAUSED | iOS suspended it during lock/background",
          "| savedTime:", savedTimeRef.current.toFixed(2),
          "| audioContextState:", _audioCtx?.state ?? "none",
          "| awaiting user gesture to resume and reconnect analyser");
      }
    };

    const onVisibility = () => {
      clearTimeout(showTimer);
      if (document.visibilityState === "hidden") {
        doHide("visibilitychange");
      } else {
        // Small delay so audio element state has settled after iOS resumes page
        showTimer = setTimeout(() => doShow(false, "visibilitychange"), 150);
      }
    };

    const onPageHide = () => doHide("pagehide");
    const onPageShow = (e) => {
      clearTimeout(showTimer);
      showTimer = setTimeout(() => doShow(e.persisted, "pageshow"), 150);
    };
    const onFreeze = () => doHide("freeze");
    const onResume = () => {
      clearTimeout(showTimer);
      showTimer = setTimeout(() => doShow(true, "resume"), 150);
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide",  onPageHide);
    window.addEventListener("pageshow",  onPageShow);
    window.addEventListener("freeze",    onFreeze);
    window.addEventListener("resume",    onResume);

    return () => {
      clearTimeout(showTimer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide",  onPageHide);
      window.removeEventListener("pageshow",  onPageShow);
      window.removeEventListener("freeze",    onFreeze);
      window.removeEventListener("resume",    onResume);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopWatchdog, startWatchdog]);

  // ── togglePlay (user gesture) ─────────────────────────────────────────────
  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    // User gesture: safe to reconnect Web Audio graph and resume AudioContext
    resetAnalyserDisabled();
    setupAnalyserGraph(audio); // reconnects analyser now that user tapped
    resumeAudioContext().catch(() => {});
    console.log("[Player] togglePlay — user gesture | isIOS:", isIOS,
      "| analyserAttached:", !!_sourceNode, "| audioContextState:", _audioCtx?.state ?? "none",
      "| audioPaused:", audio.paused, "| audioCurrentTime:", audio.currentTime.toFixed(2));

    if (!audio.paused && !audio.ended) {
      safePause(audio, "toggle-pause");
      return;
    }

    enforceRate(audio);

    if (!audio.src && loadedSrcRef.current) {
      audio.src = loadedSrcRef.current;
      enforceRate(audio);
      audio.load();
    }

    // Call play() synchronously within user gesture
    const playPromise = audio.play();
    if (playPromise && typeof playPromise.then === "function") {
      playPromise.then(() => {
        enforceRate(audio);
        startWatchdog(audio);
        console.log("[Player] togglePlay resumed | rate:", audio.playbackRate);
      }).catch((e) => {
        if (e.name !== "AbortError") {
          console.warn("[Player] togglePlay error:", e.name, e.message);
          safePlay(audio, "toggle-play-fallback");
        }
      });
    } else {
      enforceRate(audio);
      startWatchdog(audio);
    }
  }, [safePlay, safePause, startWatchdog]);

  // ── playTrack (public API) ────────────────────────────────────────────────
  const playTrack = useCallback((track, source = "song") => {
    const audio = audioRef.current;
    if (!audio || !track?.audio_url) return;
    const url = track.audio_url;

    resetAnalyserDisabled();
    // Only connect Web Audio graph if page is visible (user-gesture context)
    if (document.visibilityState === "visible") {
      setupAnalyserGraph(audio);
    }

    setSourceType(source);
    setCurrentTrack(track);
    opQueueRef.current.clearQueue();
    stopWatchdog();
    clearPendingPlay();

    loadedSrcRef.current  = url;
    savedTimeRef.current  = 0;
    lastTimeRef.current   = 0;

    // Synchronous iOS unlock sequence
    enforceRate(audio);
    audio.src = url;
    enforceRate(audio);
    audio.load();

    if (_audioCtx && _audioCtx.state === "suspended") _audioCtx.resume().catch(() => {});

    console.log("[Player] playTrack | title:", track.title, "| iOS:", isIOS,
      "| audioLoadCalledDuringResume=true (new track load, not resume)");

    const playPromise = audio.play();
    if (playPromise && typeof playPromise.then === "function") {
      playPromise.then(() => {
        enforceRate(audio);
        startWatchdog(audio);
        console.log("[Player] playTrack resolved | rate:", audio.playbackRate, "| paused:", audio.paused);
      }).catch((e) => {
        if (e.name === "AbortError") { console.log("[Player] playTrack AbortError (superseded)"); return; }
        console.warn("[Player] playTrack error:", e.name, e.message);
      });
    } else {
      enforceRate(audio);
      startWatchdog(audio);
    }
  }, [stopWatchdog, startWatchdog, clearPendingPlay]);

  // ── stopPlaying ───────────────────────────────────────────────────────────
  const stopPlaying = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    opQueueRef.current.clearQueue();
    stopWatchdog();
    clearPendingPlay();
    suspendAudioContext();
    if (!audio.paused) audio.pause();
    audio.src             = "";
    loadedSrcRef.current  = "";
    savedTimeRef.current  = 0;
    lastTimeRef.current   = 0;
    setIsPlaying(false);
    setCurrentTrack(null);
    setMediaSessionState(false);
    if ("mediaSession" in navigator) navigator.mediaSession.metadata = null;
    console.log("[Player] stopPlaying — audio cleared");
  }, [stopWatchdog, clearPendingPlay]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const registerNextHandler = useCallback((fn) => { onNextRef.current = fn; }, []);
  const registerPrevHandler = useCallback((fn) => { onPrevRef.current = fn; }, []);
  const handleNext          = useCallback(() => { onNextRef.current?.(); }, []);
  const handlePrev          = useCallback(() => { onPrevRef.current?.(); }, []);
  const clearPosition       = useCallback(() => { savedTimeRef.current = 0; }, []);
  const savePosition        = useCallback((t) => { savedTimeRef.current = t; }, []);

  return (
    <PlayerContext.Provider value={{
      currentTrack,
      isPlaying,
      queue,
      sourceType,
      savedTime: savedTimeRef.current,
      lastTimeRef,
      playTrack,
      togglePlay,
      stopPlaying,
      setQueue,
      audioRef,
      safePlay,
      safePause,
      registerNextHandler,
      registerPrevHandler,
      handleNext,
      handlePrev,
      savedTimeRef,
      playLockRef: { current: opQueueRef.current.isRunning },
      clearPosition,
      savePosition,
      setIsPlaying,
      isPWA,
      isSafariOnly,
      shouldPauseOnHide,
    }}>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used inside PlayerProvider");
  return ctx;
}