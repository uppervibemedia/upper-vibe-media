import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from "react";

// Single persistent audio element — created once, never replaced
const _audio = typeof window !== "undefined" ? (() => {
  const a = document.createElement("audio");
  a.setAttribute("playsinline", "");
  a.setAttribute("webkit-playsinline", "");
  a.preload = "auto";
  return a;
})() : null;

// AudioContext for visualiser — wired lazily on first play
let _actx = null;
let _analyser = null;
let _srcNode = null;
let _ctxWired = false;

function _wireCtx() {
  if (_ctxWired || !_audio) return;
  try {
    _actx = new (window.AudioContext || window.webkitAudioContext)();
    _analyser = _actx.createAnalyser();
    _analyser.fftSize = 256;
    _analyser.smoothingTimeConstant = 0.82;
    _srcNode = _actx.createMediaElementSource(_audio);
    _srcNode.connect(_analyser);
    _analyser.connect(_actx.destination);
    _ctxWired = true;
  } catch (e) {
    console.warn("[Player] AudioContext wire failed:", e.message);
  }
}

function _resumeCtx() {
  if (_actx && _actx.state !== "running") _actx.resume().catch(() => {});
}

export function getGlobalAnalyser() {
  return _analyser;
}
export function resumeGlobalAudioContext() {
  _resumeCtx();
}

const PlayerContext = createContext(null);

export function PlayerProvider({ children }) {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [sourceType, setSourceType] = useState("song");
  const [queue, setQueue] = useState([]);

  const audioRef        = useRef(_audio);
  const onNextRef       = useRef(null);
  const onPrevRef       = useRef(null);
  const playPromiseRef  = useRef(null);

  // Debounce timers for play/pause — prevents double-fire from lock screen
  const playDebounceRef  = useRef(null);
  const pauseDebounceRef = useRef(null);

  // ── Safe play — debounced 500 ms, guards promise races ───────────────────
  const safePlay = useCallback(() => {
    if (playDebounceRef.current) clearTimeout(playDebounceRef.current);
    playDebounceRef.current = setTimeout(() => {
      const audio = audioRef.current;
      if (!audio?.src) return;
      if (!audio.paused) return;           // already playing
      if (playPromiseRef.current) return;  // play() in flight

      _resumeCtx();
      const p = audio.play();
      if (p) {
        playPromiseRef.current = p;
        p.then(() => { playPromiseRef.current = null; })
         .catch((err) => {
           playPromiseRef.current = null;
           if (err?.name !== "AbortError") console.warn("[Player] play() error:", err?.name, err?.message);
         });
      }
    }, 500);
  }, []);

  // ── Safe pause — debounced 500 ms, waits for any pending play() ──────────
  const safePause = useCallback(() => {
    if (pauseDebounceRef.current) clearTimeout(pauseDebounceRef.current);
    pauseDebounceRef.current = setTimeout(() => {
      const audio = audioRef.current;
      if (!audio) return;
      if (audio.paused) return;            // already paused

      if (playPromiseRef.current) {
        playPromiseRef.current
          .then(() => { audio.pause(); playPromiseRef.current = null; })
          .catch(() => { playPromiseRef.current = null; });
      } else {
        audio.pause();
      }
    }, 500);
  }, []);

  // ── Audio events — driven purely by real element events ──────────────────
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onPlay  = () => {
      setIsPlaying(true);
      if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "playing";
    };
    const onPause = () => {
      setIsPlaying(false);
      if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "paused";
    };
    const onEnded = () => { onNextRef.current ? onNextRef.current() : setIsPlaying(false); };
    const onError = () => { setIsPlaying(false); console.warn("[Player] audio error", audio.error?.message); };

    audio.addEventListener("play",   onPlay);
    audio.addEventListener("pause",  onPause);
    audio.addEventListener("ended",  onEnded);
    audio.addEventListener("error",  onError);

    return () => {
      audio.removeEventListener("play",   onPlay);
      audio.removeEventListener("pause",  onPause);
      audio.removeEventListener("ended",  onEnded);
      audio.removeEventListener("error",  onError);
    };
  }, []);

  // ── Visibility change — auto-pause on screen lock / tab hide ─────────────
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        // Phone locked or page hidden: pause cleanly, preserve src + currentTime
        safePause();
      }
      // On visible: do nothing — user controls resumption via lock screen or UI
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [safePause]);

  // ── Media Session handlers — registered once, use safePlay/safePause ─────
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;

    const set = (action, fn) => {
      try { navigator.mediaSession.setActionHandler(action, fn); } catch (_) {}
    };

    // Use safePlay/safePause — never togglePlay, no duplicate promises
    set("play",          () => { safePlay(); });
    set("pause",         () => { safePause(); });
    set("nexttrack",     () => { onNextRef.current?.(); });
    set("previoustrack", () => { onPrevRef.current?.(); });
  }, [safePlay, safePause]); // safePlay/safePause are stable useCallback refs

  // ── Media Session metadata ────────────────────────────────────────────────
  useEffect(() => {
    if (!("mediaSession" in navigator) || !currentTrack) return;
    const artwork = currentTrack.cover_url
      ? [{ src: currentTrack.cover_url, sizes: "512x512", type: "image/jpeg" }]
      : [];
    navigator.mediaSession.metadata = new MediaMetadata({
      title:  currentTrack.title          || "Unknown",
      artist: currentTrack.artist_display || currentTrack.artist || "Upper Vibe Media",
      album:  "Upper Vibe Media",
      artwork,
    });
  }, [currentTrack]);

  // ── Public API ────────────────────────────────────────────────────────────
  const playTrack = useCallback((track, source = "song") => {
    if (!track) return;
    const audio = audioRef.current;
    if (!audio) return;

    setSourceType(source);
    setCurrentTrack(track);

    if (!_ctxWired) _wireCtx();

    if (audio.src !== track.audio_url) {
      // New track: swap src, clear any in-flight promise, then play
      playPromiseRef.current = null;
      audio.src = track.audio_url;
      audio.load();
    }

    // Small delay to let load() settle — avoids AbortError on fast clicks
    setTimeout(() => { safePlay(); }, 50);
  }, [safePlay]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio?.src) return;
    if (audio.paused) {
      safePlay();
    } else {
      safePause();
    }
  }, [safePlay, safePause]);

  const stopPlaying = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!audio.paused) audio.pause();
    audio.src = "";
    playPromiseRef.current = null;
    setCurrentTrack(null);
    setIsPlaying(false);
  }, []);

  const registerNextHandler = useCallback((fn) => { onNextRef.current = fn; }, []);
  const registerPrevHandler = useCallback((fn) => { onPrevRef.current = fn; }, []);
  const handleNext = useCallback(() => { onNextRef.current?.(); }, []);
  const handlePrev = useCallback(() => { onPrevRef.current?.(); }, []);

  return (
    <PlayerContext.Provider value={{
      currentTrack,
      isPlaying,
      sourceType,
      queue,
      audioRef,
      playTrack,
      togglePlay,
      stopPlaying,
      setQueue,
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