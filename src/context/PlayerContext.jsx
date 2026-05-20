import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from "react";

const PlayerContext = createContext(null);

// ONE global audio element — never recreated, never reassigned src unless track changes
const persistentAudio = (() => {
  if (typeof window === "undefined") return null;
  const a = new Audio();
  a.crossOrigin = "anonymous";
  a.preload = "auto";
  a.setAttribute("x-webkit-airplay", "allow");
  a.setAttribute("playsinline", "");
  return a;
})();

// Shared hidden ref — AudioPlayer reads this to freeze its progress bar
export const sharedHiddenRef = { current: false };

// ONE global AudioContext — shared with visualizer
let _audioCtx   = null;
let _analyser   = null;
let _sourceNode = null;

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
  if (!_sourceNode) {
    try {
      _sourceNode = _audioCtx.createMediaElementSource(audioElement);
      _analyser   = _audioCtx.createAnalyser();
      _analyser.fftSize = 256;
      _analyser.smoothingTimeConstant = 0.82;
      _sourceNode.connect(_analyser);
      _analyser.connect(_audioCtx.destination);
      window._uvAnalyser = _analyser;
    } catch {}
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

  const audioRef     = useRef(persistentAudio);
  const onNextRef    = useRef(null);
  const onPrevRef    = useRef(null);
  const loadedSrcRef = useRef("");
  const lastTimeRef  = useRef(0);   // AudioPlayer progress bar guard

  // ─────────────────────────────────────────────────────────────────────────
  // DESIGN PRINCIPLE:
  //   Safari / iOS resumes audio from the exact buffer position after pause().
  //   We must NEVER seek (audio.currentTime = x) on resume — that destroys the
  //   decoder buffer and causes the "sped-up / glitchy" artifact.
  //
  //   The ONLY time we need savedTimeRef is when the audio element's src is
  //   cleared or changed (e.g. on track load). For pause/resume within the
  //   same track we rely entirely on the native buffer state.
  // ─────────────────────────────────────────────────────────────────────────

  // savedTimeRef: only written when we actually lose the buffer (doHide forces
  // a src reload scenario) — currently kept for API compat but not used for seeks.
  const savedTimeRef = useRef(0);

  // ── Simple play — no locks, no seeks ─────────────────────────────────────
  // Just resumes the audio element. Caller must ensure src is loaded.
  const safePlay = useCallback(async (audio) => {
    try {
      await resumeAudioContext();
      // Always reset rate before playing — iOS can drift it during suspension
      audio.playbackRate        = 1;
      audio.defaultPlaybackRate = 1;
      if (!audio.paused) return; // already playing, nothing to do
      console.log("[Player] play →", {
        currentTime: audio.currentTime,
        readyState:  audio.readyState,
        src:         audio.src?.slice(-40),
      });
      await audio.play();
      // Reset rate again after play() in case iOS changed it
      audio.playbackRate = 1;
    } catch (err) {
      if (err.name !== "AbortError") console.warn("[Player] safePlay error:", err.name, err.message);
    }
  }, []);

  // ── Simple pause ─────────────────────────────────────────────────────────
  const safePause = useCallback((audio) => {
    if (audio.paused) return;
    audio.pause();
    console.log("[Player] pause →", audio.currentTime.toFixed(2));
  }, []);

  // ── Load & play a new track ───────────────────────────────────────────────
  useEffect(() => {
    if (!currentTrack?.audio_url) return;
    const audio = audioRef.current;

    const isSameTrack =
      loadedSrcRef.current === currentTrack.audio_url ||
      audio.src             === currentTrack.audio_url ||
      (audio.src && audio.src.endsWith(currentTrack.audio_url));

    if (isSameTrack) {
      // Same track — just resume from wherever the buffer is, no seek
      if (audio.paused) safePlay(audio);
      return;
    }

    // Genuinely new track — load from start
    savedTimeRef.current = 0;
    lastTimeRef.current  = 0;
    loadedSrcRef.current = currentTrack.audio_url;
    audio.src            = currentTrack.audio_url;
    audio.load();
    safePlay(audio);
  }, [currentTrack, safePlay]);

  // ── Sync isPlaying from native audio events ───────────────────────────────
  useEffect(() => {
    const audio = audioRef.current;

    const onPlay  = () => {
      setIsPlaying(true);
      if (currentTrack) setMediaSessionMetadata(currentTrack);
    };
    const onPause = () => { setIsPlaying(false); };
    const onEnded = () => {
      setIsPlaying(false);
      lastTimeRef.current = 0;
      onNextRef.current?.();
    };
    const onStall = () => { if (audio.paused) setIsPlaying(false); };

    // Rate guard — iOS sometimes drifts playbackRate away from 1
    const onRateChange = () => {
      if (audio.playbackRate !== 1) {
        console.warn("[Player] ratechange →", audio.playbackRate, "→ forcing 1");
        audio.playbackRate = 1;
      }
    };

    audio.addEventListener("play",       onPlay);
    audio.addEventListener("pause",      onPause);
    audio.addEventListener("ended",      onEnded);
    audio.addEventListener("stalled",    onStall);
    audio.addEventListener("waiting",    onStall);
    audio.addEventListener("ratechange", onRateChange);

    return () => {
      audio.removeEventListener("play",       onPlay);
      audio.removeEventListener("pause",      onPause);
      audio.removeEventListener("ended",      onEnded);
      audio.removeEventListener("stalled",    onStall);
      audio.removeEventListener("waiting",    onStall);
      audio.removeEventListener("ratechange", onRateChange);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack]);

  // ── Background / visibility handler ──────────────────────────────────────
  // ON HIDE: pause immediately (synchronous, before iOS suspends the page).
  //          We do NOT seek or reload — the buffer is preserved at currentTime.
  // ON SHOW: reset rate (iOS can drift it), sync UI. User presses Play to resume.
  useEffect(() => {
    const audio = audioRef.current;
    let showTimer = null;

    const doHide = () => {
      sharedHiddenRef.current = true;
      if (!audio.src || audio.ended) return;

      const ct = audio.currentTime;
      console.log("[Player] hide — ct:", ct.toFixed(2), "paused:", audio.paused);

      // Store time in case we need it (informational, not used for seeking)
      if (ct > 0) {
        savedTimeRef.current = ct;
        lastTimeRef.current  = ct;
      }

      // Pause synchronously — no locks, no deferred calls
      if (!audio.paused) {
        audio.pause();
      }
      setIsPlaying(false);
    };

    const doShow = () => {
      sharedHiddenRef.current = false;
      if (!audio.src || audio.ended) { setIsPlaying(false); return; }
      // Reset rate — iOS can change it during suspension
      audio.playbackRate        = 1;
      audio.defaultPlaybackRate = 1;
      // Sync UI state — do NOT auto-play
      setIsPlaying(!audio.paused);
      console.log("[Player] show — paused:", audio.paused, "ct:", audio.currentTime.toFixed(2));
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        doHide();
      } else {
        // Small delay so iOS finishes restoring the page before we read state
        clearTimeout(showTimer);
        showTimer = setTimeout(doShow, 100);
      }
    };

    const onPageHide = () => doHide();
    const onPageShow = () => {
      clearTimeout(showTimer);
      showTimer = setTimeout(doShow, 100);
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("pageshow",  onPageShow);

    return () => {
      clearTimeout(showTimer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("pageshow",  onPageShow);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Media Session metadata ────────────────────────────────────────────────
  const FALLBACK_ART = "https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?w=512&h=512&fit=crop&q=80";

  function resolveArtworkUrl(url) {
    if (!url) return FALLBACK_ART;
    if (url.startsWith("https://")) return url;
    return FALLBACK_ART;
  }

  function setMediaSessionMetadata(track) {
    if (!("mediaSession" in navigator) || !track) return;
    const artSrc = resolveArtworkUrl(track.cover_url);
    navigator.mediaSession.metadata = new MediaMetadata({
      title:   track.title || "Unknown",
      artist:  track.artist_display || track.artist || "Upper Vibe Media",
      album:   "Upper Vibe Media",
      artwork: [
        { src: artSrc, sizes: "512x512",   type: "image/jpeg" },
        { src: artSrc, sizes: "1024x1024", type: "image/jpeg" },
      ],
    });
  }

  useEffect(() => {
    if (!currentTrack) return;
    setMediaSessionMetadata(currentTrack);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack]);

  // ── Media Session action handlers ─────────────────────────────────────────
  // Lock-screen Play/Pause — NO seeks, just play/pause the existing buffer.
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    const audio = audioRef.current;

    navigator.mediaSession.setActionHandler("play", () => {
      if (!audio.src) return;
      console.log("[Player] MediaSession play — ct:", audio.currentTime, "readyState:", audio.readyState);
      audio.playbackRate        = 1;
      audio.defaultPlaybackRate = 1;

      if (!isFinite(audio.duration) || audio.readyState < 2) {
        // Audio not buffered — wait for it
        const onCan = () => {
          audio.removeEventListener("canplay", onCan);
          audio.playbackRate = 1;
          safePlay(audio);
        };
        audio.addEventListener("canplay", onCan);
        if (audio.readyState < 1) audio.load();
      } else {
        safePlay(audio);
      }
    });

    navigator.mediaSession.setActionHandler("pause", () => {
      console.log("[Player] MediaSession pause");
      safePause(audio);
      setIsPlaying(false);
    });

    navigator.mediaSession.setActionHandler("nexttrack",     () => onNextRef.current?.());
    navigator.mediaSession.setActionHandler("previoustrack", () => onPrevRef.current?.());

    return () => {
      ["play", "pause", "nexttrack", "previoustrack"].forEach((a) => {
        try { navigator.mediaSession.setActionHandler(a, null); } catch {}
      });
    };
  }, [safePlay, safePause]);

  // Sync lock-screen playback badge
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
  }, [isPlaying]);

  // ── togglePlay (UI button) ────────────────────────────────────────────────
  // Simple toggle — no seeks, just play or pause the buffer.
  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio.src) return;

    if (audio.paused || audio.ended) {
      audio.playbackRate        = 1;
      audio.defaultPlaybackRate = 1;

      if (!isFinite(audio.duration) || audio.readyState < 2) {
        const onCan = () => {
          audio.removeEventListener("canplay", onCan);
          audio.playbackRate = 1;
          safePlay(audio);
        };
        audio.addEventListener("canplay", onCan);
        if (audio.readyState < 1) audio.load();
      } else {
        safePlay(audio);
      }
    } else {
      safePause(audio);
    }
  }, [safePlay, safePause]);

  // ── Public API ────────────────────────────────────────────────────────────
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
    lastTimeRef.current  = 0;
    savedTimeRef.current = 0;
    setIsPlaying(false);
    setCurrentTrack(null);
  }, []);

  const registerNextHandler = useCallback((fn) => { onNextRef.current = fn; }, []);
  const registerPrevHandler = useCallback((fn) => { onPrevRef.current = fn; }, []);
  const handleNext          = useCallback(() => { onNextRef.current?.(); }, []);
  const handlePrev          = useCallback(() => { onPrevRef.current?.(); }, []);

  // Kept for API compatibility with anything that still references these
  const clearPosition = useCallback(() => { savedTimeRef.current = 0; }, []);
  const savePosition  = useCallback((t) => { savedTimeRef.current = t; }, []);

  return (
    <PlayerContext.Provider value={{
      currentTrack,
      isPlaying,
      queue,
      sourceType,
      savedTime: savedTimeRef.current,
      lastTimeRef,
      playTrack,
      togglePlay,
      stopPlaying,
      setQueue,
      audioRef,
      safePlay,
      safePause,
      registerNextHandler,
      registerPrevHandler,
      handleNext,
      handlePrev,
      savedTimeRef,
      playLockRef: { current: false }, // kept for compat
      clearPosition,
      savePosition,
      setIsPlaying,
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