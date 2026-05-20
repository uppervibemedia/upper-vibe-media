// v2
import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from "react";

const PlayerContext = createContext(null);

// ─── Detect PWA (standalone) mode once at module level ───────────────────
const IS_PWA = typeof window !== "undefined" && (
  window.navigator.standalone === true ||
  window.matchMedia("(display-mode: standalone)").matches
);

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
  const [currentTrack,   setCurrentTrack]   = useState(null);
  const [isPlaying,      setIsPlaying]      = useState(false);
  const [queue,          setQueue]          = useState([]);
  const [sourceType,     setSourceType]     = useState("song");
  const [pwaPausedAt,    setPwaPausedAt]    = useState(0); // >0 means PWA paused mid-song

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

  // ── Saved position ref (used by PWA pause-on-hide and resume) ────────────
  // savedTimeRef is the ref used synchronously in handlers.
  // pwaPausedAt is the React state mirror — drives UI (Resume button, frozen progress).
  const savedTimeRef = useRef(0);

  const savePWAPosition = useCallback((time) => {
    savedTimeRef.current = time;
    if (IS_PWA) setPwaPausedAt(time);
  }, []);

  const clearPWAPosition = useCallback(() => {
    savedTimeRef.current = 0;
    setPwaPausedAt(0);
  }, []);

  // ── Sync React state FROM native audio events (single mount) ─────────────
  // isPlaying is the ONLY source of truth — derived exclusively from the real
  // audio element. Every player UI reads this value; nothing else drives state.
  useEffect(() => {
    const audio = audioRef.current;

    const onPlay  = () => { resumeAudioContext(); setIsPlaying(true); };
    const onPause = () => { if (audio.readyState >= 2) setIsPlaying(false); };
    const onEnded = () => {
      const dur = audio.duration;
      const ct  = audio.currentTime;
      if (!isFinite(dur) || dur <= 0 || ct < dur - 1.5) return; // spurious
      setIsPlaying(false);
      onNextRef.current?.();
    };

    // iOS media player dismissed / audio unexpectedly interrupted:
    // abort + emptied fire when iOS kills or dismisses the native media player
    // without a clean "pause" event. Save position and sync UI immediately.
    const onHardStop = () => {
      savePWAPosition(audio.currentTime);
      setIsPlaying(false);
    };

    // stalled fires when iOS can't fetch more data (e.g. player was dismissed).
    // Only treat it as a stop if the audio element is already paused — otherwise
    // it's a normal buffering stall mid-playback and we leave playback state alone.
    const onStalled = () => {
      if (audio.paused) {
        savePWAPosition(audio.currentTime);
        setIsPlaying(false);
      }
    };

    audio.addEventListener("play",    onPlay);
    audio.addEventListener("pause",   onPause);
    audio.addEventListener("ended",   onEnded);
    audio.addEventListener("abort",   onHardStop);
    audio.addEventListener("emptied", onHardStop);
    audio.addEventListener("stalled", onStalled);

    return () => {
      audio.removeEventListener("play",    onPlay);
      audio.removeEventListener("pause",   onPause);
      audio.removeEventListener("ended",   onEnded);
      audio.removeEventListener("abort",   onHardStop);
      audio.removeEventListener("emptied", onHardStop);
      audio.removeEventListener("stalled", onStalled);
    };
  }, [savePWAPosition]);

  // ── Background / lock-screen handling ────────────────────────────────────
  //
  // PWA mode: proactively pause on hide — iOS can't reliably keep PWA audio
  //   alive through lock screen. Clean pause prevents corruption entirely.
  //   On return: only sync UI, never auto-play. User must press Play.
  //
  // Safari mode: let iOS handle background audio natively. On return,
  //   only sync UI state — never auto-play or auto-pause.
  //
  useEffect(() => {
    const audio = audioRef.current;

    const onHide = () => {
      if (!IS_PWA) return;
      if (!audio.src || audio.paused) return;
      // Proactively pause before iOS can suspend and corrupt the stream
      savePWAPosition(audio.currentTime);
      audio.pause();
      setIsPlaying(false);
    };

    const onShow = () => {
      if (!audio.src) return;
      // Sync UI from the real audio element — the single source of truth.
      // Never auto-play. If paused (PWA locked, iOS dismissed player), show paused.
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
  }, [savePWAPosition]);

  // ── Media Session — lock screen / Control Center ──────────────────────────
  // Safari mode: full media session with lock-screen controls.
  // PWA mode: skip entirely — we proactively pause on hide, no lock-screen
  //   controls needed and registering them can cause iOS to fight our pause.
  useEffect(() => {
    if (!("mediaSession" in navigator) || !currentTrack) return;
    if (IS_PWA) return; // PWA: no lock-screen controls — clean pause is the strategy

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
      if (savedTimeRef.current > 0 && isFinite(audio.duration) && audio.duration > 0) {
        audio.currentTime = savedTimeRef.current;
        clearPWAPosition();
      }
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
      // Restore position saved by PWA pause-on-hide before resuming
      if (savedTimeRef.current > 0 && isFinite(audio.duration) && audio.duration > 0) {
        audio.currentTime = savedTimeRef.current;
        clearPWAPosition();
      }
      safePlay(audio);
    } else {
      safePause(audio);
    }
    // isPlaying updates via native play/pause event listeners — not set here
  }, [clearPWAPosition]);

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
      isPWA: IS_PWA,
      pwaPausedAt,
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