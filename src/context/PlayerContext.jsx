import React, { createContext, useContext, useState, useRef, useEffect } from "react";

const PlayerContext = createContext(null);

export function PlayerProvider({ children }) {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [queue, setQueue] = useState([]);
  const [sourceType, setSourceType] = useState("song");
  const audioRef = useRef(new Audio());

  // When track changes: load + play
  useEffect(() => {
    const audio = audioRef.current;
    if (!currentTrack?.audio_url) return;

    audio.src = currentTrack.audio_url;
    audio.load();

    const onCanPlay = () => {
      audio.play().then(() => {
        setIsPlaying(true);
      }).catch(() => {
        // Autoplay blocked — just mark as not playing
        setIsPlaying(false);
      });
    };

    audio.addEventListener("canplay", onCanPlay, { once: true });
    return () => {
      audio.removeEventListener("canplay", onCanPlay);
    };
  }, [currentTrack]);

  // When isPlaying toggles (from togglePlay), sync audio element
  useEffect(() => {
    const audio = audioRef.current;
    if (!currentTrack) return;
    if (isPlaying) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [isPlaying]); // eslint-disable-line react-hooks/exhaustive-deps

  const playTrack = (track, source = "song") => {
    setSourceType(source);
    setCurrentTrack(track);
  };

  const togglePlay = () => {
    setIsPlaying((prev) => !prev);
  };

  const stopPlaying = () => {
    audioRef.current.pause();
    audioRef.current.src = "";
    setIsPlaying(false);
    setCurrentTrack(null);
  };

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
      audioRef
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