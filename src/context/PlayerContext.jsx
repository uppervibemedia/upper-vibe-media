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

  // Watchdog refs — detect silent stall (iOS suspends audio output without pausing element)
  const watchdogRef       = useRef(null);   // setInterval handle
  const watchdogTimeRef   = useRef(0);      // last observed currentTime
  const watchdogStampRef  = useRef(0);      // wall-clock when we last checked

  // ── stopWatchdog / startWatchdog ─────────────────────────────────────────
  // Polls every 800ms while audio is supposed to be playing.
  // If currentTime hasn't advanced by ≥0.1s, iOS has silently suspended audio
  // output (common on lock screen). We pause cleanly so the lock-screen bar stops.
  const stopWatchdog = useCallback(() => {
    if (watchdogRef.current) {
      clearInterval(watchdogRef.current);
      watchdogRef.current = null;
    }
  }, []);

  const startWatchdog = useCallback((audio) => {
    stopWatchdog();
    watchdogTimeRef.current  = audio.currentTime;
    watchdogStampRef.current = Date.now();

    watchdogRef.current = setInterval(() => {
      // Only fire when page is visible AND audio is not paused
      if (document.visibilityState === "hidden") return;
      if (audio.paused || audio.ended || !audio.src) { stopWatchdog(); return; }

      const now     = Date.now();
      const elapsed = (now - watchdogStampRef.current) / 1000; // seconds since last check
      const ct      = audio.currentTime;
      const advanced = ct - watchdogTimeRef.current;

      // Expected: currentTime should have moved ~elapsed seconds (±30% tolerance)
      // If it's moved less than 0.1s in 800ms+, something is wrong
      if (elapsed >= 0.7 && advanced < 0.1) {
        console.warn("[Player] 🚨 Watchdog: silent stall detected — ct:", ct.toFixed(2),
          "advanced:", advanced.toFixed(3), "elapsed:", elapsed.toFixed(2));
        // Save position so resume starts from here
        savedTimeRef.current = ct;
        lastTimeRef.current  = ct;
        // Suspend audio context then pause cleanly
        suspendAudioContext();
        audio.pause();
        // Explicitly tell Media Session we are paused — stops lock-screen bar
        if ("mediaSession" in navigator) {
          navigator.mediaSession.playbackState = "paused";
        }
        stopWatchdog();
        return;
      }

      // Update refs for next check
      watchdogTimeRef.current  = ct;
      watchdogStampRef.current = now;
    }, 800);
  }, [stopWatchdog]);

  // ── safePlay ─────────────────────────────────────────────────────────────
  // Resumes playback cleanly. Always resets rate. Seeks to savedTime if set.
  // Never touches src or load() here.
  const safePlay = useCallback(async (audio) => {
    try {
      await resumeAudioContext();
      // Always enforce rate=1 BEFORE play to prevent catch-up
      audio.playbackRate        = 1;
      audio.defaultPlaybackRate = 1;
      // If we have a saved position (from watchdog pause or hide), seek there first.
      // This ensures we resume from the exact point audio stopped, not from wherever
      // the software clock drifted to during silent suspension.
      if (savedTimeRef.current > 0 && Math.abs(audio.currentTime - savedTimeRef.current) > 0.5) {
        audio.currentTime = savedTimeRef.current;
      }
      if (!audio.paused) return;
      await audio.play();
      // Enforce again after play — iOS can reset it
      audio.playbackRate        = 1;
      audio.defaultPlaybackRate = 1;
      // Start watchdog to detect future silent stalls
      startWatchdog(audio);
    } catch (err) {
      if (err.name !== "AbortError") console.warn("[Player] safePlay error:", err.name, err.message);
    }
  }, [startWatchdog]);

  // ── safePause ─────────────────────────────────────────────────────────────
  // Suspend AudioContext FIRST so the audio graph stops processing immediately,
  // eliminating the post-pause buffer drain glitch on iOS Safari.
  const safePause = useCallback((audio) => {
    stopWatchdog();
    // Save current position before pausing so safePlay resumes from here
    if (audio.currentTime > 0) savedTimeRef.current = audio.currentTime;
    if (audio.paused) return;
    suspendAudioContext(); // stops AudioContext graph instantly — no buffer drain
    audio.pause();
  }, [stopWatchdog]);

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
      audio.play().then(() => {
        startWatchdog(audio);
      }).catch((err) => {
        if (err.name !== "AbortError") console.warn("[Player] play error:", err.name);
      });
    };
    audio.addEventListener("canplay", onCanPlay);

    // Cleanup: remove listener if track changes before canplay fires
    return () => {
      audio.removeEventListener("canplay", onCanPlay);
    };

  }, [currentTrack, safePlay, startWatchdog]);

  // ── Sync isPlaying from native audio events ───────────────────────────────
  useEffect(() => {
    const audio = audioRef.current;

    const onPlay  = () => {
      setIsPlaying(true);
      if (currentTrack) setMediaSessionMetadata(currentTrack);
      startWatchdog(audio);
    };
    const onPause = () => {
      setIsPlaying(false);
      stopWatchdog();
    };
    const onEnded = () => {
      setIsPlaying(false);
      stopWatchdog();
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
  }, [currentTrack, startWatchdog, stopWatchdog]);

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
      // Stop watchdog — no point polling while hidden
      stopWatchdog();

      // Save current position
      if (audio.currentTime > 0) {
        savedTimeRef.current = audio.currentTime;
        lastTimeRef.current  = audio.currentTime;
      }

      // CRITICAL: Pause cleanly on hide so iOS lock screen bar stops.
      // iOS Safari does NOT reliably maintain AVAudioSession background audio
      // for web apps. If we don't pause, the software clock keeps ticking
      // with no actual audio output → silent fake progress → catch-up glitch on resume.
      if (!audio.paused) {
        suspendAudioContext();
        audio.pause();
        if ("mediaSession" in navigator) {
          navigator.mediaSession.playbackState = "paused";
        }
        console.log("[Player] hide — paused cleanly at ct:", savedTimeRef.current.toFixed(2));
      }
    };

    const doShow = () => {
      clearTimeout(showTimer);
      sharedHiddenRef.current = false;

      if (!audio.src || audio.ended) {
        setIsPlaying(false);
        return;
      }

      // Sync React state — audio was paused on hide, so isPlaying = false
      // safePlay (triggered by user pressing Play) will resume from savedTimeRef
      audio.playbackRate        = 1;
      audio.defaultPlaybackRate = 1;
      setIsPlaying(!audio.paused);
      console.log("[Player] show — ct:", audio.currentTime.toFixed(2), "saved:", savedTimeRef.current.toFixed(2), "paused:", audio.paused);
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
  }, [stopWatchdog]);

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
    stopWatchdog();
    suspendAudioContext();
    audio.pause();
    audio.src            = "";
    loadedSrcRef.current = "";
    lastTimeRef.current  = 0;
    savedTimeRef.current = 0;
    playingTrackUrlRef.current = "";
    setIsPlaying(false);
    setCurrentTrack(null);
  }, [stopWatchdog]);

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