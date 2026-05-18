import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { base44 } from "@/api/base44Client";

const RadioContext = createContext(null);

const LS_KEY = "uvm_radio_queue_v2";

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildQueue(allTracks, excludeId) {
  return shuffleArray(allTracks.filter((t) => t.id !== excludeId));
}

function loadPersistedQueue(allTracks) {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    return {
      currentRadioSong: allTracks.find((t) => t.id === saved.currentId) || null,
      radioQueue: (saved.queueIds || []).map((id) => allTracks.find((t) => t.id === id)).filter(Boolean),
      radioHistory: (saved.historyIds || []).map((id) => allTracks.find((t) => t.id === id)).filter(Boolean),
      historyIndex: saved.historyIndex ?? -1,
    };
  } catch {
    return null;
  }
}

function persistQueue({ currentRadioSong, radioQueue, radioHistory, historyIndex }) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({
      currentId: currentRadioSong?.id || null,
      queueIds: radioQueue.map((t) => t.id),
      historyIds: radioHistory.map((t) => t.id),
      historyIndex,
    }));
  } catch {}
}

export function RadioProvider({ children }) {
  const [allTracks, setAllTracks] = useState([]);
  const [tracksLoaded, setTracksLoaded] = useState(false);
  const [currentRadioSong, setCurrentRadioSong] = useState(null);
  const [radioQueue, setRadioQueue] = useState([]);
  const [radioHistory, setRadioHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // NOTE: isRadioMode is NOT persisted — it reflects the live PlayerContext sourceType.
  // Radio mode is only active when the user explicitly presses play on the radio page.

  // Load tracks once
  useEffect(() => {
    base44.entities.Track.filter({ status: "published" }, "-created_date", 500).then((res) => {
      setAllTracks(res);
      setTracksLoaded(true);
    });
  }, []);

  // Restore queue (NOT mode) from localStorage after tracks load
  const restoredRef = useRef(false);
  useEffect(() => {
    if (!tracksLoaded || restoredRef.current || !allTracks.length) return;
    restoredRef.current = true;
    const saved = loadPersistedQueue(allTracks);
    if (saved) {
      if (saved.currentRadioSong) setCurrentRadioSong(saved.currentRadioSong);
      if (saved.radioQueue.length) setRadioQueue(saved.radioQueue);
      if (saved.radioHistory.length) {
        setRadioHistory(saved.radioHistory);
        setHistoryIndex(saved.historyIndex);
      }
    }
  }, [tracksLoaded, allTracks]);

  // Persist queue state whenever it changes
  useEffect(() => {
    if (!tracksLoaded) return;
    persistQueue({ currentRadioSong, radioQueue, radioHistory, historyIndex });
  }, [currentRadioSong, radioQueue, radioHistory, historyIndex, tracksLoaded]);

  // Initialize radio state (sets up current song + queue — does NOT trigger playback)
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

  // Start radio — pick a song and call onPlay(song) so PlayerContext takes over audio
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
    if (onPlay) onPlay(song);
  }, [allTracks, currentRadioSong, radioQueue]);

  // Resume radio after playing a normal song
  const resumeRadio = useCallback((onPlay) => {
    if (!currentRadioSong) return startRadio(onPlay);
    if (onPlay) onPlay(currentRadioSong);
  }, [currentRadioSong, startRadio]);

  // Next song
  const nextRadioSong = useCallback((onPlay) => {
    if (!allTracks.length) return;

    let newQueue = [...radioQueue];
    let nextSong;

    if (newQueue.length > 0) {
      nextSong = newQueue.shift();
    } else {
      const rebuilt = buildQueue(allTracks, currentRadioSong?.id);
      nextSong = rebuilt[0];
      newQueue = rebuilt.slice(1);
    }

    if (!nextSong) return;

    // Keep queue topped up
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
    if (onPlay) onPlay(nextSong);
  }, [allTracks, radioQueue, radioHistory, historyIndex, currentRadioSong]);

  // Previous song
  const prevRadioSong = useCallback((onPlay) => {
    if (historyIndex <= 0) return;
    const newIndex = historyIndex - 1;
    const song = radioHistory[newIndex];
    setRadioQueue((q) => [currentRadioSong, ...q].filter(Boolean));
    setHistoryIndex(newIndex);
    setCurrentRadioSong(song);
    if (onPlay) onPlay(song);
  }, [radioHistory, historyIndex, currentRadioSong]);

  // Jump to a specific queued song
  const jumpToSong = useCallback((song, onPlay) => {
    if (!song) return;
    const newQueue = radioQueue.filter((t) => t.id !== song.id);
    const finalQueue = newQueue.length < 10
      ? [...newQueue, ...buildQueue(allTracks, song.id).filter((t) => !newQueue.find((q) => q.id === t.id))].slice(0, 50)
      : newQueue;

    const newHistory = [...radioHistory.slice(0, historyIndex + 1), song];
    setRadioHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setCurrentRadioSong(song);
    setRadioQueue(finalQueue);
    if (onPlay) onPlay(song);
  }, [allTracks, radioQueue, radioHistory, historyIndex]);

  const hasPrev = historyIndex > 0;
  const upNext = radioQueue.slice(0, 3);

  return (
    <RadioContext.Provider value={{
      allTracks,
      tracksLoaded,
      currentRadioSong,
      radioQueue,
      radioHistory,
      hasPrev,
      upNext,
      initRadio,
      startRadio,
      resumeRadio,
      nextRadioSong,
      prevRadioSong,
      jumpToSong,
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