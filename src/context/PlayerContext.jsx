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
  console.log("[PlayerContext] ✅ Single global Audio element created");
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
    console.log("[PlayerContext] ✅ Single global AudioContext created");
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
      console.log("[PlayerContext] ✅ AudioContext source node wired");
    } catch (e) {
      console.log("[PlayerContext] ℹ️ Source node already created, reusing");
    }
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

  const audioRef   = useRef(persistentAudio);
  const onNextRef  = useRef(null);
  const onPrevRef  = useRef(null);
  const loadedSrcRef = useRef("");

  // ── Load & play a new track ───────────────────────────────────────────────
  useEffect(() => {
    if (!currentTrack?.audio_url) return;
    const audio = audioRef.current;

    // Guard: only reload if the URL actually changed
    const isSameTrack =
      loadedSrcRef.current === currentTrack.audio_url ||
      audio.src === currentTrack.audio_url ||
      (audio.src && audio.src.endsWith(currentTrack.audio_url));

    if (isSameTrack) {
      if (audio.paused) audio.play().catch(() => {});
      setIsPlaying(true);
      return;
    }

    loadedSrcRef.current = currentTrack.audio_url;
    audio.src = currentTrack.audio_url;
    audio.load();
    audio.play().catch((err) => {
      if (err.name !== "AbortError") console.warn("[PlayerContext] play() error:", err);
    });
    setIsPlaying(true);
    console.log("[PlayerContext] ▶️ Playing:", currentTrack.title);
  }, [currentTrack]);

  // ── Sync play/pause state to the audio element ───────────────────────────
  const mountedRef = useRef(false);
  useEffect(() => {
    if (!mountedRef.current) { mountedRef.current = true; return; }
    const audio = audioRef.current;
    if (!audio.src) return;

    if (isPlaying) {
      if (audio.paused) {
        audio.play().catch((err) => {
          if (err.name !== "AbortError") console.warn("[PlayerContext] play() sync error:", err);
        });
      }
    } else {
      if (!audio.paused) audio.pause();
    }
  }, [isPlaying]);

  // ── Media Session — lock screen + AirPlay controls ───────────────────────
  useEffect(() => {
    if (!("mediaSession" in navigator) || !currentTrack) return;

    // Use cover art if available, fallback to Upper Vibe Media logo
    const artSrc = currentTrack.cover_url ||
      "https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?w=512&h=512&fit=crop&q=80";
    const artwork = [
      { src: artSrc, sizes: "512x512", type: "image/jpeg" },
    ];

    navigator.mediaSession.metadata = new MediaMetadata({
      title:  currentTrack.title || "Unknown",
      artist: currentTrack.artist_display || currentTrack.artist || "Upper Vibe Media",
      album:  "Upper Vibe Media",
      artwork,
    });

    navigator.mediaSession.setActionHandler("play", () => {
      resumeAudioContext();
      const audio = audioRef.current;

      // Guard: no src loaded — do nothing (prevents AirPlay from reloading)
      if (!audio.src || audio.src === "" || audio.src === window.location.href) {
        console.log("[MediaSession] play: no src, ignoring");
        return;
      }

      // Save time BEFORE play() — Safari/AirPlay can zero currentTime on route switch
      const savedTime = audio.currentTime;

      setTimeout(() => {
        resumeAudioContext();
        // Restore if Safari zeroed it during AirPlay route switch
        if (savedTime > 1 && audio.currentTime < 1) {
          audio.currentTime = savedTime;
          console.log("[MediaSession] ⏱ Restored currentTime:", savedTime);
        }
        audio.play().catch(() => {});
      }, 50);

      setIsPlaying(true);
    });

    navigator.mediaSession.setActionHandler("pause", () => {
      audioRef.current.pause();
      setIsPlaying(false);
    });

    navigator.mediaSession.setActionHandler("nexttrack", () => onNextRef.current?.());
    navigator.mediaSession.setActionHandler("previoustrack", () => onPrevRef.current?.());

    return () => {
      ["play", "pause", "nexttrack", "previoustrack"].forEach((a) => {
        try { navigator.mediaSession.setActionHandler(a, null); } catch {}
      });
    };
  }, [currentTrack]);

  // ── Keep Media Session playback state in sync ─────────────────────────────
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
  }, [isPlaying]);

  // ── Page visibility: resume AudioContext only, never pause ──────────────
  // iOS keeps the audio element alive in the background as long as we never
  // pause it programmatically. The only thing we do on foreground is ensure
  // the AudioContext is running (browsers suspend it silently).
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        resumeAudioContext();
      }
      // Do NOT pause on hidden — that kills background audio on iOS
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  // ── Sync isPlaying from native audio element events ───────────────────────
  useEffect(() => {
    const audio = audioRef.current;

    const onPlay  = () => {
      resumeAudioContext();
      setIsPlaying(true);
    };
    const onPause = () => {
      // Ignore interim pause during audio.load() (readyState === 0)
      if (audio.readyState > 0) setIsPlaying(false);
    };
    const onEnded = () => {
      // Guard spurious "ended" from AirPlay/Cast route switch
      const dur = audio.duration;
      const ct  = audio.currentTime;
      const isRealEnd = isFinite(dur) && dur > 0 && ct >= dur - 1.5;
      if (!isRealEnd) {
        console.log("[PlayerContext] ⚠️ Spurious ended (AirPlay switch?)", { ct, dur });
        return;
      }
      console.log("[PlayerContext] ✅ Real track end — next");
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

  // ── Public API ────────────────────────────────────────────────────────────
  const playTrack = useCallback((track, source = "song") => {
    getOrCreateAudioContext(audioRef.current);
    setSourceType(source);
    setCurrentTrack(track);
    console.log("[PlayerContext] 🎵 playTrack:", track?.title, "| source:", source);
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
    loadedSrcRef.current = "";
    setIsPlaying(false);
    setCurrentTrack(null);
    console.log("[PlayerContext] ⏹ stopped");
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