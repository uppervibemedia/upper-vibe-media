import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from "react";

const PlayerContext = createContext(null);

// ─── ONE global audio element, created once, never recreated ───────────────
const persistentAudio = (() => {
  if (typeof window === "undefined") return null;
  const a = new Audio();
  a.crossOrigin = "anonymous";
  a.preload   = "auto";
  a.setAttribute("x-webkit-airplay", "allow");
  a.setAttribute("webkit-airplay",   "allow");
  a.setAttribute("playsinline", "");
  a.setAttribute("webkit-playsinline", "");
  return a;
})();

// ─── ONE global AudioContext — shared with the visualizer ──────────────────
let _audioCtx   = null;
let _analyser   = null;
let _sourceNode = null;

function resumeAudioContext() {
  if (_audioCtx && _audioCtx.state !== "running") {
    _audioCtx.resume().catch(() => {});
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

export function resumeGlobalAudioContext() { resumeAudioContext(); }
export function getGlobalAnalyser(audioElement) { return getOrCreateAudioContext(audioElement); }

export function PlayerProvider({ children }) {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying,    setIsPlaying]    = useState(false);
  const [queue,        setQueue]        = useState([]);
  const [sourceType,   setSourceType]   = useState("song");

  const audioRef         = useRef(persistentAudio);
  const onNextRef        = useRef(null);
  const onPrevRef        = useRef(null);
  const loadedSrcRef     = useRef("");
  // When we hard-pause on background, we save currentTime here.
  const savedTimeRef     = useRef(0);
  // Prevents the isPlaying-effect from driving audio when the state change
  // came from a native audio event (not a user action).
  const skipEffectRef    = useRef(false);

  // ── Load & play a new track ───────────────────────────────────────────────
  useEffect(() => {
    if (!currentTrack?.audio_url) return;
    const audio = audioRef.current;

    const isSameTrack =
      loadedSrcRef.current === currentTrack.audio_url ||
      audio.src === currentTrack.audio_url ||
      (audio.src && audio.src.endsWith(currentTrack.audio_url));

    if (isSameTrack) {
      if (audio.paused) audio.play().catch(() => {});
      setIsPlaying(true);
      return;
    }

    loadedSrcRef.current  = currentTrack.audio_url;
    savedTimeRef.current  = 0;
    audio.src = currentTrack.audio_url;
    audio.load();
    audio.play().catch((err) => {
      if (err.name !== "AbortError") console.warn("[PlayerContext] play() error:", err);
    });
    setIsPlaying(true);
  }, [currentTrack]);

  // ── isPlaying state → audio element ──────────────────────────────────────
  // Only drives the audio element when the state change came from user code
  // (togglePlay, MediaSession handler, etc.), not from native events.
  const mountedRef = useRef(false);
  useEffect(() => {
    if (!mountedRef.current) { mountedRef.current = true; return; }
    if (skipEffectRef.current) { skipEffectRef.current = false; return; }

    const audio = audioRef.current;
    if (!audio.src) return;

    if (isPlaying) {
      resumeAudioContext();
      // Restore saved position — do not let the element play from wherever
      // iOS left the decode buffer (which causes catch-up on first play back).
      if (savedTimeRef.current > 0 && Math.abs(audio.currentTime - savedTimeRef.current) > 0.5) {
        audio.currentTime = savedTimeRef.current;
      }
      if (audio.paused) audio.play().catch(() => {});
    } else {
      if (!audio.paused) {
        savedTimeRef.current = audio.currentTime;
        audio.pause();
      }
    }
  }, [isPlaying]);

  // ── Background: hard-pause immediately ───────────────────────────────────
  // We treat any backgrounding (tab hidden, pagehide, blur) as a hard pause.
  // This prevents iOS from silently buffering audio that then "catches up"
  // when the user returns and presses Pause.
  useEffect(() => {
    const audio = audioRef.current;

    const hardPause = () => {
      if (!audio.paused) {
        savedTimeRef.current = audio.currentTime;
        audio.pause();
        skipEffectRef.current = true; // native pause incoming — skip effect
        setIsPlaying(false);
        console.log("[PlayerContext] 📵 Background — hard paused at", savedTimeRef.current);
      }
    };

    const onVisible = () => {
      // Do NOT call play() or resumeAudioContext() here.
      // Restore saved position silently so user resumes from the right spot.
      if (savedTimeRef.current > 0 && Math.abs(audio.currentTime - savedTimeRef.current) > 0.5) {
        audio.currentTime = savedTimeRef.current;
        console.log("[PlayerContext] 👁 Restored position to", savedTimeRef.current);
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") hardPause();
      else onVisible();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", hardPause);
    window.addEventListener("blur",     hardPause);
    window.addEventListener("pageshow", onVisible);
    window.addEventListener("focus",    onVisible);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", hardPause);
      window.removeEventListener("blur",     hardPause);
      window.removeEventListener("pageshow", onVisible);
      window.removeEventListener("focus",    onVisible);
    };
  }, []);

  // ── Native audio events → React state ────────────────────────────────────
  useEffect(() => {
    const audio = audioRef.current;

    const onPlay = () => {
      resumeAudioContext();
      skipEffectRef.current = true;
      setIsPlaying(true);
    };

    const onPause = () => {
      if (audio.readyState < 2) return; // ignore load-time pause
      skipEffectRef.current = true;
      setIsPlaying(false);
    };

    const onEnded = () => {
      const dur = audio.duration;
      const ct  = audio.currentTime;
      if (!isFinite(dur) || dur <= 0 || ct < dur - 1.5) return; // spurious
      skipEffectRef.current = true;
      setIsPlaying(false);
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
  }, []);

  // ── Media Session ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!("mediaSession" in navigator) || !currentTrack) return;

    const artSrc = currentTrack.cover_url ||
      "https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?w=512&h=512&fit=crop&q=80";

    navigator.mediaSession.metadata = new MediaMetadata({
      title:  currentTrack.title || "Unknown",
      artist: currentTrack.artist_display || currentTrack.artist || "Upper Vibe Media",
      album:  "Upper Vibe Media",
      artwork: [{ src: artSrc, sizes: "512x512", type: "image/jpeg" }],
    });

    navigator.mediaSession.setActionHandler("play", () => {
      const audio = audioRef.current;
      if (!audio.src || audio.src === window.location.href) return;
      resumeAudioContext();
      if (savedTimeRef.current > 0 && Math.abs(audio.currentTime - savedTimeRef.current) > 0.5) {
        audio.currentTime = savedTimeRef.current;
      }
      audio.play().catch(() => {});
      setIsPlaying(true);
    });

    navigator.mediaSession.setActionHandler("pause", () => {
      const audio = audioRef.current;
      if (!audio.paused) {
        savedTimeRef.current = audio.currentTime;
        audio.pause();
      }
      setIsPlaying(false);
    });

    navigator.mediaSession.setActionHandler("nexttrack",     () => onNextRef.current?.());
    navigator.mediaSession.setActionHandler("previoustrack", () => onPrevRef.current?.());

    return () => {
      ["play","pause","nexttrack","previoustrack"].forEach((a) => {
        try { navigator.mediaSession.setActionHandler(a, null); } catch {}
      });
    };
  }, [currentTrack]);

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
  }, [isPlaying]);

  // ── Public API ────────────────────────────────────────────────────────────
  const playTrack = useCallback((track, source = "song") => {
    getOrCreateAudioContext(audioRef.current);
    setSourceType(source);
    setCurrentTrack(track);
  }, []);

  const togglePlay = useCallback(() => {
    setIsPlaying((prev) => {
      if (!prev) getOrCreateAudioContext(audioRef.current);
      return !prev;
    });
  }, []);

  const stopPlaying = useCallback(() => {
    const audio = audioRef.current;
    audio.pause();
    audio.src = "";
    loadedSrcRef.current  = "";
    savedTimeRef.current  = 0;
    setIsPlaying(false);
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