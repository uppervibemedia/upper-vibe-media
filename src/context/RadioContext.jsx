/**
 * RadioContext — Upper Vibe Media
 *
 * COLD LAUNCH RULES:
 * - On restore, we set currentRadioSong (metadata) but do NOT call playTrack.
 * - isPlaying is never persisted as "auto-resume on launch".
 * - User must press Play, or iOS Media Session must fire a play action.
 *
 * MEDIA SESSION:
 * - next/prev handlers are registered with PlayerContext once.
 * - They read latest state via stateRef (no stale closures).
 * - The same handlers are called by both the UI buttons and iOS lock-screen buttons.
 */

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

function buildQueue(allTracks, currentSongId, likedIds = []) {
  const pool = [];
  allTracks.filter((t) => t.id !== currentSongId).forEach((t) => {
    const weight = likedIds.includes(t.id) ? 3 : 1;
    for (let i = 0; i < weight; i++) pool.push(t);
  });
  return shuffleArray(pool);
}

export function RadioProvider({ children }) {
  const {
    registerNextHandler, registerPrevHandler,
    playTrack, sourceType, currentTrack,
  } = usePlayer();

  const [allTracks,        setAllTracks]        = useState([]);
  const [tracksLoaded,     setTracksLoaded]     = useState(false);
  const [currentRadioSong, setCurrentRadioSong] = useState(null);
  const [radioQueue,       setRadioQueue]       = useState([]);
  const [radioHistory,     setRadioHistory]     = useState([]);
  const [historyIndex,     setHistoryIndex]     = useState(-1);
  const [likedTrackIds,    setLikedTrackIds]    = useState([]);

  // ── Load tracks once ──────────────────────────────────────────────────────
  useEffect(() => {
    base44.entities.Track.filter({ status: "published" }, "-created_date", 500).then((res) => {
      setAllTracks(res);
      setTracksLoaded(true);
    });
  }, []);

  // ── Restore persisted state (METADATA ONLY — no autoplay) ─────────────────
  const restoredRef = useRef(false);
  useEffect(() => {
    if (!tracksLoaded || restoredRef.current) return;
    restoredRef.current = true;

    const saved = loadPersistedState();
    if (!saved) return;

    if (saved.currentRadioSongId && allTracks.length > 0) {
      const song = allTracks.find((t) => t.id === saved.currentRadioSongId);
      if (song) {
        // COLD LAUNCH: restore display state only — do NOT call playTrack
        console.log("[RadioContext] cold_launch restore — song:", song.title, "(paused, waiting for user play)");
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

  // ── Persist state (never persist isPlaying) ───────────────────────────────
  useEffect(() => {
    if (!tracksLoaded) return;
    persistState({
      currentRadioSongId: currentRadioSong?.id || null,
      radioHistoryIds:    radioHistory.map((t) => t.id),
      radioQueueIds:      radioQueue.map((t) => t.id),
      lastUpdatedAt:      Date.now(),
      // NOTE: isPlaying intentionally NOT persisted
    });
  }, [currentRadioSong, radioHistory, radioQueue, tracksLoaded]);

  const setRadioLikedIds = useCallback((ids) => setLikedTrackIds(ids), []);

  // ── Stable state ref — always current, no stale closures ─────────────────
  const stateRef = useRef({});
  useEffect(() => {
    stateRef.current = {
      allTracks, radioQueue, radioHistory, historyIndex,
      currentRadioSong, sourceType, likedTrackIds,
    };
  }, [allTracks, radioQueue, radioHistory, historyIndex, currentRadioSong, sourceType, likedTrackIds]);

  // ── Internal: advance to next song ────────────────────────────────────────
  const _playNext = useCallback((allT, queue, history, hIndex, currentSong, likedIds = []) => {
    let nextSong;
    let newQueue = [...queue];

    if (newQueue.length > 0) {
      nextSong = newQueue.shift();
    } else {
      const rebuilt = buildQueue(allT, currentSong?.id, likedIds);
      nextSong = rebuilt[0];
      newQueue  = rebuilt.slice(1);
    }

    if (!nextSong) return;

    if (newQueue.length < 10) {
      const extra = buildQueue(allT, nextSong.id, likedIds)
        .filter((t) => t.id !== nextSong.id && !newQueue.find((q) => q.id === t.id));
      newQueue = [...newQueue, ...extra].slice(0, 50);
    }

    const newHistory = [...history.slice(0, hIndex + 1), nextSong];
    setRadioHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setCurrentRadioSong(nextSong);
    setRadioQueue(newQueue);

    // This changes audio.src and starts the selected song
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

  // ── Register next/prev handlers ONCE ─────────────────────────────────────
  // These refs store the latest handler versions — called by:
  //   1. UI buttons (nextRadioSong / prevRadioSong)
  //   2. iOS lock screen via PlayerContext Media Session handlers
  //   3. onEnded (auto-advance)
  const nextFnRef = useRef(null);
  const prevFnRef = useRef(null);

  useEffect(() => {
    const handleNext = () => {
      const { sourceType } = stateRef.current;
      if (sourceType !== "radio") {
        console.log("[RadioContext] ⚠️ handleNext skipped — sourceType is", sourceType);
        return;
      }
      const { allTracks: aT, radioQueue: q, radioHistory: h, historyIndex: hi, currentRadioSong: cs, likedTrackIds: liked } = stateRef.current;
      console.log("[RadioContext] ⏭ handleNext called — song:", cs?.title);
      _playNext(aT, q, h, hi, cs, liked);
    };

    const handlePrev = () => {
      const { sourceType } = stateRef.current;
      if (sourceType !== "radio") return;
      const { radioHistory: h, historyIndex: hi, currentRadioSong: cs, radioQueue: q } = stateRef.current;
      console.log("[RadioContext] ⏮ handlePrev called — song:", cs?.title);
      _playPrev(h, hi, cs, q);
    };

    nextFnRef.current = handleNext;
    prevFnRef.current = handlePrev;

    // Wire into PlayerContext — these power both the audio player's onEnded
    // and the iOS lock-screen Media Session buttons
    registerNextHandler(handleNext);
    registerPrevHandler(handlePrev);

    console.log("[RadioContext] ✅ next/prev handlers registered");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [_playNext, _playPrev, registerNextHandler, registerPrevHandler]);

  // ── Public API ────────────────────────────────────────────────────────────

  // Initialize display state (no autoplay)
  const initRadio = useCallback(() => {
    if (!allTracks.length) return null;
    if (currentRadioSong) return currentRadioSong;

    const built = buildQueue(allTracks, null, likedTrackIds);
    const song  = built[0];
    const queue = built.slice(1);
    if (!song) return null;
    setCurrentRadioSong(song);
    setRadioHistory([song]);
    setHistoryIndex(0);
    setRadioQueue(queue);
    return song;
  }, [allTracks, currentRadioSong, likedTrackIds]);

  // Start radio — requires explicit user action
  const startRadio = useCallback((onPlay) => {
    let song  = currentRadioSong;
    let queue = radioQueue;

    if (!song) {
      const built = buildQueue(allTracks, null, likedTrackIds);
      song  = built[0];
      queue = built.slice(1);
      if (!song) return;
      setCurrentRadioSong(song);
      setRadioHistory([song]);
      setHistoryIndex(0);
      setRadioQueue(queue);
    }

    // Creates a fresh audio source and starts playback
    playTrack(song, "radio");
    if (onPlay) onPlay(song);
    console.log("[RadioContext] 📻 Radio started:", song.title);
  }, [allTracks, currentRadioSong, radioQueue, playTrack, likedTrackIds]);

  // Resume after interruption
  const resumeRadio = useCallback((onPlay) => {
    if (!currentRadioSong) return startRadio(onPlay);
    playTrack(currentRadioSong, "radio");
    if (onPlay) onPlay(currentRadioSong);
    console.log("[RadioContext] 📻 Radio resumed:", currentRadioSong.title);
  }, [currentRadioSong, startRadio, playTrack]);

  // UI delegates — call the exact same internal functions as Media Session handlers
  const nextRadioSong = useCallback(() => { nextFnRef.current?.(); }, []);
  const prevRadioSong = useCallback(() => { prevFnRef.current?.(); }, []);

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

  const isRadioMode = sourceType === "radio";
  const hasPrev     = historyIndex > 0;
  const upNext      = radioQueue.slice(0, 3);

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
      likedTrackIds,
      setRadioLikedIds,
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