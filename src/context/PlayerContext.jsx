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

function suspendAudioContext() {
  if (!_audioCtx) return;
  if (_audioCtx.state === "running") {
    try { _audioCtx.suspend(); } catch {}
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
  const savedTimeRef = useRef(0);

  // ── safePlay ─────────────────────────────────────────────────────────────
  // Just resumes playback. Never touches src or load() here.
  // The only safe way to resume on iOS is audio.play() — nothing else.
  const safePlay = useCallback(async (audio) => {
    try {
      await resumeAudioContext();
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
  // Suspend AudioContext FIRST so the audio graph stops processing immediately,
  // eliminating the post-pause buffer drain glitch on iOS Safari.
  const safePause = useCallback((audio) => {
    if (audio.paused) return;
    suspendAudioContext(); // stops AudioContext graph instantly — no buffer drain
    audio.pause();
  }, []);

  // ── Load & play a new track ───────────────────────────────────────────────
  // IMPORTANT: we use a flag ref to serialize the async play call so we never
  // call play() on a stale src if the track changes rapidly.
  const playingTrackUrlRef = useRef("");

  useEffect(() => {
    if (!currentTrack?.audio_url) return;
    const audio = audioRef.current;
    const url   = currentTrack.audio_url;

    // Same track already loaded — just resume, never touch src/load
    if (loadedSrcRef.current === url) {
      if (audio.paused) safePlay(audio);
      return;
    }

    // New track — set src and load, then play
    loadedSrcRef.current   = url;
    playingTrackUrlRef.current = url;
    savedTimeRef.current   = 0;
    lastTimeRef.current    = 0;

    audio.src = url;
    // Must call load() after setting src on a new track so iOS fetches it
    audio.load();

    // Wait for canplay before calling play() — avoids the decode-before-data race.
    // cleanup() is called on track change (effect cleanup) so we never play a stale src.
    const targetUrl = url;
    const onCanPlay = () => {
      audio.removeEventListener("canplay", onCanPlay);
      if (playingTrackUrlRef.current !== targetUrl) return; // track changed, skip
      audio.playbackRate        = 1;
      audio.defaultPlaybackRate = 1;
      audio.play().catch((err) => {
        if (err.name !== "AbortError") console.warn("[Player] play error:", err.name);
      });
    };
    audio.addEventListener("canplay", onCanPlay);

    // Cleanup: remove listener if track changes before canplay fires
    return () => {
      audio.removeEventListener("canplay", onCanPlay);
    };

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
      lastTimeRef.current  = 0;
      savedTimeRef.current = 0;
      onNextRef.current?.();
    };
    const onStall = () => { if (audio.paused) setIsPlaying(false); };
    // Rate guard — iOS/Safari can drift playbackRate during suspension
    const onRateChange = () => {
      if (audio.playbackRate !== 1) {
        console.warn("[Player] ratechange →", audio.playbackRate, "forcing 1");
        audio.playbackRate        = 1;
        audio.defaultPlaybackRate = 1;
      }
    };
    const onTimeUpdate = () => {
      lastTimeRef.current = audio.currentTime;
    };

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

  // ── Background / visibility handler ──────────────────────────────────────
  //
  // KEY INSIGHT for iOS Safari:
  // iOS supports background audio natively — you do NOT need to pause on hide.
  // In fact, pausing on hide then reloading src on show IS the cause of the
  // sped-up glitch. The decoder catches up to the last network-buffered position.
  //
  // Correct strategy:
  // - ON HIDE: do nothing to the audio. Let iOS play in background naturally.
  //   Only update the hidden ref so the UI progress bar freezes.
  // - ON SHOW: reset playbackRate (safety), sync UI state from audio element.
  //   Never reload src, never seek.
  useEffect(() => {
    const audio = audioRef.current;
    let showTimer = null;

    const doHide = () => {
      sharedHiddenRef.current = true;
      // Save current time for reference — but DO NOT pause, DO NOT touch src
      if (audio.currentTime > 0) {
        savedTimeRef.current = audio.currentTime;
        lastTimeRef.current  = audio.currentTime;
      }
      // Do NOT pause — iOS will continue playing in background correctly
      console.log("[Player] hide — ct:", audio.currentTime.toFixed(2), "playing:", !audio.paused);
    };

    const doShow = () => {
      clearTimeout(showTimer);
      sharedHiddenRef.current = false;

      if (!audio.src || audio.ended) {
        setIsPlaying(false);
        return;
      }

      // Reset rate in case iOS drifted it (safety)
      audio.playbackRate        = 1;
      audio.defaultPlaybackRate = 1;

      // Sync React state to actual audio element state
      setIsPlaying(!audio.paused);
      console.log("[Player] show — ct:", audio.currentTime.toFixed(2), "paused:", audio.paused, "readyState:", audio.readyState);
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        doHide();
      } else {
        clearTimeout(showTimer);
        showTimer = setTimeout(doShow, 50);
      }
    };

    const onPageHide = () => doHide();
    const onPageShow = () => {
      clearTimeout(showTimer);
      showTimer = setTimeout(doShow, 50);
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
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    const audio = audioRef.current;

    navigator.mediaSession.setActionHandler("play", () => {
      if (!audio.src) return;
      audio.playbackRate        = 1;
      audio.defaultPlaybackRate = 1;
      safePlay(audio);
    });

    navigator.mediaSession.setActionHandler("pause", () => {
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
      audio.playbackRate        = 1;
      audio.defaultPlaybackRate = 1;
      safePlay(audio);
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
    audio.src            = "";
    loadedSrcRef.current = "";
    lastTimeRef.current  = 0;
    savedTimeRef.current = 0;
    playingTrackUrlRef.current = "";
    setIsPlaying(false);
    setCurrentTrack(null);
  }, []);

  const registerNextHandler = useCallback((fn) => { onNextRef.current = fn; }, []);
  const registerPrevHandler = useCallback((fn) => { onPrevRef.current = fn; }, []);
  const handleNext          = useCallback(() => { onNextRef.current?.(); }, []);
  const handlePrev          = useCallback(() => { onPrevRef.current?.(); }, []);

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