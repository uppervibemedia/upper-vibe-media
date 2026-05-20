import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from "react";

const PlayerContext = createContext(null);

// ONE global audio element — never recreated, never reassigned src unless track changes
const persistentAudio = (() => {
  if (typeof window === "undefined") return null;
  const a = new Audio();
  a.crossOrigin = "anonymous";
  a.preload = "auto";
  a.setAttribute("x-webkit-airplay", "allow");
  a.setAttribute("playsinline", "");
  return a;
})();

// Shared hidden ref — AudioPlayer reads this to freeze its progress bar
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
  if (!_sourceNode) {
    try {
      _sourceNode = _audioCtx.createMediaElementSource(audioElement);
      _analyser   = _audioCtx.createAnalyser();
      _analyser.fftSize = 256;
      _analyser.smoothingTimeConstant = 0.82;
      _sourceNode.connect(_analyser);
      _analyser.connect(_audioCtx.destination);
      window._uvAnalyser = _analyser;
    } catch {}
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
  // savedTime > 0: we deliberately paused mid-song (hide/lock). User must tap Play to resume.
  const [savedTime,    setSavedTime]    = useState(0);

  const audioRef     = useRef(persistentAudio);
  const onNextRef    = useRef(null);
  const onPrevRef    = useRef(null);
  const loadedSrcRef = useRef("");

  // Synchronous refs — never stale inside async functions
  const savedTimeRef   = useRef(0);  // mirror of savedTime state
  const playLockRef    = useRef(false); // 500ms guard — prevents stacked play/pause
  const pauseLockRef   = useRef(false);
  const lastTimeRef    = useRef(0);  // last known currentTime — AudioPlayer uses this for progress guard

  // ── Position helpers ──────────────────────────────────────────────────────
  const savePosition = useCallback((time) => {
    savedTimeRef.current = time;
    setSavedTime(time);
  }, []);

  const clearPosition = useCallback(() => {
    savedTimeRef.current = 0;
    setSavedTime(0);
  }, []);

  // ── safePlay ─────────────────────────────────────────────────────────────
  // 1. 500ms lock — prevents stacked play() promises
  // 2. Awaits AudioContext resume — prevents catch-up burst on Safari
  // 3. Forces playbackRate = 1 — guards OS catch-up rate adjustment
  const safePlay = useCallback(async (audio) => {
    if (playLockRef.current) {
      console.log("[Player] safePlay skipped — lock active");
      return;
    }
    playLockRef.current = true;
    const unlock = () => {
      setTimeout(() => { playLockRef.current = false; }, 500);
    };
    try {
      await resumeAudioContext();
      // Re-assert rate AFTER context resumes — iOS can drift it during suspension
      audio.playbackRate        = 1;
      audio.defaultPlaybackRate = 1;
      if (!audio.paused) { unlock(); return; } // already playing — no-op
      // One final rate assertion right before play() — belt-and-suspenders for Safari
      audio.playbackRate = 1;
      console.log("[Player] safePlay →", {
        currentTime:   audio.currentTime,
        readyState:    audio.readyState,
        audioCtxState: _audioCtx?.state,
      });
      await audio.play();
      // Post-play rate guard — Safari occasionally resets rate after play() resolves
      audio.playbackRate = 1;
    } catch (err) {
      if (err.name !== "AbortError") console.warn("[Player] safePlay error:", err.name, err.message);
    } finally {
      unlock();
    }
  }, []);

  // ── safePause ────────────────────────────────────────────────────────────
  // 500ms lock — prevents duplicate pause() and race with safePlay
  const safePause = useCallback((audio, saveTime = true) => {
    if (pauseLockRef.current) {
      console.log("[Player] safePause skipped — lock active");
      return;
    }
    pauseLockRef.current = true;
    setTimeout(() => { pauseLockRef.current = false; }, 500);

    if (audio.paused) return; // already paused — no-op
    if (saveTime) savePosition(audio.currentTime);
    audio.pause();
    console.log("[Player] safePause →", { currentTime: audio.currentTime });
  }, [savePosition]);

  // ── Load & play a new track ───────────────────────────────────────────────
  // Only sets src + calls play when the track URL genuinely changes.
  // Same-track: if paused just resume; never reload src.
  useEffect(() => {
    if (!currentTrack?.audio_url) return;
    const audio = audioRef.current;

    const isSameTrack =
      loadedSrcRef.current === currentTrack.audio_url ||
      audio.src             === currentTrack.audio_url ||
      (audio.src && audio.src.endsWith(currentTrack.audio_url));

    if (isSameTrack) {
      if (audio.paused) safePlay(audio);
      return;
    }

    // Genuinely new track — reset everything cleanly
    clearPosition();
    lastTimeRef.current   = 0;
    loadedSrcRef.current  = currentTrack.audio_url;
    audio.src             = currentTrack.audio_url;
    audio.load();
    safePlay(audio);
  }, [currentTrack, clearPosition, safePlay]);

  // ── Sync isPlaying + Media Session metadata from native audio events ──────
  useEffect(() => {
    const audio = audioRef.current;

    const onPlay = () => {
      setIsPlaying(true);
      if (currentTrack) setMediaSessionMetadata(currentTrack);
    };
    const onPause = () => {
      setIsPlaying(false);
    };
    const onEnded = () => {
      setIsPlaying(false);
      clearPosition();
      lastTimeRef.current = 0;
      onNextRef.current?.();
    };
    // readystatechange / stalled — keep isPlaying in sync with real state
    const onStall = () => {
      if (audio.paused) setIsPlaying(false);
    };

    // Correct any OS-driven playback rate change immediately (Safari catch-up guard)
    const onRateChange = () => {
      if (audio.playbackRate !== 1) {
        console.warn("[Player] ratechange detected:", audio.playbackRate, "→ forcing back to 1");
        audio.playbackRate = 1;
      }
    };

    audio.addEventListener("play",       onPlay);
    audio.addEventListener("pause",      onPause);
    audio.addEventListener("ended",      onEnded);
    audio.addEventListener("stalled",    onStall);
    audio.addEventListener("waiting",    onStall);
    audio.addEventListener("ratechange", onRateChange);

    return () => {
      audio.removeEventListener("play",       onPlay);
      audio.removeEventListener("pause",      onPause);
      audio.removeEventListener("ended",      onEnded);
      audio.removeEventListener("stalled",    onStall);
      audio.removeEventListener("waiting",    onStall);
      audio.removeEventListener("ratechange", onRateChange);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearPosition, currentTrack]);

  // ── Unified visibility / background handler ───────────────────────────────
  // ON HIDE  — pause immediately, save time, stop all UI updates
  // ON SHOW  — sync UI from real audio state, NEVER auto-play
  //            User must tap Play manually after returning.
  useEffect(() => {
    const audio = audioRef.current;

    const onHide = () => {
      // Signal progress bar to freeze
      sharedHiddenRef.current = true;
      if (!audio.src || audio.ended) return;
      // Pause only if actually playing — do NOT reset src, do NOT reload
      if (!audio.paused) {
        const ct = audio.currentTime;
        audio.pause();
        savePosition(ct);
        setIsPlaying(false);
        console.log("[Player] onHide — paused at", ct.toFixed(2));
      }
    };

    const onShow = async () => {
      sharedHiddenRef.current = false;
      console.log("[Player] onShow — audio.paused:", audio.paused, "readyState:", audio.readyState, "audioCtx:", _audioCtx?.state);

      if (!audio.src || audio.ended) {
        setIsPlaying(false);
        return;
      }

      if (!audio.paused) {
        // Audio kept playing natively through the lock screen player (user never pressed pause).
        // The AudioContext was suspended while the screen was locked. On resume it will
        // "catch up" through its backlogged buffer — causing the 3-second speed burst.
        // Fix: pause → let AudioContext fully resume → snap currentTime → force rate=1 → play.
        const snapTime = audio.currentTime;
        audio.pause();
        try { await resumeAudioContext(); } catch {}
        // Drain any buffered audio by snapping currentTime to where we actually are
        audio.currentTime  = snapTime;
        audio.playbackRate        = 1;
        audio.defaultPlaybackRate = 1;
        console.log("[Player] onShow resync — snapped to", snapTime.toFixed(2), "audioCtx:", _audioCtx?.state);
        // Small delay so the seek settles before we call play()
        setTimeout(() => { safePlay(audio); }, 80);
      } else {
        // Audio was already paused (user had pressed pause before locking)
        // Just sync UI — do not auto-play
        setIsPlaying(false);
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") onHide();
      else onShow();
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide",  onHide);
    window.addEventListener("pageshow",  onShow);
    // iOS PWA: fires when returning to tab
    window.addEventListener("focus",     onShow);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onHide);
      window.removeEventListener("pageshow", onShow);
      window.removeEventListener("focus",    onShow);
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
    navigator.mediaSession.metadata = new MediaMetadata({
      title:   track.title   || "Unknown",
      artist:  track.artist_display || track.artist || "Upper Vibe Media",
      album:   "Upper Vibe Media",
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

  // Media Session action handlers — must use safePlay/safePause, not togglePlay
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    const audio = audioRef.current;

    navigator.mediaSession.setActionHandler("play", () => {
      if (!audio.src) return;
      // Restore saved position before resuming
      if (savedTimeRef.current > 0 && isFinite(audio.duration) && audio.duration > 0) {
        audio.currentTime = savedTimeRef.current;
        clearPosition();
      }
      safePlay(audio);
    });

    navigator.mediaSession.setActionHandler("pause", () => {
      safePause(audio, true);
    });

    navigator.mediaSession.setActionHandler("nexttrack",     () => onNextRef.current?.());
    navigator.mediaSession.setActionHandler("previoustrack", () => onPrevRef.current?.());

    return () => {
      ["play", "pause", "nexttrack", "previoustrack"].forEach((a) => {
        try { navigator.mediaSession.setActionHandler(a, null); } catch {}
      });
    };
  }, [clearPosition, safePlay, safePause]);

  // Keep Media Session badge in sync with real audio state
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
  }, [isPlaying]);

  // ── Public API ────────────────────────────────────────────────────────────

  // togglePlay: the UI play/pause button.
  // On resume after hide: seek to savedTime first, then safePlay once.
  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio.src) return;

    if (audio.paused || audio.ended) {
      // Restore saved position if we paused on hide/lock
      if (savedTimeRef.current > 0 && isFinite(audio.duration) && audio.duration > 0) {
        audio.currentTime = savedTimeRef.current;
        clearPosition();
      }
      safePlay(audio);
    } else {
      safePause(audio, true);
    }
  }, [clearPosition, safePlay, safePause]);

  const playTrack = useCallback((track, source = "song") => {
    getOrCreateAudioContext(audioRef.current);
    setSourceType(source);
    setCurrentTrack(track);
  }, []);

  const stopPlaying = useCallback(() => {
    const audio = audioRef.current;
    audio.pause();
    audio.src = "";
    loadedSrcRef.current  = "";
    lastTimeRef.current   = 0;
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
      lastTimeRef,   // AudioPlayer uses this for the progress freeze guard
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