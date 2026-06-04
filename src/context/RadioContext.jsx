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
import { getDislikedIds } from "@/hooks/useDislike";
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
    isPlaying,
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

  // Saved radio session position — persists across on-demand song plays
  const radioSavedTimeRef   = useRef(0);
  const radioWasPlayingRef  = useRef(false);

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
    import("@/lib/trackCache").then(({ getPublishedTracks }) => {
      getPublishedTracks("-created_date", 500).then((res) => {
        setAllTracks(res);
        setTracksLoaded(true);
        setCuratorActive(isCuratorActive());
      });
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
    // Restore saved position
    if (saved.radioSavedTime > 1) {
      radioSavedTimeRef.current = saved.radioSavedTime;
      console.log("[RadioContext] 📍 Restored saved radio time from localStorage:", saved.radioSavedTime.toFixed(2));
    }
    }
    }
  }, [tracksLoaded, allTracks]);

  // ── Persist state ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!tracksLoaded) return;
    persistState({
      currentRadioSongId:  currentRadioSong?.id || null,
      radioHistoryIds:     radioHistory.map((t) => t.id),
      radioQueueIds:       radioQueue.map((t) => t.id),
      radioSavedTime:      radioSavedTimeRef.current,
      lastUpdatedAt:       Date.now(),
    });
  }, [currentRadioSong, radioHistory, radioQueue, tracksLoaded]);

  // ── Save radio position when leaving radio (sourceType changes away) ───────
  const prevSourceTypeRef = useRef(sourceType);
  useEffect(() => {
    const prev = prevSourceTypeRef.current;
    prevSourceTypeRef.current = sourceType;

    if (prev === "radio" && sourceType !== "radio") {
      // User switched from radio to a library song — save position
      const audio = audioRef?.current;
      const ct = audio ? audio.currentTime : 0;
      const wasPlaying = audio ? !audio.paused : false;
      if (ct > 0) {
        radioSavedTimeRef.current  = ct;
        radioWasPlayingRef.current = wasPlaying;
        console.log("[RadioContext] 📍 Radio position saved:", ct.toFixed(2), "wasPlaying:", wasPlaying);
        // Also persist to localStorage
        try {
          const s = loadPersistedState() || {};
          persistState({ ...s, radioSavedTime: ct });
        } catch {}
      }
    }
  }, [sourceType, audioRef]);

  // ── Sync stateRef ─────────────────────────────────────────────────────────
  useEffect(() => {
    stateRef.current = {
      allTracks, radioQueue, radioHistory, historyIndex,
      currentRadioSong, sourceType, likedTrackIds,
      // Track the currently playing song from PlayerContext so initRadio can adopt it
      _currentPlayerTrack: isPlaying ? currentTrack : null,
    };
  }, [allTracks, radioQueue, radioHistory, historyIndex, currentRadioSong, sourceType, likedTrackIds, currentTrack, isPlaying]);

  // Keep refs in sync
  useEffect(() => { isHostDropRef.current = isHostDropPlaying; }, [isHostDropPlaying]);
  useEffect(() => { completedCountRef.current = completedSongCount; }, [completedSongCount]);

  const setRadioLikedIds = useCallback((ids) => setLikedTrackIds(ids), []);

  // ── Internal: play a specific song into radio ─────────────────────────────
  const _loadNextSong = useCallback((allT, queue, history, hIndex, currentSong, likedIds = []) => {
    let nextSong;
    let newQueue = [...queue];

    const dislikedIds = getDislikedIds();
    if (newQueue.length > 0) {
      nextSong = newQueue.shift();
    } else {
      const rebuilt = buildWeightedQueue(allT, currentSong?.id, likedIds, dislikedIds);
      nextSong = rebuilt[0];
      newQueue  = rebuilt.slice(1);
    }
    if (!nextSong) return null;

    if (newQueue.length < 10) {
      const extra = buildWeightedQueue(allT, nextSong.id, likedIds, dislikedIds)
        .filter((t) => t.id !== nextSong.id && !newQueue.find((q) => q.id === t.id));
      newQueue = [...newQueue, ...extra].slice(0, 50);
    }

    // F: cap history at 50 to prevent unbounded memory/localStorage growth
    const rawHistory = [...history.slice(0, hIndex + 1), nextSong];
    const newHistory = rawHistory.length > 50 ? rawHistory.slice(rawHistory.length - 50) : rawHistory;
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

    // Clear saved position — next song always starts from 0
    radioSavedTimeRef.current = 0;

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
    radioSavedTimeRef.current = 0; // prev song always starts fresh
    playTrack(song, "radio");
    console.log("[RadioContext] ⏮ Prev radio song:", song.title);
  }, [playTrack]);

  // ── Stable next/prev handlers ─────────────────────────────────────────────
  // FIX: These were previously defined inside a useEffect and re-registered
  // every time _playNext/_playPrev changed. This created a race window: if a
  // song's "ended" event fired during the React commit cycle between the old
  // handler being de-registered (effect cleanup) and the new one being set
  // (effect re-run), onNextRef.current was briefly null/stale and auto-advance
  // would silently fail.
  //
  // Solution: define as stable useCallback hooks that read exclusively from
  // stateRef.current (never from reactive closure). Register them ONCE via
  // a mount-only useEffect. Since all state is accessed via stateRef, the
  // callbacks are always current without needing re-registration.
  //
  // handleNext is called by PlayerContext for BOTH:
  //   (a) natural song end (onEnded fires → onNextRef.current())  [fromSkip=false]
  //   (b) user skip press                                          [fromSkip=true]
  //   (c) lock screen next                                         [fromSkip=true via op-queue]
  const handleNext = useCallback((fromSkip = false) => {
    const { sourceType, currentRadioSong: cs, allTracks: aT } = stateRef.current;
    if (sourceType !== "radio") return;

    // Case 1: Host drop just ended (natural end) or skipped (user)
    if (isHostDropRef.current) {
      const drop = currentDropRef.current;
      if (fromSkip) {
        console.log("[RadioContext] 🎙 Host drop skipped by user");
        if (drop) trackDropSkipped(drop);
      } else {
        console.log("[RadioContext] 🎙 Host drop ended naturally:", drop?.title);
        if (drop) trackDropCompleted(drop);
      }
      isHostDropRef.current  = false;
      currentDropRef.current = null;
      setIsHostDropPlaying(false);
      _playNext(false);
      return;
    }

    // Case 2: User-initiated skip
    if (fromSkip) {
      _playNext(true);
      return;
    }

    // Case 3: Natural song end — run curator + host drop logic
    if (cs) {
      recordComplete(cs.id, aT);
      setCuratorActive(isCuratorActive());
    }
    const newCount = completedCountRef.current + 1;
    completedCountRef.current = newCount;
    setCompletedSongCount(newCount);
    console.log("[RadioContext] ✅ Song completed — count:", newCount);

    if (newCount % 4 === 0) {
      console.log("[RadioContext] 🎙 Triggering host drop after", newCount, "completions");
      _playHostDropThenNext();
    } else {
      _playNext(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [_playNext, _playHostDropThenNext]);

  const handlePrev = useCallback(() => {
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [_playNext, _playPrev]);

  // Keep user-facing skip refs current whenever stable callbacks update
  useEffect(() => {
    // User-facing skip (Radio page next button, lock screen next) → fromSkip=true
    nextFnRef.current = () => handleNext(true);
    prevFnRef.current = handlePrev;
  }, [handleNext, handlePrev]);

  // Register with PlayerContext ONCE on mount — stable callbacks mean there is
  // no re-registration race. onNextRef in PlayerContext always holds a valid fn.
  useEffect(() => {
    registerNextHandler(handleNext);
    registerPrevHandler(handlePrev);
    console.log("[RadioContext] ✅ next/prev handlers registered (stable, once)");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Audio event listeners for curator (pause only) ───────────────────────
  // NOTE: "ended" is NOT listened to here. Instead, the next/prev handler
  // registered above is called by PlayerContext's onEnded → onNextRef.current().
  // This prevents double-trigger: RadioContext ended + PlayerContext onNextRef.
  //
  // FIX: Use stable [] deps with audioRef (the ref object, not .current).
  // audioRef?.current was an invalid React dependency — React does not track
  // .current mutations, so the effect would only ever run once regardless.
  // Using [] is semantically equivalent (audio element is singleton) but
  // correctly expressed and avoids ESLint warnings about invalid deps.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onPause = () => {
      const { currentRadioSong: cs, allTracks: aT, sourceType: st } = stateRef.current;
      if (st !== "radio" || !cs || isHostDropRef.current) return;
      const secs = audio.currentTime;
      recordListen(cs.id, secs, aT);
    };

    audio.addEventListener("pause", onPause);
    return () => {
      audio.removeEventListener("pause", onPause);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Public API ────────────────────────────────────────────────────────────
  const initRadio = useCallback(() => {
    if (!allTracks.length) return null;
    if (currentRadioSong) return currentRadioSong;

    // If a song is already playing (from homepage/library), adopt it as the radio song
    // so the Radio page shows it as the current track without restarting
    const activeSong = stateRef.current._currentPlayerTrack;
    if (activeSong) {
      const built = buildWeightedQueue(allTracks, activeSong.id, likedTrackIds, getDislikedIds());
      setCurrentRadioSong(activeSong);
      setRadioHistory([activeSong]);
      setHistoryIndex(0);
      setRadioQueue(built.slice(1));
      return activeSong;
    }

    const built = buildWeightedQueue(allTracks, null, likedTrackIds, getDislikedIds());
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
      const built = buildWeightedQueue(allTracks, null, likedTrackIds, getDislikedIds());
      song  = built[0];
      queue = built.slice(1);
      if (!song) return;
      setCurrentRadioSong(song);
      setRadioHistory([song]);
      setHistoryIndex(0);
      setRadioQueue(queue);
      // Fresh session — clear any saved position
      radioSavedTimeRef.current = 0;
    } else {
      // Resuming existing session — pass saved position directly to playTrack
      const savedTime = radioSavedTimeRef.current;
      if (savedTime > 1) {
        console.log("[RadioContext] 📍 Restoring radio position:", savedTime.toFixed(2));
      }
    }
    const resumeTime = radioSavedTimeRef.current;
    playTrack(song, "radio", resumeTime > 1 ? resumeTime : 0);
    if (onPlay) onPlay(song);
    console.log("[RadioContext] 📻 Radio started:", song.title);
  }, [allTracks, currentRadioSong, radioQueue, playTrack, likedTrackIds]);

  const resumeRadio = useCallback((onPlay) => {
    if (!currentRadioSong) return startRadio(onPlay);
    const savedTime = radioSavedTimeRef.current;
    if (savedTime > 1) {
      console.log("[RadioContext] 📍 resumeRadio restoring position:", savedTime.toFixed(2));
    }
    playTrack(currentRadioSong, "radio", savedTime > 1 ? savedTime : 0);
    if (onPlay) onPlay(currentRadioSong);
  }, [currentRadioSong, startRadio, playTrack]);

  const nextRadioSong = useCallback(() => { nextFnRef.current?.(); }, []); // calls handleNextUser → fromSkip=true
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
      ? [...newQueue, ...buildWeightedQueue(allTracks, song.id, likedTrackIds, getDislikedIds()).filter((t) => !newQueue.find((q) => q.id === t.id))].slice(0, 50)
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