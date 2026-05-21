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
  const lastTimeRef  = useRef(0);

  // The time we paused at — used ONLY when we need to reload the src after
  // Safari evicts the buffer (long background pause).
  const savedTimeRef   = useRef(0);
  // Timestamp (ms) of when we hid — used to detect long background pauses
  const hiddenAtRef    = useRef(0);
  // Whether the last pause was triggered by backgrounding (not user)
  const bgPausedRef    = useRef(false);
  // Keep-alive interval while backgrounded
  const keepAliveRef   = useRef(null);

  // ── safePlay ─────────────────────────────────────────────────────────────
  // Calls play() cleanly. If Safari evicted the buffer (long bg pause),
  // reloads from savedTime first.
  const safePlay = useCallback(async (audio) => {
    try {
      await resumeAudioContext();
      audio.playbackRate        = 1;
      audio.defaultPlaybackRate = 1;
      if (!audio.paused) return;

      // Detect Safari buffer eviction:
      // readyState 0 (HAVE_NOTHING) after a pause means the buffer was cleared.
      if (audio.readyState === 0 && audio.src) {
        console.log("[Player] safePlay — buffer evicted, reloading src at", savedTimeRef.current.toFixed(2));
        const resumeTime = savedTimeRef.current;
        savedTimeRef.current = 0;
        audio.load();
        await new Promise((resolve) => {
          const onCan = () => {
            audio.removeEventListener("canplay", onCan);
            if (resumeTime > 0) {
              try { audio.currentTime = resumeTime; } catch {}
            }
            resolve();
          };
          audio.addEventListener("canplay", onCan);
        });
        audio.playbackRate = 1;
        await audio.play();
        audio.playbackRate = 1;
        return;
      }

      await audio.play();
      audio.playbackRate = 1;
    } catch (err) {
      if (err.name !== "AbortError") console.warn("[Player] safePlay error:", err.name, err.message);
    }
  }, []);

  // ── safePause ─────────────────────────────────────────────────────────────
  const safePause = useCallback((audio) => {
    if (audio.paused) return;
    audio.pause();
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
      if (audio.paused) safePlay(audio);
      return;
    }

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
      bgPausedRef.current = false;
      setIsPlaying(true);
      if (currentTrack) setMediaSessionMetadata(currentTrack);
    };
    const onPause = () => { setIsPlaying(false); };
    const onEnded = () => {
      setIsPlaying(false);
      lastTimeRef.current  = 0;
      savedTimeRef.current = 0;
      onNextRef.current?.();
    };
    const onStall = () => { if (audio.paused) setIsPlaying(false); };
    const onRateChange = () => {
      if (audio.playbackRate !== 1) {
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
  useEffect(() => {
    const audio = audioRef.current;

    const stopKeepAlive = () => {
      if (keepAliveRef.current) {
        clearInterval(keepAliveRef.current);
        keepAliveRef.current = null;
      }
    };

    // While backgrounded, ping the audio element every 3s to prevent Safari
    // from fully evicting the decode buffer. This is the "keepalive" trick.
    const startKeepAlive = () => {
      stopKeepAlive();
      keepAliveRef.current = setInterval(() => {
        // Reading currentTime is enough to keep the element "active" in some
        // Safari versions. For stubborn cases we also check readyState.
        const _ = audio.currentTime; // eslint-disable-line no-unused-vars
        console.log("[Player] keepalive ping — ct:", audio.currentTime.toFixed(2), "readyState:", audio.readyState);
      }, 3000);
    };

    const doHide = () => {
      sharedHiddenRef.current = true;
      if (!audio.src || audio.ended) return;

      const ct = audio.currentTime;
      if (ct > 0) {
        savedTimeRef.current = ct;
        lastTimeRef.current  = ct;
      }
      hiddenAtRef.current = Date.now();

      if (!audio.paused) {
        bgPausedRef.current = true;
        audio.pause();
        console.log("[Player] hide — paused at", ct.toFixed(2));
      }

      setIsPlaying(false);
      // Start keepalive so Safari doesn't evict the buffer
      startKeepAlive();
    };

    const doShow = () => {
      sharedHiddenRef.current = false;
      stopKeepAlive();

      if (!audio.src || audio.ended) { setIsPlaying(false); return; }

      audio.playbackRate        = 1;
      audio.defaultPlaybackRate = 1;

      // If we were the ones who paused it (bgPausedRef), auto-resume.
      // If the user manually paused before backgrounding, leave it paused.
      if (bgPausedRef.current) {
        bgPausedRef.current = false;
        console.log("[Player] show — auto-resuming (bg paused)");
        safePlay(audio);
      } else {
        setIsPlaying(!audio.paused);
        console.log("[Player] show — user had paused, leaving paused");
      }
    };

    let showTimer = null;

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        doHide();
      } else {
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
      stopKeepAlive();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("pageshow",  onPageShow);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safePlay]);

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
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    const audio = audioRef.current;

    navigator.mediaSession.setActionHandler("play", () => {
      if (!audio.src) return;
      console.log("[Player] MediaSession play — readyState:", audio.readyState, "ct:", audio.currentTime);
      bgPausedRef.current = false;
      audio.playbackRate        = 1;
      audio.defaultPlaybackRate = 1;
      safePlay(audio);
    });

    navigator.mediaSession.setActionHandler("pause", () => {
      console.log("[Player] MediaSession pause");
      bgPausedRef.current = false;
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
  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio.src) return;

    if (audio.paused || audio.ended) {
      bgPausedRef.current = false;
      audio.playbackRate        = 1;
      audio.defaultPlaybackRate = 1;
      safePlay(audio);
    } else {
      bgPausedRef.current = false;
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
    if (keepAliveRef.current) { clearInterval(keepAliveRef.current); keepAliveRef.current = null; }
    audio.pause();
    audio.src = "";
    loadedSrcRef.current = "";
    lastTimeRef.current  = 0;
    savedTimeRef.current = 0;
    bgPausedRef.current  = false;
    setIsPlaying(false);
    setCurrentTrack(null);
  }, []);

  const registerNextHandler = useCallback((fn) => { onNextRef.current = fn; }, []);
  const registerPrevHandler = useCallback((fn) => { onPrevRef.current = fn; }, []);
  const handleNext          = useCallback(() => { onNextRef.current?.(); }, []);
  const handlePrev          = useCallback(() => { onPrevRef.current?.(); }, []);

  // API compat
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
      playLockRef: { current: false },
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