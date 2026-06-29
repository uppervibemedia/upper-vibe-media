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
import { useAuth } from "@/lib/AuthContext";
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
const MY_VIBE_RECENT_KEY = "uvm_my_vibe_recent_initial_ids";

function loadPersistedState() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "null"); } catch { return null; }
}
function persistState(state) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch {}
}
function loadMyVibeRecentIds() {
  try {
    const ids = JSON.parse(localStorage.getItem(MY_VIBE_RECENT_KEY) || "[]");
    return Array.isArray(ids) ? ids.filter(Boolean).slice(0, 5) : [];
  } catch { return []; }
}
function rememberMyVibeInitial(trackId) {
  if (!trackId) return;
  try {
    const recent = loadMyVibeRecentIds().filter((id) => id !== trackId);
    localStorage.setItem(MY_VIBE_RECENT_KEY, JSON.stringify([trackId, ...recent].slice(0, 5)));
  } catch {}
}
function pickFreshMyVibeSong(allTracks, excludeId, likedIds = [], dislikedIds = [], recentIds = []) {
  const eligibleTracks = (allTracks || []).filter((t) => t?.id && t.audio_url && t.status !== "archived" && !dislikedIds.includes(t.id));
  const combinedRecent = [...new Set([excludeId, ...recentIds, ...loadMyVibeRecentIds()].filter(Boolean))];
  const likedPool = likedIds.length
    ? eligibleTracks.filter((t) => likedIds.includes(t.id) && t.id !== excludeId)
    : [];
  const likedQueue = likedPool.length > 1
    ? buildWeightedQueue(likedPool, excludeId, likedIds, dislikedIds, combinedRecent)
    : likedPool;
  if (likedQueue.length) return likedQueue[0];
  return buildWeightedQueue(eligibleTracks, excludeId, likedIds, dislikedIds, combinedRecent)[0] || eligibleTracks[0] || null;
}

export function RadioProvider({ children }) {
  const {
    registerNextHandler, registerPrevHandler,
    audioRef,
  } = usePlayer();
  const { user } = useAuth();

  const [allTracks,          setAllTracks]          = useState([]);
  const [tracksLoaded,       setTracksLoaded]       = useState(false);
  const [currentRadioSong,   setCurrentRadioSong]   = useState(null);
  const [radioQueue,         setRadioQueue]         = useState([]);
  const [radioHistory,       setRadioHistory]       = useState([]);
  const [historyIndex,       setHistoryIndex]       = useState(-1);
  const [likedTrackIds,      setLikedTrackIds]      = useState([]);
  const [likedIdsLoaded,     setLikedIdsLoaded]     = useState(false);
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

  // ── Load tracks + drops (staggered to avoid rate limits) ──────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      import("@/lib/trackCache").then(({ getPublishedTracks }) => {
        getPublishedTracks("-created_date", 500).then((res) => {
          setAllTracks(res);
          setTracksLoaded(true);
          setCuratorActive(isCuratorActive());
        });
      });
    }, 250); // Load quickly so My Vibe always has a real default song ready
    loadHostDrops();
    return () => clearTimeout(timer);
  }, []);

  // ── Restore persisted state (no autoplay) ─────────────────────────────────
  const restoredRef = useRef(false);
  useEffect(() => {
    if (!tracksLoaded || restoredRef.current || (user?.id && !likedIdsLoaded)) return;
    restoredRef.current = true;
    const saved = loadPersistedState();
    const savedId = saved?.currentRadioSongId || null;
    const hist = saved?.radioHistoryIds?.length
      ? saved.radioHistoryIds.map((id) => allTracks.find((t) => t.id === id)).filter(Boolean)
      : [];
    const recentIds = [savedId, ...hist.slice(-5).map((t) => t.id), ...loadMyVibeRecentIds()].filter(Boolean);
    const song = pickFreshMyVibeSong(allTracks, savedId, likedTrackIds, getDislikedIds(), recentIds);
    if (song) {
      setCurrentRadioSong(song);
      setRadioHistory([song]);
      setHistoryIndex(0);
      setRadioQueue(buildWeightedQueue(allTracks.filter((t) => t?.audio_url && t.status !== "archived"), song.id, likedTrackIds, getDislikedIds(), [song.id, ...recentIds]));
      rememberMyVibeInitial(song.id);
      radioSavedTimeRef.current = 0;
    }
  }, [tracksLoaded, allTracks, likedTrackIds, likedIdsLoaded, user?.id]);

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

  // Position saving handled by RAM on switch — no-op here

  // ── Sync stateRef ─────────────────────────────────────────────────────────
  useEffect(() => {
    stateRef.current = {
      allTracks, radioQueue, radioHistory, historyIndex,
      currentRadioSong, likedTrackIds,
    };
  }, [allTracks, radioQueue, radioHistory, historyIndex, currentRadioSong, likedTrackIds]);

  // Keep refs in sync
  useEffect(() => { isHostDropRef.current = isHostDropPlaying; }, [isHostDropPlaying]);
  useEffect(() => { completedCountRef.current = completedSongCount; }, [completedSongCount]);

  useEffect(() => {
    if (!tracksLoaded) return;
    if (!user?.id) { setLikedTrackIds([]); setLikedIdsLoaded(true); return; }
    let cancelled = false;
    setLikedIdsLoaded(false);
    base44.entities.Favorite.list("-created_date", 500)
      .then((favorites) => {
        if (cancelled) return;
        const ids = (favorites || [])
          .filter((fav) => fav.type === "track" && fav.track_id)
          .map((fav) => fav.track_id);
        setLikedTrackIds([...new Set(ids)]);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLikedIdsLoaded(true); });
    return () => { cancelled = true; };
  }, [tracksLoaded, user?.id]);

  const setRadioLikedIds = useCallback((ids) => setLikedTrackIds(ids), []);

  function getRecentMyVibeIds(history, hIndex, limit = 10) {
    return history.slice(Math.max(0, hIndex - limit + 1), hIndex + 1).map((t) => t.id).filter(Boolean);
  }

  function takeNextFromQueue(queue, currentId, recentIds) {
    const cleanQueue = queue.filter((t) => t?.id && t.id !== currentId);
    const preferredIndex = cleanQueue.findIndex((t) => !recentIds.includes(t.id));
    const index = preferredIndex >= 0 ? preferredIndex : 0;
    const nextSong = cleanQueue[index] || null;
    const newQueue = nextSong ? cleanQueue.filter((_, i) => i !== index) : cleanQueue;
    return { nextSong, newQueue };
  }

  // ── Internal: play a specific song into radio ─────────────────────────────
  const _loadNextSong = useCallback((allT, queue, history, hIndex, currentSong, likedIds = []) => {
    let nextSong;
    let newQueue = [...queue];

    const dislikedIds = getDislikedIds();
    const recentIds = getRecentMyVibeIds(history, hIndex, 10);
    if (newQueue.length > 0) {
      const picked = takeNextFromQueue(newQueue, currentSong?.id, recentIds);
      nextSong = picked.nextSong;
      newQueue = picked.newQueue;
    }
    if (!nextSong) {
      const rebuilt = buildWeightedQueue(allT, currentSong?.id, likedIds, dislikedIds, recentIds);
      nextSong = rebuilt[0];
      newQueue  = rebuilt.slice(1);
    }
    if (!nextSong) return null;

    if (newQueue.length < 10) {
      const nextRecentIds = [...recentIds, nextSong.id].slice(-10);
      const extra = buildWeightedQueue(allT, nextSong.id, likedIds, dislikedIds, nextRecentIds)
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

  // ── Play next song (queue management only — RAM handles audio) ────────────
  const _playNext = useCallback((fromSkip = false) => {
    const { allTracks: aT, radioQueue: q, radioHistory: h, historyIndex: hi, currentRadioSong: cs, likedTrackIds: liked } = stateRef.current;

    // Record curator signal
    if (cs && fromSkip) {
      import("@/lib/radioAudioManager").then(({ getAudioElement }) => {
        const el = getAudioElement();
        const secs = el ? el.currentTime : 0;
        recordSkip(cs.id, secs, aT);
        setCuratorActive(isCuratorActive());
      });
    }

    const nextSong = _loadNextSong(aT, q, h, hi, cs, liked);
    if (nextSong) {
      console.log("[RadioContext] ⏭ Queue advanced to:", nextSong.title);
      // currentRadioSong state update triggers Radio.jsx useEffect → playMyVibeTrack
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [_loadNextSong]);

  // ── Play host drop then next song ─────────────────────────────────────────
  const _playHostDropThenNext = useCallback(async () => {
    await loadHostDrops();
    const drop = pickRandomDrop();

    if (!drop) {
      console.log("[RadioContext] 🎙 No active drops — going to next song");
      _playNext(false);
      return;
    }

    console.log("[RadioContext] 🎙 Playing host drop:", drop.title);
    const dropTrack = hostDropAsTrack(drop);
    currentDropRef.current = drop;
    isHostDropRef.current  = true;
    setIsHostDropPlaying(true);
    trackDropStarted(drop);

    try {
      // Play drop audio via RAM
      const { playMyVibeTrack } = await import("@/lib/radioAudioManager");
      playMyVibeTrack(dropTrack);
    } catch (e) {
      console.warn("[RadioContext] 🎙 Drop play error:", e.message);
      trackDropFailed(drop);
      isHostDropRef.current  = false;
      currentDropRef.current = null;
      setIsHostDropPlaying(false);
      _playNext(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [_playNext]);

  const _playPrev = useCallback((history, hIndex, currentSong) => {
    if (hIndex <= 0) return;
    const newIndex = hIndex - 1;
    const song = history[newIndex];
    setRadioQueue((q) => [currentSong, ...q].filter(Boolean));
    setHistoryIndex(newIndex);
    setCurrentRadioSong(song);
    console.log("[RadioContext] ⏮ Queue back to:", song.title);
    // currentRadioSong update triggers Radio.jsx useEffect → playMyVibeTrack
  }, []);

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
    const { currentRadioSong: cs, allTracks: aT } = stateRef.current;

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
    const { radioHistory: h, historyIndex: hi, currentRadioSong: cs } = stateRef.current;
    _playPrev(h, hi, cs);
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
      const { currentRadioSong: cs, allTracks: aT } = stateRef.current;
      if (!cs || isHostDropRef.current) return;
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
    const song = pickFreshMyVibeSong(allTracks, currentRadioSong?.id || null, likedTrackIds, getDislikedIds(), []);
    if (!song) return null;
    const built = buildWeightedQueue(allTracks, song.id, likedTrackIds, getDislikedIds(), [song.id]);
    setCurrentRadioSong(song);
    setRadioHistory([song]);
    setHistoryIndex(0);
    setRadioQueue(built);
    rememberMyVibeInitial(song.id);
    return song;
  }, [allTracks, currentRadioSong, likedTrackIds]);

  /**
   * startMyVibeQueue — initializes the queue and calls back with the first track.
   * The Radio page is responsible for actually calling playMyVibeTrack(track) via RAM.
   * This separation keeps audio control in RAM and queue management in RadioContext.
   */
  const startMyVibeQueue = useCallback((onFirstTrack) => {
    let song = currentRadioSong;
    if (!song) {
      song = pickFreshMyVibeSong(allTracks, null, likedTrackIds, getDislikedIds(), []);
      if (!song) {
        console.warn("[RadioContext] startMyVibeQueue — no tracks available");
        return;
      }
      const built = buildWeightedQueue(allTracks, song.id, likedTrackIds, getDislikedIds(), [song.id]);
      setCurrentRadioSong(song);
      setRadioHistory([song]);
      setHistoryIndex(0);
      setRadioQueue(built);
      rememberMyVibeInitial(song.id);
    }
    console.log("[RadioContext] 📻 Queue initialized, first track:", song.title);
    if (onFirstTrack) onFirstTrack(song);
  }, [allTracks, currentRadioSong, likedTrackIds]);

  // Keep startRadio for backwards compatibility (used by other parts of app)
  const startRadio = useCallback((onPlay) => {
    startMyVibeQueue(onPlay);
  }, [startMyVibeQueue]);

  const resumeRadio = useCallback((onPlay) => {
    if (currentRadioSong) {
      if (onPlay) onPlay(currentRadioSong);
    } else {
      startMyVibeQueue(onPlay);
    }
  }, [currentRadioSong, startMyVibeQueue]);

  const nextRadioSong = useCallback(() => { nextFnRef.current?.(); }, []); // fromSkip=true (user action)
  const handleNextNatural = useCallback(() => { handleNext(false); }, [handleNext]); // fromSkip=false (natural end)
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
    // Caller is responsible for triggering audio via RAM
    if (onPlay) onPlay(song);
  }, [allTracks, radioQueue, radioHistory, historyIndex, likedTrackIds]);

  const isRadioMode = true; // RAM owns mode detection; keep for backwards compat
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
      likedIdsLoaded,
      curatorActive,
      isHostDropPlaying,
      completedSongCount,
      setRadioLikedIds,
      curatorRecordLike,
      initRadio,
      startRadio,
      startMyVibeQueue,
      resumeRadio,
      nextRadioSong,
      handleNextNatural,
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