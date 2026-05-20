import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from "react";

const PlayerContext = createContext(null);

// ─── ONE global audio element — never recreated ────────────────────────────
const persistentAudio = (() => {
  if (typeof window === "undefined") return null;
  const a = new Audio();
  a.crossOrigin = "anonymous";
  a.preload = "auto";
  a.setAttribute("x-webkit-airplay", "allow");
  a.setAttribute("webkit-airplay", "allow");
  a.setAttribute("playsinline", "");
  a.setAttribute("webkit-playsinline", "");
  return a;
})();

// ─── ONE global AudioContext — shared with visualizer ─────────────────────
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

// ─── safePlay — single guard, handles low readyState ─────────────────────
// _actionLock prevents stacked play/pause calls within 500ms
let _actionLock = false;
function lockAction(ms = 500) {
  _actionLock = true;
  setTimeout(() => { _actionLock = false; }, ms);
}

function safePlay(audio) {
  if (_actionLock) return;
  lockAction();
  resumeAudioContext();

  if (audio.readyState >= 3) {
    audio.play().catch(() => {});
  } else {
    // Not enough data — reload from current position, then play on canplay
    const savedTime = audio.currentTime;
    const onCanPlay = () => {
      audio.removeEventListener("canplay", onCanPlay);
      // Restore position in case load() reset it
      if (savedTime > 0 && Math.abs(audio.currentTime - savedTime) > 0.5) {
        audio.currentTime = savedTime;
      }
      audio.play().catch(() => {});
    };
    audio.addEventListener("canplay", onCanPlay);
    if (
      audio.networkState === HTMLMediaElement.NETWORK_IDLE ||
      audio.networkState === HTMLMediaElement.NETWORK_EMPTY
    ) {
      audio.load();
    }
  }
}

function safePause(audio) {
  if (_actionLock) return;
  lockAction();
  if (!audio.paused) audio.pause();
}

export function PlayerProvider({ children }) {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying,    setIsPlaying]    = useState(false);
  const [queue,        setQueue]        = useState([]);
  const [sourceType,   setSourceType]   = useState("song");

  const audioRef     = useRef(persistentAudio);
  const onNextRef    = useRef(null);
  const onPrevRef    = useRef(null);
  const loadedSrcRef = useRef("");

  // ── Load & play a new track ───────────────────────────────────────────────
  useEffect(() => {
    if (!currentTrack?.audio_url) return;
    const audio = audioRef.current;

    const isSameTrack =
      loadedSrcRef.current === currentTrack.audio_url ||
      audio.src === currentTrack.audio_url ||
      (audio.src && audio.src.endsWith(currentTrack.audio_url));

    if (isSameTrack) {
      // Same song already loaded — just resume, don't reload or reset time
      if (audio.paused) safePlay(audio);
      return;
    }

    // New track — load and play
    loadedSrcRef.current = currentTrack.audio_url;
    audio.src = currentTrack.audio_url;
    audio.load();
    audio.play().catch((err) => {
      if (err.name !== "AbortError") console.warn("[PlayerContext] play() error:", err);
    });
  }, [currentTrack]);

  // ── Sync React state FROM native audio events (single mount) ─────────────
  // isPlaying is DERIVED from the real audio element, not the other way around.
  useEffect(() => {
    const audio = audioRef.current;

    const onPlay  = () => {
      resumeAudioContext();
      lastTimeRef.current = audio.currentTime;
      setIsPlaying(true);
      startStallDetector();
    };
    const onPause = () => {
      if (audio.readyState >= 2) {
        setIsPlaying(false);
        stopStallDetector();
      }
    };
    const onEnded = () => {
      const dur = audio.duration;
      const ct  = audio.currentTime;
      if (!isFinite(dur) || dur <= 0 || ct < dur - 1.5) return; // spurious
      setIsPlaying(false);
      stopStallDetector();
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
  }, [startStallDetector, stopStallDetector]);

  // ── Background/lock-screen + fake-playback handling ─────────────────────
  //
  // Both Safari and PWA/standalone:
  //   → Do NOT auto-pause on visibilitychange or pagehide.
  //   → Media Session handlers own play/pause for lock screen / Control Center.
  //   → On return, sync React UI state from actual audio element.
  //   → Never reload src, never reset currentTime.
  //
  // PWA-only stall detector:
  //   iOS PWA suspends audio on lock but never fires "pause". currentTime
  //   freezes while isPlaying stays true → fake progress bar.
  //   Fix: poll every 2s. If currentTime hasn't moved and audio isn't
  //   genuinely paused/ended, treat it as stalled → set isPlaying = false.
  //
  const savedTimeRef   = useRef(0);
  const lastTimeRef    = useRef(0);
  const stallTimerRef  = useRef(null);

  // Start/stop the stall-detector based on isPlaying state
  const startStallDetector = useCallback(() => {
    const isStandalone =
      window.navigator.standalone === true ||
      window.matchMedia("(display-mode: standalone)").matches;
    if (!isStandalone) return;

    if (stallTimerRef.current) return; // already running
    const audio = audioRef.current;
    lastTimeRef.current = audio.currentTime;

    stallTimerRef.current = setInterval(() => {
      const a = audioRef.current;
      if (!a.src) return;

      // If audio element is already paused/ended/errored → just sync UI
      if (a.paused || a.ended || a.error) {
        setIsPlaying(false);
        return;
      }

      // Check if currentTime advanced since last poll
      const now = a.currentTime;
      if (Math.abs(now - lastTimeRef.current) < 0.1) {
        // Time hasn't moved — audio is silently stalled (iOS lock-screen kill)
        savedTimeRef.current = now; // save position for resume
        setIsPlaying(false);
      } else {
        lastTimeRef.current = now;
      }
    }, 2000);
  }, []);

  const stopStallDetector = useCallback(() => {
    if (stallTimerRef.current) {
      clearInterval(stallTimerRef.current);
      stallTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    const audio = audioRef.current;

    const syncUI = () => {
      if (!audio.src) return;
      const playing = !audio.paused && !audio.ended && !audio.error;
      setIsPlaying(playing);
      if (playing) {
        lastTimeRef.current = audio.currentTime;
        startStallDetector();
      } else {
        stopStallDetector();
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") syncUI();
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pageshow", syncUI);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pageshow", syncUI);
      stopStallDetector();
    };
  }, [startStallDetector, stopStallDetector]);

  // ── Media Session — lock screen / Control Center ──────────────────────────
  // Re-registered every time currentTrack changes.
  // Handlers call safePlay/safePause directly — never togglePlay, never playTrack.
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

    // These handlers are the authoritative source of truth for native controls.
    // They do NOT call togglePlay / playTrack — that would reload the src.
    navigator.mediaSession.setActionHandler("play", () => {
      const audio = audioRef.current;
      if (!audio.src || audio.src === window.location.href) return;
      // Restore position saved by stall detector (PWA lock-screen suspend)
      if (
        savedTimeRef.current > 0 &&
        isFinite(audio.duration) &&
        audio.duration > 0 &&
        Math.abs(audio.currentTime - savedTimeRef.current) > 0.5
      ) {
        audio.currentTime = savedTimeRef.current;
      }
      savedTimeRef.current = 0;
      safePlay(audio);
    });

    navigator.mediaSession.setActionHandler("pause", () => {
      safePause(audioRef.current);
    });

    navigator.mediaSession.setActionHandler("nexttrack",     () => onNextRef.current?.());
    navigator.mediaSession.setActionHandler("previoustrack", () => onPrevRef.current?.());

    return () => {
      ["play", "pause", "nexttrack", "previoustrack"].forEach((a) => {
        try { navigator.mediaSession.setActionHandler(a, null); } catch {}
      });
    };
  }, [currentTrack]);

  // ── Keep Media Session playback badge in sync ─────────────────────────────
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
  }, [isPlaying]);

  // ── Public API ────────────────────────────────────────────────────────────

  // togglePlay — used by website UI buttons only, never by Media Session
  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio.src) return;
    if (audio.paused) {
      // Restore position saved by stall detector (PWA lock-screen suspend)
      if (
        savedTimeRef.current > 0 &&
        isFinite(audio.duration) &&
        audio.duration > 0 &&
        Math.abs(audio.currentTime - savedTimeRef.current) > 0.5
      ) {
        audio.currentTime = savedTimeRef.current;
        savedTimeRef.current = 0;
      }
      safePlay(audio);
    } else {
      safePause(audio);
    }
    // isPlaying updates via native play/pause event listeners — not set here
  }, []);

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