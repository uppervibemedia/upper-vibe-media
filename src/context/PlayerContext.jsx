import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from "react";

const PlayerContext = createContext(null);

// ONE global audio element — never recreated
const persistentAudio = (() => {
  if (typeof window === "undefined") return null;
  const a = new Audio();
  a.crossOrigin = "anonymous";
  a.preload = "auto";
  a.setAttribute("x-webkit-airplay", "allow");
  a.setAttribute("playsinline", "");
  return a;
})();

// Shared hidden ref — AudioPlayer reads this to freeze progress bar
// without needing its own visibilitychange listener
export const sharedHiddenRef = { current: false };

// ONE global AudioContext — shared with visualizer
let _audioCtx   = null;
let _analyser   = null;
let _sourceNode = null;

// Returns a promise that resolves once AudioContext is truly running
// Awaiting this before play() prevents the "catch-up burst" glitch
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

export function resumeGlobalAudioContext() { resumeAudioContext().catch(() => {}); }
export function getGlobalAnalyser(audioElement) { return getOrCreateAudioContext(audioElement); }

export function PlayerProvider({ children }) {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying,    setIsPlaying]    = useState(false);
  const [queue,        setQueue]        = useState([]);
  const [sourceType,   setSourceType]   = useState("song");
  // savedTime > 0 means we paused mid-song on hide — UI shows Resume
  const [savedTime,    setSavedTime]    = useState(0);

  const audioRef        = useRef(persistentAudio);
  const onNextRef       = useRef(null);
  const onPrevRef       = useRef(null);
  const loadedSrcRef    = useRef("");
  const savedTimeRef    = useRef(0); // synchronous mirror of savedTime state
  const playLockRef     = useRef(false); // prevents stacked play() calls

  // Safe play: awaits AudioContext, forces playbackRate=1, guards against stacking
  const safePlay = useCallback(async (audio) => {
    if (playLockRef.current) {
      console.log("[Player] play() skipped — lock active");
      return;
    }
    playLockRef.current = true;
    try {
      // Must await so AudioContext is RUNNING before audio starts — prevents catch-up burst
      await resumeAudioContext();
      // Force rate to 1 — guards against any OS/browser catch-up rate adjustment
      audio.playbackRate = 1;
      audio.defaultPlaybackRate = 1;
      console.log("[Player] play() →", {
        currentTime: audio.currentTime,
        playbackRate: audio.playbackRate,
        audioCtxState: _audioCtx?.state,
      });
      await audio.play();
    } catch (err) {
      if (err.name !== "AbortError") console.warn("[Player] play() error:", err);
    } finally {
      playLockRef.current = false;
    }
  }, []);

  // ── Save / clear position helpers ────────────────────────────────────────
  const savePosition = useCallback((time) => {
    savedTimeRef.current = time;
    setSavedTime(time);
  }, []);

  const clearPosition = useCallback(() => {
    savedTimeRef.current = 0;
    setSavedTime(0);
  }, []);

  // ── Load & play a new track ───────────────────────────────────────────────
  useEffect(() => {
    if (!currentTrack?.audio_url) return;
    const audio = audioRef.current;

    const isSameTrack =
      loadedSrcRef.current === currentTrack.audio_url ||
      audio.src === currentTrack.audio_url ||
      (audio.src && audio.src.endsWith(currentTrack.audio_url));

    if (isSameTrack) {
      if (audio.paused) safePlay(audio);
      return;
    }

    // New track — clear any saved position from previous track
    clearPosition();
    loadedSrcRef.current = currentTrack.audio_url;
    audio.src = currentTrack.audio_url;
    audio.load();
    safePlay(audio);
  }, [currentTrack, clearPosition, safePlay]);

  // ── Sync isPlaying + Media Session metadata from native audio events ─────
  // Merged: single play listener handles both isPlaying state AND metadata refresh
  useEffect(() => {
    const audio = audioRef.current;
    const onPlay  = () => {
      setIsPlaying(true);
      // Re-set metadata here — Safari needs this AFTER playback begins
      if (currentTrack) setMediaSessionMetadata(currentTrack);
    };
    const onPause = () => setIsPlaying(false);
    const onEnded = () => {
      setIsPlaying(false);
      clearPosition();
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearPosition, currentTrack]);

  // ── Unified visibility/background handler ────────────────────────────────
  // Single visibilitychange + pagehide/pageshow listener owns all hide/show logic.
  // AudioPlayer reads a shared hiddenRef (exported below) to freeze its progress bar —
  // no second visibilitychange listener needed in the UI layer.
  //
  // On hide: pause immediately, save time, set isPlaying=false (stops animations)
  // On show: sync isPlaying from real audio state only — never auto-play
  useEffect(() => {
    const audio = audioRef.current;

    const onHide = () => {
      if (!audio.src || audio.paused) return;
      const ct = audio.currentTime;
      audio.pause();
      savePosition(ct);
      setIsPlaying(false);
      // Signal AudioPlayer to freeze its progress bar
      sharedHiddenRef.current = true;
    };

    const onShow = () => {
      sharedHiddenRef.current = false;
      // Sync UI to real audio state — never call play()
      setIsPlaying(!audio.paused && !audio.ended);
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") onHide();
      else onShow();
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onHide);
    window.addEventListener("pageshow", onShow);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onHide);
      window.removeEventListener("pageshow", onShow);
    };
  }, [savePosition]);

  // ── Media Session (lock screen controls) ─────────────────────────────────
  // Helper: validate artwork URL is absolute HTTPS (Safari requirement)
  const FALLBACK_ART = "https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?w=512&h=512&fit=crop&q=80";

  function resolveArtworkUrl(url) {
    if (!url) return FALLBACK_ART;
    // Must be absolute HTTPS — no blobs, no relative, no http
    if (url.startsWith("https://")) return url;
    return FALLBACK_ART;
  }

  function setMediaSessionMetadata(track) {
    if (!("mediaSession" in navigator) || !track) return;

    const rawUrl  = track.cover_url;
    const artSrc  = resolveArtworkUrl(rawUrl);
    const title   = track.title   || "Unknown";
    const artist  = track.artist_display || track.artist || "Upper Vibe Media";

    console.log("[MediaSession] Setting metadata:", {
      title,
      artist,
      cover_url: rawUrl,
      artworkUsed: artSrc,
    });

    // Probe the image so we can warn if Safari will reject it
    const img = new Image();
    img.onload  = () => console.log("[MediaSession] Artwork loaded OK:", artSrc);
    img.onerror = () => console.warn("[MediaSession] Artwork FAILED to load:", artSrc);
    img.src = artSrc;

    navigator.mediaSession.metadata = new MediaMetadata({
      title,
      artist,
      album: "Upper Vibe Media",
      artwork: [
        { src: artSrc, sizes: "512x512",   type: "image/jpeg" },
        { src: artSrc, sizes: "1024x1024", type: "image/jpeg" },
      ],
    });
  }

  // Set metadata whenever track changes (covers PWA / already-playing case)
  // The play event also re-sets metadata (merged into the play listener above)
  useEffect(() => {
    if (!currentTrack) return;
    setMediaSessionMetadata(currentTrack);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack]);

  // Register Media Session action handlers (separate from metadata)
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;

    navigator.mediaSession.setActionHandler("play", () => {
      const audio = audioRef.current;
      if (!audio.src) return;
      if (savedTimeRef.current > 0 && isFinite(audio.duration) && audio.duration > 0) {
        audio.currentTime = savedTimeRef.current;
        clearPosition();
      }
      safePlay(audio);
    });

    navigator.mediaSession.setActionHandler("pause", () => {
      const audio = audioRef.current;
      if (!audio.paused) {
        savePosition(audio.currentTime);
        audio.pause();
      }
    });

    navigator.mediaSession.setActionHandler("nexttrack",     () => onNextRef.current?.());
    navigator.mediaSession.setActionHandler("previoustrack", () => onPrevRef.current?.());

    return () => {
      ["play", "pause", "nexttrack", "previoustrack"].forEach((a) => {
        try { navigator.mediaSession.setActionHandler(a, null); } catch {}
      });
    };
  }, [clearPosition, savePosition]);

  // Keep Media Session badge in sync
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
  }, [isPlaying]);

  // ── Public API ────────────────────────────────────────────────────────────
  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio.src) return;
    if (audio.paused) {
      // Restore saved position if we paused on hide
      if (savedTimeRef.current > 0 && isFinite(audio.duration) && audio.duration > 0) {
        audio.currentTime = savedTimeRef.current;
        clearPosition();
      }
      safePlay(audio);
    } else {
      savePosition(audio.currentTime);
      audio.pause();
    }
  }, [clearPosition, savePosition, safePlay]);

  const playTrack = useCallback((track, source = "song") => {
    // Ensure AudioContext graph is wired (idempotent) — playback happens in the load effect
    getOrCreateAudioContext(audioRef.current);
    setSourceType(source);
    setCurrentTrack(track);
  }, []);

  const stopPlaying = useCallback(() => {
    const audio = audioRef.current;
    audio.pause();
    audio.src = "";
    loadedSrcRef.current = "";
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
      savedTime,   // > 0 when paused at a saved mid-song position
      isPWA: false,
      pwaPausedAt: savedTime,
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