import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from "react";

const PlayerContext = createContext(null);

// ONE global audio element — never recreated
const persistentAudio = (() => {
  if (typeof window === "undefined") return null;
  const a = new Audio();
  // Do NOT set crossOrigin="anonymous" — this forces a CORS preflight on every
  // audio URL. If the server doesn't send CORS headers the element silently
  // fails on iOS. Only needed if you use WebAudio analysis from a different origin.
  a.preload = "auto";
  a.setAttribute("x-webkit-airplay", "allow");
  a.setAttribute("playsinline", "");
  return a;
})();

export const sharedHiddenRef = { current: false };

// ── AudioContext — used ONLY for the visualizer analyser ─────────────────────
// IMPORTANT: createMediaElementSource routes ALL audio through the AudioContext
// graph. If the AudioContext is suspended/interrupted, the audio element becomes
// silent even though it reports "playing". This is the root cause of the
// lock-screen silent playback bug on iOS.
//
// Solution: we still create the graph for the visualizer, but we must keep the
// AudioContext running at all times and handle the iOS "interrupted" state by
// resuming it the moment a user gesture is available.
let _audioCtx   = null;
let _analyser   = null;
let _sourceNode = null;

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

// Resume AudioContext — must be called from a user gesture AND after any
// iOS AVAudioSession interruption. Never suspend it.
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

  const audioRef            = useRef(persistentAudio);
  const onNextRef           = useRef(null);
  const onPrevRef           = useRef(null);
  const loadedSrcRef        = useRef("");
  const lastTimeRef         = useRef(0);
  const savedTimeRef        = useRef(0);
  const playingTrackUrlRef  = useRef("");
  // True when the user intends audio to be playing — survives interruptions
  const intentPlayingRef    = useRef(false);

  // ── AudioContext interruption handler ─────────────────────────────────────
  // iOS WebKit sets AudioContext.state = "interrupted" when AVAudioSession is
  // interrupted (phone call, lock screen with certain configs, Siri, etc.).
  // While interrupted the AudioContext graph produces silence even though
  // HTMLAudioElement.paused === false and timeupdate still fires.
  // We must resume the AudioContext as soon as iOS allows it.
  useEffect(() => {
    const audio = audioRef.current;

    const handleCtxStateChange = () => {
      if (!_audioCtx) return;
      console.log("[Player] AudioContext state:", _audioCtx.state);

      if (_audioCtx.state === "interrupted") {
        // iOS interrupted us — pause the element so its clock matches
        // what the user will hear. Do NOT lose intentPlayingRef.
        if (!audio.paused) {
          audio.pause();
          // intentPlayingRef stays true — we want to resume when uninterrupted
        }
        setIsPlaying(false);
      }

      if (_audioCtx.state === "running" && intentPlayingRef.current) {
        // Interruption ended AND user intended to be playing — resume
        if (audio.paused && audio.src) {
          audio.playbackRate        = 1;
          audio.defaultPlaybackRate = 1;
          audio.play().catch(() => {});
        }
      }
    };

    // Poll for AudioContext creation — it's created lazily on first user gesture
    const ctxPollInterval = setInterval(() => {
      if (_audioCtx && !_audioCtx.onstatechange) {
        _audioCtx.onstatechange = handleCtxStateChange;
        clearInterval(ctxPollInterval);
      }
    }, 500);

    return () => clearInterval(ctxPollInterval);
  }, []);

  // ── safePlay ─────────────────────────────────────────────────────────────
  // Resume playback. Never touches src, never seeks, never suspends AudioContext.
  // The ONLY legitimate reasons to touch src/load are in the new-track effect.
  const safePlay = useCallback(async (audio) => {
    try {
      intentPlayingRef.current = true;
      // Must resume AudioContext FIRST — if it's interrupted/suspended,
      // audio.play() will succeed but produce silence through the graph.
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
  // Just pause — never touch AudioContext state. Keeping AudioContext running
  // is critical; suspending it causes a clock-resync glitch on resume.
  const safePause = useCallback((audio) => {
    intentPlayingRef.current = false;
    if (audio.paused) return;
    audio.pause();
  }, []);

  // ── Load & play a new track ───────────────────────────────────────────────
  useEffect(() => {
    if (!currentTrack?.audio_url) return;
    const audio = audioRef.current;
    const url   = currentTrack.audio_url;

    // Same track — just resume if paused
    if (loadedSrcRef.current === url) {
      if (audio.paused) safePlay(audio);
      return;
    }

    // New track
    intentPlayingRef.current   = true;
    loadedSrcRef.current       = url;
    playingTrackUrlRef.current = url;
    savedTimeRef.current       = 0;
    lastTimeRef.current        = 0;

    audio.src = url;
    audio.load();

    const targetUrl = url;
    const onCanPlay = () => {
      audio.removeEventListener("canplay", onCanPlay);
      if (playingTrackUrlRef.current !== targetUrl) return;
      audio.playbackRate        = 1;
      audio.defaultPlaybackRate = 1;
      audio.play().catch((err) => {
        if (err.name !== "AbortError") console.warn("[Player] play error:", err.name);
      });
    };
    audio.addEventListener("canplay", onCanPlay);

    return () => { audio.removeEventListener("canplay", onCanPlay); };

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
  // ON HIDE: Do NOT pause. iOS handles background audio natively.
  //          Only freeze the UI progress ref.
  // ON SHOW: Sync UI state. Reset rate. If AudioContext got interrupted while
  //          hidden, resume it now (we're back in foreground = user gesture context).
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
      console.log("[Player] hide — ct:", audio.currentTime.toFixed(2), "paused:", audio.paused);
    };

    const doShow = () => {
      clearTimeout(showTimer);
      sharedHiddenRef.current = false;

      if (!audio.src || audio.ended) { setIsPlaying(false); return; }

      audio.playbackRate        = 1;
      audio.defaultPlaybackRate = 1;

      // Returning to foreground = valid user gesture context.
      // If AudioContext was interrupted by iOS while in background, resume it now.
      // This is the fix for "bar moves but no sound" — the AudioContext was
      // interrupted so the graph was silent even though audio was "playing".
      if (_audioCtx && _audioCtx.state !== "running") {
        _audioCtx.resume().then(() => {
          // If element somehow paused during the interruption but user intended
          // to play, restart it
          if (intentPlayingRef.current && audio.paused && audio.src) {
            audio.playbackRate        = 1;
            audio.defaultPlaybackRate = 1;
            audio.play().catch(() => {});
          }
        }).catch(() => {});
      }

      setIsPlaying(!audio.paused);
      console.log("[Player] show — ct:", audio.currentTime.toFixed(2), "paused:", audio.paused, "ctxState:", _audioCtx?.state);
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

  // ── Public API ────────────────────────────────────────────────────────────
  const playTrack = useCallback((track, source = "song") => {
    getOrCreateAudioContext(audioRef.current);
    setSourceType(source);
    setCurrentTrack(track);
  }, []);

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