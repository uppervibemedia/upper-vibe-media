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

// Build a weighted queue — liked tracks appear 3x more often
function buildQueue(allTracks, currentSongId, likedIds = []) {
  const pool = [];
  allTracks.filter((t) => t.id !== currentSongId).forEach((t) => {
    const weight = likedIds.includes(t.id) ? 3 : 1;
    for (let i = 0; i < weight; i++) pool.push(t);
  });
  return shuffleArray(pool);
}

export function RadioProvider({ children }) {
  const { registerNextHandler, registerPrevHandler, playTrack, sourceType, currentTrack, isPlaying, audioRef, safePause, togglePlay, clearPlayLocks } = usePlayer();

  const [allTracks,        setAllTracks]        = useState([]);
  const [tracksLoaded,     setTracksLoaded]     = useState(false);
  const [currentRadioSong, setCurrentRadioSong] = useState(null);
  const [radioQueue,       setRadioQueue]       = useState([]);
  const [radioHistory,     setRadioHistory]     = useState([]);
  const [historyIndex,     setHistoryIndex]     = useState(-1);
  const [likedTrackIds,    setLikedTrackIds]    = useState([]);
  // PWA-only: true when the app was hidden/locked while Radio was playing
  const [pwaRadioPaused,   setPwaRadioPaused]   = useState(false);

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

  // ── Expose a setter so Radio page can push liked IDs in ──────────────────
  const setRadioLikedIds = useCallback((ids) => setLikedTrackIds(ids), []);

  // ── Keep stable refs for next/prev so Media Session callbacks never go stale ──
  // These refs always point to the latest function versions
  const nextFnRef = useRef(null);
  const prevFnRef = useRef(null);

  // ── Internal: advance to next song and play it via global player ──────────
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

    // Refill queue if running low
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
    stateRef.current = { allTracks, radioQueue, radioHistory, historyIndex, currentRadioSong, sourceType, likedTrackIds, isPlaying };
  }, [allTracks, radioQueue, radioHistory, historyIndex, currentRadioSong, sourceType, likedTrackIds, isPlaying]);

  // Keep sourceType in stateRef so handlers can check it without stale closures
  // (sourceType is already in stateRef via the effect above, but we name it explicitly)

  // Register next/prev handlers ONCE — they read latest state via stateRef
  useEffect(() => {
    const handleNext = () => {
      // SAFETY: only advance the radio queue when sourceType is "radio".
      // If a non-radio song ends (Music page, SongPage, etc.) this handler fires
      // but must not hijack the radio queue — return immediately.
      const { sourceType } = stateRef.current;
      if (sourceType !== "radio") {
        console.log("[RadioContext] ⚠️ handleNext skipped — sourceType is", sourceType);
        return;
      }
      const { allTracks: aT, radioQueue: q, radioHistory: h, historyIndex: hi, currentRadioSong: cs, likedTrackIds: liked } = stateRef.current;
      _playNext(aT, q, h, hi, cs, liked);
    };
    const handlePrev = () => {
      // SAFETY: same guard — only navigate radio history when in radio mode
      const { sourceType } = stateRef.current;
      if (sourceType !== "radio") return;
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

    const built = buildQueue(allTracks, null, likedTrackIds);
    const song  = built[0];
    const queue = built.slice(1);
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
      const built = buildQueue(allTracks, null, likedTrackIds);
      song  = built[0];
      queue = built.slice(1);
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
  }, [allTracks, currentRadioSong, radioQueue, playTrack, likedTrackIds]);

  // Resume radio (called after PWA background pause or non-radio interruption)
  const resumeRadio = useCallback((onPlay) => {
    if (!currentRadioSong) return startRadio(onPlay);
    const audio = audioRef.current;
    // Clear any stuck play/pause locks before re-triggering playback
    clearPlayLocks();
    console.log("[RadioContext] 📻 Radio resumeRadio —", {
      song: currentRadioSong.title,
      audioPaused: audio?.paused,
      audioTime:   audio?.currentTime,
      readyState:  audio?.readyState,
    });
    playTrack(currentRadioSong, "radio");
    if (onPlay) onPlay(currentRadioSong);
    console.log("[RadioContext] 📻 Radio resumed:", currentRadioSong.title);
  }, [currentRadioSong, startRadio, playTrack, audioRef, clearPlayLocks]);

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

  // ── PWA-only: Auto-pause on background, show Resume banner on return ────────
  // PlayerContext's generic hide/show handler is bypassed for PWA Radio.
  // This effect is the sole owner of hide/show logic in that scenario.
  //
  // KEY INSIGHT: The manual Radio Pause button calls handlePlay() → togglePlay().
  // We call that exact same togglePlay() here so the state produced is identical.
  // togglePlay() → safePause(audio, true) → saves currentTime, sets isPlaying=false,
  // keeps audio.src loaded, keeps sourceType="radio", keeps Media Session active.
  const wasPlayingBeforeHideRef = useRef(false);
  // Stable ref so the event listeners below always get latest togglePlay
  const togglePlayRef = useRef(togglePlay);
  useEffect(() => { togglePlayRef.current = togglePlay; }, [togglePlay]);

  useEffect(() => {
    const isPwa =
      window.navigator.standalone === true ||
      window.matchMedia("(display-mode: standalone)").matches;
    if (!isPwa) return;

    const onHide = () => {
      const { sourceType: st, isPlaying: playing } = stateRef.current;
      if (st !== "radio") return;

      console.log("[PWA Radio] onHide — MANUAL PAUSE EQUIVALENT", {
        isPlaying: playing,
        flow: "same as Radio Pause button → togglePlay()",
      });

      if (playing) {
        // ✅ Call the EXACT same function the Radio Pause button calls.
        // handlePlay() in Radio.jsx → togglePlay() when isCurrentlyPlayingRadio.
        // This does: safePause(audio, true) → saves time, sets isPlaying=false,
        // keeps sourceType="radio", keeps audio.src, keeps Media Session handlers.
        togglePlayRef.current();
        wasPlayingBeforeHideRef.current = true;
        console.log("[PWA Radio] onHide — auto-paused via togglePlay() (same as manual Pause button)");
      } else {
        wasPlayingBeforeHideRef.current = false;
        console.log("[PWA Radio] onHide — already paused, nothing to do");
      }
    };

    const onShow = () => {
      const { sourceType: st } = stateRef.current;
      if (st !== "radio") return;

      // Clear any locks accumulated during background so lock-screen Play / Resume can fire
      clearPlayLocks();

      console.log("[PWA Radio] onShow —", {
        wasPlayingBeforeHide: wasPlayingBeforeHideRef.current,
        audioElement: {
          paused:     audioRef.current?.paused,
          time:       audioRef.current?.currentTime,
          readyState: audioRef.current?.readyState,
        },
      });

      // Show Resume banner only if we were the ones who paused on hide
      if (wasPlayingBeforeHideRef.current) {
        setPwaRadioPaused(true);
        wasPlayingBeforeHideRef.current = false;
        console.log("[PWA Radio] onShow — showing Resume banner (was playing before hide)");
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") onHide();
      else onShow();
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onHide);
    window.addEventListener("blur",     onHide);
    window.addEventListener("focus",    onShow);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onHide);
      window.removeEventListener("blur",     onHide);
      window.removeEventListener("focus",    onShow);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearPlayLocks]);

  const clearPwaRadioPaused = useCallback(() => setPwaRadioPaused(false), []);

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
      likedTrackIds,
      setRadioLikedIds,
      initRadio,
      startRadio,
      resumeRadio,
      nextRadioSong,
      prevRadioSong,
      jumpToSong,
      pwaRadioPaused,
      clearPwaRadioPaused,
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