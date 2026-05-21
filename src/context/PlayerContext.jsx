import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from "react";

const PlayerContext = createContext(null);

// ONE global audio element — never recreated
const persistentAudio = (() => {
  if (typeof window === "undefined") return null;
  const a = new Audio();
  a.preload = "metadata";
  a.setAttribute("x-webkit-airplay", "allow");
  a.setAttribute("playsinline", "");
  return a;
})();

export const sharedHiddenRef = { current: false };

// ── AudioContext — for visualiser analyser only ──────────────────────────────
let _audioCtx   = null;
let _analyser   = null;
let _sourceNode = null;

export function getGlobalAnalyser(audioElement) {
  if (!audioElement) return null;
  if (!_audioCtx) {
    try {
      _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      window._uvAudioCtx = _audioCtx;
    } catch { return null; }
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

export function resumeGlobalAudioContext() {
  if (_audioCtx && _audioCtx.state !== "running") {
    _audioCtx.resume().catch(() => {});
  }
}

export function PlayerProvider({ children }) {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying,    setIsPlaying]    = useState(false);
  const [queue,        setQueue]        = useState([]);
  const [sourceType,   setSourceType]   = useState("song");

  const audioRef           = useRef(persistentAudio);
  const onNextRef          = useRef(null);
  const onPrevRef          = useRef(null);
  const loadedSrcRef       = useRef("");
  const lastTimeRef        = useRef(0);
  const savedTimeRef       = useRef(0);
  const intentPlayingRef   = useRef(false);

  // ── playTrack ─────────────────────────────────────────────────────────────
  // iOS Safari rule: audio.play() MUST be called synchronously inside the
  // user gesture handler. No awaits, no async calls before play().
  const playTrack = useCallback((track, source = "song") => {
    if (!track?.audio_url) return;
    const audio = audioRef.current;
    const url   = track.audio_url;

    intentPlayingRef.current = true;
    setSourceType(source);
    setCurrentTrack(track);

    if (loadedSrcRef.current === url && !audio.ended) {
      // Same track — just resume
      if (audio.paused) {
        audio.play().catch((err) => {
          console.warn("[Player] resume error:", err.name, err.message);
        });
      }
      return;
    }

    // New track
    loadedSrcRef.current = url;
    savedTimeRef.current = 0;
    lastTimeRef.current  = 0;

    audio.src = url;
    audio.load();
    audio.play().catch((err) => {
      console.warn("[Player] play error:", err.name, err.message);
    });

  }, []);

  // ── safePlay — resume only ────────────────────────────────────────────────
  const safePlay = useCallback((audio) => {
    intentPlayingRef.current = true;
    if (_audioCtx && _audioCtx.state !== "running") {
      _audioCtx.resume().catch(() => {});
    }
    if (!audio.paused) return;
    audio.play().catch((err) => {
      if (err.name !== "AbortError") console.warn("[Player] safePlay error:", err.name);
    });
  }, []);

  // ── safePause ─────────────────────────────────────────────────────────────
  const safePause = useCallback((audio) => {
    intentPlayingRef.current = false;
    if (!audio.paused) audio.pause();
  }, []);

  // ── Audio event listeners ─────────────────────────────────────────────────
  useEffect(() => {
    const audio = audioRef.current;

    const onPlay      = () => setIsPlaying(true);
    const onPause     = () => setIsPlaying(false);
    const onEnded     = () => {
      intentPlayingRef.current = false;
      setIsPlaying(false);
      lastTimeRef.current  = 0;
      savedTimeRef.current = 0;
      onNextRef.current?.();
    };
    const onStall     = () => { if (audio.paused) setIsPlaying(false); };
    const onTimeUpdate = () => { lastTimeRef.current = audio.currentTime; };
    const onError     = () => {
      const e = audio.error;
      const codes = { 1: "ABORTED", 2: "NETWORK", 3: "DECODE", 4: "SRC_NOT_SUPPORTED" };
      console.error("[Player] audio error:", codes[e?.code] || e?.code, e?.message, "| src:", audio.src?.slice(-60));
    };

    audio.addEventListener("play",       onPlay);
    audio.addEventListener("pause",      onPause);
    audio.addEventListener("ended",      onEnded);
    audio.addEventListener("stalled",    onStall);
    audio.addEventListener("waiting",    onStall);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("error",      onError);

    return () => {
      audio.removeEventListener("play",       onPlay);
      audio.removeEventListener("pause",      onPause);
      audio.removeEventListener("ended",      onEnded);
      audio.removeEventListener("stalled",    onStall);
      audio.removeEventListener("waiting",    onStall);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("error",      onError);
    };
  }, []);

  // ── Background / Foreground ───────────────────────────────────────────────
  useEffect(() => {
    const audio = audioRef.current;

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        sharedHiddenRef.current = true;
        if (audio.currentTime > 0) savedTimeRef.current = audio.currentTime;
        // Do NOT pause — iOS handles background audio natively
      } else {
        sharedHiddenRef.current = false;
        // Foreground return — resume AudioContext if interrupted
        if (_audioCtx && _audioCtx.state !== "running") {
          _audioCtx.resume().then(() => {
            if (intentPlayingRef.current && audio.paused && audio.src) {
              audio.play().catch(() => {});
            }
          }).catch(() => {});
        }
        setIsPlaying(!audio.paused);
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  // ── Media Session ─────────────────────────────────────────────────────────
  const FALLBACK_ART = "https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?w=512&h=512&fit=crop&q=80";

  useEffect(() => {
    if (!("mediaSession" in navigator) || !currentTrack) return;
    const art = currentTrack.cover_url?.startsWith("https://") ? currentTrack.cover_url : FALLBACK_ART;
    navigator.mediaSession.metadata = new MediaMetadata({
      title:   currentTrack.title   || "Unknown",
      artist:  currentTrack.artist_display || "Upper Vibe Media",
      album:   "Upper Vibe Media",
      artwork: [{ src: art, sizes: "512x512", type: "image/jpeg" }],
    });
  }, [currentTrack]);

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    const audio = audioRef.current;
    navigator.mediaSession.setActionHandler("play",          () => safePlay(audio));
    navigator.mediaSession.setActionHandler("pause",         () => safePause(audio));
    navigator.mediaSession.setActionHandler("nexttrack",     () => onNextRef.current?.());
    navigator.mediaSession.setActionHandler("previoustrack", () => onPrevRef.current?.());
  }, [safePlay, safePause]);

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
  }, [isPlaying]);

  // ── togglePlay ────────────────────────────────────────────────────────────
  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio.src) return;
    if (audio.paused || audio.ended) safePlay(audio);
    else safePause(audio);
  }, [safePlay, safePause]);

  // ── stopPlaying ───────────────────────────────────────────────────────────
  const stopPlaying = useCallback(() => {
    const audio = audioRef.current;
    intentPlayingRef.current = false;
    audio.pause();
    audio.src            = "";
    loadedSrcRef.current = "";
    lastTimeRef.current  = 0;
    savedTimeRef.current = 0;
    setIsPlaying(false);
    setCurrentTrack(null);
  }, []);

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
      playLockRef: { current: false },
      clearPosition,
      savePosition,
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