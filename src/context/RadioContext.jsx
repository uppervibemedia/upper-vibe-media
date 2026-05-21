/**
 * RadioContext — Upper Vibe Media
 *
 * HOST DROP SYSTEM:
 * - completedSongCount tracks songs that ended naturally (onEnded).
 * - Every 4 completions triggers a host drop interstitial.
 * - The drop plays via the same Audio element — no second element.
 * - isHostDropPlaying flag is exposed to the Radio page for UI.
 * - Drop skip: nextRadioSong called while drop is playing → skip drop, play next.
 *
 * COLD LAUNCH RULES:
 * - On restore, set currentRadioSong (metadata) but do NOT call playTrack.
 * - isPlaying is never persisted.
 *
 * CURATOR:
 * - recordSkip on next press (with seconds listened)
 * - recordComplete on natural song end
 * - recordListen on pause (> 30s)
 * - recordLike from Radio page heart button
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
import {
  loadHostDrops,
  pickRandomDrop,
  hostDropAsTrack,
  trackDropStarted,
  trackDropCompleted,
  trackDropSkipped,
  trackDropFailed,
} from "@/lib/hostDropEngine";

const RadioContext = createContext(null);
const LS_KEY = "uvm_radio_state";

function loadPersistedState() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "null"); } catch { return null; }
}
function persistState(state) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch {}
}

export function RadioProvider({ children }) {
  const {
    registerNextHandler, registerPrevHandler,
    playTrack, sourceType, currentTrack, audioRef,
  } = usePlayer();

  const [allTracks,          setAllTracks]          = useState([]);
  const [tracksLoaded,       setTracksLoaded]       = useState(false);
  const [currentRadioSong,   setCurrentRadioSong]   = useState(null);
  const [radioQueue,         setRadioQueue]         = useState([]);
  const [radioHistory,       setRadioHistory]       = useState([]);
  const [historyIndex,       setHistoryIndex]       = useState(-1);
  const [likedTrackIds,      setLikedTrackIds]      = useState([]);
  const [curatorActive,      setCuratorActive]      = useState(false);
  const [isHostDropPlaying,  setIsHostDropPlaying]  = useState(false);
  const [completedSongCount, setCompletedSongCount] = useState(0);

  // Refs for things needed inside event handlers without stale closures
  const stateRef            = useRef({});
  const isHostDropRef       = useRef(false);   // mirrors isHostDropPlaying
  const pendingDropRef      = useRef(null);     // the drop object queued to play
  const currentDropRef      = useRef(null);     // drop currently playing
  const completedCountRef   = useRef(0);        // mirrors completedSongCount
  const nextFnRef           = useRef(null);
  const prevFnRef           = useRef(null);

  // ── Load tracks + drops ───────────────────────────────────────────────────
  useEffect(() => {
    base44.entities.Track.filter({ status: "published" }, "-created_date", 500).then((res) => {
      setAllTracks(res);
      setTracksLoaded(true);
      setCuratorActive(isCuratorActive());
    });
    loadHostDrops(); // pre-cache drops in background
  }, []);

  // ── Restore persisted state (no autoplay) ─────────────────────────────────
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
        const q = saved.radioQueueIds?.length
          ? saved.radioQueueIds.map((id) => allTracks.find((t) => t.id === id)).filter(Boolean)
          : buildWeightedQueue(allTracks, song.id, []);
        setRadioQueue(q);
      }
    }
  }, [tracksLoaded, allTracks]);

  // ── Persist state ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!tracksLoaded) return;
    persistState({
      currentRadioSongId: currentRadioSong?.id || null,
      radioHistoryIds:    radioHistory.map((t) => t.id),
      radioQueueIds:      radioQueue.map((t) => t.id),
      lastUpdatedAt:      Date.now(),
    });
  }, [currentRadioSong, radioHistory, radioQueue, tracksLoaded]);

  // ── Sync stateRef ─────────────────────────────────────────────────────────
  useEffect(() => {
    stateRef.current = {
      allTracks, radioQueue, radioHistory, historyIndex,
      currentRadioSong, sourceType, likedTrackIds,
    };
  }, [allTracks, radioQueue, radioHistory, historyIndex, currentRadioSong, sourceType, likedTrackIds]);

  // Keep refs in sync
  useEffect(() => { isHostDropRef.current = isHostDropPlaying; }, [isHostDropPlaying]);
  useEffect(() => { completedCountRef.current = completedSongCount; }, [completedSongCount]);

  const setRadioLikedIds = useCallback((ids) => setLikedTrackIds(ids), []);

  // ── Internal: play a specific song into radio ─────────────────────────────
  const _loadNextSong = useCallback((allT, queue, history, hIndex, currentSong, likedIds = []) => {
    let nextSong;
    let newQueue = [...queue];

    if (newQueue.length > 0) {
      nextSong = newQueue.shift();
    } else {
      const rebuilt = buildWeightedQueue(allT, currentSong?.id, likedIds);
      nextSong = rebuilt[0];
      newQueue  = rebuilt.slice(1);
    }
    if (!nextSong) return null;

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
    return nextSong;
  }, []);

  // ── Play next song (optionally from skip — records curator signal) ─────────
  const _playNext = useCallback((fromSkip = false) => {
    const { allTracks: aT, radioQueue: q, radioHistory: h, historyIndex: hi, currentRadioSong: cs, likedTrackIds: liked } = stateRef.current;

    // Record curator signal
    if (cs && fromSkip) {
      const audio = audioRef?.current;
      const secs = audio ? audio.currentTime : 0;
      recordSkip(cs.id, secs, aT);
      setCuratorActive(isCuratorActive());
    }

    const nextSong = _loadNextSong(aT, q, h, hi, cs, liked);
    if (nextSong) {
      playTrack(nextSong, "radio");
      console.log("[RadioContext] ⏭ Next radio song:", nextSong.title);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [_loadNextSong, playTrack, audioRef]);

  // ── Play host drop then next song ─────────────────────────────────────────
  const _playHostDropThenNext = useCallback(async () => {
    await loadHostDrops();
    const drop = pickRandomDrop();

    if (!drop) {
      // No drops available — go straight to next song
      console.log("[RadioContext] 🎙 No active drops, skipping drop");
      _playNext(false);
      return;
    }

    console.log("[RadioContext] 🎙 Playing host drop:", drop.title);
    const dropTrack = hostDropAsTrack(drop);
    currentDropRef.current = drop;
    pendingDropRef.current = null;
    isHostDropRef.current  = true;
    setIsHostDropPlaying(true);
    trackDropStarted(drop);

    try {
      playTrack(dropTrack, "radio");
    } catch (e) {
      console.warn("[RadioContext] 🎙 Drop playTrack error:", e.message);
      trackDropFailed(drop);
      isHostDropRef.current  = false;
      currentDropRef.current = null;
      setIsHostDropPlaying(false);
      _playNext(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playTrack, _playNext]);

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

  // ── Register next/prev handlers ───────────────────────────────────────────
  useEffect(() => {
    const handleNext = () => {
      const { sourceType } = stateRef.current;
      if (sourceType !== "radio") return;

      // If a host drop is playing, skip it and go to the next song
      if (isHostDropRef.current) {
        const drop = currentDropRef.current;
        console.log("[RadioContext] 🎙 Host drop skipped by user");
        if (drop) trackDropSkipped(drop);
        isHostDropRef.current  = false;
        currentDropRef.current = null;
        setIsHostDropPlaying(false);
        _playNext(false);
        return;
      }

      _playNext(true); // fromSkip = true
    };

    const handlePrev = () => {
      const { sourceType } = stateRef.current;
      if (sourceType !== "radio") return;
      // If host drop playing, just skip it
      if (isHostDropRef.current) {
        const drop = currentDropRef.current;
        if (drop) trackDropSkipped(drop);
        isHostDropRef.current  = false;
        currentDropRef.current = null;
        setIsHostDropPlaying(false);
        _playNext(false);
        return;
      }
      const { radioHistory: h, historyIndex: hi, currentRadioSong: cs, radioQueue: q } = stateRef.current;
      _playPrev(h, hi, cs, q);
    };

    nextFnRef.current = handleNext;
    prevFnRef.current = handlePrev;
    registerNextHandler(handleNext);
    registerPrevHandler(handlePrev);
    console.log("[RadioContext] ✅ next/prev handlers registered");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [_playNext, _playPrev, registerNextHandler, registerPrevHandler]);

  // ── Audio event listeners for host drop & curator ─────────────────────────
  useEffect(() => {
    const audio = audioRef?.current;
    if (!audio) return;

    const onEnded = () => {
      const { currentRadioSong: cs, allTracks: aT, sourceType: st } = stateRef.current;
      if (st !== "radio") return;

      // ── Case 1: Host drop just ended ───────────────────────────────────
      if (isHostDropRef.current) {
        const drop = currentDropRef.current;
        console.log("[RadioContext] 🎙 Host drop ended:", drop?.title);
        if (drop) trackDropCompleted(drop);
        isHostDropRef.current  = false;
        currentDropRef.current = null;
        setIsHostDropPlaying(false);
        // Play the next real song
        _playNext(false);
        return;
      }

      // ── Case 2: Real song ended naturally ──────────────────────────────
      if (!cs) return;

      // Curator: record completion
      recordComplete(cs.id, aT);
      setCuratorActive(isCuratorActive());

      // Increment completed count
      const newCount = completedCountRef.current + 1;
      completedCountRef.current = newCount;
      setCompletedSongCount(newCount);

      console.log("[RadioContext] ✅ Song completed — count:", newCount);

      // Every 4 completions → queue a host drop
      if (newCount % 4 === 0) {
        console.log("[RadioContext] 🎙 Triggering host drop after", newCount, "completions");
        _playHostDropThenNext();
      } else {
        _playNext(false);
      }
    };

    const onPause = () => {
      const { currentRadioSong: cs, allTracks: aT, sourceType: st } = stateRef.current;
      if (st !== "radio" || !cs || isHostDropRef.current) return;
      const secs = audio.currentTime;
      recordListen(cs.id, secs, aT);
    };

    audio.addEventListener("ended", onEnded);
    audio.addEventListener("pause", onPause);
    return () => {
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("pause", onPause);
    };
  // Re-attach when audio element changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioRef?.current, _playNext, _playHostDropThenNext]);

  // ── Public API ────────────────────────────────────────────────────────────
  const initRadio = useCallback(() => {
    if (!allTracks.length) return null;
    if (currentRadioSong) return currentRadioSong;
    const built = buildWeightedQueue(allTracks, null, likedTrackIds);
    const song  = built[0];
    if (!song) return null;
    setCurrentRadioSong(song);
    setRadioHistory([song]);
    setHistoryIndex(0);
    setRadioQueue(built.slice(1));
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
  }, [currentRadioSong, startRadio, playTrack]);

  const nextRadioSong = useCallback(() => { nextFnRef.current?.(); }, []);
  const prevRadioSong = useCallback(() => { prevFnRef.current?.(); }, []);

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
      isHostDropPlaying,
      completedSongCount,
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