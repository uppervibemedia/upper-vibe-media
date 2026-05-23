/**
 * PlayerContext — Upper Vibe Media
 * ─────────────────────────────────────────────────────────────────────────────
 * SINGLE GLOBAL AUDIO CONTROLLER
 *
 * Architecture principles:
 *  1. ONE audio element, ONE operation queue, ONE source of truth.
 *  2. Every play/pause request goes through an async operation queue so
 *     rapid lock-screen taps, visibility events, and React renders CANNOT
 *     cause overlapping play() calls or rate corruption.
 *  3. playbackRate is forced to 1.0 at 8 distinct points:
 *       - audio element creation
 *       - before every load()
 *       - after every load() / canplay
 *       - before every play()
 *       - after every play() resolves
 *       - on every ratechange event
 *       - on every play native event
 *       - on every visibility-show / pageshow
 *  4. MediaSession handlers are registered ONCE and never re-registered.
 *     They talk to the operation queue, not directly to the audio element.
 *  5. Visibility / lifecycle events are handled by ONE listener block.
 *     PWA mode: keep audio alive (iOS continues playing in background).
 *     Safari tab mode: save position, pause, restore on show.
 *  6. Lock-screen debounce: 200 ms window prevents rapid-tap corruption.
 *  7. Stall watchdog: if audio.currentTime doesn't advance for 1.5 s
 *     while supposedly playing, pause and log.
 *  8. State saved to sessionStorage (not localStorage) so a hard refresh
 *     gets a clean slate but a BFCache restore works correctly.
 *
 * WATCHDOGS (all log to console so you can verify on iOS):
 *   [WD:rate]     playbackRate !== 1 detected and corrected
 *   [WD:stall]    audio.currentTime not advancing
 *   [WD:lock]     op-queue blocked > 3s (signals stuck lock)
 *   [WD:desync]   MediaSession state != audio.paused state
 *   [WD:dup]      duplicate audio instances detected
 *   [WD:drift]    currentTime moved while paused
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
// PWA detection (stable — computed once at module load)
// ─────────────────────────────────────────────────────────────────────────────
const isPWA = (() => {
  if (typeof window === "undefined") return false;
  return (
    window.navigator.standalone === true ||
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches
  );
})();

// ─────────────────────────────────────────────────────────────────────────────
// iOS detection — on iOS/iPadOS we MUST skip AudioContext routing.
// Routing through Web Audio API (createMediaElementSource) prevents the OS
// from routing audio to AirPlay, Bluetooth, or TV. On iOS we let the audio
// element play directly to the system output (which supports all routing).
// ─────────────────────────────────────────────────────────────────────────────
const isIOS = (() => {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
})();

// ─────────────────────────────────────────────────────────────────────────────
// Safari detection — Safari is the ONLY browser that requires pause-on-hide
// for background tab audio. Chrome, Firefox, Edge all support background audio.
// ─────────────────────────────────────────────────────────────────────────────
const isSafariOnly = (() => {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  // Safari: has "Safari/" but NOT "Chrome/" and NOT "Chromium/" and NOT "EdgA/" and NOT "Firefox/"
  return (
    /Safari\//.test(ua) &&
    !/Chrome\//.test(ua) &&
    !/Chromium\//.test(ua) &&
    !/EdgA?\//.test(ua) &&
    !/Firefox\//.test(ua) &&
    !/FxiOS\//.test(ua)
  );
})();

// On desktop non-Safari (Chrome, Edge, Firefox), audio plays in background tabs natively.
// Only pause-on-hide when: not PWA AND is Safari tab.
const shouldPauseOnHide = !isPWA && isSafariOnly;

console.log("[Player] cold_launch | isPWA:", isPWA, "| isIOS:", isIOS,
  "| isSafariOnly:", isSafariOnly, "| shouldPauseOnHide:", shouldPauseOnHide,
  "| ua:", navigator.userAgent.substring(0, 80));

// ─────────────────────────────────────────────────────────────────────────────
// Global audio instance tracker — detect duplicate audio objects (watchdog)
// ─────────────────────────────────────────────────────────────────────────────
let _globalAudioInstanceCount = 0;

// ─────────────────────────────────────────────────────────────────────────────
// Shared visibility ref — exported so AudioPlayer bar can gate progress updates
// ─────────────────────────────────────────────────────────────────────────────
export const sharedHiddenRef = { current: false };

// ─────────────────────────────────────────────────────────────────────────────
// AudioContext — shared with visualiser, created lazily on first user gesture.
//
// RULES:
//  1. NEVER call setupAnalyserGraph at page load / bootstrap — only inside a
//     user gesture (tap on Play button). This is the iOS Safari requirement.
//  2. createMediaElementSource is called ONCE per audio element and cached.
//     Calling it twice on the same element throws InvalidStateError.
//  3. source → analyser → destination: audio still plays, analyser gets data.
//  4. If setup fails for any reason: log it, disable analyser for session,
//     audio keeps playing normally (safety net).
//  5. Works on both iOS and non-iOS when called inside a user gesture.
// ─────────────────────────────────────────────────────────────────────────────
let _audioCtx   = null;
let _analyser   = null;
let _sourceNode = null;
let _sourceEl   = null; // the element _sourceNode was created from
// Flag: if analyser setup throws, disable for the rest of the session
let _analyserDisabled = false;

async function resumeAudioContext() {
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
 * setupAnalyserGraph — wires the audio element into a Web Audio graph.
 * MUST be called inside a user gesture (iOS Safari requirement).
 * Safe to call multiple times — caches source node, never recreates it.
 *
 * AUDIO SAFETY: if this throws for any reason, we catch it, disable the
 * analyser for the session, and audio keeps playing normally.
 */
function setupAnalyserGraph(audioElement) {
  if (!audioElement || _analyserDisabled) return null;

  try {
    // Create context if needed (or recreate if closed)
    if (!_audioCtx || _audioCtx.state === "closed") {
      _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      window._uvAudioCtx = _audioCtx;
      _analyser   = null;
      _sourceNode = null;
      _sourceEl   = null;
    }

    if (_audioCtx.state === "suspended") {
      _audioCtx.resume().catch(() => {});
    }

    // Create analyser once and reuse — changing mode never recreates this
    if (!_analyser) {
      _analyser = _audioCtx.createAnalyser();
      _analyser.fftSize = 2048;
      _analyser.smoothingTimeConstant = 0.75;
      window._uvAnalyser = _analyser;
    }

    // Create source node once per audio element — NEVER recreate it
    // createMediaElementSource() on the same element twice = InvalidStateError
    if (!_sourceNode || _sourceEl !== audioElement) {
      if (_sourceNode) {
        try { _sourceNode.disconnect(); } catch {}
        _sourceNode = null;
        _sourceEl   = null;
      }
      _sourceNode = _audioCtx.createMediaElementSource(audioElement);
      _sourceEl   = audioElement;
      // source → analyser → destination (audio still plays, analyser gets data)
      _sourceNode.connect(_analyser);
      _analyser.connect(_audioCtx.destination);
      console.log("[Player] AudioGraph connected | iOS:", isIOS, "| ctxState:", _audioCtx.state,
        "| src:", audioElement.src?.substring(0, 55));
    }

    return _analyser;
  } catch (e) {
    // SAFETY NET: analyser failed — audio keeps playing, visualiser uses fallback
    console.warn("[Player] setupAnalyserGraph failed — disabling analyser |", e.name, e.message);
    _analyserDisabled = true;
    _sourceNode = null;
    _sourceEl   = null;
    return null;
  }
}

export function resumeGlobalAudioContext() { return resumeAudioContext().catch(() => {}); }

/**
 * requestAnalyser — called by the visualiser after a user gesture.
 * Works on iOS and non-iOS. Returns null if setup failed or not yet called.
 */
export function requestAnalyser(audioElement) {
  if (!audioElement || _analyserDisabled) return null;
  const an = setupAnalyserGraph(audioElement);
  if (!an) return null;
  return { analyser: an, ctx: _audioCtx, sourceNode: _sourceNode };
}

// ─────────────────────────────────────────────────────────────────────────────
// enforceRate — call at every touch point
// ─────────────────────────────────────────────────────────────────────────────
function enforceRate(audio) {
  if (!audio) return;
  if (audio.playbackRate !== 1) {
    console.warn("[WD:rate] playbackRate was", audio.playbackRate, "→ forcing 1.0");
    audio.playbackRate = 1;
  }
  if (audio.defaultPlaybackRate !== 1) {
    audio.defaultPlaybackRate = 1;
  }
  if ("preservesPitch" in audio) audio.preservesPitch = true;
}

// ─────────────────────────────────────────────────────────────────────────────
// createFreshAudio — ALWAYS creates a new element (never reuses)
//
// AirPlay / Bluetooth / TV requirements:
//  1. Element must be attached to the DOM (iOS requires this for system routing)
//  2. disableRemotePlayback = false (explicit opt-in to AirPlay/BT)
//  3. x-webkit-airplay="allow" attribute (legacy WebKit AirPlay hook)
//  4. playsinline attribute (prevents iOS from going fullscreen)
//  5. NO crossOrigin="anonymous" on iOS — CORS header mismatch kills AirPlay
//     routing on some CDN configs. Only set crossOrigin on non-iOS.
// ─────────────────────────────────────────────────────────────────────────────
function createFreshAudio() {
  _globalAudioInstanceCount++;
  if (_globalAudioInstanceCount > 1) {
    console.error("[WD:dup] duplicate audio instance created! count:", _globalAudioInstanceCount);
  }
  const a = new Audio();

  // CORS: only on non-iOS. On iOS, crossOrigin="anonymous" can break AirPlay
  // routing when the CDN doesn't return Access-Control-Allow-Origin for the
  // OPTIONS preflight that AirPlay triggers.
  if (!isIOS) {
    a.crossOrigin = "anonymous";
  }

  a.preload = "auto";
  enforceRate(a);

  // AirPlay / remote playback — explicit enable
  a.setAttribute("x-webkit-airplay", "allow");
  a.setAttribute("playsinline", "");
  if ("disableRemotePlayback" in a) {
    a.disableRemotePlayback = false; // explicitly allow AirPlay + BT
  }

  // Attach to DOM — required for iOS to route audio to AirPlay/BT/TV.
  // Hidden, zero-size, no visual footprint.
  a.style.cssText = "position:absolute;width:0;height:0;opacity:0;pointer-events:none;";
  a.setAttribute("aria-hidden", "true");
  document.body.appendChild(a);

  console.log("[Player] audio_created | instance #", _globalAudioInstanceCount,
    "| iOS:", isIOS, "| domAttached: true");
  return a;
}

function destroyAudio(audio) {
  if (!audio) return;
  _globalAudioInstanceCount = Math.max(0, _globalAudioInstanceCount - 1);
  audio.pause();
  audio.src = "";
  try { audio.load(); } catch {}
  // Remove from DOM
  try { if (audio.parentNode) audio.parentNode.removeChild(audio); } catch {}
  console.log("[Player] audio_destroyed | remaining instances:", _globalAudioInstanceCount);
}

// ─────────────────────────────────────────────────────────────────────────────
// OPERATION QUEUE — serialises all play/pause requests
// No two audio operations can run concurrently.
// ─────────────────────────────────────────────────────────────────────────────
class AudioOpQueue {
  constructor() {
    this._running = false;
    this._queue   = [];
    this._lockTime = 0;
  }

  /** Enqueue an async operation. Returns a promise that resolves when done. */
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
    this._running  = true;
    this._lockTime = Date.now();
    const next = this._queue.shift();
    Promise.resolve().then(next).finally(() => {
      this._running  = false;
      this._lockTime = 0;
      this._drain();
    });
  }

  get isRunning() { return this._running; }
  get lockAge()   { return this._lockTime ? Date.now() - this._lockTime : 0; }
  clearQueue()    { this._queue = []; }
}

// ─────────────────────────────────────────────────────────────────────────────
// LOCK-SCREEN DEBOUNCE — prevents rapid play/pause from corrupting state
// ─────────────────────────────────────────────────────────────────────────────
function makeDebounce(ms) {
  let timer = null;
  let lastIntent = null; // "play" | "pause"
  return function debounce(intent, fn) {
    lastIntent = intent;
    clearTimeout(timer);
    timer = setTimeout(() => {
      console.log("[Player] debounce fired | intent:", lastIntent);
      fn(lastIntent);
      timer = null;
    }, ms);
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// MEDIA SESSION — registered ONCE, talks to the op queue
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
    title:   track.title         || "Unknown",
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
  const playingUrlRef    = useRef("");   // guard for stale async ops
  const savedTimeRef     = useRef(0);   // position to restore on resume
  const lastTimeRef      = useRef(0);   // last known currentTime (for AudioPlayer bar)
  const onNextRef        = useRef(null);
  const onPrevRef        = useRef(null);

  // Operation queue — ONE instance, persists for the life of the provider
  const opQueueRef = useRef(new AudioOpQueue());

  // Lock-screen debounce (200 ms) — ONE instance
  const lsDebounceRef = useRef(makeDebounce(200));

  // Watchdog
  const watchdogRef      = useRef(null);
  const watchdogTimeRef  = useRef(0);
  const watchdogStampRef = useRef(0);
  const watchdogLockRef  = useRef(null);

  // ── Bootstrap ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const audio = createFreshAudio();
    audioRef.current = audio;
    // NOTE: Do NOT call setupAnalyserGraph here — it must only be called inside
    // a user gesture (required by iOS Safari and recommended by spec).

    // Register MediaSession handlers ONCE here — they close over audioRef
    registerMediaSessionHandlers();

    // Start queue-lock watchdog
    watchdogLockRef.current = setInterval(() => {
      const q = opQueueRef.current;
      if (q.isRunning && q.lockAge > 3000) {
        console.warn("[WD:lock] op-queue blocked for", q.lockAge, "ms — clearing queue");
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
    if (watchdogRef.current) {
      clearInterval(watchdogRef.current);
      watchdogRef.current = null;
    }
  }, []);

  const startWatchdog = useCallback((audio) => {
    stopWatchdog();
    watchdogTimeRef.current  = audio.currentTime;
    watchdogStampRef.current = Date.now();

    watchdogRef.current = setInterval(() => {
      // Don't fire when page is hidden (PWA continues in background, that's fine)
      if (!isPWA && document.visibilityState === "hidden") return;
      if (audio.paused || audio.ended || !audio.src) { stopWatchdog(); return; }

      const elapsed  = (Date.now() - watchdogStampRef.current) / 1000;
      const ct       = audio.currentTime;
      const advanced = ct - watchdogTimeRef.current;

      // Rate watchdog
      if (audio.playbackRate !== 1) {
        console.warn("[WD:rate] stall-check: playbackRate =", audio.playbackRate, "→ forcing 1.0");
        enforceRate(audio);
      }

      // Stall watchdog: no advancement in 1.5 s while supposedly playing
      if (elapsed >= 1.5 && advanced < 0.05) {
        console.warn("[WD:stall] audio not advancing — ct:", ct.toFixed(2), "elapsed:", elapsed.toFixed(1));
        savedTimeRef.current = ct;
        lastTimeRef.current  = ct;
        suspendAudioContext();
        audio.pause();
        setMediaSessionState(false);
        setIsPlaying(false);
        stopWatchdog();
        return;
      }

      // Drift watchdog: currentTime moving while paused
      if (audio.paused && advanced > 0.1) {
        console.warn("[WD:drift] currentTime advanced", advanced.toFixed(2), "while paused!");
      }

      watchdogTimeRef.current  = ct;
      watchdogStampRef.current = Date.now();
    }, 800);
  }, [stopWatchdog]);

  // ── MediaSession desync watchdog ──────────────────────────────────────────
  // Runs every 5 s to catch lock-screen / audio state mismatches
  useEffect(() => {
    const t = setInterval(() => {
      const audio = audioRef.current;
      if (!audio || !("mediaSession" in navigator)) return;
      const msPlaying = navigator.mediaSession.playbackState === "playing";
      const actualPlaying = !audio.paused && !audio.ended && !!audio.src;
      if (msPlaying !== actualPlaying) {
        console.warn("[WD:desync] MediaSession state (", navigator.mediaSession.playbackState,
          ") does not match audio.paused (", audio.paused, ") — correcting");
        setMediaSessionState(actualPlaying);
      }
    }, 5000);
    return () => clearInterval(t);
  }, []);

  // ── CORE: safePlay (goes through op queue) ────────────────────────────────
  const safePlay = useCallback(async (audio, reason) => {
    if (!audio) return;
    return opQueueRef.current.push(async () => {
      const src = audio.src || loadedSrcRef.current;
      if (!src) {
        console.warn("[Player] safePlay blocked — no src | reason:", reason);
        return;
      }

      console.log("[Player] safePlay | reason:", reason,
        "| src:", src.substring(0, 60),
        "| paused:", audio.paused,
        "| rs:", audio.readyState,
        "| ct:", audio.currentTime.toFixed(2),
        "| rate:", audio.playbackRate,
        "| isPWA:", isPWA);

      // Already playing and healthy — just enforce rate
      if (!audio.paused && !audio.ended && audio.readyState >= 2) {
        enforceRate(audio);
        startWatchdog(audio);
        console.log("[Player] safePlay — already playing, enforced rate");
        return;
      }

      enforceRate(audio);
      await resumeAudioContext();

      // Needs reload (buffer evicted, error, or no src set)
      const needsReload = audio.readyState < 2 || audio.error || !audio.src;
      if (needsReload) {
        console.log("[Player] safePlay — buffer evicted or no src, reloading | rs:", audio.readyState, "err:", audio.error?.code ?? null);
        const restoreTime = savedTimeRef.current;
        const reloadSrc   = src;

        // Safari anti-glitch: clear → yield → set
        audio.src = "";
        await new Promise(r => setTimeout(r, 30));
        if (!audio.src) {
          audio.src = reloadSrc;
          enforceRate(audio);
          audio.load();
        }

        await new Promise((resolve, reject) => {
          let done = false;
          const finish = (ok) => {
            if (done) return;
            done = true;
            cleanup();
            ok ? resolve() : reject(new Error("load failed"));
          };
          const onCanPlay = () => finish(true);
          const onError   = () => finish(false);
          const cleanup   = () => {
            audio.removeEventListener("canplay", onCanPlay);
            audio.removeEventListener("error",   onError);
          };
          audio.addEventListener("canplay", onCanPlay);
          audio.addEventListener("error",   onError);
          setTimeout(() => finish(false), 8000); // 8s timeout
        }).catch((e) => {
          console.warn("[Player] safePlay reload timeout/error:", e.message);
        });

        enforceRate(audio);

        // Restore position
        if (restoreTime > 1) {
          try {
            audio.currentTime = restoreTime;
            await new Promise(r => setTimeout(r, 60));
          } catch {}
        }
      } else {
        // Normal resume — correct drift
        const saved = savedTimeRef.current;
        if (saved > 0 && Math.abs(audio.currentTime - saved) > 0.8) {
          console.log("[Player] safePlay — drift correction:", audio.currentTime.toFixed(2), "→", saved.toFixed(2));
          try { audio.currentTime = saved; } catch {}
        }
      }

      // Guard: if track changed during async work, abort
      if (audio.src && !audio.src.includes(loadedSrcRef.current.split("?")[0].slice(-20))) {
        console.log("[Player] safePlay — src changed during async, aborting");
        return;
      }

      if (!audio.paused) {
        enforceRate(audio);
        startWatchdog(audio);
        return;
      }

      enforceRate(audio);
      console.log("[Player] calling audio.play() | rate:", audio.playbackRate);
      const p = audio.play();
      if (p && typeof p.then === "function") {
        await p;
        enforceRate(audio); // iOS can reset rate AFTER play() resolves
      }
      console.log("[Player] play() resolved | rate:", audio.playbackRate, "| paused:", audio.paused);
      startWatchdog(audio);
    });
  }, [startWatchdog]);

  // ── safePause (goes through op queue) ────────────────────────────────────
  const safePause = useCallback(async (audio, reason = "pause") => {
    if (!audio) return;
    return opQueueRef.current.push(async () => {
      console.log("[Player] safePause | reason:", reason, "| paused:", audio.paused, "| ct:", audio.currentTime.toFixed(2));
      stopWatchdog();
      if (audio.currentTime > 0) {
        savedTimeRef.current = audio.currentTime;
        lastTimeRef.current  = audio.currentTime;
      }
      if (!audio.paused) {
        suspendAudioContext();
        audio.pause();
      }
      setMediaSessionState(false);
    });
  }, [stopWatchdog]);

  // ── Register MediaSession handlers — called ONCE at mount ─────────────────
  function registerMediaSessionHandlers() {
    if (!("mediaSession" in navigator)) return;

    const debounce = lsDebounceRef.current;

    navigator.mediaSession.setActionHandler("play", () => {
      const audio = audioRef.current;
      console.log("[Player] 🔒 Lock screen PLAY | src:", audio?.src ? "set" : "MISSING",
        "| track:", currentTrackRef.current?.title ?? "none",
        "| paused:", audio?.paused, "| rate:", audio?.playbackRate);
      debounce("play", (intent) => {
        if (intent === "play" && audioRef.current) {
          enforceRate(audioRef.current);
          safePlay(audioRef.current, "lockscreen-play");
          setIsPlaying(true);
          setMediaSessionState(true);
        }
      });
    });

    navigator.mediaSession.setActionHandler("pause", () => {
      const audio = audioRef.current;
      console.log("[Player] 🔒 Lock screen PAUSE | ct:", audio?.currentTime?.toFixed(2));
      debounce("pause", (intent) => {
        if (intent === "pause" && audioRef.current) {
          safePause(audioRef.current, "lockscreen-pause");
          setIsPlaying(false);
        }
      });
    });

    navigator.mediaSession.setActionHandler("nexttrack", () => {
      console.log("[Player] 🔒 Lock screen NEXT");
      opQueueRef.current.push(async () => { onNextRef.current?.(); });
    });

    navigator.mediaSession.setActionHandler("previoustrack", () => {
      console.log("[Player] 🔒 Lock screen PREV");
      opQueueRef.current.push(async () => { onPrevRef.current?.(); });
    });

    // Disable seek to prevent iOS from changing currentTime unexpectedly
    try { navigator.mediaSession.setActionHandler("seekforward",  null); } catch {}
    try { navigator.mediaSession.setActionHandler("seekbackward", null); } catch {}
    try { navigator.mediaSession.setActionHandler("seekto",       null); } catch {}

    console.log("[Player] MediaSession handlers registered (once)");
  }

  // NOTE: Track loading and playback is now handled directly in playTrack()
  // above, keeping us inside the iOS user gesture window. This useEffect is
  // intentionally removed — do not re-add it.

  // ── Native audio events → React state ────────────────────────────────────
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onPlay = () => {
      enforceRate(audio);
      setIsPlaying(true);
      setMediaSessionState(true);
      const track = currentTrackRef.current;
      if (track) {
        setMediaSessionMetadata(track);
        try { trackSongPlay(track); streamStart(track); } catch {}
      }
      // Update lock screen position
      if ("mediaSession" in navigator && "setPositionState" in navigator.mediaSession) {
        try {
          if (audio.duration && isFinite(audio.duration)) {
            navigator.mediaSession.setPositionState({
              duration:     audio.duration,
              playbackRate: 1,
              position:     audio.currentTime,
            });
          }
        } catch {}
      }
      startWatchdog(audio);
    };

    const onPause = () => {
      setIsPlaying(false);
      setMediaSessionState(false);
      stopWatchdog();
      const track = currentTrackRef.current;
      try { if (track) { trackSongPause(track); streamPause(); } } catch {}
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

    const onRateChange = () => {
      if (audio.playbackRate !== 1) {
        console.warn("[WD:rate] ratechange event fired | rate:", audio.playbackRate, "→ forcing 1.0");
        enforceRate(audio);
      }
    };

    let lastPositionUpdateTime = 0;
    const onTimeUpdate = () => {
      lastTimeRef.current = audio.currentTime;
      // Update lock screen progress — throttled to once per second to avoid
      // flooding the MediaSession API on mobile devices.
      const now = Date.now();
      if (!audio.paused && now - lastPositionUpdateTime >= 1000 &&
          "mediaSession" in navigator && "setPositionState" in navigator.mediaSession) {
        lastPositionUpdateTime = now;
        try {
          if (audio.duration && isFinite(audio.duration)) {
            navigator.mediaSession.setPositionState({
              duration:     audio.duration,
              playbackRate: 1,
              position:     audio.currentTime,
            });
          }
        } catch {}
      }
    };

    const onStall = () => {
      if (audio.paused) setIsPlaying(false);
      console.warn("[WD:stall] stall/waiting event | rs:", audio.readyState, "| ct:", audio.currentTime.toFixed(2));
    };

    const onError = () => {
      console.error("[Player] audio error | code:", audio.error?.code, "msg:", audio.error?.message);
      setIsPlaying(false);
      setMediaSessionState(false);
      stopWatchdog();
    };

    audio.addEventListener("play",        onPlay);
    audio.addEventListener("pause",       onPause);
    audio.addEventListener("ended",       onEnded);
    audio.addEventListener("ratechange",  onRateChange);
    audio.addEventListener("timeupdate",  onTimeUpdate);
    audio.addEventListener("stalled",     onStall);
    audio.addEventListener("waiting",     onStall);
    audio.addEventListener("error",       onError);

    return () => {
      audio.removeEventListener("play",        onPlay);
      audio.removeEventListener("pause",       onPause);
      audio.removeEventListener("ended",       onEnded);
      audio.removeEventListener("ratechange",  onRateChange);
      audio.removeEventListener("timeupdate",  onTimeUpdate);
      audio.removeEventListener("stalled",     onStall);
      audio.removeEventListener("waiting",     onStall);
      audio.removeEventListener("error",       onError);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startWatchdog, stopWatchdog]);

  // ── Visibility / page lifecycle ───────────────────────────────────────────
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    let showTimer = null;

    const doHide = (event) => {
      sharedHiddenRef.current = true;
      // Save position before anything changes
      if (audio.currentTime > 0) {
        savedTimeRef.current = audio.currentTime;
        lastTimeRef.current  = audio.currentTime;
      }
      console.log("[Player] PAGE HIDE | event:", event, "| isPWA:", isPWA,
        "| isSafariOnly:", isSafariOnly, "| shouldPauseOnHide:", shouldPauseOnHide,
        "| ct:", audio.currentTime.toFixed(2), "| paused:", audio.paused);

      if (shouldPauseOnHide) {
        // Safari tab only: pause and save position so iOS doesn't buffer-glitch
        stopWatchdog();
        if (!audio.paused) {
          suspendAudioContext();
          audio.pause();
          setMediaSessionState(false);
          console.log("[Player] Safari tab hide — paused at:", savedTimeRef.current.toFixed(2));
        }
      } else {
        // Desktop Chrome/Edge/Firefox + PWA: keep audio playing in background.
        // Just stop the watchdog to avoid false stall alerts while hidden.
        stopWatchdog();
        console.log("[Player] desktop/PWA hide — audio continues in background");
      }
    };

    const doShow = (persisted, event) => {
      clearTimeout(showTimer);
      sharedHiddenRef.current = false;

      enforceRate(audio); // ALWAYS enforce rate on show

      console.log("[Player] PAGE SHOW | event:", event, "| persisted:", persisted,
        "| isPWA:", isPWA, "| shouldPauseOnHide:", shouldPauseOnHide,
        "| ct:", audio.currentTime.toFixed(2),
        "| rate:", audio.playbackRate, "| paused:", audio.paused, "| rs:", audio.readyState);

      if (!audio.src && !loadedSrcRef.current) {
        setIsPlaying(false);
        return;
      }

      // Sync React state from actual audio state (audio may have self-paused or kept playing)
      setIsPlaying(!audio.paused);
      setMediaSessionState(!audio.paused);

      if (!audio.paused) {
        // Audio kept playing (desktop) — resume watchdog and resume AudioContext
        resumeAudioContext().catch(() => {});
        enforceRate(audio);
        startWatchdog(audio);
        console.log("[Player] PAGE SHOW — audio was playing, resumed watchdog + AudioContext");
      } else if (!shouldPauseOnHide && audio.src) {
        // Desktop/PWA: audio unexpectedly paused while hidden (e.g. OS media interruption)
        // Resume AudioContext but don't force-play — respect current paused state
        resumeAudioContext().catch(() => {});
        console.log("[Player] PAGE SHOW — audio paused unexpectedly on desktop, AudioContext resumed");
      } else {
        // Safari tab: audio was intentionally paused on hide — user must tap play
        console.log("[Player] PAGE SHOW — Safari tab, audio paused, waiting for user");
      }
    };

    const onVisibility = () => {
      clearTimeout(showTimer);
      if (document.visibilityState === "hidden") {
        doHide("visibilitychange");
      } else {
        showTimer = setTimeout(() => doShow(false, "visibilitychange"), 80);
      }
    };

    const onPageHide = (e) => doHide("pagehide");
    const onPageShow = (e) => {
      clearTimeout(showTimer);
      showTimer = setTimeout(() => doShow(e.persisted, "pageshow"), 80);
    };

    // freeze/resume for BFCache
    const onFreeze  = () => doHide("freeze");
    const onResume  = () => {
      clearTimeout(showTimer);
      showTimer = setTimeout(() => doShow(true, "resume"), 80);
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

  // ── togglePlay ────────────────────────────────────────────────────────────
  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    // Wire Web Audio graph for visualiser — inside user gesture (iOS-safe).
    setupAnalyserGraph(audio);
    resumeAudioContext().catch(() => {});

    if (!audio.paused && !audio.ended) {
      // Currently playing — pause it
      safePause(audio, "toggle-pause");
      return;
    }

    // Currently paused — resume or reload
    enforceRate(audio);

    // If src is gone (e.g. after stopPlaying or Safari clearing it), reload from ref
    if (!audio.src && loadedSrcRef.current) {
      audio.src = loadedSrcRef.current;
      enforceRate(audio);
      audio.load();
    }

    // iOS: call play() synchronously within gesture
    const playPromise = audio.play();
    if (playPromise && typeof playPromise.then === "function") {
      playPromise.then(() => {
        enforceRate(audio);
        startWatchdog(audio);
        console.log("[Player] togglePlay resumed | rate:", audio.playbackRate);
      }).catch((e) => {
        if (e.name !== "AbortError") {
          console.warn("[Player] togglePlay play() error:", e.name, e.message);
          // Fall back to safePlay which handles buffer-evicted state
          safePlay(audio, "toggle-play-fallback");
        }
      });
    } else {
      enforceRate(audio);
      startWatchdog(audio);
    }
  }, [safePlay, safePause, startWatchdog]);

  // ── playTrack (public API) ────────────────────────────────────────────────
  // iOS CRITICAL: audio.play() must be called synchronously within the user
  // gesture handler. Any await before play() loses the gesture context on iOS
  // Safari and the browser silently blocks playback with no error.
  //
  // Strategy:
  //   1. Synchronously: clear queue, set src, load(), play() — all in one tick.
  //      iOS unlocks audio on the synchronous play() call.
  //   2. The play() Promise resolves async — we just handle errors there.
  //   3. watchdog and state updates happen after play() resolves.
  const playTrack = useCallback((track, source = "song") => {
    const audio = audioRef.current;
    if (!audio || !track?.audio_url) return;

    const url = track.audio_url;

    // Wire Web Audio graph for visualiser — called inside user gesture (iOS-safe).
    // Source node is created once and reused; changing tracks does NOT recreate it.
    setupAnalyserGraph(audio);

    // Update React state
    setSourceType(source);
    setCurrentTrack(track);

    // Clear any pending ops so this track wins
    opQueueRef.current.clearQueue();
    stopWatchdog();

    // Update refs immediately (synchronous, before any async)
    loadedSrcRef.current  = url;
    playingUrlRef.current = url;
    savedTimeRef.current  = 0;
    lastTimeRef.current   = 0;

    // ── SYNCHRONOUS iOS unlock sequence ──────────────────────────────────────
    // Must happen in the same call stack as the user gesture.
    enforceRate(audio);
    audio.src = url;
    enforceRate(audio);
    audio.load();

    // Resume AudioContext if suspended (required before play on all platforms)
    if (_audioCtx && _audioCtx.state === "suspended") {
      _audioCtx.resume().catch(() => {});
    }

    console.log("[Player] playTrack sync | title:", track.title, "| iOS:", isIOS, "| src set, load() called");

    // play() called synchronously — this is the iOS gesture unlock
    const playPromise = audio.play();

    // Handle the async resolution without blocking
    if (playPromise && typeof playPromise.then === "function") {
      playPromise.then(() => {
        enforceRate(audio);
        startWatchdog(audio);
        console.log("[Player] playTrack resolved | title:", track.title, "| rate:", audio.playbackRate, "| paused:", audio.paused);
      }).catch((e) => {
        if (e.name === "AbortError") {
          // Another track was queued — this is normal, ignore
          console.log("[Player] playTrack AbortError (superseded by newer track) |", track.title);
          return;
        }
        // NotAllowedError = iOS gesture unlock failed (shouldn't happen since we're sync)
        // NetworkError = bad URL
        console.warn("[Player] playTrack play() error:", e.name, e.message, "| title:", track.title);
      });
    } else {
      // Older iOS: no promise returned, assume playing
      enforceRate(audio);
      startWatchdog(audio);
    }
  }, [stopWatchdog, startWatchdog]);

  // ── stopPlaying ───────────────────────────────────────────────────────────
  const stopPlaying = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    opQueueRef.current.clearQueue();
    stopWatchdog();
    suspendAudioContext();
    if (!audio.paused) audio.pause();
    audio.src            = "";
    loadedSrcRef.current = "";
    playingUrlRef.current = "";
    savedTimeRef.current = 0;
    lastTimeRef.current  = 0;
    setIsPlaying(false);
    setCurrentTrack(null);
    setMediaSessionState(false);
    if ("mediaSession" in navigator) navigator.mediaSession.metadata = null;
    console.log("[Player] stopPlaying — audio cleared");
  }, [stopWatchdog]);

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
      playLockRef: { current: opQueueRef.current.isRunning }, // compat shim
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