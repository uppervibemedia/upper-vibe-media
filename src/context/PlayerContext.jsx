import React, { createContext, useContext, useState, useRef, useEffect } from "react";

const PlayerContext = createContext(null);

export function PlayerProvider({ children }) {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [queue, setQueue] = useState([]);
  const audioRef = useRef(new Audio());

  useEffect(() => {
    const audio = audioRef.current;
    if (currentTrack?.audio_url) {
      audio.src = currentTrack.audio_url;
      audio.play();
      setIsPlaying(true);
    }
  }, [currentTrack]);

  useEffect(() => {
    const audio = audioRef.current;
    if (isPlaying) {
      audio.play();
    } else {
      audio.pause();
    }
  }, [isPlaying]);

  const playTrack = (track) => {
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