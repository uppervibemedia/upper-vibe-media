import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from "react";

const PlayerContext = createContext(null);

// ─── Upper Vibe fallback logo (HTTPS, square) ──────────────────────────────
// Used when a track has no cover art so iOS lock screen always shows something.
const FALLBACK_ART = "https://uppervibemedia.com/logo512.png";

// ─── Exactly ONE global audio element ─────────────────────────────────────
const persistentAudio = (() => {
  if (typeof window === "undefined") return null;
  const a = new Audio();
  a.crossOrigin = "anonymous";
  a.preload     = "auto";
  return a;
})();

// ─── Exactly ONE AudioContext + analyser ──────────────────────────────────
let _audioCtx   = null;
let _analyser   = null;
let _sourceNode = null;

function _resumeCtx() {
  if (_audioCtx && _audioCtx.state !== "running") {
    _audioCtx.resume().catch(() => {});
  }
}

function _wireAudio(audioEl) {
  if (!audioEl) return null;
  if (!_audioCtx) {
    _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    window._uvAudioCtx = _audioCtx;
  }
  _resumeCtx();
  if (!_sourceNode) {
    try {
      _sourceNode = _audioCtx.createMediaElementSource(audioEl);
      _analyser   = _audioCtx.createAnalyser();
      _analyser.fftSize = 256;
      _analyser.smoothingTimeConstant = 0.82;
      _sourceNode.connect(_analyser);
      _analyser.connect(_audioCtx.destination);
      window._uvAnalyser = _analyser;
    } catch (_) {
      // already wired
    }
  }
  return _analyser;
}

export function resumeGlobalAudioContext() { _resumeCtx(); }
export function getGlobalAnalyser(audioEl) { return _wireAudio(audioEl); }

// Build artwork array for MediaSession — always HTTPS, always two sizes
function _buildArtwork(coverUrl) {
  const src = (coverUrl && coverUrl.startsWith("https://")) ? coverUrl : FALLBACK_ART;
  return [
    { src, sizes: "512x512",  type: "image/png" },
    { src, sizes: "1024x1024", type: "image/png" },
  ];
}

// ──────────────────────────────────────────────────────────────────────────
export function PlayerProvider({ children }) {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying,    setIsPlaying]    = useState(false);
  const [queue,        setQueue]        = useState([]);
  const [sourceType,   setSourceType]   = useState("song");

  const audioRef     = useRef(persistentAudio);
  const onNextRef    = useRef(null);
  const onPrevRef    = useRef(null);
  const loadedSrcRef = useRef("");

  // TRUE while audio.load() is in flight — suppresses spurious pause event
  const loadingRef  = useRef(false);

  // TRUE only when the USER deliberately paused (not OS / lock-screen pause).
  // Key: we set this to true BEFORE awaiting any promise, so no async gap.
  const userPausedRef = useRef(false);

  // Mirror of isPlaying for [] callbacks
  const playingRef = useRef(false);

  // In-flight play() promise — held so _safePause can await it
  const playPromiseRef = useRef(null);

  // Hard debounce: ignore any toggle within 500 ms of the last one
  const lastToggleMs = useRef(0);

  useEffect(() => { playingRef.current = isPlaying; }, [isPlaying]);

  // ── _safePlay ──────────────────────────────────────────────────────────
  // Call audio.play() safely. Stores the promise so _safePause can wait for it.
  const _safePlay = useCallback((audio) => {
    if (!audio?.src) return;
    userPausedRef.current = false;
    _resumeCtx();
    const p = audio.play().catch((err) => {
      // NotAllowedError = no user gesture yet; others are real errors
      if (err?.name !== "NotAllowedError") {
        console.warn("[Player] play() failed:", err?.name);
      }
    });
    playPromiseRef.current = p;
    if (p && typeof p.finally === "function") {
      p.finally(() => {
        if (playPromiseRef.current === p) playPromiseRef.current = null;
      });
    }
  }, []);

  // ── _safePause ─────────────────────────────────────────────────────────
  // Mark user intent FIRST (synchronous), THEN wait for any play() promise,
  // THEN call audio.pause() exactly once.
  const _safePause = useCallback((audio) => {
    if (!audio) return;
    // Mark intent synchronously — before any await — so no other code can
    // see a window where userPausedRef is still false.
    userPausedRef.current = true;
    const doPause = () => { if (!audio.paused) audio.pause(); };
    if (playPromiseRef.current) {
      playPromiseRef.current.then(doPause).catch(doPause);
    } else {
      doPause();
    }
  }, []);

  // ── 1. Audio element event listeners — registered ONCE ──────────────────
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onPlay = () => {
      _resumeCtx();
      setIsPlaying(true);
      playingRef.current = true;
    };

    const onPause = () => {
      // Ignore pause fired during src change (audio.load())
      if (loadingRef.current) return;
      setIsPlaying(false);
      playingRef.current = false;
      // Do NOT touch userPausedRef here — only _safePause does that.
      // An OS/lock-screen pause sets isPlaying=false but leaves
      // userPausedRef=false so the visibility handler can restart.
    };

    const onEnded = () => {
      if (onNextRef.current) {
        onNextRef.current();
      } else {
        setIsPlaying(false);
        playingRef.current = false;
      }
    };

    audio.addEventListener("play",  onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("play",  onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
    };
  }, []); // exactly once

  // ── 2. Media Session handlers — registered ONCE ─────────────────────────
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;

    navigator.mediaSession.setActionHandler("play", () => {
      const audio = audioRef.current;
      if (!audio?.src) return;
      // Must call resume() synchronously here — iOS user-gesture requirement
      _resumeCtx();
      userPausedRef.current = false;
      if (audio.paused) _safePlay(audio);
    });

    navigator.mediaSession.setActionHandler("pause", () => {
      const audio = audioRef.current;
      if (!audio) return;
      _safePause(audio);
    });

    navigator.mediaSession.setActionHandler("nexttrack", () => {
      onNextRef.current?.();
    });

    navigator.mediaSession.setActionHandler("previoustrack", () => {
      onPrevRef.current?.();
    });

    // No cleanup — handlers stay active for app lifetime
  }, []); // exactly once

  // ── 3. Media Session metadata — update every time track changes ─────────
  useEffect(() => {
    if (!("mediaSession" in navigator) || !currentTrack) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title:   currentTrack.title          || "Unknown",
      artist:  currentTrack.artist_display || currentTrack.artist || "Upper Vibe Media",
      album:   "Upper Vibe Media",
      artwork: _buildArtwork(currentTrack.cover_url),
    });
  }, [currentTrack]);

  // ── 4. Media Session playback state ─────────────────────────────────────
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
  }, [isPlaying]);

  // ── 5. Load + play when currentTrack changes ────────────────────────────
  useEffect(() => {
    if (!currentTrack?.audio_url) return;
    const audio = audioRef.current;
    if (!audio) return;

    if (loadedSrcRef.current === currentTrack.audio_url) {
      // Same URL — just resume
      _resumeCtx();
      if (audio.paused) _safePlay(audio);
      return;
    }

    // New track
    loadingRef.current    = true;
    loadedSrcRef.current  = currentTrack.audio_url;
    userPausedRef.current = false;
    audio.src             = currentTrack.audio_url;
    audio.load();
    // Clear loading flag after the spurious pause from audio.load() has fired
    const t = setTimeout(() => { loadingRef.current = false; }, 300);

    _wireAudio(audio);
    _safePlay(audio);

    return () => clearTimeout(t);
  }, [currentTrack, _safePlay]);

  // ── 6. Visibility change — resume after lock screen ─────────────────────
  // Only restarts if:
  //   (a) user did NOT explicitly pause, AND
  //   (b) a track src is loaded, AND
  //   (c) audio is paused (OS killed it), AND
  //   (d) not mid-load
  // We also add a short delay to avoid restarting on transient visibility
  // flickers (e.g. notification shade, permission dialog, tab switch).
  useEffect(() => {
    let restoreTimer = null;
    const handle = () => {
      clearTimeout(restoreTimer);
      if (document.visibilityState !== "visible") return;
      const audio = audioRef.current;
      _resumeCtx();
      if (!userPausedRef.current && audio?.src && audio.paused && !loadingRef.current) {
        // Small delay: ensures we're really returning from lock, not a flicker
        restoreTimer = setTimeout(() => {
          const a = audioRef.current;
          if (!userPausedRef.current && a?.src && a.paused && !loadingRef.current) {
            _safePlay(a);
          }
        }, 200);
      }
    };
    document.addEventListener("visibilitychange", handle);
    return () => {
      document.removeEventListener("visibilitychange", handle);
      clearTimeout(restoreTimer);
    };
  }, [_safePlay]);

  // ── Public API ──────────────────────────────────────────────────────────

  const playTrack = useCallback((track, source = "song") => {
    _wireAudio(audioRef.current);
    setSourceType(source);
    setCurrentTrack(track);
  }, []);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio?.src) return;

    // Hard debounce — 500 ms between toggles
    const now = Date.now();
    if (now - lastToggleMs.current < 500) return;
    lastToggleMs.current = now;

    if (audio.paused) {
      _wireAudio(audio);
      _safePlay(audio);
    } else {
      _safePause(audio);
    }
  }, [_safePlay, _safePause]);

  const stopPlaying = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    userPausedRef.current = true;
    if (!audio.paused) audio.pause();
    audio.src            = "";
    loadedSrcRef.current = "";
    setIsPlaying(false);
    playingRef.current   = false;
    setCurrentTrack(null);
  }, []);

  const registerNextHandler = useCallback((fn) => { onNextRef.current = fn; }, []);
  const registerPrevHandler = useCallback((fn) => { onPrevRef.current = fn; }, []);
  const handleNext          = useCallback(() => { onNextRef.current?.(); }, []);
  const handlePrev          = useCallback(() => { onPrevRef.current?.(); }, []);

  return (
    <PlayerContext.Provider value={{
      currentTrack,
      isPlaying,
      queue,
      sourceType,
      playTrack,
      togglePlay,
      stopPlaying,
      setQueue,
      audioRef,
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