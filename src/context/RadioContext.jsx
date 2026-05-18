import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { base44 } from "@/api/base44Client";

const RadioContext = createContext(null);

const LS_KEY = "uvm_radio_state";

function loadPersistedState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function persistState(state) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch {}
}

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Build a fresh shuffle queue (excludes current song from front)
function buildQueue(allTracks, currentSongId) {
  const shuffled = shuffleArray(allTracks.filter((t) => t.id !== currentSongId));
  return shuffled;
}

export function RadioProvider({ children }) {
  const [allTracks, setAllTracks] = useState([]);
  const [tracksLoaded, setTracksLoaded] = useState(false);
  const [currentRadioSong, setCurrentRadioSong] = useState(null);
  const [radioQueue, setRadioQueue] = useState([]); // upcoming songs
  const [radioHistory, setRadioHistory] = useState([]); // played songs
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isRadioMode, setIsRadioMode] = useState(false);

  // Load tracks once
  useEffect(() => {
    base44.entities.Track.filter({ status: "published" }, "-created_date", 500).then((res) => {
      setAllTracks(res);
      setTracksLoaded(true);
    });
  }, []);

  // Restore persisted state once tracks are loaded
  const restoredRef = useRef(false);
  useEffect(() => {
    if (!tracksLoaded || restoredRef.current) return;
    restoredRef.current = true;

    const saved = loadPersistedState();
    if (!saved) return;

    if (saved.currentRadioSongId && allTracks.length > 0) {
      const song = allTracks.find((t) => t.id === saved.currentRadioSongId);
      if (song) {
        setCurrentRadioSong(song);
        setIsRadioMode(!!saved.isRadioMode);

        if (saved.radioHistoryIds?.length) {
          const hist = saved.radioHistoryIds
            .map((id) => allTracks.find((t) => t.id === id))
            .filter(Boolean);
          setRadioHistory(hist);
          setHistoryIndex(hist.length - 1);
        }

        if (saved.radioQueueIds?.length) {
          const queue = saved.radioQueueIds
            .map((id) => allTracks.find((t) => t.id === id))
            .filter(Boolean);
          setRadioQueue(queue);
        } else {
          // Rebuild queue if not persisted
          setRadioQueue(buildQueue(allTracks, song.id));
        }
      }
    }
  }, [tracksLoaded, allTracks]);

  // Persist whenever relevant state changes
  useEffect(() => {
    if (!tracksLoaded) return;
    persistState({
      currentRadioSongId: currentRadioSong?.id || null,
      radioHistoryIds: radioHistory.map((t) => t.id),
      radioQueueIds: radioQueue.map((t) => t.id),
      isRadioMode,
      lastUpdatedAt: Date.now(),
    });
  }, [currentRadioSong, radioHistory, radioQueue, isRadioMode, tracksLoaded]);

  // Initialize radio with a random song if nothing is loaded yet (no autoplay)
  const initRadio = useCallback(() => {
    if (!allTracks.length) return null;
    if (currentRadioSong) return currentRadioSong;

    const shuffled = shuffleArray(allTracks);
    const song = shuffled[0];
    const queue = shuffled.slice(1);
    if (!song) return null;
    setCurrentRadioSong(song);
    setRadioHistory([song]);
    setHistoryIndex(0);
    setRadioQueue(queue);
    return song;
  }, [allTracks, currentRadioSong]);

  // Start radio — play current (or pick one) and set radio mode
  const startRadio = useCallback((onPlay) => {
    let song = currentRadioSong;
    let queue = radioQueue;

    if (!song) {
      const shuffled = shuffleArray(allTracks);
      song = shuffled[0];
      queue = shuffled.slice(1);
      if (!song) return;
      setCurrentRadioSong(song);
      setRadioHistory([song]);
      setHistoryIndex(0);
      setRadioQueue(queue);
    }
    setIsRadioMode(true);
    if (onPlay) onPlay(song);
  }, [allTracks, currentRadioSong, radioQueue]);

  // Resume radio after playing a normal song
  const resumeRadio = useCallback((onPlay) => {
    if (!currentRadioSong) return startRadio(onPlay);
    setIsRadioMode(true);
    if (onPlay) onPlay(currentRadioSong);
  }, [currentRadioSong, startRadio]);

  // Advance to next song in queue
  const nextRadioSong = useCallback((onPlay) => {
    if (!allTracks.length) return;

    let nextSong;
    let newQueue = [...radioQueue];

    if (newQueue.length > 0) {
      nextSong = newQueue.shift();
    } else {
      // Rebuild queue when exhausted
      const rebuilt = buildQueue(allTracks, currentRadioSong?.id);
      nextSong = rebuilt[0];
      newQueue = rebuilt.slice(1);
    }

    if (!nextSong) return;

    // Refill queue if running low (keep at least 10)
    if (newQueue.length < 10) {
      const extra = buildQueue(allTracks, nextSong.id).filter(
        (t) => t.id !== nextSong.id && !newQueue.find((q) => q.id === t.id)
      );
      newQueue = [...newQueue, ...extra].slice(0, 50);
    }

    const newHistory = [...radioHistory.slice(0, historyIndex + 1), nextSong];
    setRadioHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setCurrentRadioSong(nextSong);
    setRadioQueue(newQueue);
    setIsRadioMode(true);
    if (onPlay) onPlay(nextSong);
  }, [allTracks, radioQueue, radioHistory, historyIndex, currentRadioSong]);

  // Go back to previous song
  const prevRadioSong = useCallback((onPlay) => {
    if (historyIndex <= 0) return;
    const newIndex = historyIndex - 1;
    const song = radioHistory[newIndex];
    // Push current back to front of queue
    setRadioQueue((q) => [currentRadioSong, ...q].filter(Boolean));
    setHistoryIndex(newIndex);
    setCurrentRadioSong(song);
    setIsRadioMode(true);
    if (onPlay) onPlay(song);
  }, [radioHistory, historyIndex, currentRadioSong]);

  // Jump to a specific Up Next song
  const jumpToSong = useCallback((song, onPlay) => {
    if (!song) return;
    // Remove it from the queue and add current to history
    const newQueue = radioQueue.filter((t) => t.id !== song.id);
    // Refill if needed
    const finalQueue = newQueue.length < 10
      ? [...newQueue, ...buildQueue(allTracks, song.id).filter((t) => !newQueue.find((q) => q.id === t.id))].slice(0, 50)
      : newQueue;

    const newHistory = [...radioHistory.slice(0, historyIndex + 1), song];
    setRadioHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setCurrentRadioSong(song);
    setRadioQueue(finalQueue);
    setIsRadioMode(true);
    if (onPlay) onPlay(song);
  }, [allTracks, radioQueue, radioHistory, historyIndex]);

  const pauseRadioMode = useCallback(() => {
    setIsRadioMode(false);
  }, []);

  const hasPrev = historyIndex > 0;
  const upNext = radioQueue.slice(0, 3);

  return (
    <RadioContext.Provider value={{
      allTracks,
      tracksLoaded,
      currentRadioSong,
      radioQueue,
      radioHistory,
      isRadioMode,
      hasPrev,
      upNext,
      initRadio,
      startRadio,
      resumeRadio,
      nextRadioSong,
      prevRadioSong,
      jumpToSong,
      pauseRadioMode,
    }}>
      {children}
    </RadioContext.Provider>
  );
}

export function useRadio() {
  const ctx = useContext(RadioContext);
  if (!ctx) throw new Error("useRadio must be used inside RadioProvider");
  return ctx;
}