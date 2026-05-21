import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from "react";
import { trackSongPlay, trackSongPause, trackSongComplete, streamStart, streamPause, streamEnd, streamSetMeta } from "@/lib/analytics";

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

// ── PWA detection ─────────────────────────────────────────────────────────────
// In PWA (Add-to-Home-Screen / standalone) mode, iOS gives the web app a proper
// AVAudioSession that keeps audio alive in background — same as a native app.
// We must NOT pause on visibilitychange in this mode; instead we let the OS
// handle the audio session and only sync state when we come back to foreground.
const isPWA = (() => {
  if (typeof window === "undefined") return false;
  return (
    window.navigator.standalone === true ||
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches
  );
})();

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

  // Keep a ref to currentTrack so Media Session handlers (registered once) always
  // see the latest value without needing re-registration.
  const currentTrackRef = useRef(null);
  useEffect(() => {
    currentTrackRef.current = currentTrack;
    // Update stream metadata whenever track changes
    try { if (currentTrack) streamSetMeta(currentTrack); } catch {}
  }, [currentTrack]);

  // Watchdog refs — detect silent stall (iOS suspends audio output without pausing element)
  const watchdogRef       = useRef(null);
  const watchdogTimeRef   = useRef(0);
  const watchdogStampRef  = useRef(0);

  // ── stopWatchdog / startWatchdog ─────────────────────────────────────────
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
      // In PWA mode we allow background playback — don't skip when hidden
      if (!isPWA && document.visibilityState === "hidden") return;
      if (audio.paused || audio.ended || !audio.src) { stopWatchdog(); return; }

      const now      = Date.now();
      const elapsed  = (now - watchdogStampRef.current) / 1000;
      const ct       = audio.currentTime;
      const advanced = ct - watchdogTimeRef.current;

      if (elapsed >= 0.7 && advanced < 0.1) {
        console.warn("[Player] 🚨 Watchdog: silent stall — ct:", ct.toFixed(2),
          "advanced:", advanced.toFixed(3), "elapsed:", elapsed.toFixed(2),
          "isPWA:", isPWA);
        savedTimeRef.current = ct;
        lastTimeRef.current  = ct;
        suspendAudioContext();
        audio.pause();
        if ("mediaSession" in navigator) {
          navigator.mediaSession.playbackState = "paused";
        }
        stopWatchdog();
        return;
      }

      watchdogTimeRef.current  = ct;
      watchdogStampRef.current = now;
    }, 800);
  }, [stopWatchdog]);

  // ── safePlay ─────────────────────────────────────────────────────────────
  // Core resume function — handles both Safari and PWA paths.
  //
  // Safari anti-glitch rules (the original sped-up sound fix):
  //   - NEVER call audio.load() on the same src without first clearing src=""
  //     Safari ignores re-assignment of the same src value, so load() replays
  //     from the buffered start position causing the catch-up glitch.
  //   - ALWAYS seek to savedTimeRef AFTER canplay, not before.
  //   - ALWAYS enforce playbackRate=1 before AND after play().
  //   - ONLY reload if readyState < 2 or error is set (evicted buffer).
  //   - Normal resume (readyState >= 2, no error): just play() — no load, no seek
  //     unless time has drifted significantly from saved position.
  //
  // PWA lock-screen resume:
  //   - Buffer may be evicted after long background — reload path handles this.
  const safePlay = useCallback(async (audio, reason) => {
    console.log("[Player] safePlay called — reason:", reason || "ui",
      "| src:", audio.src ? "set" : "MISSING",
      "| paused:", audio.paused,
      "| readyState:", audio.readyState,
      "| error:", audio.error?.code ?? null,
      "| savedTime:", savedTimeRef.current.toFixed(2),
      "| ct:", audio.currentTime.toFixed(2),
      "| isPWA:", isPWA);

    if (!audio.src) {
      console.warn("[Player] safePlay blocked — no src");
      return;
    }

    if (!audio.paused && audio.readyState >= 2) {
      // Already playing and healthy — enforce rate and restart watchdog only
      audio.playbackRate        = 1;
      audio.defaultPlaybackRate = 1;
      startWatchdog(audio);
      console.log("[Player] safePlay — already playing, enforcing rate");
      return;
    }

    try {
      // 1. Resume AudioContext — must happen before play()
      await resumeAudioContext();

      // 2. Enforce rate before play
      audio.playbackRate        = 1;
      audio.defaultPlaybackRate = 1;

      // 3. Reload if buffer is evicted (readyState < 2 or error)
      //    CRITICAL: must clear src first so Safari sees a real src change,
      //    otherwise audio.load() on the same url replays from buffer start → sped-up glitch.
      if (audio.readyState < 2 || audio.error) {
        console.log("[Player] safePlay — buffer evicted, reloading (readyState:", audio.readyState, "error:", audio.error?.code ?? null, ")");
        const src = audio.src;
        const restoreTime = savedTimeRef.current;

        // Clear src so Safari treats next assignment as a genuine new resource
        audio.src = "";
        // Brief yield so Safari processes the src clear before we reassign
        await new Promise(r => setTimeout(r, 0));
        audio.src = src;
        audio.load();

        await new Promise((resolve, reject) => {
          const onCanPlay = () => { cleanup(); resolve(); };
          const onError   = (e) => { cleanup(); reject(new Error("load error: " + e.message)); };
          const cleanup   = () => {
            audio.removeEventListener("canplay", onCanPlay);
            audio.removeEventListener("error",   onError);
          };
          audio.addEventListener("canplay", onCanPlay);
          audio.addEventListener("error",   onError);
        });

        // After reload, seek to saved position before play
        audio.playbackRate        = 1;
        audio.defaultPlaybackRate = 1;
        if (restoreTime > 0) {
          audio.currentTime = restoreTime;
          // Brief wait for seek to settle — Safari needs this or play() starts from 0
          await new Promise(r => setTimeout(r, 50));
        }
      } else {
        // 4. Normal resume — buffer is healthy.
        //    Only seek if time has significantly drifted from where we paused
        //    (e.g. software clock advanced during silent suspension).
        //    Threshold: 0.5s to avoid micro-seeking on normal pauses.
        if (savedTimeRef.current > 0 && Math.abs(audio.currentTime - savedTimeRef.current) > 0.5) {
          console.log("[Player] safePlay — seeking from", audio.currentTime.toFixed(2), "→", savedTimeRef.current.toFixed(2));
          audio.currentTime = savedTimeRef.current;
        }
      }

      if (!audio.paused) {
        console.log("[Player] safePlay — already playing after reload, skip play()");
        startWatchdog(audio);
        return;
      }

      // 5. Play
      await audio.play();

      // 6. Enforce rate again — iOS can reset it after play()
      audio.playbackRate        = 1;
      audio.defaultPlaybackRate = 1;

      startWatchdog(audio);
      console.log("[Player] ✅ safePlay success — ct:", audio.currentTime.toFixed(2));
    } catch (err) {
      if (err.name !== "AbortError") {
        console.warn("[Player] safePlay error:", err.name, err.message);
      }
    }
  }, [startWatchdog]);

  // ── safePause ─────────────────────────────────────────────────────────────
  // Suspend AudioContext FIRST so the audio graph stops instantly (no buffer drain).
  // Always update mediaSession.playbackState so the lock-screen bar stops immediately.
  const safePause = useCallback((audio) => {
    stopWatchdog();
    if (audio.currentTime > 0) savedTimeRef.current = audio.currentTime;
    if (audio.paused) return;
    suspendAudioContext();
    audio.pause();
    // Explicitly tell iOS lock screen the player is paused — without this,
    // the lock-screen progress bar can keep advancing for a few seconds.
    if ("mediaSession" in navigator) {
      navigator.mediaSession.playbackState = "paused";
    }
  }, [stopWatchdog]);

  // ── Load & play a new track ───────────────────────────────────────────────
  const playingTrackUrlRef = useRef("");

  useEffect(() => {
    if (!currentTrack?.audio_url) return;
    const audio = audioRef.current;
    const url   = currentTrack.audio_url;

    // Same track already loaded — just resume, never touch src/load
    if (loadedSrcRef.current === url) {
      if (audio.paused) safePlay(audio, "same-track-resume");
      return;
    }

    // New track
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
      audio.play().then(() => {
        startWatchdog(audio);
      }).catch((err) => {
        if (err.name !== "AbortError") console.warn("[Player] play error:", err.name);
      });
    };
    audio.addEventListener("canplay", onCanPlay);

    return () => { audio.removeEventListener("canplay", onCanPlay); };
  }, [currentTrack, safePlay, startWatchdog]);

  // ── Sync isPlaying from native audio events ───────────────────────────────
  useEffect(() => {
    const audio = audioRef.current;

    const onPlay  = () => {
      setIsPlaying(true);
      if (currentTrackRef.current) {
        setMediaSessionMetadata(currentTrackRef.current);
        // Analytics — fire-and-forget, never blocks playback
        try { trackSongPlay(currentTrackRef.current); streamStart(currentTrackRef.current); } catch {}
      }
      startWatchdog(audio);
    };
    const onPause = () => {
      setIsPlaying(false);
      stopWatchdog();
      try { if (currentTrackRef.current) { trackSongPause(currentTrackRef.current); streamPause(); } } catch {}
    };
    const onEnded = () => {
      setIsPlaying(false);
      stopWatchdog();
      try { if (currentTrackRef.current) { trackSongComplete(currentTrackRef.current); streamEnd(true); } } catch {}
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
  }, [currentTrack, startWatchdog, stopWatchdog]);

  // ── Background / visibility handler ──────────────────────────────────────
  //
  // PWA (standalone) mode:
  //   iOS gives PWAs a real AVAudioSession — audio continues in background.
  //   DO NOT pause on hide. Just save position and update hidden flag.
  //   On show, sync React state from the actual audio element.
  //
  // Safari (non-PWA) mode:
  //   iOS suspends web audio when the page goes hidden. Pause cleanly on hide
  //   so the lock-screen bar stops. Resume from savedTime on show.
  useEffect(() => {
    const audio = audioRef.current;
    let showTimer = null;

    const doHide = () => {
      sharedHiddenRef.current = true;

      // Always save position
      if (audio.currentTime > 0) {
        savedTimeRef.current = audio.currentTime;
        lastTimeRef.current  = audio.currentTime;
      }

      if (isPWA) {
        // PWA: let iOS keep the audio session alive — DO NOT pause.
        // Stop the watchdog (it's a JS timer, useless while hidden).
        // Media Session handlers stay registered — iOS will fire them from lock screen.
        stopWatchdog();
        console.log("[Player] hide (PWA) — audio continues in background, ct:", audio.currentTime.toFixed(2));
      } else {
        // Safari: iOS suspends web audio on page hide.
        // Pause cleanly NOW so:
        //   (a) the lock-screen progress bar stops immediately
        //   (b) we have the exact position for seekless resume (no catch-up)
        //   (c) AudioContext is suspended before pause so no buffer drain glitch
        stopWatchdog();
        if (!audio.paused) {
          // Capture position at the last possible moment before we pause
          const ct = audio.currentTime;
          if (ct > 0) {
            savedTimeRef.current = ct;
            lastTimeRef.current  = ct;
          }
          suspendAudioContext();
          audio.pause();
          if ("mediaSession" in navigator) {
            navigator.mediaSession.playbackState = "paused";
          }
          console.log("[Player] hide (Safari) — paused at:", savedTimeRef.current.toFixed(2));
        }
      }
    };

    const doShow = () => {
      clearTimeout(showTimer);
      sharedHiddenRef.current = false;

      if (!audio.src || audio.ended) {
        setIsPlaying(false);
        return;
      }

      audio.playbackRate        = 1;
      audio.defaultPlaybackRate = 1;

      const nowPlaying = !audio.paused;
      setIsPlaying(nowPlaying);

      console.log("[Player] show —",
        "isPWA:", isPWA,
        "| ct:", audio.currentTime.toFixed(2),
        "| saved:", savedTimeRef.current.toFixed(2),
        "| paused:", audio.paused,
        "| readyState:", audio.readyState);

      // In PWA, if audio was playing in background and is still playing — restart watchdog
      if (isPWA && nowPlaying) {
        startWatchdog(audio);
      }
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
  }, [stopWatchdog, startWatchdog]);

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
  // Registered ONCE — never re-register on track change.
  // Uses audioRef + currentTrackRef (refs) so handlers are always fresh.
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    const audio = audioRef.current;

    navigator.mediaSession.setActionHandler("play", () => {
      const track = currentTrackRef.current;
      console.log("[Player] 🎵 Media Session PLAY fired —",
        "isPWA:", isPWA,
        "| src:", audio.src ? "set" : "MISSING",
        "| track:", track?.title ?? "none",
        "| paused:", audio.paused,
        "| readyState:", audio.readyState,
        "| error:", audio.error?.code ?? null,
        "| savedTime:", savedTimeRef.current.toFixed(2));

      if (!audio.src) {
        // src was cleared — nothing we can do without re-triggering playTrack
        console.warn("[Player] Media Session play — no src, cannot resume");
        return;
      }

      audio.playbackRate        = 1;
      audio.defaultPlaybackRate = 1;
      safePlay(audio, "pwa-lockscreen");
    });

    navigator.mediaSession.setActionHandler("pause", () => {
      console.log("[Player] 🎵 Media Session PAUSE fired");
      safePause(audio);
      setIsPlaying(false);
    });

    navigator.mediaSession.setActionHandler("nexttrack",     () => {
      console.log("[Player] 🎵 Media Session NEXT fired");
      onNextRef.current?.();
    });
    navigator.mediaSession.setActionHandler("previoustrack", () => {
      console.log("[Player] 🎵 Media Session PREV fired");
      onPrevRef.current?.();
    });

    return () => {
      ["play", "pause", "nexttrack", "previoustrack"].forEach((a) => {
        try { navigator.mediaSession.setActionHandler(a, null); } catch {}
      });
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safePlay, safePause]);
  // NOTE: intentionally NOT listing currentTrack — we use currentTrackRef so
  // this effect never re-runs on track change (avoids handler gaps on rapid skips)

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
      safePlay(audio, "toggle");
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
      isPWA,
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