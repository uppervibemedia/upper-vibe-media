import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from "react";

const PlayerContext = createContext(null);

// ONE global audio element — never recreated
const persistentAudio = (() => {
  if (typeof window === "undefined") return null;
  const a = new Audio();
  a.crossOrigin = "anonymous";
  a.preload = "auto";
  a.setAttribute("x-webkit-airplay", "allow");
  a.setAttribute("playsinline", "");
  return a;
})();

// Shared hidden ref — AudioPlayer reads this to freeze progress bar
// without needing its own visibilitychange listener
export const sharedHiddenRef = { current: false };

// ONE global AudioContext — shared with visualizer
let _audioCtx   = null;
let _analyser   = null;
let _sourceNode = null;

async function resumeAudioContext() {
  if (!_audioCtx) return;
  if (_audioCtx.state !== "running") {
    try { await _audioCtx.resume(); } catch {}
  }
}

function getOrCreateAudioContext(audioElement) {
  if (!audioElement) return null;
  if (!_audioCtx) {
    _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    window._uvAudioCtx = _audioCtx;
  }
  resumeAudioContext();
  if (!_sourceNode) {
    try {
      _sourceNode = _audioCtx.createMediaElementSource(audioElement);
      _analyser   = _audioCtx.createAnalyser();
      _analyser.fftSize = 256;
      _analyser.smoothingTimeConstant = 0.82;
      _sourceNode.connect(_analyser);
      _analyser.connect(_audioCtx.destination);
      window._uvAnalyser = _analyser;
    } catch (e) {}
  }
  return _analyser;
}

export function resumeGlobalAudioContext() { resumeAudioContext().catch(() => {}); }
export function getGlobalAnalyser(audioElement) { return getOrCreateAudioContext(audioElement); }

export function PlayerProvider({ children }) {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying,    setIsPlaying]    = useState(false);
  const [queue,        setQueue]        = useState([]);
  const [sourceType,   setSourceType]   = useState("song");
  // savedTime > 0 means we paused mid-song on hide — UI shows Resume at that position
  const [savedTime,    setSavedTime]    = useState(0);

  const audioRef        = useRef(persistentAudio);
  const onNextRef       = useRef(null);
  const onPrevRef       = useRef(null);
  const loadedSrcRef    = useRef("");
  const savedTimeRef    = useRef(0); // synchronous mirror of savedTime state

  // ── 500ms play/pause lock ─────────────────────────────────────────────────
  // Prevents stacked play() / pause() calls from iOS controls + app controls
  // firing simultaneously (the source of the "sped-up first second" glitch).
  const opLockRef      = useRef(false);
  const opLockTimeout  = useRef(null);

  const acquireLock = useCallback(() => {
    if (opLockRef.current) return false;
    opLockRef.current = true;
    clearTimeout(opLockTimeout.current);
    // Auto-release after 500ms as a safety net
    opLockTimeout.current = setTimeout(() => { opLockRef.current = false; }, 500);
    return true;
  }, []);

  const releaseLock = useCallback(() => {
    opLockRef.current = false;
    clearTimeout(opLockTimeout.current);
  }, []);

  // ── Save / clear position helpers ────────────────────────────────────────
  const savePosition = useCallback((time) => {
    savedTimeRef.current = time;
    setSavedTime(time);
  }, []);

  const clearPosition = useCallback(() => {
    savedTimeRef.current = 0;
    setSavedTime(0);
  }, []);

  // ── safePlay ─────────────────────────────────────────────────────────────
  // Single entry point for ALL play() calls.
  // 1. Acquires 500ms lock (drops duplicate calls)
  // 2. Awaits AudioContext resume (prevents catch-up burst)
  // 3. Forces playbackRate = 1 (guards against OS rate adjustments)
  // 4. Calls audio.play() once
  const safePlay = useCallback(async (audio) => {
    if (!acquireLock()) {
      console.log("[Player] safePlay skipped — lock active");
      return;
    }
    try {
      // Wait for AudioContext to be truly RUNNING before audio starts.
      // Without this, buffered audio plays back in a burst on iOS.
      await resumeAudioContext();
      // Force rate to 1 — iOS sometimes adjusts this after backgrounding
      audio.playbackRate = 1;
      audio.defaultPlaybackRate = 1;
      console.log("[Player] safePlay →", {
        currentTime: audio.currentTime,
        readyState: audio.readyState,
        audioCtxState: _audioCtx?.state,
      });
      await audio.play();
    } catch (err) {
      if (err.name !== "AbortError") console.warn("[Player] safePlay error:", err);
    } finally {
      releaseLock();
    }
  }, [acquireLock, releaseLock]);

  // ── safePause ────────────────────────────────────────────────────────────
  // Single entry point for ALL pause() calls.
  // Saves position and acquires lock to prevent duplicate pause/play races.
  const safePause = useCallback((audio) => {
    if (!acquireLock()) {
      console.log("[Player] safePause skipped — lock active");
      return;
    }
    try {
      if (!audio.paused) {
        savePosition(audio.currentTime);
        audio.pause();
        console.log("[Player] safePause → paused at", audio.currentTime);
      }
    } finally {
      releaseLock();
    }
  }, [acquireLock, releaseLock, savePosition]);

  // ── Load & play a new track ───────────────────────────────────────────────
  // Only sets src + loads + plays when the track URL actually changes.
  // If same track is already loaded but paused, just resumes — no reload.
  useEffect(() => {
    if (!currentTrack?.audio_url) return;
    const audio = audioRef.current;

    const isSameTrack =
      loadedSrcRef.current === currentTrack.audio_url ||
      audio.src === currentTrack.audio_url ||
      (audio.src && audio.src.endsWith(currentTrack.audio_url));

    if (isSameTrack) {
      if (audio.paused) safePlay(audio);
      return;
    }

    // New track — clear any saved position from the previous track
    clearPosition();
    loadedSrcRef.current = currentTrack.audio_url;
    audio.src = currentTrack.audio_url;
    audio.load();
    safePlay(audio);
  }, [currentTrack, clearPosition, safePlay]);

  // ── Sync isPlaying + Media Session metadata from native audio events ─────
  useEffect(() => {
    const audio = audioRef.current;

    const onPlay  = () => {
      setIsPlaying(true);
      // Re-set metadata after play starts — Safari requires this
      if (currentTrack) setMediaSessionMetadata(currentTrack);
    };
    const onPause = () => setIsPlaying(false);
    const onEnded = () => {
      setIsPlaying(false);
      clearPosition();
      onNextRef.current?.();
    };

    audio.addEventListener("play",  onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("play",  onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearPosition, currentTrack]);

  // ── Unified visibility / background / lock-screen handler ────────────────
  //
  // ON HIDE (lock, switch app, browser tab hidden):
  //   • Save currentTime to savedTimeRef
  //   • Call audio.pause() once via safePause (which saves position too)
  //   • Set isPlaying=false to stop UI animations
  //   • Set sharedHiddenRef so AudioPlayer freezes its progress bar
  //   • Do NOT reset src, do NOT reload, do NOT trigger next song
  //
  // ON SHOW (return to app):
  //   • Clear sharedHiddenRef
  //   • Sync isPlaying from real audio.paused — NEVER auto-play
  //   • UI will show Play/Resume button for user to press manually
  //
  useEffect(() => {
    const audio = audioRef.current;

    const onHide = () => {
      // Signal AudioPlayer to freeze its progress bar immediately
      sharedHiddenRef.current = true;
      if (!audio.src || audio.paused) return;
      // Save position BEFORE pausing (safePause also saves, but be explicit)
      const ct = audio.currentTime;
      savePosition(ct);
      // Pause without lock since we're in a visibility handler (may need to fire fast)
      try { audio.pause(); } catch {}
      setIsPlaying(false);
      console.log("[Player] onHide — paused at", ct);
    };

    const onShow = () => {
      sharedHiddenRef.current = false;
      // Read real audio state — NEVER call play() here.
      // User must press Play manually after returning.
      const actuallyPlaying = !audio.paused && !audio.ended && audio.readyState >= 2;
      setIsPlaying(actuallyPlaying);
      console.log("[Player] onShow — audio.paused:", audio.paused, "isPlaying set to:", actuallyPlaying);
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") onHide();
      else onShow();
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onHide);
    window.addEventListener("pageshow", onShow);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onHide);
      window.removeEventListener("pageshow", onShow);
    };
  }, [savePosition]);

  // ── Media Session (lock screen controls) ─────────────────────────────────
  const FALLBACK_ART = "https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?w=512&h=512&fit=crop&q=80";

  function resolveArtworkUrl(url) {
    if (!url) return FALLBACK_ART;
    if (url.startsWith("https://")) return url;
    return FALLBACK_ART;
  }

  function setMediaSessionMetadata(track) {
    if (!("mediaSession" in navigator) || !track) return;
    const artSrc = resolveArtworkUrl(track.cover_url);
    const title  = track.title || "Unknown";
    const artist = track.artist_display || track.artist || "Upper Vibe Media";
    navigator.mediaSession.metadata = new MediaMetadata({
      title,
      artist,
      album: "Upper Vibe Media",
      artwork: [
        { src: artSrc, sizes: "512x512",   type: "image/jpeg" },
        { src: artSrc, sizes: "1024x1024", type: "image/jpeg" },
      ],
    });
  }

  useEffect(() => {
    if (!currentTrack) return;
    setMediaSessionMetadata(currentTrack);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack]);

  // ── Media Session action handlers ─────────────────────────────────────────
  // Route through safePlay / safePause so lock-screen controls
  // and in-app controls share the same 500ms guard.
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;

    navigator.mediaSession.setActionHandler("play", () => {
      const audio = audioRef.current;
      if (!audio.src) return;
      // Restore saved position first — then play exactly from where we paused
      if (savedTimeRef.current > 0 && isFinite(audio.duration) && audio.duration > 0) {
        audio.currentTime = savedTimeRef.current;
        clearPosition();
      }
      safePlay(audio);
    });

    navigator.mediaSession.setActionHandler("pause", () => {
      safePause(audioRef.current);
    });

    navigator.mediaSession.setActionHandler("nexttrack",     () => onNextRef.current?.());
    navigator.mediaSession.setActionHandler("previoustrack", () => onPrevRef.current?.());

    return () => {
      ["play", "pause", "nexttrack", "previoustrack"].forEach((a) => {
        try { navigator.mediaSession.setActionHandler(a, null); } catch {}
      });
    };
  }, [clearPosition, safePlay, safePause]);

  // Keep Media Session badge in sync
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
  }, [isPlaying]);

  // ── Public API ────────────────────────────────────────────────────────────
  // togglePlay: used by in-app buttons — routes through safePlay/safePause
  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio.src) return;
    if (audio.paused) {
      // Restore saved position before resuming
      if (savedTimeRef.current > 0 && isFinite(audio.duration) && audio.duration > 0) {
        audio.currentTime = savedTimeRef.current;
        clearPosition();
      }
      safePlay(audio);
    } else {
      safePause(audio);
    }
  }, [clearPosition, safePlay, safePause]);

  const playTrack = useCallback((track, source = "song") => {
    getOrCreateAudioContext(audioRef.current);
    setSourceType(source);
    setCurrentTrack(track);
  }, []);

  const stopPlaying = useCallback(() => {
    const audio = audioRef.current;
    try { audio.pause(); } catch {}
    audio.src = "";
    loadedSrcRef.current = "";
    clearPosition();
    setIsPlaying(false);
    setCurrentTrack(null);
  }, [clearPosition]);

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
      savedTime,
      isPWA: false,
      pwaPausedAt: savedTime,
      playTrack,
      togglePlay,
      safePlay,
      safePause,
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