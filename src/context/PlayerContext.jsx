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
  // Prevents stacked duplicate play() / pause() calls from firing simultaneously.
  // NOTE: Media Session "play" (lock screen) always bypasses this lock because
  // it is a trusted user gesture and must never be dropped.
  const opLockRef      = useRef(false);
  const opLockTimeout  = useRef(null);

  const acquireLock = useCallback(() => {
    if (opLockRef.current) return false;
    opLockRef.current = true;
    clearTimeout(opLockTimeout.current);
    opLockTimeout.current = setTimeout(() => { opLockRef.current = false; }, 500);
    return true;
  }, []);

  const releaseLock = useCallback(() => {
    opLockRef.current = false;
    clearTimeout(opLockTimeout.current);
  }, []);

  // Force-release the lock — used before any trusted-gesture play call
  // so that a previous onHide pause lock never blocks resumption.
  const forceReleaseLock = useCallback(() => {
    opLockRef.current = false;
    clearTimeout(opLockTimeout.current);
  }, []);

  // ── Save / clear position helpers ────────────────────────────────────────
  const savePosition = useCallback((time) => {
    savedTimeRef.current = time;
    setSavedTime(time);
  }, []); // used only by safePause and togglePlay

  const clearPosition = useCallback(() => {
    savedTimeRef.current = 0;
    setSavedTime(0);
  }, []);

  // ── safePlay ─────────────────────────────────────────────────────────────
  // Single entry point for ALL play() calls.
  // Pass force=true for trusted user gestures (lock screen, Media Session)
  // so a stale lock from a previous pause never silently drops the call.
  const safePlay = useCallback(async (audio, force = false) => {
    if (force) {
      // Trusted gesture (lock screen / Media Session "play") — always clear
      // any existing lock before proceeding so it is never silently dropped.
      forceReleaseLock();
    }
    if (!acquireLock()) {
      console.log("[Player] safePlay skipped — lock active");
      return;
    }
    try {
      // Await AudioContext resume — prevents buffered-audio burst on iOS.
      // On PWA after lock screen, the lock-screen tap IS a user gesture so
      // AudioContext.resume() will succeed here.
      await resumeAudioContext();
      // Force rate to 1 — iOS sometimes adjusts this after backgrounding
      audio.playbackRate = 1;
      audio.defaultPlaybackRate = 1;
      console.log("[Player] safePlay →", {
        currentTime: audio.currentTime,
        readyState: audio.readyState,
        paused: audio.paused,
        audioCtxState: _audioCtx?.state,
        force,
      });
      await audio.play();
    } catch (err) {
      if (err.name !== "AbortError") console.warn("[Player] safePlay error:", err);
    } finally {
      releaseLock();
    }
  }, [acquireLock, releaseLock, forceReleaseLock]); // safePlay

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

  // ── Visibility / background handler ──────────────────────────────────────
  //
  // iOS REALITY: When the screen locks, iOS does NOT fire visibilitychange.
  // Audio keeps playing natively through the lock screen. The Media Session
  // "pause" action fires if the user taps pause on the lock screen.
  //
  // We only use visibilitychange to:
  //   - ON HIDE: freeze the progress bar (sharedHiddenRef) — do NOT pause audio
  //   - ON SHOW: unfreeze the progress bar, sync UI state from real audio state
  //
  useEffect(() => {
    const audio = audioRef.current;

    const onHide = () => {
      // Freeze the progress bar so it doesn't tick while page is hidden
      sharedHiddenRef.current = true;
      console.log("[Player] onHide — page hidden, audio.paused:", audio.paused);
    };

    const onShow = () => {
      sharedHiddenRef.current = false;
      // Sync UI to real audio state — covers both "still playing" and "user paused from lock screen"
      const actuallyPlaying = !audio.paused && !audio.ended && audio.readyState >= 2;
      setIsPlaying(actuallyPlaying);
      forceReleaseLock();
      console.log("[Player] onShow — audio.paused:", audio.paused, "→ isPlaying:", actuallyPlaying);
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
  }, [forceReleaseLock]);

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
  // IMPORTANT: These handlers are called by iOS with a real user gesture
  // context. We call audio.play() / audio.pause() directly here — no lock
  // guards — because the OS serialises these calls itself and any lock we hold
  // from a previous in-app action would silently block resumption.
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;

    navigator.mediaSession.setActionHandler("play", async () => {
      const audio = audioRef.current;
      if (!audio.src) return;
      forceReleaseLock(); // clear any stale lock
      try {
        await resumeAudioContext();
        audio.playbackRate = 1;
        audio.defaultPlaybackRate = 1;
        await audio.play();
        console.log("[MediaSession] play → resumed at", audio.currentTime);
      } catch (err) {
        if (err.name !== "AbortError") console.warn("[MediaSession] play error:", err);
      }
    });

    navigator.mediaSession.setActionHandler("pause", () => {
      const audio = audioRef.current;
      if (!audio.paused) {
        audio.pause();
        console.log("[MediaSession] pause → paused at", audio.currentTime);
      }
    });

    navigator.mediaSession.setActionHandler("nexttrack",     () => onNextRef.current?.());
    navigator.mediaSession.setActionHandler("previoustrack", () => onPrevRef.current?.());

    return () => {
      ["play", "pause", "nexttrack", "previoustrack"].forEach((a) => {
        try { navigator.mediaSession.setActionHandler(a, null); } catch {}
      });
    };
  }, [forceReleaseLock]);

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