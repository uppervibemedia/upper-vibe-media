import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from "react";

const PlayerContext = createContext(null);

// ONE global audio element — never recreated
const persistentAudio = (() => {
  if (typeof window === "undefined") return null;
  const a = new Audio();
  a.preload = "auto";
  a.setAttribute("x-webkit-airplay", "allow");
  a.setAttribute("playsinline", "");
  return a;
})();

export const sharedHiddenRef = { current: false };

// ── AudioContext — for visualiser only ───────────────────────────────────────
let _audioCtx   = null;
let _analyser   = null;
let _sourceNode = null;

function getOrCreateAudioContext(audioElement) {
  if (!audioElement) return null;
  if (!_audioCtx) {
    try {
      _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      window._uvAudioCtx = _audioCtx;
    } catch { return null; }
  }
  if (!_sourceNode) {
    try {
      _sourceNode = _audioCtx.createMediaElementSource(audioElement);
      _analyser   = _audioCtx.createAnalyser();
      _analyser.fftSize             = 256;
      _analyser.smoothingTimeConstant = 0.82;
      _sourceNode.connect(_analyser);
      _analyser.connect(_audioCtx.destination);
      window._uvAnalyser = _analyser;
    } catch {}
  }
  return _analyser;
}

async function ensureAudioContextRunning() {
  if (!_audioCtx) return;
  if (_audioCtx.state !== "running") {
    try { await _audioCtx.resume(); } catch {}
  }
}

export function resumeGlobalAudioContext() { ensureAudioContextRunning().catch(() => {}); }
export function getGlobalAnalyser(audioElement) { return getOrCreateAudioContext(audioElement); }

export function PlayerProvider({ children }) {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying,    setIsPlaying]    = useState(false);
  const [queue,        setQueue]        = useState([]);
  const [sourceType,   setSourceType]   = useState("song");

  const audioRef           = useRef(persistentAudio);
  const onNextRef          = useRef(null);
  const onPrevRef          = useRef(null);
  const loadedSrcRef       = useRef("");
  const lastTimeRef        = useRef(0);
  const savedTimeRef       = useRef(0);
  const playingTrackUrlRef = useRef("");
  const intentPlayingRef   = useRef(false);
  // Tracks the pending track to load — set synchronously in playTrack
  const pendingTrackRef    = useRef(null);

  // ── AudioContext interruption recovery ────────────────────────────────────
  useEffect(() => {
    const audio = audioRef.current;
    const ctxPoll = setInterval(() => {
      if (_audioCtx && !_audioCtx.onstatechange) {
        _audioCtx.onstatechange = () => {
          console.log("[Player] AudioContext state:", _audioCtx.state);
          if (_audioCtx.state === "interrupted") {
            if (!audio.paused) { audio.pause(); }
            setIsPlaying(false);
          }
          if (_audioCtx.state === "running" && intentPlayingRef.current) {
            if (audio.paused && audio.src) {
              audio.playbackRate = 1;
              audio.defaultPlaybackRate = 1;
              audio.play().catch(() => {});
            }
          }
        };
        clearInterval(ctxPoll);
      }
    }, 500);
    return () => clearInterval(ctxPoll);
  }, []);

  // ── safePlay ──────────────────────────────────────────────────────────────
  const safePlay = useCallback(async (audio) => {
    try {
      intentPlayingRef.current = true;
      await ensureAudioContextRunning();
      audio.playbackRate        = 1;
      audio.defaultPlaybackRate = 1;
      if (!audio.paused) return;
      await audio.play();
      audio.playbackRate        = 1;
      audio.defaultPlaybackRate = 1;
    } catch (err) {
      if (err.name !== "AbortError") console.warn("[Player] safePlay error:", err.name, err.message);
    }
  }, []);

  // ── safePause ─────────────────────────────────────────────────────────────
  // Never touch AudioContext state — suspending it causes clock-resync glitch on resume
  const safePause = useCallback((audio) => {
    intentPlayingRef.current = false;
    if (audio.paused) return;
    audio.pause();
  }, []);

  // ── playTrack — THE iOS-CRITICAL PATH ─────────────────────────────────────
  // On iOS Safari, audio.play() MUST be called synchronously within the
  // user-gesture call stack. React state updates (setState → effect) break
  // this because the effect runs asynchronously after the gesture.
  //
  // Strategy:
  //   1. Call audio.play() SYNCHRONOUSLY inside playTrack (before any await/setState)
  //      This "unlocks" the audio element with iOS for this gesture.
  //   2. Then set the src, call load(), and the element continues playing
  //      because iOS already granted permission in step 1.
  //
  // This is the standard Apple-recommended pattern for web audio on iOS.
  const playTrack = useCallback((track, source = "song") => {
    if (!track?.audio_url) return;
    const audio = audioRef.current;

    // ── Step 1: Synchronous play() call — unlocks iOS audio ─────────────────
    // This must happen in the same synchronous call stack as the user gesture.
    // We call play() BEFORE setting src so iOS grants permission.
    // The play() will briefly "fail" (AbortError) when we change src below,
    // which is expected and handled.
    intentPlayingRef.current = true;

    // Only call play() sync if audio is currently paused (don't double-play)
    if (audio.paused) {
      audio.play().catch((err) => {
        // AbortError is expected — we're about to change the src immediately
        if (err.name !== "AbortError" && err.name !== "NotSupportedError") {
          console.warn("[Player] sync play() error:", err.name);
        }
      });
    }

    // ── Step 2: Initialise AudioContext (also must be synchronous on iOS) ────
    getOrCreateAudioContext(audio);

    // ── Step 3: Set state (async from here is fine — permission already granted) ─
    setSourceType(source);

    const url = track.audio_url;

    if (loadedSrcRef.current === url) {
      // Same track — already loaded, just ensure it's playing
      setCurrentTrack(track);
      if (audio.paused) {
        audio.playbackRate        = 1;
        audio.defaultPlaybackRate = 1;
        audio.play().catch(() => {});
      }
      return;
    }

    // New track — change src
    loadedSrcRef.current       = url;
    playingTrackUrlRef.current = url;
    savedTimeRef.current       = 0;
    lastTimeRef.current        = 0;
    pendingTrackRef.current    = track;

    audio.src = url;
    audio.load();

    const targetUrl = url;
    const onCanPlay = () => {
      audio.removeEventListener("canplay", onCanPlay);
      if (playingTrackUrlRef.current !== targetUrl) return;
      audio.playbackRate        = 1;
      audio.defaultPlaybackRate = 1;
      audio.play().catch((err) => {
        if (err.name !== "AbortError") console.warn("[Player] canplay play() error:", err.name);
      });
    };
    audio.addEventListener("canplay", onCanPlay);

    setCurrentTrack(track);

    // Cleanup stale canplay listeners on rapid track changes
    pendingTrackRef._cleanup = () => audio.removeEventListener("canplay", onCanPlay);
  }, []);

  // ── Sync isPlaying from native audio events ───────────────────────────────
  useEffect(() => {
    const audio = audioRef.current;

    const onPlay  = () => {
      setIsPlaying(true);
      if (currentTrack) setMediaSessionMetadata(currentTrack);
    };
    const onPause = () => { setIsPlaying(false); };
    const onEnded = () => {
      intentPlayingRef.current = false;
      setIsPlaying(false);
      lastTimeRef.current  = 0;
      savedTimeRef.current = 0;
      onNextRef.current?.();
    };
    const onStall = () => { if (audio.paused) setIsPlaying(false); };
    const onRateChange = () => {
      if (audio.playbackRate !== 1) {
        console.warn("[Player] ratechange →", audio.playbackRate, "forcing 1");
        audio.playbackRate        = 1;
        audio.defaultPlaybackRate = 1;
      }
    };
    const onTimeUpdate = () => { lastTimeRef.current = audio.currentTime; };

    audio.addEventListener("play",       onPlay);
    audio.addEventListener("pause",      onPause);
    audio.addEventListener("ended",      onEnded);
    audio.addEventListener("stalled",    onStall);
    audio.addEventListener("waiting",    onStall);
    audio.addEventListener("ratechange", onRateChange);
    audio.addEventListener("timeupdate", onTimeUpdate);

    return () => {
      audio.removeEventListener("play",       onPlay);
      audio.removeEventListener("pause",      onPause);
      audio.removeEventListener("ended",      onEnded);
      audio.removeEventListener("stalled",    onStall);
      audio.removeEventListener("waiting",    onStall);
      audio.removeEventListener("ratechange", onRateChange);
      audio.removeEventListener("timeupdate", onTimeUpdate);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack]);

  // ── Background / Foreground ───────────────────────────────────────────────
  useEffect(() => {
    const audio = audioRef.current;
    let showTimer = null;

    const doHide = () => {
      sharedHiddenRef.current = true;
      if (audio.currentTime > 0) {
        savedTimeRef.current = audio.currentTime;
        lastTimeRef.current  = audio.currentTime;
      }
      // Do NOT pause — let iOS background audio work naturally
    };

    const doShow = () => {
      clearTimeout(showTimer);
      sharedHiddenRef.current = false;
      if (!audio.src || audio.ended) { setIsPlaying(false); return; }

      audio.playbackRate        = 1;
      audio.defaultPlaybackRate = 1;

      // Returning to foreground = user gesture context — resume AudioContext
      // if iOS interrupted it (this fixes "bar moves but no sound" bug)
      if (_audioCtx && _audioCtx.state !== "running") {
        _audioCtx.resume().then(() => {
          if (intentPlayingRef.current && audio.paused && audio.src) {
            audio.playbackRate        = 1;
            audio.defaultPlaybackRate = 1;
            audio.play().catch(() => {});
          }
        }).catch(() => {});
      }

      setIsPlaying(!audio.paused);
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") doHide();
      else { clearTimeout(showTimer); showTimer = setTimeout(doShow, 50); }
    };
    const onPageHide = () => doHide();
    const onPageShow = () => { clearTimeout(showTimer); showTimer = setTimeout(doShow, 50); };

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

  // ── Media Session ─────────────────────────────────────────────────────────
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

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    const audio = audioRef.current;

    navigator.mediaSession.setActionHandler("play", () => {
      if (!audio.src) return;
      safePlay(audio);
    });
    navigator.mediaSession.setActionHandler("pause", () => {
      safePause(audio);
    });
    navigator.mediaSession.setActionHandler("nexttrack",     () => onNextRef.current?.());
    navigator.mediaSession.setActionHandler("previoustrack", () => onPrevRef.current?.());

    return () => {
      ["play", "pause", "nexttrack", "previoustrack"].forEach((a) => {
        try { navigator.mediaSession.setActionHandler(a, null); } catch {}
      });
    };
  }, [safePlay, safePause]);

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
  }, [isPlaying]);

  // ── togglePlay ────────────────────────────────────────────────────────────
  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio.src) return;
    if (audio.paused || audio.ended) safePlay(audio);
    else safePause(audio);
  }, [safePlay, safePause]);

  // ── stopPlaying ───────────────────────────────────────────────────────────
  const stopPlaying = useCallback(() => {
    const audio = audioRef.current;
    intentPlayingRef.current   = false;
    audio.pause();
    audio.src                  = "";
    loadedSrcRef.current       = "";
    lastTimeRef.current        = 0;
    savedTimeRef.current       = 0;
    playingTrackUrlRef.current = "";
    setIsPlaying(false);
    setCurrentTrack(null);
  }, []);

  const registerNextHandler = useCallback((fn) => { onNextRef.current = fn; }, []);
  const registerPrevHandler = useCallback((fn) => { onPrevRef.current = fn; }, []);
  const handleNext          = useCallback(() => { onNextRef.current?.(); }, []);
  const handlePrev          = useCallback(() => { onPrevRef.current?.(); }, []);
  const clearPosition       = useCallback(() => { savedTimeRef.current = 0; }, []);
  const savePosition        = useCallback((t) => { savedTimeRef.current = t; }, []);

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