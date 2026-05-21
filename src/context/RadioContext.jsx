/**
 * RadioContext — Upper Vibe Media
 *
 * COLD LAUNCH RULES:
 * - On restore, we set currentRadioSong (metadata) but do NOT call playTrack.
 * - isPlaying is never persisted as "auto-resume on launch".
 * - User must press Play, or iOS Media Session must fire a play action.
 *
 * CURATOR:
 * - recordSkip   — fired when user presses next (with seconds listened)
 * - recordComplete — fired on onEnded
 * - recordListen  — fired on pause if listened > 30s but not complete
 * - recordLike    — fired from Radio page heart button
 * - buildWeightedQueue replaces the old buildQueue everywhere
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { usePlayer } from "./PlayerContext";
import {
  buildWeightedQueue,
  recordSkip,
  recordComplete,
  recordListen,
  isCuratorActive,
} from "@/lib/radioCurator";

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

export function RadioProvider({ children }) {
  const {
    registerNextHandler, registerPrevHandler,
    playTrack, sourceType, currentTrack, audioRef,
  } = usePlayer();

  const [allTracks,        setAllTracks]        = useState([]);
  const [tracksLoaded,     setTracksLoaded]     = useState(false);
  const [currentRadioSong, setCurrentRadioSong] = useState(null);
  const [radioQueue,       setRadioQueue]       = useState([]);
  const [radioHistory,     setRadioHistory]     = useState([]);
  const [historyIndex,     setHistoryIndex]     = useState(-1);
  const [likedTrackIds,    setLikedTrackIds]    = useState([]);
  const [curatorActive,    setCuratorActive]    = useState(false);

  // ── Load tracks once ──────────────────────────────────────────────────────
  useEffect(() => {
    base44.entities.Track.filter({ status: "published" }, "-created_date", 500).then((res) => {
      setAllTracks(res);
      setTracksLoaded(true);
      setCuratorActive(isCuratorActive());
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
          setRadioQueue(buildWeightedQueue(allTracks, song.id, []));
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
    });
  }, [currentRadioSong, radioHistory, radioQueue, tracksLoaded]);

  const setRadioLikedIds = useCallback((ids) => setLikedTrackIds(ids), []);

  // ── Stable state ref ──────────────────────────────────────────────────────
  const stateRef = useRef({});
  useEffect(() => {
    stateRef.current = {
      allTracks, radioQueue, radioHistory, historyIndex,
      currentRadioSong, sourceType, likedTrackIds,
    };
  }, [allTracks, radioQueue, radioHistory, historyIndex, currentRadioSong, sourceType, likedTrackIds]);

  // ── Helper: get seconds listened for current song ─────────────────────────
  function getListenedSeconds() {
    const audio = audioRef?.current;
    return audio ? audio.currentTime : 0;
  }

  // ── Internal: advance to next song ────────────────────────────────────────
  const _playNext = useCallback((allT, queue, history, hIndex, currentSong, likedIds = [], fromSkip = false) => {
    // Record curator signal before leaving the song
    if (currentSong && fromSkip) {
      const secs = getListenedSeconds();
      recordSkip(currentSong.id, secs, allT);
      setCuratorActive(isCuratorActive());
    }

    let nextSong;
    let newQueue = [...queue];

    if (newQueue.length > 0) {
      nextSong = newQueue.shift();
    } else {
      const rebuilt = buildWeightedQueue(allT, currentSong?.id, likedIds);
      nextSong = rebuilt[0];
      newQueue  = rebuilt.slice(1);
    }

    if (!nextSong) return;

    // Refill with curator-weighted queue when running low
    if (newQueue.length < 10) {
      const extra = buildWeightedQueue(allT, nextSong.id, likedIds)
        .filter((t) => t.id !== nextSong.id && !newQueue.find((q) => q.id === t.id));
      newQueue = [...newQueue, ...extra].slice(0, 50);
    }

    const newHistory = [...history.slice(0, hIndex + 1), nextSong];
    setRadioHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setCurrentRadioSong(nextSong);
    setRadioQueue(newQueue);

    playTrack(nextSong, "radio");
    console.log("[RadioContext] ⏭ Next radio song:", nextSong.title);
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
  const nextFnRef = useRef(null);
  const prevFnRef = useRef(null);

  useEffect(() => {
    const handleNext = (fromSkip = true) => {
      const { sourceType } = stateRef.current;
      if (sourceType !== "radio") {
        console.log("[RadioContext] ⚠️ handleNext skipped — sourceType is", sourceType);
        return;
      }
      const { allTracks: aT, radioQueue: q, radioHistory: h, historyIndex: hi, currentRadioSong: cs, likedTrackIds: liked } = stateRef.current;
      console.log("[RadioContext] ⏭ handleNext called — song:", cs?.title);
      _playNext(aT, q, h, hi, cs, liked, fromSkip);
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

    registerNextHandler(handleNext);
    registerPrevHandler(handlePrev);

    console.log("[RadioContext] ✅ next/prev handlers registered");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [_playNext, _playPrev, registerNextHandler, registerPrevHandler]);

  // ── Listen to audio events for curator signals ────────────────────────────
  useEffect(() => {
    const audio = audioRef?.current;
    if (!audio) return;

    const onEnded = () => {
      const { currentRadioSong: cs, allTracks: aT, sourceType: st } = stateRef.current;
      if (st !== "radio" || !cs) return;
      recordComplete(cs.id, aT);
      setCuratorActive(isCuratorActive());
    };

    const onPause = () => {
      const { currentRadioSong: cs, allTracks: aT, sourceType: st } = stateRef.current;
      if (st !== "radio" || !cs) return;
      const secs = audio.currentTime;
      recordListen(cs.id, secs, aT);
    };

    audio.addEventListener("ended", onEnded);
    audio.addEventListener("pause", onPause);
    return () => {
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("pause", onPause);
    };
  // Re-attach when audioRef element becomes available
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioRef?.current]);

  // ── Public API ────────────────────────────────────────────────────────────

  const initRadio = useCallback(() => {
    if (!allTracks.length) return null;
    if (currentRadioSong) return currentRadioSong;

    const built = buildWeightedQueue(allTracks, null, likedTrackIds);
    const song  = built[0];
    const queue = built.slice(1);
    if (!song) return null;
    setCurrentRadioSong(song);
    setRadioHistory([song]);
    setHistoryIndex(0);
    setRadioQueue(queue);
    return song;
  }, [allTracks, currentRadioSong, likedTrackIds]);

  const startRadio = useCallback((onPlay) => {
    let song  = currentRadioSong;
    let queue = radioQueue;

    if (!song) {
      const built = buildWeightedQueue(allTracks, null, likedTrackIds);
      song  = built[0];
      queue = built.slice(1);
      if (!song) return;
      setCurrentRadioSong(song);
      setRadioHistory([song]);
      setHistoryIndex(0);
      setRadioQueue(queue);
    }

    playTrack(song, "radio");
    if (onPlay) onPlay(song);
    console.log("[RadioContext] 📻 Radio started:", song.title);
  }, [allTracks, currentRadioSong, radioQueue, playTrack, likedTrackIds]);

  const resumeRadio = useCallback((onPlay) => {
    if (!currentRadioSong) return startRadio(onPlay);
    playTrack(currentRadioSong, "radio");
    if (onPlay) onPlay(currentRadioSong);
    console.log("[RadioContext] 📻 Radio resumed:", currentRadioSong.title);
  }, [currentRadioSong, startRadio, playTrack]);

  const nextRadioSong = useCallback(() => { nextFnRef.current?.(); }, []);
  const prevRadioSong = useCallback(() => { prevFnRef.current?.(); }, []);

  // recordLike is exposed so Radio page can call it from the heart button
  const curatorRecordLike = useCallback((trackId, liked) => {
    const { allTracks: aT } = stateRef.current;
    import("@/lib/radioCurator").then(({ recordLike }) => {
      recordLike(trackId, liked, aT);
      setCuratorActive(isCuratorActive());
    });
  }, []);

  const jumpToSong = useCallback((song, onPlay) => {
    if (!song) return;
    const newQueue = radioQueue.filter((t) => t.id !== song.id);
    const finalQueue = newQueue.length < 10
      ? [...newQueue, ...buildWeightedQueue(allTracks, song.id, likedTrackIds).filter((t) => !newQueue.find((q) => q.id === t.id))].slice(0, 50)
      : newQueue;

    const newHistory = [...radioHistory.slice(0, historyIndex + 1), song];
    setRadioHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setCurrentRadioSong(song);
    setRadioQueue(finalQueue);

    playTrack(song, "radio");
    if (onPlay) onPlay(song);
    console.log("[RadioContext] 🎯 Jumped to:", song.title);
  }, [allTracks, radioQueue, radioHistory, historyIndex, playTrack, likedTrackIds]);

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
      curatorActive,
      setRadioLikedIds,
      curatorRecordLike,
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