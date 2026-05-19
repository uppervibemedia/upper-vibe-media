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

// Public exports for visualizer components
export function resumeGlobalAudioContext() { _resumeCtx(); }
export function getGlobalAnalyser(audioEl) { return _wireAudio(audioEl); }

// ──────────────────────────────────────────────────────────────────────────
export function PlayerProvider({ children }) {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying,    setIsPlaying]    = useState(false);
  const [queue,        setQueue]        = useState([]);
  const [sourceType,   setSourceType]   = useState("song");

  // Stable ref to the one audio element — never recreated
  const audioRef     = useRef(persistentAudio);
  // Refs for next/prev handlers (Radio registers these)
  const onNextRef    = useRef(null);
  const onPrevRef    = useRef(null);
  // Tracks the last URL we loaded so we don't reload the same src
  const loadedSrcRef = useRef("");
  // TRUE during the brief window between audio.load() and canplay —
  // suppresses the spurious "pause" event the browser fires on src change
  const loadingRef   = useRef(false);
  // Mirror of isPlaying for callbacks that were registered with [] deps
  const playingRef   = useRef(false);

  // Keep playingRef in sync
  useEffect(() => { playingRef.current = isPlaying; }, [isPlaying]);

  // ── 1. Register all audio-element event listeners ONCE ─────────────────
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onPlay = () => {
      _resumeCtx();
      setIsPlaying(true);
      playingRef.current = true;
    };
    const onPause = () => {
      // Ignore the browser's own "pause" that fires when we change audio.src
      if (loadingRef.current) return;
      setIsPlaying(false);
      playingRef.current = false;
    };
    const onEnded = () => {
      // If Radio (or anything else) registered a next handler, let it advance.
      // Do NOT set isPlaying=false here — the next handler will call playTrack()
      // which keeps playback alive. Setting false would trigger pause() first.
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
  }, []); // ← exactly once, forever

  // ── 2. Register Media Session handlers ONCE ────────────────────────────
  // Handlers always read current state through refs — no re-registration needed.
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;

    navigator.mediaSession.setActionHandler("play", () => {
      const audio = audioRef.current;
      // Must call resume() synchronously inside the user-gesture callback (iOS rule)
      _resumeCtx();
      if (audio.src && audio.paused) {
        audio.play().catch(() => {});
      }
      // setIsPlaying(true) fires via the "play" event above — no duplicate needed
    });

    navigator.mediaSession.setActionHandler("pause", () => {
      const audio = audioRef.current;
      audio.pause();
      // setIsPlaying(false) fires via the "pause" event above
    });

    navigator.mediaSession.setActionHandler("nexttrack", () => {
      onNextRef.current?.();
    });

    navigator.mediaSession.setActionHandler("previoustrack", () => {
      onPrevRef.current?.();
    });

    // No cleanup — keep handlers active for the app lifetime
  }, []); // ← exactly once, forever

  // ── 3. Update Media Session metadata when track changes ────────────────
  useEffect(() => {
    if (!("mediaSession" in navigator) || !currentTrack) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title:   currentTrack.title            || "Unknown",
      artist:  currentTrack.artist_display   || currentTrack.artist || "Upper Vibe Media",
      album:   "Upper Vibe Media",
      artwork: currentTrack.cover_url
        ? [{ src: currentTrack.cover_url, sizes: "512x512", type: "image/jpeg" }]
        : [],
    });
  }, [currentTrack]);

  // ── 4. Sync Media Session playback state ───────────────────────────────
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
  }, [isPlaying]);

  // ── 5. Load + play when currentTrack changes ───────────────────────────
  useEffect(() => {
    if (!currentTrack?.audio_url) return;
    const audio = audioRef.current;
    if (!audio) return;

    if (loadedSrcRef.current === currentTrack.audio_url) {
      // Same URL already loaded — just resume
      _resumeCtx();
      if (audio.paused) audio.play().catch(() => {});
      // isPlaying updated by "play" event
      return;
    }

    // New URL — change source and play
    loadingRef.current   = true;
    loadedSrcRef.current = currentTrack.audio_url;
    audio.src            = currentTrack.audio_url;
    audio.load();
    // Clear loading flag after the spurious "pause" event has fired.
    // 300 ms is generous — the event fires synchronously or within a few ms.
    const t = setTimeout(() => { loadingRef.current = false; }, 300);

    _wireAudio(audio); // ensure AudioContext is wired before play()
    _resumeCtx();
    audio.play().catch(() => {});
    // isPlaying(true) set by the "play" event fired by audio.play()

    return () => clearTimeout(t);
  }, [currentTrack]);

  // ── 6. Visibility change — recover from iOS lock screen ────────────────
  // Single listener, reads state via refs only (no stale closures).
  useEffect(() => {
    const handle = () => {
      if (document.visibilityState !== "visible") return;
      const audio = audioRef.current;
      _resumeCtx();
      // If we should be playing but audio was killed by the OS, restart it.
      // Guard: skip if we're mid-load (audio.play() already pending).
      if (playingRef.current && audio?.src && audio.paused && !loadingRef.current) {
        _resumeCtx();
        audio.play().catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", handle);
    return () => document.removeEventListener("visibilitychange", handle);
  }, []); // ← exactly once

  // ── Public API ─────────────────────────────────────────────────────────

  /**
   * Start playing a track. source = "song" | "radio"
   * Calling this is the ONLY way to change what's playing.
   */
  const playTrack = useCallback((track, source = "song") => {
    _wireAudio(audioRef.current); // must happen in a user-gesture context when possible
    setSourceType(source);
    setCurrentTrack(track);
  }, []);

  /**
   * Toggle play/pause on the current track.
   * Drives the audio element directly — state updates come back via events.
   */
  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio?.src) return;
    if (audio.paused) {
      _wireAudio(audio);
      _resumeCtx();
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, []);

  const stopPlaying = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.src        = "";
    loadedSrcRef.current = "";
    setIsPlaying(false);
    playingRef.current = false;
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