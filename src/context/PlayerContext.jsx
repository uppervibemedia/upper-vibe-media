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

  // savedTimeRef: the currentTime captured synchronously on hide.
  // Used ONLY when Safari evicts the buffer and we must reload src + seek.
  const savedTimeRef = useRef(0);
  // Keep-alive interval — prevents Safari from fully discarding the buffer
  const keepAliveRef = useRef(null);

  // ── safePlay ─────────────────────────────────────────────────────────────
  // Resume the audio element.
  // If Safari evicted the buffer (readyState === 0), reload src atomically
  // at savedTimeRef so we resume from the exact saved position, not from 0.
  // NEVER call audio.load() standalone — that resets currentTime to 0 before
  // the seek has a chance to fire and is the root cause of the catch-up glitch.
  const safePlay = useCallback(async (audio) => {
    try {
      await resumeAudioContext();

      // Always enforce rate = 1 BEFORE play — Safari can drift it
      audio.playbackRate        = 1;
      audio.defaultPlaybackRate = 1;

      if (!audio.paused) return; // already playing

      // ── Safari buffer eviction check ──────────────────────────────────────
      // readyState 0 (HAVE_NOTHING) on a paused element with a valid src means
      // Safari silently discarded the decode buffer while we were in background.
      // Fix: re-assign src (does NOT reset currentTime immediately like load()),
      // then seek inside 'loadedmetadata' before playback starts.
      if (audio.readyState === 0 && audio.src) {
        const resumeTime = savedTimeRef.current;
        const srcUrl     = audio.src; // preserve before reassign
        console.log("[Player] safePlay — buffer evicted, reloading at", resumeTime.toFixed(2));

        await new Promise((resolve, reject) => {
          const cleanup = () => {
            audio.removeEventListener("loadedmetadata", onMeta);
            audio.removeEventListener("error",          onErr);
          };
          const onMeta = () => {
            cleanup();
            // Seek to saved position as soon as metadata is ready
            if (resumeTime > 0 && isFinite(audio.duration)) {
              try { audio.currentTime = resumeTime; } catch {}
            }
            resolve();
          };
          const onErr = (e) => { cleanup(); reject(e); };
          audio.addEventListener("loadedmetadata", onMeta);
          audio.addEventListener("error",          onErr);
          // Re-assigning src is the atomic reload — avoids the load()+seek race
          audio.src = srcUrl;
        });

        savedTimeRef.current = 0;
        audio.playbackRate        = 1;
        audio.defaultPlaybackRate = 1;
        await audio.play();
        audio.playbackRate = 1;
        return;
      }

      // Normal resume — buffer is intact, just call play()
      // DO NOT seek. Safari resumes from currentTime natively with no glitch.
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

    // Genuinely new track — full load from start
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
      lastTimeRef.current  = 0;
      savedTimeRef.current = 0;
      onNextRef.current?.();
    };
    const onStall = () => { if (audio.paused) setIsPlaying(false); };
    // Rate guard — iOS/Safari can drift playbackRate during suspension
    const onRateChange = () => {
      if (audio.playbackRate !== 1) {
        console.warn("[Player] ratechange →", audio.playbackRate, "forcing 1");
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
  // ON HIDE:
  //   1. Capture audio.currentTime synchronously right now (before iOS suspends)
  //   2. Pause immediately — same as pressing the Pause button
  //   3. Freeze UI (isPlaying = false)
  //   4. Start keep-alive to prevent Safari buffer eviction
  //
  // ON SHOW:
  //   1. Stop keep-alive
  //   2. Reset playbackRate (iOS can drift it)
  //   3. Sync UI — leave audio PAUSED, wait for user to press Play
  //   4. DO NOT auto-play
  useEffect(() => {
    const audio = audioRef.current;
    let showTimer = null;

    const stopKeepAlive = () => {
      if (keepAliveRef.current) {
        clearInterval(keepAliveRef.current);
        keepAliveRef.current = null;
      }
    };

    // Ping currentTime every 4s while hidden — enough to keep Safari's
    // network buffer alive without triggering a media policy violation.
    const startKeepAlive = () => {
      stopKeepAlive();
      keepAliveRef.current = setInterval(() => {
        // Just reading currentTime keeps the media element "active"
        void audio.currentTime;
      }, 4000);
    };

    const doHide = () => {
      sharedHiddenRef.current = true;
      if (!audio.src || audio.ended) return;

      // Capture position SYNCHRONOUSLY — before iOS has a chance to suspend
      const ct = audio.currentTime;
      if (ct > 0) {
        savedTimeRef.current = ct;
        lastTimeRef.current  = ct;
        console.log("[Player] hide — saved ct:", ct.toFixed(2));
      }

      // Pause immediately — bypass nothing, this must be synchronous
      if (!audio.paused) {
        audio.pause();
        console.log("[Player] hide — paused");
      }

      setIsPlaying(false);
      startKeepAlive();
    };

    const doShow = () => {
      clearTimeout(showTimer);
      sharedHiddenRef.current = false;
      stopKeepAlive();

      if (!audio.src || audio.ended) { setIsPlaying(false); return; }

      // Reset rate — Safari can drift it during suspension
      audio.playbackRate        = 1;
      audio.defaultPlaybackRate = 1;

      // Always leave paused — user must press Play
      // DO NOT call safePlay here
      setIsPlaying(false);
      console.log("[Player] show — leaving paused at", audio.currentTime.toFixed(2), "readyState:", audio.readyState);
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
      stopKeepAlive();
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
  // Lock-screen Play: enforce rate=1, then safePlay (handles buffer eviction).
  // Lock-screen Pause: just pause, no seek.
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    const audio = audioRef.current;

    navigator.mediaSession.setActionHandler("play", () => {
      if (!audio.src) return;
      console.log("[Player] MediaSession play — readyState:", audio.readyState, "ct:", audio.currentTime);
      audio.playbackRate        = 1;
      audio.defaultPlaybackRate = 1;
      safePlay(audio);
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
    if (keepAliveRef.current) { clearInterval(keepAliveRef.current); keepAliveRef.current = null; }
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