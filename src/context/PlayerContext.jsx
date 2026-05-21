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
console.log("[Player] cold_launch | isPWA:", isPWA, "| ua:", navigator.userAgent.substring(0, 80));

// ─────────────────────────────────────────────────────────────────────────────
// Global audio instance tracker — detect duplicate audio objects (watchdog)
// ─────────────────────────────────────────────────────────────────────────────
let _globalAudioInstanceCount = 0;

// ─────────────────────────────────────────────────────────────────────────────
// Shared visibility ref — exported so AudioPlayer bar can gate progress updates
// ─────────────────────────────────────────────────────────────────────────────
export const sharedHiddenRef = { current: false };

// ─────────────────────────────────────────────────────────────────────────────
// AudioContext — shared with visualiser, created lazily on first user gesture
// ─────────────────────────────────────────────────────────────────────────────
let _audioCtx   = null;
let _analyser   = null;
let _sourceNode = null;

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
function getOrCreateAudioContext(audioElement) {
  if (!audioElement) return null;
  if (!_audioCtx) {
    _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    window._uvAudioCtx = _audioCtx;
  }
  if (!_sourceNode) {
    try {
      _sourceNode = _audioCtx.createMediaElementSource(audioElement);
      _analyser   = _audioCtx.createAnalyser();
      _analyser.fftSize = 256;
      _analyser.smoothingTimeConstant = 0.82;
      _sourceNode.connect(_analyser);
      _analyser.connect(_audioCtx.destination);
      window._uvAnalyser = _analyser;
    } catch (e) {
      console.warn("[Player] AudioContext setup error:", e.message);
    }
  }
  return _analyser;
}
export function resumeGlobalAudioContext() { resumeAudioContext().catch(() => {}); }
export function getGlobalAnalyser(el) { return getOrCreateAudioContext(el); }

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
// ─────────────────────────────────────────────────────────────────────────────
function createFreshAudio() {
  _globalAudioInstanceCount++;
  if (_globalAudioInstanceCount > 1) {
    console.error("[WD:dup] duplicate audio instance created! count:", _globalAudioInstanceCount);
  }
  const a = new Audio();
  a.crossOrigin = "anonymous";
  a.preload     = "auto";
  enforceRate(a);
  a.setAttribute("x-webkit-airplay", "allow");
  a.setAttribute("playsinline", "");
  console.log("[Player] audio_created | instance #", _globalAudioInstanceCount);
  return a;
}

function destroyAudio(audio) {
  if (!audio) return;
  _globalAudioInstanceCount = Math.max(0, _globalAudioInstanceCount - 1);
  audio.pause();
  audio.src = "";
  try { audio.load(); } catch {}
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
    getOrCreateAudioContext(audio);

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

  // ── Load & play new track ─────────────────────────────────────────────────
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack?.audio_url) return;

    const url = currentTrack.audio_url;

    // Same src — just resume if paused
    if (loadedSrcRef.current === url && audio.src) {
      if (audio.paused) safePlay(audio, "same-track-resume");
      return;
    }

    // New track — enqueue full load
    opQueueRef.current.push(async () => {
      const thisUrl = currentTrack?.audio_url;
      if (!thisUrl) return;

      console.log("[Player] loading new track:", currentTrack.title, "| url:", thisUrl.substring(0, 60));

      // Snapshot the url we're loading
      loadedSrcRef.current   = thisUrl;
      playingUrlRef.current  = thisUrl;
      savedTimeRef.current   = 0;
      lastTimeRef.current    = 0;

      stopWatchdog();

      // Fully clear old audio state
      enforceRate(audio);
      audio.src = "";
      await new Promise(r => setTimeout(r, 30)); // Safari yield

      // Guard: if another track was queued during yield, abort
      if (playingUrlRef.current !== thisUrl) {
        console.log("[Player] track changed during yield, aborting load");
        return;
      }

      audio.src = thisUrl;
      enforceRate(audio);
      audio.load();

      await new Promise((resolve) => {
        let done = false;
        const finish = () => {
          if (done) return;
          done = true;
          audio.removeEventListener("canplay", finish);
          audio.removeEventListener("error",   onErr);
          resolve();
        };
        const onErr = () => {
          console.warn("[Player] track load error");
          finish();
        };
        audio.addEventListener("canplay", finish);
        audio.addEventListener("error",   onErr);
        setTimeout(finish, 8000);
      });

      // Guard again after async
      if (playingUrlRef.current !== thisUrl) {
        console.log("[Player] track changed after load, aborting play");
        return;
      }

      enforceRate(audio);
      await resumeAudioContext();

      console.log("[Player] playing track | rate:", audio.playbackRate, "| ct:", audio.currentTime.toFixed(2));
      const p = audio.play();
      if (p && typeof p.then === "function") {
        await p.catch((e) => {
          if (e.name !== "AbortError") console.warn("[Player] new track play error:", e.name, e.message);
        });
      }
      enforceRate(audio);
      console.log("[Player] new track started | rate:", audio.playbackRate);
      startWatchdog(audio);
    });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack]);

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

    const onTimeUpdate = () => {
      lastTimeRef.current = audio.currentTime;
      // Update lock screen progress (only from real currentTime)
      if (!audio.paused && "mediaSession" in navigator && "setPositionState" in navigator.mediaSession) {
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
        "| ct:", audio.currentTime.toFixed(2), "| paused:", audio.paused);

      if (isPWA) {
        // PWA: iOS continues audio in background — just stop watchdog
        stopWatchdog();
      } else {
        // Safari tab: pause and save position
        stopWatchdog();
        if (!audio.paused) {
          suspendAudioContext();
          audio.pause();
          setMediaSessionState(false);
          console.log("[Player] Safari hide — paused at:", savedTimeRef.current.toFixed(2));
        }
      }
    };

    const doShow = (persisted, event) => {
      clearTimeout(showTimer);
      sharedHiddenRef.current = false;

      const wasPlaying = !audio.paused;
      enforceRate(audio); // ALWAYS enforce on show

      console.log("[Player] PAGE SHOW | event:", event, "| persisted:", persisted,
        "| isPWA:", isPWA, "| ct:", audio.currentTime.toFixed(2),
        "| rate:", audio.playbackRate, "| paused:", audio.paused, "| rs:", audio.readyState);

      if (!audio.src && !loadedSrcRef.current) {
        setIsPlaying(false);
        return;
      }

      // Sync React state from actual audio state
      setIsPlaying(!audio.paused);
      setMediaSessionState(!audio.paused);

      if (isPWA) {
        // PWA: resume watchdog if audio is playing
        if (!audio.paused) startWatchdog(audio);
      } else {
        // Safari: audio was paused on hide — UI shows paused, user must tap play
        // (This is correct — never auto-resume in Safari tab)
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
    if (!audio || !audio.src) return;
    if (audio.paused || audio.ended) {
      enforceRate(audio);
      safePlay(audio, "toggle-play");
    } else {
      safePause(audio, "toggle-pause");
    }
  }, [safePlay, safePause]);

  // ── playTrack (public API) ────────────────────────────────────────────────
  const playTrack = useCallback((track, source = "song") => {
    if (!audioRef.current) return;
    getOrCreateAudioContext(audioRef.current);
    setSourceType(source);
    setCurrentTrack(track);
  }, []);

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