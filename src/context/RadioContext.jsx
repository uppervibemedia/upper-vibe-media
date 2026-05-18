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

function pickNextSong(allTracks, recentIds = []) {
  if (!allTracks.length) return null;
  // Avoid repeating recent songs when possible
  const recentSet = new Set(recentIds.slice(-Math.min(recentIds.length, Math.floor(allTracks.length / 2))));
  const pool = allTracks.filter((t) => !recentSet.has(t.id));
  const candidates = pool.length > 0 ? pool : allTracks;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

export function RadioProvider({ children }) {
  const [allTracks, setAllTracks] = useState([]);
  const [tracksLoaded, setTracksLoaded] = useState(false);
  const [currentRadioSong, setCurrentRadioSong] = useState(null);
  const [radioHistory, setRadioHistory] = useState([]); // array of track objects
  const [historyIndex, setHistoryIndex] = useState(-1); // index into radioHistory for prev/next
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

        // Restore history
        if (saved.radioHistoryIds?.length) {
          const hist = saved.radioHistoryIds
            .map((id) => allTracks.find((t) => t.id === id))
            .filter(Boolean);
          setRadioHistory(hist);
          setHistoryIndex(hist.length - 1);
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
      isRadioMode,
      lastUpdatedAt: Date.now(),
    });
  }, [currentRadioSong, radioHistory, isRadioMode, tracksLoaded]);

  // Initialize radio with a random song if nothing is loaded yet
  const initRadio = useCallback(() => {
    if (!allTracks.length) return null;
    if (currentRadioSong) return currentRadioSong; // already has one

    const song = pickNextSong(allTracks, []);
    if (!song) return null;
    setCurrentRadioSong(song);
    setRadioHistory([song]);
    setHistoryIndex(0);
    return song;
  }, [allTracks, currentRadioSong]);

  // Start radio (called when user presses Play Radio)
  const startRadio = useCallback((onPlay) => {
    let song = currentRadioSong;
    if (!song) {
      song = pickNextSong(allTracks, []);
      if (!song) return;
      setCurrentRadioSong(song);
      setRadioHistory([song]);
      setHistoryIndex(0);
    }
    setIsRadioMode(true);
    if (onPlay) onPlay(song);
  }, [allTracks, currentRadioSong]);

  // Resume radio (user returns after playing normal song)
  const resumeRadio = useCallback((onPlay) => {
    if (!currentRadioSong) return startRadio(onPlay);
    setIsRadioMode(true);
    if (onPlay) onPlay(currentRadioSong);
  }, [currentRadioSong, startRadio]);

  // Next song
  const nextRadioSong = useCallback((onPlay) => {
    if (!allTracks.length) return;
    const recentIds = radioHistory.map((t) => t.id);
    const song = pickNextSong(allTracks, recentIds);
    if (!song) return;

    const newHistory = [...radioHistory.slice(0, historyIndex + 1), song];
    setRadioHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setCurrentRadioSong(song);
    setIsRadioMode(true);
    if (onPlay) onPlay(song);
  }, [allTracks, radioHistory, historyIndex]);

  // Previous song
  const prevRadioSong = useCallback((onPlay) => {
    if (historyIndex <= 0) return;
    const newIndex = historyIndex - 1;
    const song = radioHistory[newIndex];
    setHistoryIndex(newIndex);
    setCurrentRadioSong(song);
    setIsRadioMode(true);
    if (onPlay) onPlay(song);
  }, [radioHistory, historyIndex]);

  // Pause radio mode (user plays a normal song)
  const pauseRadioMode = useCallback(() => {
    setIsRadioMode(false);
  }, []);

  const hasPrev = historyIndex > 0;

  return (
    <RadioContext.Provider value={{
      allTracks,
      tracksLoaded,
      currentRadioSong,
      radioHistory,
      isRadioMode,
      hasPrev,
      initRadio,
      startRadio,
      resumeRadio,
      nextRadioSong,
      prevRadioSong,
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