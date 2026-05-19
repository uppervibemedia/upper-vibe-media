import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from "react";

const PlayerContext = createContext(null);

// ─── ONE global audio element, created once, never recreated ───────────────
const persistentAudio = (() => {
  if (typeof window === "undefined") return null;
  const a = new Audio();
  a.crossOrigin = "anonymous";
  a.preload     = "auto";
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

  const audioRef       = useRef(persistentAudio);
  const onNextRef      = useRef(null);
  const onPrevRef      = useRef(null);
  const loadedSrcRef   = useRef("");
  // True while audio.load() is in flight — suppresses spurious pause events
  const isLoadingRef   = useRef(false);
  // Ref mirror of isPlaying for callbacks registered with empty deps
  const isPlayingRef   = useRef(false);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

  // ── Load & play a new track ───────────────────────────────────────────────
  useEffect(() => {
    if (!currentTrack?.audio_url) return;
    const audio = audioRef.current;

    if (loadedSrcRef.current === currentTrack.audio_url) {
      // Same URL — just play if paused
      if (audio.paused) {
        resumeAudioContext();
        audio.play().catch(() => {});
      }
      setIsPlaying(true);
      return;
    }

    // New URL — load and play
    isLoadingRef.current = true;
    loadedSrcRef.current = currentTrack.audio_url;
    audio.src = currentTrack.audio_url;
    audio.load();
    // Clear loading flag after the synchronous pause event has fired (~100ms is enough,
    // 300ms gives extra margin for slow devices)
    setTimeout(() => { isLoadingRef.current = false; }, 300);

    resumeAudioContext();
    audio.play().catch(() => {});
    setIsPlaying(true);

    console.log("[PlayerContext] ▶️ Loading new track:", currentTrack.title);
  }, [currentTrack]);

  // ── Media Session metadata + action handlers ──────────────────────────────
  // Re-runs when currentTrack changes so metadata is always fresh.
  // Handlers read state via refs so they are always current without re-registering.
  useEffect(() => {
    if (!("mediaSession" in navigator) || !currentTrack) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title:   currentTrack.title       || "Unknown",
      artist:  currentTrack.artist_display || currentTrack.artist || "Upper Vibe Media",
      album:   "Upper Vibe Media",
      artwork: currentTrack.cover_url
        ? [{ src: currentTrack.cover_url, sizes: "512x512", type: "image/jpeg" }]
        : [],
    });

    navigator.mediaSession.setActionHandler("play", () => {
      const audio = audioRef.current;
      resumeAudioContext();
      // Small delay — iOS AudioContext needs a moment to un-suspend after lock
      setTimeout(() => {
        resumeAudioContext();
        if (audio.paused) audio.play().catch(() => {});
      }, 80);
      setIsPlaying(true);
      isPlayingRef.current = true;
    });

    navigator.mediaSession.setActionHandler("pause", () => {
      const audio = audioRef.current;
      audio.pause();
      setIsPlaying(false);
      isPlayingRef.current = false;
    });

    navigator.mediaSession.setActionHandler("nexttrack", () => {
      onNextRef.current?.();
    });

    navigator.mediaSession.setActionHandler("previoustrack", () => {
      onPrevRef.current?.();
    });

    // No cleanup — intentionally keep handlers alive across track changes
    // (nulling them would remove lock-screen controls between track loads)
  }, [currentTrack]);

  // ── Keep Media Session playback state in sync ─────────────────────────────
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
  }, [isPlaying]);

  // ── Audio element event listeners — registered ONCE ───────────────────────
  // These sync React state with what the audio element actually does.
  // Do NOT add isPlaying→audio.play/pause logic here — it would double-fire.
  useEffect(() => {
    const audio = audioRef.current;

    const onPlay = () => {
      resumeAudioContext();
      setIsPlaying(true);
      isPlayingRef.current = true;
    };

    const onPause = () => {
      // Ignore the spurious pause fired synchronously by audio.load() during track changes
      if (isLoadingRef.current) return;
      setIsPlaying(false);
      isPlayingRef.current = false;
    };

    const onEnded = () => {
      if (onNextRef.current) {
        // Let the next handler call playTrack() — it will set isPlaying(true) again
        onNextRef.current();
      } else {
        setIsPlaying(false);
        isPlayingRef.current = false;
      }
    };

    audio.addEventListener("play",   onPlay);
    audio.addEventListener("pause",  onPause);
    audio.addEventListener("ended",  onEnded);
    return () => {
      audio.removeEventListener("play",   onPlay);
      audio.removeEventListener("pause",  onPause);
      audio.removeEventListener("ended",  onEnded);
    };
  }, []); // ← exactly once

  // ── Page visibility — handle phone unlock ────────────────────────────────
  // Registered once. Reads latest state via isPlayingRef + isLoadingRef (both refs).
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;
      console.log("[PlayerContext] 👁 Page visible");

      const audio = audioRef.current;
      resumeAudioContext();

      // If we intended to be playing but audio was paused by the OS, restart it.
      // Guard: skip if a new track is still loading (it will call play() itself).
      if (isPlayingRef.current && audio.src && audio.paused && !isLoadingRef.current) {
        setTimeout(() => {
          resumeAudioContext();
          if (isPlayingRef.current && audio.src && audio.paused && !isLoadingRef.current) {
            audio.play().catch(() => {});
            console.log("[PlayerContext] ▶️ Resumed after unlock");
          }
        }, 150);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []); // ← exactly once

  // ── Public API ────────────────────────────────────────────────────────────

  const playTrack = useCallback((track, source = "song") => {
    getOrCreateAudioContext(audioRef.current);
    setSourceType(source);
    setCurrentTrack(track);
    console.log("[PlayerContext] 🎵 playTrack:", track?.title, "| source:", source);
  }, []);

  // togglePlay drives the audio element directly — no isPlaying→audio sync effect needed
  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio.src) return;

    if (audio.paused) {
      getOrCreateAudioContext(audio);
      resumeAudioContext();
      audio.play().catch(() => {});
      // setIsPlaying(true) will fire via the "play" event listener above
    } else {
      audio.pause();
      // setIsPlaying(false) will fire via the "pause" event listener above
    }
    console.log("[PlayerContext] 🔀 togglePlay");
  }, []);

  const stopPlaying = useCallback(() => {
    const audio = audioRef.current;
    audio.pause();
    audio.src        = "";
    loadedSrcRef.current = "";
    setIsPlaying(false);
    isPlayingRef.current = false;
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