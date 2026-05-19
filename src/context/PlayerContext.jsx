/**
 * PlayerContext — Single Global Audio Controller
 *
 * ONE HTMLAudioElement, ONE AudioContext, ONE MediaSession, ONE state machine.
 * Radio and Streaming both go through this. Nothing else touches audio.
 *
 * State machine:
 *   idle → loading → playing ↔ paused
 *                  → stalled
 *                  → error
 *   playing → ended → (onNext fires, or back to idle)
 */
import React, {
  createContext, useContext,
  useState, useRef, useEffect, useCallback,
} from "react";

// ─── ONE persistent <audio> element ───────────────────────────────────────
// IMPORTANT: Created at module scope so it survives React re-renders.
// iOS will grant background-playback permission to this element once the
// first audio.play() is called inside a user-gesture event handler.
// We must NEVER replace this element — doing so loses the permission.
const _audio = typeof window !== "undefined" ? (() => {
  const a = document.createElement("audio");
  a.crossOrigin = "anonymous";
  a.preload     = "metadata";   // "auto" can cause duplicate loads on iOS
  a.setAttribute("playsinline", "");   // required for iOS inline playback
  a.setAttribute("webkit-playsinline", "");
  return a;
})() : null;

// ─── ONE AudioContext for the visualiser ──────────────────────────────────
// Deliberately NOT created at module scope — iOS requires AudioContext to be
// created inside a user gesture. We wire it lazily on first play().
let _actx       = null;
let _analyser   = null;
let _srcNode    = null;
let _ctxWired   = false;

function _resumeCtx() {
  if (_actx && _actx.state !== "running") _actx.resume().catch(() => {});
}

// Wire audio → analyser → destination. Safe to call multiple times.
function _wireCtx() {
  if (_ctxWired || !_audio) return;
  try {
    _actx     = new (window.AudioContext || window.webkitAudioContext)();
    _analyser = _actx.createAnalyser();
    _analyser.fftSize = 256;
    _analyser.smoothingTimeConstant = 0.82;
    _srcNode  = _actx.createMediaElementSource(_audio);
    _srcNode.connect(_analyser);
    _analyser.connect(_actx.destination);
    _ctxWired = true;
    window._uvAudioCtx  = _actx;
    window._uvAnalyser  = _analyser;
    _log("AudioContext wired");
  } catch (e) {
    _log("AudioContext wire failed:", e.message);
  }
}

// ─── Exports for visualiser components ────────────────────────────────────
export function resumeGlobalAudioContext() { _resumeCtx(); }
export function getGlobalAnalyser() {
  if (!_ctxWired) _wireCtx();
  return _analyser;
}

// ─── Fallback artwork ─────────────────────────────────────────────────────
// Must be HTTPS and publicly accessible. Replace with actual hosted logo.
const FALLBACK_ART = "https://uppervibemedia.com/logo512.png";

function _buildArtwork(url) {
  const src = url && url.startsWith("https://") ? url : FALLBACK_ART;
  return [
    { src, sizes: "512x512",   type: "image/jpeg" },
    { src, sizes: "1024x1024", type: "image/jpeg" },
  ];
}

// ─── Debug logger ─────────────────────────────────────────────────────────
function _log(...args) {
  console.log("[🎵 Player]", ...args);
}

function _audioSnapshot() {
  if (!_audio) return "no audio element";
  return {
    src:          _audio.src ? _audio.src.slice(-40) : "—",
    paused:       _audio.paused,
    currentTime:  _audio.currentTime.toFixed(2),
    readyState:   _audio.readyState,
    networkState: _audio.networkState,
    error:        _audio.error?.message || null,
  };
}

// ─── State machine states ──────────────────────────────────────────────────
const S = { IDLE: "idle", LOADING: "loading", PLAYING: "playing", PAUSED: "paused", STALLED: "stalled", ERROR: "error" };

// ──────────────────────────────────────────────────────────────────────────
const PlayerContext = createContext(null);

export function PlayerProvider({ children }) {
  const [playerState, setPlayerState] = useState(S.IDLE);  // state machine
  const [currentTrack, setCurrentTrack] = useState(null);
  const [sourceType,   setSourceType]   = useState("song");
  const [queue,        setQueue]        = useState([]);

  // Convenience bool for consumers
  const isPlaying = playerState === S.PLAYING;

  // ── Refs (never cause re-renders) ─────────────────────────────────────
  const audioRef        = useRef(_audio);          // the ONE audio element
  const onNextRef       = useRef(null);            // Radio next handler
  const onPrevRef       = useRef(null);            // Radio prev handler
  const loadedSrcRef    = useRef("");              // last successfully loaded URL
  const loadingRef      = useRef(false);           // true while src is being loaded
  const userPausedRef   = useRef(false);           // true = user explicitly paused
  const playPromiseRef  = useRef(null);            // in-flight play() promise
  const lastToggleMs    = useRef(0);               // debounce timestamp
  const stateRef        = useRef(S.IDLE);          // mirror of playerState for callbacks

  // Keep stateRef in sync
  const _setState = useCallback((s) => {
    stateRef.current = s;
    setPlayerState(s);
  }, []);

  // ── Core play/pause helpers ───────────────────────────────────────────

  // Call audio.play(). Does NOT debounce — callers do that.
  // Returns immediately; promise tracked in playPromiseRef.
  const _doPlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio?.src) return;
    // If a play promise is already pending, don't stack another one.
    if (playPromiseRef.current) {
      _log("play() skipped — promise already pending");
      return;
    }
    userPausedRef.current = false;
    _resumeCtx();
    _setState(S.LOADING);
    _log("play() called →", _audioSnapshot());
    const p = audio.play();
    if (p && typeof p.then === "function") {
      playPromiseRef.current = p;
      p.then(() => {
        if (playPromiseRef.current === p) playPromiseRef.current = null;
        _log("play() resolved");
      }).catch((err) => {
        if (playPromiseRef.current === p) playPromiseRef.current = null;
        if (err?.name === "AbortError") {
          // Interrupted by a subsequent load — normal during track change
          _log("play() aborted (new load started)");
        } else if (err?.name === "NotAllowedError") {
          _log("play() blocked — no user gesture");
          _setState(S.PAUSED);
        } else {
          _log("play() error:", err?.name, err?.message);
          _setState(S.ERROR);
        }
      });
    }
  }, [_setState]);

  // Call audio.pause(). Waits for any pending play() first.
  const _doPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    userPausedRef.current = true;
    const exec = () => {
      if (!audio.paused) {
        audio.pause();
        _log("pause() called →", _audioSnapshot());
      }
    };
    if (playPromiseRef.current) {
      _log("pause() waiting for pending play() promise...");
      playPromiseRef.current.then(exec).catch(exec);
    } else {
      exec();
    }
  }, []);

  // ── 1. Audio element events — registered ONCE, forever ────────────────
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onPlay = () => {
      _resumeCtx();
      _setState(S.PLAYING);
      _log("event:play →", _audioSnapshot());
      if ("mediaSession" in navigator) {
        navigator.mediaSession.playbackState = "playing";
      }
    };

    const onPause = () => {
      // Suppress the spurious pause that fires when audio.src changes
      if (loadingRef.current) return;
      // Determine if this was user-initiated or OS-forced
      const wasUser = userPausedRef.current;
      _setState(wasUser ? S.PAUSED : S.PAUSED);
      _log(`event:pause (userInitiated=${wasUser}) →`, _audioSnapshot());
      if ("mediaSession" in navigator) {
        navigator.mediaSession.playbackState = "paused";
      }
    };

    const onEnded = () => {
      _log("event:ended");
      if (onNextRef.current) {
        onNextRef.current();
      } else {
        _setState(S.IDLE);
      }
    };

    const onWaiting = () => {
      if (stateRef.current === S.PLAYING) _setState(S.STALLED);
      _log("event:waiting (stalled)");
    };

    const onPlaying = () => {
      // Fires when playback actually starts after buffering
      _setState(S.PLAYING);
    };

    const onError = () => {
      _log("event:error →", audio.error?.message);
      _setState(S.ERROR);
    };

    audio.addEventListener("play",    onPlay);
    audio.addEventListener("pause",   onPause);
    audio.addEventListener("ended",   onEnded);
    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("playing", onPlaying);
    audio.addEventListener("error",   onError);

    return () => {
      audio.removeEventListener("play",    onPlay);
      audio.removeEventListener("pause",   onPause);
      audio.removeEventListener("ended",   onEnded);
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("playing", onPlaying);
      audio.removeEventListener("error",   onError);
    };
  }, [_setState]); // _setState is stable

  // ── 2. Media Session handlers — registered ONCE, forever ──────────────
  // Handlers always read state through refs — never stale.
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;

    const setHandler = (action, fn) => {
      try { navigator.mediaSession.setActionHandler(action, fn); } catch (_) {}
    };

    setHandler("play", () => {
      _log("MediaSession: play");
      const audio = audioRef.current;
      if (!audio?.src) return;
      userPausedRef.current = false;
      _resumeCtx(); // sync — iOS user-gesture requirement
      if (audio.paused && !playPromiseRef.current) _doPlay();
    });

    setHandler("pause", () => {
      _log("MediaSession: pause");
      _doPause();
    });

    setHandler("nexttrack", () => {
      _log("MediaSession: next");
      onNextRef.current?.();
    });

    setHandler("previoustrack", () => {
      _log("MediaSession: prev");
      onPrevRef.current?.();
    });

    // Keep handlers alive — no cleanup
  }, [_doPlay, _doPause]); // both are stable useCallbacks

  // ── 3. Media Session metadata ─────────────────────────────────────────
  useEffect(() => {
    if (!("mediaSession" in navigator) || !currentTrack) return;
    const meta = new MediaMetadata({
      title:   currentTrack.title          || "Unknown",
      artist:  currentTrack.artist_display || currentTrack.artist || "Upper Vibe Media",
      album:   "Upper Vibe Media",
      artwork: _buildArtwork(currentTrack.cover_url),
    });
    navigator.mediaSession.metadata = meta;
    _log("MediaSession metadata updated:", meta.title, meta.artist);
  }, [currentTrack]);

  // ── 4. Load + play when currentTrack changes ──────────────────────────
  useEffect(() => {
    if (!currentTrack?.audio_url) return;
    const audio = audioRef.current;
    if (!audio) return;

    if (loadedSrcRef.current === currentTrack.audio_url) {
      // Same URL already loaded — just resume
      _log("Same src — resuming");
      if (audio.paused && !playPromiseRef.current) _doPlay();
      return;
    }

    // New track — change src and play
    _log("Loading new track:", currentTrack.title);
    loadingRef.current    = true;
    loadedSrcRef.current  = currentTrack.audio_url;
    userPausedRef.current = false;
    playPromiseRef.current = null; // cancel any stale promise reference

    audio.src = currentTrack.audio_url;
    // Do NOT call audio.load() explicitly — setting src triggers it.
    // audio.load() would fire a second "emptied" event and confuse the state.

    _setState(S.LOADING);

    // Suppress the spurious pause event that fires when src changes.
    // It always fires synchronously or within one microtask.
    const clearLoading = setTimeout(() => { loadingRef.current = false; }, 500);

    // Wire AudioContext lazily (inside this user-gesture chain)
    if (!_ctxWired) _wireCtx();
    _resumeCtx();

    _doPlay();

    return () => clearTimeout(clearLoading);
  }, [currentTrack, _doPlay, _setState]);

  // ── 5. Visibility change — recover from lock screen ───────────────────
  // iOS fires "pause" when screen locks. We restart ONLY if:
  //   • page is visible again
  //   • user did NOT explicitly pause (userPausedRef = false)
  //   • audio is still paused
  //   • no play() promise is already in flight
  //   • not mid-load
  // A 300 ms guard prevents false restarts on notification-shade flickers.
  useEffect(() => {
    let timer = null;
    const handle = () => {
      clearTimeout(timer);
      if (document.visibilityState !== "visible") return;
      _resumeCtx();
      const audio = audioRef.current;
      if (userPausedRef.current) return;           // user pressed pause
      if (!audio?.src)           return;           // nothing loaded
      if (!audio.paused)         return;           // already playing
      if (loadingRef.current)    return;           // mid-load
      if (playPromiseRef.current) return;          // play already pending
      _log("visibilitychange → visible, scheduling restart");
      timer = setTimeout(() => {
        const a = audioRef.current;
        if (!userPausedRef.current && a?.src && a.paused && !loadingRef.current && !playPromiseRef.current) {
          _log("Restarting after lock screen");
          _doPlay();
        }
      }, 300);
    };
    document.addEventListener("visibilitychange", handle);
    return () => {
      document.removeEventListener("visibilitychange", handle);
      clearTimeout(timer);
    };
  }, [_doPlay]);

  // ── Public API ────────────────────────────────────────────────────────

  /**
   * Start playing a new track. source = "song" | "radio"
   * This is the ONLY entry point for changing what's playing.
   */
  const playTrack = useCallback((track, source = "song") => {
    if (!track) return;
    _log("playTrack:", track.title, `[${source}]`);
    setSourceType(source);
    setCurrentTrack(track);
    // Actual load+play happens in effect #4 above
  }, []);

  /**
   * Toggle play ↔ pause.
   * Hard-debounced: ignores calls within 500 ms of the last one.
   */
  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio?.src) return;

    const now = Date.now();
    if (now - lastToggleMs.current < 500) {
      _log("togglePlay debounced");
      return;
    }
    lastToggleMs.current = now;

    if (audio.paused) {
      if (!playPromiseRef.current) {
        _log("togglePlay → play");
        _doPlay();
      }
    } else {
      _log("togglePlay → pause");
      _doPause();
    }
  }, [_doPlay, _doPause]);

  /**
   * Stop playback and clear the player.
   */
  const stopPlaying = useCallback(() => {
    _log("stopPlaying");
    const audio = audioRef.current;
    if (!audio) return;
    userPausedRef.current  = true;
    playPromiseRef.current = null;
    if (!audio.paused) audio.pause();
    audio.src            = "";
    loadedSrcRef.current = "";
    _setState(S.IDLE);
    setCurrentTrack(null);
  }, [_setState]);

  const registerNextHandler = useCallback((fn) => {
    _log("registerNextHandler");
    onNextRef.current = fn;
  }, []);

  const registerPrevHandler = useCallback((fn) => {
    _log("registerPrevHandler");
    onPrevRef.current = fn;
  }, []);

  const handleNext = useCallback(() => { onNextRef.current?.(); }, []);
  const handlePrev = useCallback(() => { onPrevRef.current?.(); }, []);

  // Debug snapshot — callable from console as window._uvDebug()
  useEffect(() => {
    window._uvDebug = () => ({
      playerState:       stateRef.current,
      audioSnapshot:     _audioSnapshot(),
      userPaused:        userPausedRef.current,
      loading:           loadingRef.current,
      playPromisePending: !!playPromiseRef.current,
      ctxWired:          _ctxWired,
      ctxState:          _actx?.state,
      currentTrack:      currentTrack?.title,
      sourceType,
    });
  }, [currentTrack, sourceType]);

  return (
    <PlayerContext.Provider value={{
      // State
      currentTrack,
      isPlaying,
      playerState,
      queue,
      sourceType,
      // Actions
      playTrack,
      togglePlay,
      stopPlaying,
      setQueue,
      // Audio ref (for AudioPlayer progress bar, visualiser)
      audioRef,
      // Radio handler registration
      registerNextHandler,
      registerPrevHandler,
      handleNext,
      handlePrev,
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