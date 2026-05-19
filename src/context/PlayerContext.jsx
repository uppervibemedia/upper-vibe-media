import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from "react";

const PlayerContext = createContext(null);

// ─── ONE global audio element, created once, never recreated ───────────────
const persistentAudio = (() => {
  if (typeof window === "undefined") return null;
  const a = new Audio();
  a.crossOrigin = "anonymous";
  a.preload   = "auto";
  // Debug: confirm only one instance exists
  console.log("[PlayerContext] ✅ Single global Audio element created");
  return a;
})();

// ─── ONE global AudioContext — shared with the visualizer ──────────────────
let _audioCtx    = null;
let _analyser    = null;
let _sourceNode  = null;

function getOrCreateAudioContext(audioElement) {
  if (!audioElement) return null;

  if (!_audioCtx) {
    _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    window._uvAudioCtx = _audioCtx;
    console.log("[PlayerContext] ✅ Single global AudioContext created");
  }
  if (_audioCtx.state === "suspended" || _audioCtx.state === "interrupted") {
    _audioCtx.resume().catch(() => {});
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
      console.log("[PlayerContext] ✅ AudioContext source node wired to single analyser");
    } catch (e) {
      // Already connected — reuse existing
      console.log("[PlayerContext] ℹ️ Source node already created, reusing");
    }
  }

  return _analyser;
}

// Expose for visualizer components
export function getGlobalAnalyser(audioElement) {
  return getOrCreateAudioContext(audioElement);
}

export function PlayerProvider({ children }) {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying,    setIsPlaying]    = useState(false);
  const [queue,        setQueue]        = useState([]);
  const [sourceType,   setSourceType]   = useState("song");

  const audioRef    = useRef(persistentAudio);
  const onNextRef   = useRef(null);
  const onPrevRef   = useRef(null);

  // Track whether the current track was already loaded to avoid re-loading
  const loadedSrcRef = useRef("");

  // ── Load & play a new track ───────────────────────────────────────────────
  useEffect(() => {
    if (!currentTrack?.audio_url) return;
    const audio = audioRef.current;

    // Only reload if URL actually changed
    if (audio.src === currentTrack.audio_url || loadedSrcRef.current === currentTrack.audio_url) {
      // Same track — just ensure we're playing
      if (audio.paused) audio.play().catch(() => {});
      setIsPlaying(true);
      return;
    }

    loadedSrcRef.current = currentTrack.audio_url;
    audio.src = currentTrack.audio_url;
    audio.load();
    audio.play().catch(() => {});
    setIsPlaying(true);

    console.log("[PlayerContext] ▶️ Playing:", currentTrack.title);
  }, [currentTrack]);

  // ── Sync play/pause to the element (never re-seek / re-load) ─────────────
  // Use a ref to avoid the effect running on mount with isPlaying=false before a track is set
  const mountedRef = useRef(false);
  useEffect(() => {
    if (!mountedRef.current) { mountedRef.current = true; return; }
    const audio = audioRef.current;
    if (!audio.src) return; // nothing loaded yet

    if (isPlaying) {
      if (audio.paused) {
        audio.play().catch(() => {});
        console.log("[PlayerContext] ▶️ play() called from isPlaying sync");
      }
    } else {
      if (!audio.paused) {
        audio.pause();
        console.log("[PlayerContext] ⏸ pause() called from isPlaying sync");
      }
    }
  }, [isPlaying]);

  // ── Media Session — lock screen metadata & controls ──────────────────────
  useEffect(() => {
    if (!("mediaSession" in navigator) || !currentTrack) return;

    const artwork = currentTrack.cover_url
      ? [{ src: currentTrack.cover_url, sizes: "512x512", type: "image/jpeg" }]
      : [];

    navigator.mediaSession.metadata = new MediaMetadata({
      title:  currentTrack.title  || "Unknown",
      artist: currentTrack.artist_display || currentTrack.artist || "Upper Vibe Media",
      album:  "Upper Vibe Media",
      artwork,
    });

    // Always re-register handlers so they have fresh closure state via refs
    navigator.mediaSession.setActionHandler("play", () => {
      const audio = audioRef.current;
      audio.play().catch(() => {});
      setIsPlaying(true);
    });
    navigator.mediaSession.setActionHandler("pause", () => {
      audioRef.current.pause();
      setIsPlaying(false);
    });
    navigator.mediaSession.setActionHandler("nexttrack", () => {
      onNextRef.current?.();
    });
    navigator.mediaSession.setActionHandler("previoustrack", () => {
      onPrevRef.current?.();
    });

    return () => {
      ["play", "pause", "nexttrack", "previoustrack"].forEach((action) => {
        try { navigator.mediaSession.setActionHandler(action, null); } catch {}
      });
    };
  }, [currentTrack]);

  // ── Keep Media Session playback state in sync ─────────────────────────────
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
  }, [isPlaying]);

  // ── Page visibility — phone unlock / tab return ───────────────────────────
  // Single listener registered once, reads latest isPlaying via a ref to avoid stacking
  const isPlayingRef = useRef(isPlaying);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;

      console.log("[PlayerContext] 👁 Page became visible");

      // Resume suspended AudioContext (iOS Safari suspends it on page hide)
      if (_audioCtx?.state === "suspended") {
        _audioCtx.resume().catch(() => {});
        console.log("[PlayerContext] 🔊 AudioContext resumed");
      }

      const audio = audioRef.current;
      // Only re-play if we were playing AND audio actually paused (e.g. iOS killed it)
      if (isPlayingRef.current && audio.src && audio.paused) {
        audio.play().catch(() => {});
        console.log("[PlayerContext] ▶️ Resumed after visibility restore");
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // ← empty deps: registered exactly once, reads state via ref

  // ── Sync isPlaying from audio element events (handles native pause by OS) ─
  useEffect(() => {
    const audio = audioRef.current;

    const onPlay  = () => { setIsPlaying(true);  };
    const onPause = () => {
      // Don't set paused if the pause was caused by a src load (interim pause)
      // We check: if src is still set and readyState > 0 we trust the OS pause
      if (audio.src && audio.readyState > 0) {
        setIsPlaying(false);
      }
    };
    const onEnded = () => { setIsPlaying(false); onNextRef.current?.(); };

    audio.addEventListener("play",   onPlay);
    audio.addEventListener("pause",  onPause);
    audio.addEventListener("ended",  onEnded);
    return () => {
      audio.removeEventListener("play",   onPlay);
      audio.removeEventListener("pause",  onPause);
      audio.removeEventListener("ended",  onEnded);
    };
  }, []); // ← registered exactly once

  // ── Public API ────────────────────────────────────────────────────────────
  const playTrack = useCallback((track, source = "song") => {
    setSourceType(source);
    setCurrentTrack(track);
    console.log("[PlayerContext] 🎵 playTrack called:", track?.title, "| source:", source);
  }, []);

  const togglePlay = useCallback(() => {
    setIsPlaying((prev) => {
      console.log("[PlayerContext] 🔀 togglePlay:", prev ? "→ pause" : "→ play");
      return !prev;
    });
  }, []);

  const stopPlaying = useCallback(() => {
    const audio = audioRef.current;
    audio.pause();
    audio.src       = "";
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