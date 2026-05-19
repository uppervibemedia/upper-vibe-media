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
      console.log("[PlayerContext] ✅ AudioContext source node wired to single analyser");
    } catch (e) {
      // Already connected — reuse existing
      console.log("[PlayerContext] ℹ️ Source node already created, reusing");
    }
  }

  return _analyser;
}

// Expose for direct resume calls (e.g. on user gestures, visibility restore)
export function resumeGlobalAudioContext() {
  resumeAudioContext();
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
      // iOS: AudioContext is suspended when triggered from lock screen
      resumeAudioContext();
      const audio = audioRef.current;
      // Small delay ensures AudioContext is running before play()
      setTimeout(() => {
        resumeAudioContext();
        audio.play().catch(() => {});
      }, 50);
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

      const audio = audioRef.current;

      // Step 1: Always resume AudioContext first — iOS suspends it on lock
      resumeAudioContext();
      console.log("[PlayerContext] 🔊 AudioContext resume requested on visibility restore");

      // Step 2: If we were playing and audio is paused (iOS killed it), restart
      if (isPlayingRef.current && audio.src && audio.paused) {
        // Small delay to let AudioContext fully resume before calling play()
        setTimeout(() => {
          resumeAudioContext();
          if (isPlayingRef.current && audio.paused) {
            audio.play().catch(() => {});
            console.log("[PlayerContext] ▶️ Resumed after visibility restore");
          }
        }, 100);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // ← empty deps: registered exactly once, reads state via ref

  // ── Sync isPlaying from audio element events (handles native pause by OS) ─
  useEffect(() => {
    const audio = audioRef.current;

    const onPlay  = () => {
      // iOS Safari: AudioContext gets suspended on lock — resume it every time
      // audio starts playing (including after lock-screen play button)
      resumeAudioContext();
      setIsPlaying(true);
    };
    const onPause = () => {
      // Trust all pause events from the OS/browser EXCEPT the brief interim pause
      // that fires synchronously during audio.load() before src is ready.
      // readyState === 0 (HAVE_NOTHING) means we're mid-load — ignore that pause.
      if (audio.readyState > 0) {
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
    // Wire audio graph + resume AudioContext on every user-initiated play (iOS requirement)
    // This must happen here so radio playback benefits from the same lifecycle management
    // as regular song playback, even when the visualizer is not mounted.
    getOrCreateAudioContext(audioRef.current);
    setSourceType(source);
    setCurrentTrack(track);
    console.log("[PlayerContext] 🎵 playTrack called:", track?.title, "| source:", source);
  }, []);

  const togglePlay = useCallback(() => {
    setIsPlaying((prev) => {
      if (!prev) {
        // Wire graph + resume AudioContext (iOS Safari requirement)
        getOrCreateAudioContext(audioRef.current);
      }
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