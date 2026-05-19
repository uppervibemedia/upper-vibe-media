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
let _actx    = null;
let _analyser = null;
let _srcNode  = null;
let _ctxWired = false;

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
  } catch (e) {
    console.warn("[Player] AudioContext wire failed:", e.message);
  }
}

function _resumeCtx() {
  if (_actx && _actx.state !== "running") _actx.resume().catch(() => {});
}

export function getGlobalAnalyser()        { return _analyser; }
export function resumeGlobalAudioContext() { _resumeCtx(); }

const PlayerContext = createContext(null);

export function PlayerProvider({ children }) {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying,    setIsPlaying]    = useState(false);
  const [sourceType,   setSourceType]   = useState("song");
  const [queue,        setQueue]        = useState([]);

  const audioRef       = useRef(_audio);
  const onNextRef      = useRef(null);
  const onPrevRef      = useRef(null);
  const playPromiseRef = useRef(null);

  // ── Audio events ──────────────────────────────────────────────────────────
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onPlay  = () => { setIsPlaying(true);  if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "playing"; };
    const onPause = () => { setIsPlaying(false); if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "paused"; };
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

  // ── Media Session — registered once ───────────────────────────────────────
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;

    const set = (action, fn) => {
      try { navigator.mediaSession.setActionHandler(action, fn); } catch (_) {}
    };

    set("play", () => {
      const audio = audioRef.current;
      if (!audio?.src || !audio.paused) return;
      _resumeCtx();
      const p = audio.play();
      if (p) { playPromiseRef.current = p; p.then(() => { playPromiseRef.current = null; }).catch(() => { playPromiseRef.current = null; }); }
    });

    set("pause", () => {
      const audio = audioRef.current;
      if (!audio || audio.paused) return;
      if (playPromiseRef.current) {
        playPromiseRef.current.then(() => { audio.pause(); playPromiseRef.current = null; }).catch(() => { playPromiseRef.current = null; });
      } else {
        audio.pause();
      }
    });

    set("nexttrack",     () => { onNextRef.current?.(); });
    set("previoustrack", () => { onPrevRef.current?.(); });
  }, []); // never re-register

  // ── Media Session metadata ─────────────────────────────────────────────────
  useEffect(() => {
    if (!("mediaSession" in navigator) || !currentTrack) return;
    const artwork = currentTrack.cover_url ? [{ src: currentTrack.cover_url, sizes: "512x512", type: "image/jpeg" }] : [];
    navigator.mediaSession.metadata = new MediaMetadata({
      title:   currentTrack.title          || "Unknown",
      artist:  currentTrack.artist_display || currentTrack.artist || "Upper Vibe Media",
      album:   "Upper Vibe Media",
      artwork,
    });
  }, [currentTrack]);

  // ── Core helpers ──────────────────────────────────────────────────────────
  const _doPlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio?.src || playPromiseRef.current) return;
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
  }, []);

  const _doPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playPromiseRef.current) {
      playPromiseRef.current.then(() => { audio.pause(); playPromiseRef.current = null; }).catch(() => { playPromiseRef.current = null; });
    } else if (!audio.paused) {
      audio.pause();
    }
  }, []);

  // ── Public API ─────────────────────────────────────────────────────────────
  const playTrack = useCallback((track, source = "song") => {
    if (!track) return;
    const audio = audioRef.current;
    if (!audio) return;

    setSourceType(source);
    setCurrentTrack(track);

    if (!_ctxWired) _wireCtx();

    if (audio.src !== track.audio_url) {
      playPromiseRef.current = null;
      audio.src = track.audio_url;
      audio.load();
    }

    // Small delay to let load() settle before playing, avoids AbortError on fast clicks
    setTimeout(() => {
      _doPlay();
    }, 50);
  }, [_doPlay]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio?.src) return;
    if (audio.paused) {
      _doPlay();
    } else {
      _doPause();
    }
  }, [_doPlay, _doPause]);

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
  const handleNext          = useCallback(() => { onNextRef.current?.(); }, []);
  const handlePrev          = useCallback(() => { onPrevRef.current?.(); }, []);

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