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
  const [savedTime,    setSavedTime]    = useState(0);

  const audioRef     = useRef(persistentAudio);
  const onNextRef    = useRef(null);
  const onPrevRef    = useRef(null);
  const loadedSrcRef = useRef("");

  // Synchronous refs — never stale inside async callbacks
  const savedTimeRef  = useRef(0);   // set on background-pause; cleared on resume
  const playLockRef   = useRef(false);
  const pauseLockRef  = useRef(false);
  const lastTimeRef   = useRef(0);   // AudioPlayer progress bar guard

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
  // Resumes the audio element cleanly.
  // IMPORTANT: Callers must seek audio.currentTime BEFORE calling safePlay if needed.
  //            safePlay never seeks — seeking inside causes Safari to re-buffer (glitch).
  const safePlay = useCallback(async (audio) => {
    if (playLockRef.current) {
      console.log("[Player] safePlay skipped — lock active");
      return;
    }
    playLockRef.current = true;
    const unlock = () => { setTimeout(() => { playLockRef.current = false; }, 500); };
    try {
      await resumeAudioContext();
      audio.playbackRate        = 1;
      audio.defaultPlaybackRate = 1;
      if (!audio.paused) { unlock(); return; }
      audio.playbackRate        = 1;
      audio.defaultPlaybackRate = 1;
      console.log("[Player] safePlay →", {
        currentTime:   audio.currentTime,
        readyState:    audio.readyState,
        audioCtxState: _audioCtx?.state,
      });
      await audio.play();
      audio.playbackRate = 1;
    } catch (err) {
      if (err.name !== "AbortError") console.warn("[Player] safePlay error:", err.name, err.message);
    } finally {
      unlock();
    }
  }, []);

  // ── safePause ─────────────────────────────────────────────────────────────
  const safePause = useCallback((audio, saveTime = true) => {
    if (pauseLockRef.current) {
      console.log("[Player] safePause skipped — lock active");
      return;
    }
    pauseLockRef.current = true;
    setTimeout(() => { pauseLockRef.current = false; }, 500);
    if (audio.paused) return;
    if (saveTime) savePosition(audio.currentTime);
    audio.pause();
    console.log("[Player] safePause →", { currentTime: audio.currentTime });
  }, [savePosition]);

  // ── Load & play a new track ───────────────────────────────────────────────
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

    // Genuinely new track — reset and play from start
    clearPosition();
    lastTimeRef.current  = 0;
    loadedSrcRef.current = currentTrack.audio_url;
    audio.src            = currentTrack.audio_url;
    audio.load();
    safePlay(audio);
  }, [currentTrack, clearPosition, safePlay]);

  // ── Sync isPlaying from native audio events ───────────────────────────────
  useEffect(() => {
    const audio = audioRef.current;

    const onPlay      = () => { setIsPlaying(true); if (currentTrack) setMediaSessionMetadata(currentTrack); };
    const onPause     = () => { setIsPlaying(false); };
    const onEnded     = () => { setIsPlaying(false); clearPosition(); lastTimeRef.current = 0; onNextRef.current?.(); };
    const onStall     = () => { if (audio.paused) setIsPlaying(false); };
    const onRateChange = () => {
      if (audio.playbackRate !== 1) {
        console.warn("[Player] ratechange →", audio.playbackRate, "forcing 1");
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

  // ── Background / visibility handler ──────────────────────────────────────
  // ON HIDE: immediately pause + save position synchronously (before iOS suspends us)
  // ON SHOW: reset rate + sync UI. User must press Play. Never auto-resume.
  useEffect(() => {
    const audio = audioRef.current;
    let showScheduled = false;

    const doHide = () => {
      sharedHiddenRef.current = true;
      if (!audio.src || audio.ended) return;

      // Capture time SYNCHRONOUSLY right now — before iOS has a chance to clear it
      const ct = audio.currentTime;
      if (ct > 0) {
        savedTimeRef.current = ct;
        setSavedTime(ct);
        lastTimeRef.current  = ct;
      }
      setIsPlaying(false);

      // Force pause — bypass locks, background always wins
      pauseLockRef.current = false;
      playLockRef.current  = false;
      if (!audio.paused) {
        audio.pause();
        console.log("[Player] onHide — paused at", ct.toFixed(2));
      } else {
        console.log("[Player] onHide — already paused at", ct.toFixed(2));
      }
    };

    const doShow = () => {
      showScheduled = false;
      sharedHiddenRef.current = false;
      if (!audio.src || audio.ended) { setIsPlaying(false); return; }
      // Reset rate in case iOS drifted it
      audio.playbackRate        = 1;
      audio.defaultPlaybackRate = 1;
      // Sync UI — never auto-play
      setIsPlaying(!audio.paused);
      console.log("[Player] onShow — paused:", audio.paused, "savedTime:", savedTimeRef.current);
    };

    const onHide = () => {
      // Run synchronously (no microtask/setTimeout) — must fire before iOS suspends
      doHide();
    };

    const onShow = () => {
      if (showScheduled) return;
      showScheduled = true;
      setTimeout(doShow, 80);
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") onHide();
      else onShow();
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide",  onHide);
    window.addEventListener("pageshow",  onShow);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide",  onHide);
      window.removeEventListener("pageshow",  onShow);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Media Session metadata ────────────────────────────────────────────────
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
      title:   track.title || "Unknown",
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

  // ── Media Session action handlers ─────────────────────────────────────────
  // Lock-screen Play: restore savedTime then resume. No re-seek if time is 0.
  // This is the ONLY MediaSession play handler — no PWA hook override needed.
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    const audio = audioRef.current;

    const doPlay = () => {
      const saved = savedTimeRef.current;
      console.log("[Player] MediaSession play — saved:", saved, "src:", !!audio.src, "readyState:", audio.readyState);

      // Restore position if we have one (set by doHide)
      if (saved > 0) {
        try { audio.currentTime = saved; } catch {}
        clearPosition();
      }
      audio.playbackRate        = 1;
      audio.defaultPlaybackRate = 1;
      safePlay(audio);
    };

    navigator.mediaSession.setActionHandler("play", () => {
      if (!audio.src) return;

      if (!isFinite(audio.duration) || audio.readyState < 2) {
        console.log("[Player] MediaSession play — not ready, waiting for canplay");
        const onCan = () => { audio.removeEventListener("canplay", onCan); doPlay(); };
        audio.addEventListener("canplay", onCan);
        if (audio.readyState < 1) audio.load();
      } else {
        doPlay();
      }
    });

    navigator.mediaSession.setActionHandler("pause", () => {
      savePosition(audio.currentTime);
      pauseLockRef.current = false;
      if (!audio.paused) audio.pause();
      setIsPlaying(false);
    });

    navigator.mediaSession.setActionHandler("nexttrack",     () => onNextRef.current?.());
    navigator.mediaSession.setActionHandler("previoustrack", () => onPrevRef.current?.());

    return () => {
      ["play", "pause", "nexttrack", "previoustrack"].forEach((a) => {
        try { navigator.mediaSession.setActionHandler(a, null); } catch {}
      });
    };
  }, [clearPosition, savePosition, safePlay]);

  // Sync lock-screen badge
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
  }, [isPlaying]);

  // ── togglePlay (UI button) ────────────────────────────────────────────────
  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio.src) return;

    if (audio.paused || audio.ended) {
      const resume = () => {
        const saved = savedTimeRef.current;
        if (saved > 0) {
          try { audio.currentTime = saved; } catch {}
          clearPosition();
        }
        audio.playbackRate        = 1;
        audio.defaultPlaybackRate = 1;
        safePlay(audio);
      };
      if (!isFinite(audio.duration) || audio.readyState < 2) {
        const onCan = () => { audio.removeEventListener("canplay", onCan); resume(); };
        audio.addEventListener("canplay", onCan);
        if (audio.readyState < 1) audio.load();
      } else {
        resume();
      }
    } else {
      safePause(audio, true);
    }
  }, [clearPosition, safePlay, safePause]);

  // ── Public API ────────────────────────────────────────────────────────────
  const playTrack = useCallback((track, source = "song") => {
    getOrCreateAudioContext(audioRef.current);
    setSourceType(source);
    setCurrentTrack(track);
  }, []);

  const stopPlaying = useCallback(() => {
    const audio = audioRef.current;
    audio.pause();
    audio.src = "";
    loadedSrcRef.current = "";
    lastTimeRef.current  = 0;
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
      playLockRef,
      clearPosition,
      setIsPlaying,
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