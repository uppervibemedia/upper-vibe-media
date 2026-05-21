/**
 * PlayerContext — Upper Vibe Media
 *
 * COLD LAUNCH HARDENING (Safari / PWA force-close recovery):
 *
 * - On every module load we create a FRESH Audio element (no singleton reuse).
 * - Persisted radio state is restored as metadata only — isPlaying is never
 *   auto-resumed on restart. User or iOS Media Session must trigger play.
 * - playbackRate is enforced to 1 before AND after every play() call, and
 *   also on visibilitychange / pageshow / pagehide / ratechange events.
 * - Media Session handlers are re-registered whenever currentTrack changes.
 * - A play-lock prevents concurrent play() calls on the same element.
 * - The audio element is completely torn down and rebuilt when changing tracks
 *   after a cold launch (readyState === 0 with no src set = cold state).
 */

import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from "react";
import { trackSongPlay, trackSongPause, trackSongComplete, streamStart, streamPause, streamEnd, streamSetMeta } from "@/lib/analytics";

const PlayerContext = createContext(null);

// ── PWA detection ─────────────────────────────────────────────────────────────
const isPWA = (() => {
  if (typeof window === "undefined") return false;
  return (
    window.navigator.standalone === true ||
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches
  );
})();

console.log("[Player] cold_launch — isPWA:", isPWA, "| time:", Date.now());

// ── Audio element factory ─────────────────────────────────────────────────────
// Creates a FRESH element on every cold launch — never reuses stale state.
function createFreshAudio() {
  const a = new Audio();
  a.crossOrigin = "anonymous";
  a.preload = "auto";
  a.playbackRate = 1;
  a.defaultPlaybackRate = 1;
  if ("preservesPitch" in a) a.preservesPitch = true;
  a.setAttribute("x-webkit-airplay", "allow");
  a.setAttribute("playsinline", "");
  console.log("[Player] audio_created — fresh element");
  return a;
}

// ── ONE global AudioContext — shared with visualiser ─────────────────────────
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

// ── Shared hidden flag ────────────────────────────────────────────────────────
export const sharedHiddenRef = { current: false };

// ── enforceRate — call before AND after every play() ─────────────────────────
function enforceRate(audio) {
  audio.playbackRate        = 1;
  audio.defaultPlaybackRate = 1;
  if ("preservesPitch" in audio) audio.preservesPitch = true;
}

// =============================================================================
export function PlayerProvider({ children }) {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying,    setIsPlaying]    = useState(false);
  const [queue,        setQueue]        = useState([]);
  const [sourceType,   setSourceType]   = useState("song");

  // Live audio element ref — replaced on cold launch, never reused across restarts
  const audioRef          = useRef(null);
  const onNextRef         = useRef(null);
  const onPrevRef         = useRef(null);
  const loadedSrcRef      = useRef("");
  const savedTimeRef      = useRef(0);
  const lastTimeRef       = useRef(0);
  const playLockRef       = useRef(false);   // prevent concurrent play() calls
  const currentTrackRef   = useRef(null);
  const playingUrlRef     = useRef("");

  // ── Bootstrap: create fresh audio on mount ───────────────────────────────
  useEffect(() => {
    const audio = createFreshAudio();
    audioRef.current = audio;
    getOrCreateAudioContext(audio);
    console.log("[Player] audio_created — mounted");

    return () => {
      console.log("[Player] audio_destroyed — unmount");
      destroyAudio(audio);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function destroyAudio(audio) {
    if (!audio) return;
    audio.pause();
    audio.src = "";
    try { audio.load(); } catch {}
    // Remove all event listeners by cloning (easiest teardown pattern)
    console.log("[Player] audio_destroyed");
  }

  // ── Keep currentTrackRef in sync ──────────────────────────────────────────
  useEffect(() => {
    currentTrackRef.current = currentTrack;
    try { if (currentTrack) streamSetMeta(currentTrack); } catch {}
  }, [currentTrack]);

  // ── Watchdog refs ─────────────────────────────────────────────────────────
  const watchdogRef      = useRef(null);
  const watchdogTimeRef  = useRef(0);
  const watchdogStampRef = useRef(0);

  const stopWatchdog = useCallback(() => {
    if (watchdogRef.current) { clearInterval(watchdogRef.current); watchdogRef.current = null; }
  }, []);

  const startWatchdog = useCallback((audio) => {
    stopWatchdog();
    watchdogTimeRef.current  = audio.currentTime;
    watchdogStampRef.current = Date.now();

    watchdogRef.current = setInterval(() => {
      if (!isPWA && document.visibilityState === "hidden") return;
      if (audio.paused || audio.ended || !audio.src) { stopWatchdog(); return; }

      const elapsed  = (Date.now() - watchdogStampRef.current) / 1000;
      const ct       = audio.currentTime;
      const advanced = ct - watchdogTimeRef.current;

      if (elapsed >= 0.7 && advanced < 0.1) {
        console.warn("[Player] 🚨 Watchdog: silent stall — ct:", ct.toFixed(2));
        savedTimeRef.current = ct;
        lastTimeRef.current  = ct;
        suspendAudioContext();
        audio.pause();
        if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "paused";
        stopWatchdog();
        return;
      }

      watchdogTimeRef.current  = ct;
      watchdogStampRef.current = Date.now();
    }, 800);
  }, [stopWatchdog]);

  // ── safePause ─────────────────────────────────────────────────────────────
  const safePause = useCallback((audio) => {
    stopWatchdog();
    if (audio && audio.currentTime > 0) savedTimeRef.current = audio.currentTime;
    if (!audio || audio.paused) return;
    suspendAudioContext();
    audio.pause();
    if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "paused";
  }, [stopWatchdog]);

  // ── safePlay ─────────────────────────────────────────────────────────────
  const safePlay = useCallback(async (audio, reason) => {
    if (!audio || !audio.src) {
      console.warn("[Player] safePlay blocked — no audio or no src | reason:", reason);
      return;
    }

    // Play lock — prevent concurrent play() calls
    if (playLockRef.current) {
      console.log("[Player] safePlay — play lock active, skipping | reason:", reason);
      return;
    }

    console.log("[Player] safePlay — reason:", reason,
      "| paused:", audio.paused,
      "| readyState:", audio.readyState,
      "| error:", audio.error?.code ?? null,
      "| ct:", audio.currentTime.toFixed(2),
      "| saved:", savedTimeRef.current.toFixed(2),
      "| isPWA:", isPWA);

    // Already playing and healthy
    if (!audio.paused && audio.readyState >= 2) {
      enforceRate(audio);
      startWatchdog(audio);
      return;
    }

    playLockRef.current = true;
    try {
      await resumeAudioContext();
      enforceRate(audio);

      // Reload if buffer is evicted
      if (audio.readyState < 2 || audio.error) {
        console.log("[Player] safePlay — buffer evicted, reloading (rs:", audio.readyState, "err:", audio.error?.code ?? null, ")");
        const src         = audio.src;
        const restoreTime = savedTimeRef.current;

        // CRITICAL: clear src first so Safari sees a genuine src change
        audio.src = "";
        await new Promise(r => setTimeout(r, 0));
        audio.src = src;
        enforceRate(audio);
        audio.load();

        await new Promise((resolve, reject) => {
          const done    = () => { cleanup(); resolve(); };
          const fail    = (e) => { cleanup(); reject(new Error("load error: " + (e.message || ""))); };
          const cleanup = () => {
            audio.removeEventListener("canplay", done);
            audio.removeEventListener("error",   fail);
          };
          audio.addEventListener("canplay", done);
          audio.addEventListener("error",   fail);
        });

        enforceRate(audio);
        if (restoreTime > 0) {
          audio.currentTime = restoreTime;
          await new Promise(r => setTimeout(r, 50));
        }
      } else {
        // Normal resume — correct drift if needed
        if (savedTimeRef.current > 0 && Math.abs(audio.currentTime - savedTimeRef.current) > 0.5) {
          console.log("[Player] safePlay — seeking", audio.currentTime.toFixed(2), "→", savedTimeRef.current.toFixed(2));
          audio.currentTime = savedTimeRef.current;
        }
      }

      if (!audio.paused) {
        enforceRate(audio);
        startWatchdog(audio);
        console.log("[Player] safePlay — already playing after reload");
        return;
      }

      console.log("[Player] playbackRate before play:", audio.playbackRate);
      const playPromise = audio.play();
      await playPromise;
      enforceRate(audio); // enforce AFTER play — iOS can reset rate post-play
      console.log("[Player] play promise resolved | playbackRate after play:", audio.playbackRate);
      startWatchdog(audio);

    } catch (err) {
      if (err.name !== "AbortError") {
        console.warn("[Player] safePlay error:", err.name, err.message);
      } else {
        console.log("[Player] safePlay — AbortError (normal on rapid track change)");
      }
    } finally {
      playLockRef.current = false;
    }
  }, [startWatchdog]);

  // ── Load & play new track ─────────────────────────────────────────────────
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack?.audio_url) return;

    const url = currentTrack.audio_url;

    // Same src already loaded — just resume
    if (loadedSrcRef.current === url) {
      if (audio.paused) safePlay(audio, "same-track-resume");
      return;
    }

    // New track — full reload
    loadedSrcRef.current   = url;
    playingUrlRef.current  = url;
    savedTimeRef.current   = 0;
    lastTimeRef.current    = 0;
    playLockRef.current    = false; // reset lock for new track

    // CRITICAL: clear src first (Safari anti-glitch)
    audio.src = "";
    enforceRate(audio);

    // Tiny yield so Safari processes the clear
    setTimeout(() => {
      if (playingUrlRef.current !== url) return; // track changed again
      audio.src = url;
      enforceRate(audio);
      audio.load();

      const onCanPlay = () => {
        audio.removeEventListener("canplay", onCanPlay);
        if (playingUrlRef.current !== url) return;
        enforceRate(audio);
        console.log("[Player] track changed — playbackRate before play:", audio.playbackRate);
        audio.play().then(() => {
          enforceRate(audio);
          console.log("[Player] track changed — play promise resolved | playbackRate:", audio.playbackRate);
          startWatchdog(audio);
        }).catch((err) => {
          if (err.name !== "AbortError") console.warn("[Player] new track play error:", err.name);
        });
      };
      audio.addEventListener("canplay", onCanPlay);
    }, 0);

    return () => {
      // cleanup handled by the timeout guard (playingUrlRef check)
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack]);

  // ── Native audio events → React state ────────────────────────────────────
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onPlay = () => {
      enforceRate(audio);
      setIsPlaying(true);
      if (currentTrackRef.current) {
        setMediaSessionMetadata(currentTrackRef.current);
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
    const onStall      = () => { if (audio.paused) setIsPlaying(false); };
    const onRateChange = () => {
      if (audio.playbackRate !== 1) {
        console.warn("[Player] ratechange →", audio.playbackRate, "forcing 1");
        enforceRate(audio);
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
  }, [startWatchdog, stopWatchdog]);

  // ── Visibility / page lifecycle ───────────────────────────────────────────
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    let showTimer = null;

    const doHide = () => {
      sharedHiddenRef.current = true;
      if (audio.currentTime > 0) {
        savedTimeRef.current = audio.currentTime;
        lastTimeRef.current  = audio.currentTime;
      }
      console.log("[Player] visibilitychange — hidden | isPWA:", isPWA, "| ct:", audio.currentTime.toFixed(2));

      if (isPWA) {
        stopWatchdog();
      } else {
        stopWatchdog();
        if (!audio.paused) {
          const ct = audio.currentTime;
          if (ct > 0) { savedTimeRef.current = ct; lastTimeRef.current = ct; }
          suspendAudioContext();
          audio.pause();
          if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "paused";
          console.log("[Player] hide (Safari) — paused at:", savedTimeRef.current.toFixed(2));
        }
      }
    };

    const doShow = (persisted) => {
      clearTimeout(showTimer);
      sharedHiddenRef.current = false;
      if (!audio.src || audio.ended) { setIsPlaying(false); return; }

      enforceRate(audio);
      setIsPlaying(!audio.paused);
      console.log("[Player] visibilitychange — visible | isPWA:", isPWA,
        "| persisted:", persisted,
        "| ct:", audio.currentTime.toFixed(2),
        "| paused:", audio.paused,
        "| rs:", audio.readyState);

      if (isPWA && !audio.paused) startWatchdog(audio);
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        doHide();
      } else {
        clearTimeout(showTimer);
        showTimer = setTimeout(() => doShow(false), 50);
      }
    };
    const onPageHide = () => doHide();
    const onPageShow = (e) => {
      console.log("[Player] pageshow — persisted:", e.persisted);
      clearTimeout(showTimer);
      showTimer = setTimeout(() => doShow(e.persisted), 50);
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
      title:   track.title  || "Unknown",
      artist:  track.artist_display || track.artist || "Upper Vibe Media",
      album:   "Upper Vibe Radio",
      artwork: [
        { src: artSrc, sizes: "512x512",   type: "image/jpeg" },
        { src: artSrc, sizes: "1024x1024", type: "image/jpeg" },
      ],
    });
    console.log("[Player] track changed from iOS control / metadata set:", track.title);
  }

  // Update metadata whenever track changes
  useEffect(() => {
    if (currentTrack) setMediaSessionMetadata(currentTrack);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack]);

  // ── Media Session action handlers — re-register on every track change ────
  // Re-registering ensures next/prev always call the freshest registered
  // next/prev handlers (which point to the latest radio queue state via refs).
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    const audio = audioRef.current;
    if (!audio) return;

    navigator.mediaSession.setActionHandler("play", () => {
      const track = currentTrackRef.current;
      console.log("[Player] 🎵 Media Session PLAY fired — src:", audio.src ? "set" : "MISSING",
        "| track:", track?.title ?? "none",
        "| paused:", audio.paused, "| rs:", audio.readyState);
      if (!audio.src) return;
      enforceRate(audio);
      safePlay(audio, "pwa-lockscreen");
    });

    navigator.mediaSession.setActionHandler("pause", () => {
      console.log("[Player] 🎵 Media Session PAUSE fired");
      safePause(audio);
      setIsPlaying(false);
    });

    navigator.mediaSession.setActionHandler("nexttrack", () => {
      console.log("[Player] 🎵 mediaSession next pressed");
      onNextRef.current?.();
    });

    navigator.mediaSession.setActionHandler("previoustrack", () => {
      console.log("[Player] 🎵 mediaSession previous pressed");
      onPrevRef.current?.();
    });

    navigator.mediaSession.setActionHandler("seekforward",  null);
    navigator.mediaSession.setActionHandler("seekbackward", null);

    return () => {
      ["play", "pause", "nexttrack", "previoustrack"].forEach((a) => {
        try { navigator.mediaSession.setActionHandler(a, null); } catch {}
      });
    };
  // Re-run whenever currentTrack changes — ensures handlers are always fresh
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack, safePlay, safePause]);

  // Sync lock-screen playback badge
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
  }, [isPlaying]);

  // ── togglePlay ────────────────────────────────────────────────────────────
  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !audio.src) return;
    if (audio.paused || audio.ended) {
      enforceRate(audio);
      safePlay(audio, "toggle");
    } else {
      safePause(audio);
    }
  }, [safePlay, safePause]);

  // ── Public API ────────────────────────────────────────────────────────────
  const playTrack = useCallback((track, source = "song") => {
    if (!audioRef.current) return;
    getOrCreateAudioContext(audioRef.current);
    setSourceType(source);
    setCurrentTrack(track);
  }, []);

  const stopPlaying = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    stopWatchdog();
    suspendAudioContext();
    audio.pause();
    audio.src            = "";
    loadedSrcRef.current = "";
    playingUrlRef.current = "";
    lastTimeRef.current  = 0;
    savedTimeRef.current = 0;
    playLockRef.current  = false;
    setIsPlaying(false);
    setCurrentTrack(null);
    console.log("[Player] audio_destroyed — stopPlaying");
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
      playLockRef,
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