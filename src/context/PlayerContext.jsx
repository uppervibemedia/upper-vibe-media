import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from "react";

const PlayerContext = createContext(null);

// Single persistent audio element — never recreated
const persistentAudio = (() => {
  const a = new Audio();
  a.crossOrigin = "anonymous";
  a.preload = "auto";
  return a;
})();

export function PlayerProvider({ children }) {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [queue, setQueue] = useState([]);
  const [sourceType, setSourceType] = useState("song");
  // Refs for Media Session callbacks (avoids stale closure)
  const onNextRef = useRef(null);
  const onPrevRef = useRef(null);
  const audioRef = useRef(persistentAudio);

  // Load & play when track changes
  useEffect(() => {
    if (!currentTrack?.audio_url) return;
    const audio = audioRef.current;
    audio.src = currentTrack.audio_url;
    audio.load();
    audio.play().catch(() => {});
    setIsPlaying(true);
  }, [currentTrack]);

  // Sync play/pause state to audio element
  useEffect(() => {
    const audio = audioRef.current;
    if (isPlaying) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [isPlaying]);

  // Media Session API — lock screen controls & metadata
  useEffect(() => {
    if (!("mediaSession" in navigator) || !currentTrack) return;

    const artwork = currentTrack.cover_url
      ? [{ src: currentTrack.cover_url, sizes: "512x512", type: "image/jpeg" }]
      : [];

    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentTrack.title || "Unknown",
      artist: currentTrack.artist_display || currentTrack.artist || "Upper Vibe Media",
      album: "Upper Vibe Media",
      artwork,
    });

    navigator.mediaSession.setActionHandler("play", () => {
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
    });
    navigator.mediaSession.setActionHandler("pause", () => {
      audioRef.current.pause();
      setIsPlaying(false);
    });
    navigator.mediaSession.setActionHandler("nexttrack", () => {
      if (onNextRef.current) onNextRef.current();
    });
    navigator.mediaSession.setActionHandler("previoustrack", () => {
      if (onPrevRef.current) onPrevRef.current();
    });

    return () => {
      // Clear handlers on unmount (safety)
      ["play","pause","nexttrack","previoustrack"].forEach((action) => {
        try { navigator.mediaSession.setActionHandler(action, null); } catch {}
      });
    };
  }, [currentTrack]);

  // Keep Media Session playback state in sync
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
  }, [isPlaying]);

  // Resume AudioContext and re-sync playback when tab becomes visible again (phone unlock)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        const audio = audioRef.current;
        // Resume any suspended Web Audio context (used by visualizer)
        if (window._uvAudioCtx?.state === "suspended") {
          window._uvAudioCtx.resume().catch(() => {});
        }
        // If we think we're playing but audio is paused, re-trigger play
        if (isPlaying && audio.paused && audio.src) {
          audio.play().catch(() => {});
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isPlaying, audioRef]);

  const playTrack = useCallback((track, source = "song") => {
    setSourceType(source);
    setCurrentTrack(track);
  }, []);

  const togglePlay = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  const stopPlaying = useCallback(() => {
    audioRef.current.pause();
    audioRef.current.src = "";
    setIsPlaying(false);
    setCurrentTrack(null);
  }, []);

  // Allow Radio/Queue to register next/prev handlers for lock screen & UI buttons
  const registerNextHandler = useCallback((fn) => { onNextRef.current = fn; }, []);
  const registerPrevHandler = useCallback((fn) => { onPrevRef.current = fn; }, []);

  const handleNext = useCallback(() => { onNextRef.current?.(); }, []);
  const handlePrev = useCallback(() => { onPrevRef.current?.(); }, []);

  return (
    <PlayerContext.Provider value={{
      currentTrack,
      isPlaying,
      queue,
      sourceType,
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