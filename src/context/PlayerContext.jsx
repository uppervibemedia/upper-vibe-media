import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from "react";

const PlayerContext = createContext(null);

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
      // already wired — safe to ignore
    }
  }
  return _analyser;
}

export function resumeGlobalAudioContext() { _resumeCtx(); }
export function getGlobalAnalyser(audioEl) { return _wireAudio(audioEl); }

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
  const loadingRef   = useRef(false);

  // ── Key fix for Bug 1 ──────────────────────────────────────────────────
  // TRUE only when the USER explicitly pressed pause (not an OS/lock-screen pause).
  // When the phone locks, iOS fires "pause" on the element — we must NOT treat
  // that as a user action, otherwise playingRef becomes false and we never restart.
  const userPausedRef = useRef(false);

  // Mirror of isPlaying for [] callbacks — updated immediately alongside setState
  const playingRef   = useRef(false);

  // ── Key fix for Bug 2 ──────────────────────────────────────────────────
  // Tracks the in-flight play() promise so we can wait for it before pausing,
  // avoiding the "play() interrupted by pause()" DOMException glitch.
  const playPromiseRef  = useRef(null);
  // Debounce guard — prevents double-tap from firing two play/pause calls
  const toggleBusyRef   = useRef(false);

  useEffect(() => { playingRef.current = isPlaying; }, [isPlaying]);

  // ── Safe play helper ────────────────────────────────────────────────────
  // Always awaits any pending play promise before doing anything.
  // Returns the new play promise (or null).
  const _safePlay = useCallback((audio) => {
    _resumeCtx();
    userPausedRef.current = false;
    const p = audio.play().catch(() => {});
    playPromiseRef.current = p;
    p.then(() => { if (playPromiseRef.current === p) playPromiseRef.current = null; });
    return p;
  }, []);

  // ── Safe pause helper ───────────────────────────────────────────────────
  // Waits for any in-flight play() to settle first, then pauses.
  const _safePause = useCallback(async (audio) => {
    userPausedRef.current = true;
    if (playPromiseRef.current) {
      await playPromiseRef.current;
    }
    if (!audio.paused) audio.pause();
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
      // Ignore pause fired during audio.load() src change
      if (loadingRef.current) return;
      setIsPlaying(false);
      playingRef.current = false;
      // NOTE: we do NOT set userPausedRef here.
      // userPausedRef is only set by _safePause (explicit user action).
      // This means an OS/lock-screen pause will set isPlaying=false in React
      // state but userPausedRef stays false → visibility handler can restart it.
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
      userPausedRef.current = false;
      _resumeCtx(); // must be synchronous — iOS user-gesture requirement
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
  }, []); // exactly once — handlers read state via refs, always current

  // ── 3. Media Session metadata ───────────────────────────────────────────
  useEffect(() => {
    if (!("mediaSession" in navigator) || !currentTrack) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title:   currentTrack.title          || "Unknown",
      artist:  currentTrack.artist_display || currentTrack.artist || "Upper Vibe Media",
      album:   "Upper Vibe Media",
      artwork: currentTrack.cover_url
        ? [{ src: currentTrack.cover_url, sizes: "512x512", type: "image/jpeg" }]
        : [],
    });
  }, [currentTrack]);

  // ── 4. Media Session playback state ────────────────────────────────────
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
      // Same track already loaded — just resume if needed
      _resumeCtx();
      if (audio.paused) _safePlay(audio);
      return;
    }

    // New track — load and play
    loadingRef.current   = true;
    loadedSrcRef.current = currentTrack.audio_url;
    userPausedRef.current = false;
    audio.src             = currentTrack.audio_url;
    audio.load();
    const t = setTimeout(() => { loadingRef.current = false; }, 300);

    _wireAudio(audio);
    _safePlay(audio);

    return () => clearTimeout(t);
  }, [currentTrack, _safePlay]);

  // ── 6. Visibility change — auto-restart after lock screen ───────────────
  // Bug 1 fix: only restart if the user did NOT explicitly press pause.
  // The OS fires "pause" when locking but userPausedRef stays false,
  // so we know we should restart when the page becomes visible again.
  useEffect(() => {
    const handle = () => {
      if (document.visibilityState !== "visible") return;
      const audio = audioRef.current;
      // Always resume AudioContext (iOS suspends it on lock)
      _resumeCtx();
      // Restart only if:
      //   - user did not explicitly pause
      //   - a track is loaded
      //   - audio is currently paused (OS killed it)
      //   - not mid-load (play() already on the way)
      if (!userPausedRef.current && audio?.src && audio.paused && !loadingRef.current) {
        _safePlay(audio);
      }
    };
    document.addEventListener("visibilitychange", handle);
    return () => document.removeEventListener("visibilitychange", handle);
  }, [_safePlay]); // _safePlay is stable (useCallback with no deps)

  // ── Public API ──────────────────────────────────────────────────────────

  const playTrack = useCallback((track, source = "song") => {
    _wireAudio(audioRef.current);
    setSourceType(source);
    setCurrentTrack(track);
  }, []);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio?.src) return;

    // Debounce: ignore rapid double-taps
    if (toggleBusyRef.current) return;
    toggleBusyRef.current = true;
    setTimeout(() => { toggleBusyRef.current = false; }, 300);

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
    audio.pause();
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