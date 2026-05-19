import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { usePlayer } from "./PlayerContext";

const RadioContext = createContext(null);

const LS_KEY = "uvm_radio_state";

function loadPersistedState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function persistState(state) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch {}
}

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildQueue(allTracks, currentSongId) {
  return shuffleArray(allTracks.filter((t) => t.id !== currentSongId));
}

export function RadioProvider({ children }) {
  const { registerNextHandler, registerPrevHandler, playTrack, sourceType, currentTrack } = usePlayer();

  const [allTracks,       setAllTracks]       = useState([]);
  const [tracksLoaded,    setTracksLoaded]    = useState(false);
  const [currentRadioSong, setCurrentRadioSong] = useState(null);
  const [radioQueue,      setRadioQueue]      = useState([]);
  const [radioHistory,    setRadioHistory]    = useState([]);
  const [historyIndex,    setHistoryIndex]    = useState(-1);

  // ── Load tracks once ──────────────────────────────────────────────────────
  useEffect(() => {
    base44.entities.Track.filter({ status: "published" }, "-created_date", 500).then((res) => {
      setAllTracks(res);
      setTracksLoaded(true);
    });
  }, []);

  // ── Restore persisted state ───────────────────────────────────────────────
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
        if (saved.radioHistoryIds?.length) {
          const hist = saved.radioHistoryIds.map((id) => allTracks.find((t) => t.id === id)).filter(Boolean);
          setRadioHistory(hist);
          setHistoryIndex(hist.length - 1);
        }
        if (saved.radioQueueIds?.length) {
          const queue = saved.radioQueueIds.map((id) => allTracks.find((t) => t.id === id)).filter(Boolean);
          setRadioQueue(queue);
        } else {
          setRadioQueue(buildQueue(allTracks, song.id));
        }
      }
    }
  }, [tracksLoaded, allTracks]);

  // ── Persist state changes ─────────────────────────────────────────────────
  useEffect(() => {
    if (!tracksLoaded) return;
    persistState({
      currentRadioSongId: currentRadioSong?.id || null,
      radioHistoryIds:    radioHistory.map((t) => t.id),
      radioQueueIds:      radioQueue.map((t) => t.id),
      lastUpdatedAt:      Date.now(),
    });
  }, [currentRadioSong, radioHistory, radioQueue, tracksLoaded]);

  // ── Keep stable refs for next/prev so Media Session callbacks never go stale ──
  // These refs always point to the latest function versions
  const nextFnRef = useRef(null);
  const prevFnRef = useRef(null);

  // ── Internal: advance to next song and play it via global player ──────────
  const _playNext = useCallback((allT, queue, history, hIndex, currentSong) => {
    let nextSong;
    let newQueue = [...queue];

    if (newQueue.length > 0) {
      nextSong = newQueue.shift();
    } else {
      const rebuilt = buildQueue(allT, currentSong?.id);
      nextSong = rebuilt[0];
      newQueue  = rebuilt.slice(1);
    }

    if (!nextSong) return;

    // Refill queue if running low
    if (newQueue.length < 10) {
      const extra = buildQueue(allT, nextSong.id)
        .filter((t) => t.id !== nextSong.id && !newQueue.find((q) => q.id === t.id));
      newQueue = [...newQueue, ...extra].slice(0, 50);
    }

    const newHistory = [...history.slice(0, hIndex + 1), nextSong];
    setRadioHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setCurrentRadioSong(nextSong);
    setRadioQueue(newQueue);

    // Use the global player — same audio element as regular songs
    playTrack(nextSong, "radio");
    console.log("[RadioContext] ⏭ Next radio song:", nextSong.title);
  }, [playTrack]);

  const _playPrev = useCallback((history, hIndex, currentSong, queue) => {
    if (hIndex <= 0) return;
    const newIndex = hIndex - 1;
    const song = history[newIndex];
    setRadioQueue((q) => [currentSong, ...q].filter(Boolean));
    setHistoryIndex(newIndex);
    setCurrentRadioSong(song);
    playTrack(song, "radio");
    console.log("[RadioContext] ⏮ Prev radio song:", song.title);
  }, [playTrack]);

  // ── Stable ref wrappers — always current, no stale closure in Media Session ─
  // We need refs to the latest state values for use inside callbacks registered once
  const stateRef = useRef({});
  useEffect(() => {
    stateRef.current = { allTracks, radioQueue, radioHistory, historyIndex, currentRadioSong };
  }, [allTracks, radioQueue, radioHistory, historyIndex, currentRadioSong]);

  // Register next/prev handlers ONCE — they read latest state via stateRef
  useEffect(() => {
    const handleNext = () => {
      const { allTracks: aT, radioQueue: q, radioHistory: h, historyIndex: hi, currentRadioSong: cs } = stateRef.current;
      _playNext(aT, q, h, hi, cs);
    };
    const handlePrev = () => {
      const { radioHistory: h, historyIndex: hi, currentRadioSong: cs, radioQueue: q } = stateRef.current;
      _playPrev(h, hi, cs, q);
    };

    nextFnRef.current = handleNext;
    prevFnRef.current = handlePrev;

    // Register with PlayerContext — these control the lock-screen buttons too
    registerNextHandler(handleNext);
    registerPrevHandler(handlePrev);

    console.log("[RadioContext] ✅ next/prev handlers registered with global PlayerContext");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [_playNext, _playPrev, registerNextHandler, registerPrevHandler]);
  // Note: intentionally not listing stateRef — it's a ref, always fresh

  // ── Public API ────────────────────────────────────────────────────────────

  // Initialize radio display (no autoplay)
  const initRadio = useCallback(() => {
    if (!allTracks.length) return null;
    if (currentRadioSong) return currentRadioSong;

    const shuffled = shuffleArray(allTracks);
    const song  = shuffled[0];
    const queue = shuffled.slice(1);
    if (!song) return null;
    setCurrentRadioSong(song);
    setRadioHistory([song]);
    setHistoryIndex(0);
    setRadioQueue(queue);
    return song;
  }, [allTracks, currentRadioSong]);

  // Start radio — loads song into the global player
  const startRadio = useCallback((onPlay) => {
    let song  = currentRadioSong;
    let queue = radioQueue;

    if (!song) {
      const shuffled = shuffleArray(allTracks);
      song  = shuffled[0];
      queue = shuffled.slice(1);
      if (!song) return;
      setCurrentRadioSong(song);
      setRadioHistory([song]);
      setHistoryIndex(0);
      setRadioQueue(queue);
    }

    // Use the same global audio element via playTrack
    playTrack(song, "radio");
    if (onPlay) onPlay(song);
    console.log("[RadioContext] 📻 Radio started:", song.title);
  }, [allTracks, currentRadioSong, radioQueue, playTrack]);

  // Resume radio (called when user interrupted radio by playing another song)
  const resumeRadio = useCallback((onPlay) => {
    if (!currentRadioSong) return startRadio(onPlay);
    playTrack(currentRadioSong, "radio");
    if (onPlay) onPlay(currentRadioSong);
    console.log("[RadioContext] 📻 Radio resumed:", currentRadioSong.title);
  }, [currentRadioSong, startRadio, playTrack]);

  // Next — delegates to the same handler registered with PlayerContext
  const nextRadioSong = useCallback(() => {
    nextFnRef.current?.();
  }, []);

  // Prev
  const prevRadioSong = useCallback(() => {
    prevFnRef.current?.();
  }, []);

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

    playTrack(song, "radio");
    if (onPlay) onPlay(song);
    console.log("[RadioContext] 🎯 Jumped to:", song.title);
  }, [allTracks, radioQueue, radioHistory, historyIndex, playTrack]);

  // ── Derived state for UI ──────────────────────────────────────────────────
  // "Radio is active" = the global player is currently playing a radio-sourced track
  const isRadioMode    = sourceType === "radio";
  const hasPrev        = historyIndex > 0;
  const upNext         = radioQueue.slice(0, 3);

  // Debug
  useEffect(() => {
    if (currentTrack) {
      console.log("[RadioContext] 🔍 sourceType:", sourceType,
        "| currentTrack:", currentTrack?.id,
        "| isRadioMode:", isRadioMode,
        "| currentRadioSong:", currentRadioSong?.id,
        "| same instance:", currentTrack === currentRadioSong || currentTrack?.id === currentRadioSong?.id);
    }
  }, [sourceType, currentTrack, isRadioMode, currentRadioSong]);

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