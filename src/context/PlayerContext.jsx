import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from "react";

const PlayerContext = createContext(null);

// Single shared Audio element — survives re-renders and page navigation
const AUDIO = new Audio();

export function PlayerProvider({ children }) {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [sourceType, setSourceType] = useState("song"); // "song" | "radio"
  const [queue, setQueue] = useState([]);
  const audioRef = useRef(AUDIO);

  // Load + play whenever currentTrack changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!currentTrack?.audio_url) {
      audio.pause();
      audio.src = "";
      setIsPlaying(false);
      return;
    }

    audio.pause();
    audio.src = currentTrack.audio_url;
    audio.load();

    const onCanPlay = () => {
      audio.play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    };

    audio.addEventListener("canplay", onCanPlay, { once: true });
    return () => audio.removeEventListener("canplay", onCanPlay);
  }, [currentTrack]);

  // Sync play/pause for togglePlay
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  useEffect(() => {
    const audio = audioRef.current;
    if (!currentTrack) return;
    if (isPlaying) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying]);

  const playTrack = useCallback((track, source = "song") => {
    setSourceType(source);
    setCurrentTrack(track);
  }, []);

  const togglePlay = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  const stopPlaying = useCallback(() => {
    const audio = audioRef.current;
    audio.pause();
    audio.src = "";
    setIsPlaying(false);
    setCurrentTrack(null);
    setSourceType("song");
  }, []);

  return (
    <PlayerContext.Provider value={{
      currentTrack,
      isPlaying,
      sourceType,
      queue,
      playTrack,
      togglePlay,
      stopPlaying,
      setQueue,
      audioRef,
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