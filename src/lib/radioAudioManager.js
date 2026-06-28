/**
 * RadioAudioManager — Upper Vibe Media
 *
 * One audio element. One source of truth.
 * Controls both Upper Vibe Radio (live stream) and My Vibe Radio (internal tracks).
 *
 * The Radio page UI reads state via subscribe() and sends commands via the
 * play/pause/switch/skip API. It never touches the audio element directly.
 *
 * Architecture:
 *  - Single HTMLAudioElement, module-level singleton (survives page remounts)
 *  - activeMode: "upperVibeRadio" | "myVibeRadio" | null
 *  - All event listeners are owned here and cleaned up properly on source switch
 *  - Reconnect logic lives here only (no duplication in the React layer)
 */

import { LIVE_STREAM_URL } from "./liveStreamConfig";

// ── Singleton audio element ────────────────────────────────────────────────────
let _audio = null;

function getAudio() {
  if (!_audio) {
    _audio = new Audio();
    _audio.crossOrigin = "anonymous";
    _audio.preload = "none";
    _audio.volume = 0.85;
    console.log("[RAM] Audio element created");
  }
  return _audio;
}

// ── State ──────────────────────────────────────────────────────────────────────
let _state = {
  activeMode: null,          // "upperVibeRadio" | "myVibeRadio" | null
  audioType: null,           // "liveStream" | "internalTrack" | null
  isPlaying: false,
  intendedToPlay: false,
  currentStreamUrl: null,
  currentTrack: null,        // Track object for myVibeRadio
  lastTrack: null,           // Persists the last My Vibe track even after stopAll()
  audioStatus: "idle",       // "idle" | "loading" | "playing" | "paused" | "stalled" | "error"
  lastError: null,
  currentTime: 0,            // playback position for myVibeRadio (updated via timeupdate)
  duration: 0,               // track duration once known
};

// ── Subscribers ───────────────────────────────────────────────────────────────
const _subscribers = new Set();

function _notify() {
  const snap = { ..._state };
  _subscribers.forEach((fn) => {
    try { fn(snap); } catch {}
  });
}

export function subscribe(fn) {
  _subscribers.add(fn);
  // Immediately emit current state to new subscriber
  try { fn({ ..._state }); } catch {}
  return () => _subscribers.delete(fn);
}

export function getState() {
  return { ..._state };
}

// ── Internal state setter ─────────────────────────────────────────────────────
function _setState(partial) {
  _state = { ..._state, ...partial };
  _notify();
}

// ── Active event listener cleanup ─────────────────────────────────────────────
let _cleanupListeners = null;

function _removeCurrentListeners() {
  if (_cleanupListeners) {
    _cleanupListeners();
    _cleanupListeners = null;
    console.log("[RAM] Event listeners removed");
  }
}

// ── Reconnect timer ───────────────────────────────────────────────────────────
let _reconnectTimer = null;

function _clearReconnect() {
  if (_reconnectTimer) {
    clearTimeout(_reconnectTimer);
    _reconnectTimer = null;
  }
}

// ── Saved state for cross-mode restoration (Live ↔ My Vibe switching) ─────────
let _savedMyVibeTrackId = null;
let _savedMyVibePosition = 0;

// ── Callbacks from outside (RadioContext) ────────────────────────────────────
let _onMyVibeEnded = null;    // called when a myVibe track ends naturally
let _onMyVibeError = null;    // called when a myVibe track errors

export function setMyVibeCallbacks({ onEnded, onError }) {
  _onMyVibeEnded = onEnded;
  _onMyVibeError = onError;
}

// ── Core: stop current audio cleanly ─────────────────────────────────────────
function _stopAudio(log = "") {
  _clearReconnect();
  _removeCurrentListeners();
  const audio = getAudio();
  if (!audio.paused) {
    audio.pause();
  }
  audio.src = "";
  console.log(`[RAM] Audio stopped ${log}`);
  _setState({
    isPlaying: false,
    intendedToPlay: false,
    audioStatus: "idle",
    lastError: null,
  });
}

// ── Upper Vibe Radio ──────────────────────────────────────────────────────────

function _attachLiveListeners() {
  const audio = getAudio();

  const onPlaying = () => {
    console.log("[RAM][Live] playing");
    _setState({ isPlaying: true, audioStatus: "playing", lastError: null, intendedToPlay: true });
  };

  const onPause = () => {
    if (_state.activeMode !== "upperVibeRadio") return;
    if (_state.intendedToPlay) {
      // Unexpected pause — e.g. browser suspended
      console.warn("[RAM][Live] unexpected pause");
    } else {
      console.log("[RAM][Live] paused");
      _setState({ isPlaying: false, audioStatus: "paused" });
    }
  };

  const onWaiting = () => {
    if (_state.activeMode !== "upperVibeRadio") return;
    console.log("[RAM][Live] waiting/buffering");
    _setState({ audioStatus: "loading" });
  };

  const onStalled = () => {
    if (_state.activeMode !== "upperVibeRadio" || !_state.intendedToPlay) return;
    console.warn("[RAM][Live] stalled — scheduling reconnect");
    _setState({ audioStatus: "stalled", isPlaying: false });
    _scheduleReconnect();
  };

  const onError = () => {
    if (_state.activeMode !== "upperVibeRadio" || !_state.intendedToPlay) return;
    const code = audio.error?.code;
    console.warn("[RAM][Live] error code:", code, "— scheduling reconnect");
    _setState({ audioStatus: "error", isPlaying: false, lastError: `Stream error (${code})` });
    _scheduleReconnect();
  };

  const onEnded = () => {
    if (_state.activeMode !== "upperVibeRadio" || !_state.intendedToPlay) return;
    console.warn("[RAM][Live] ended — scheduling reconnect");
    _scheduleReconnect();
  };

  audio.addEventListener("playing", onPlaying);
  audio.addEventListener("pause", onPause);
  audio.addEventListener("waiting", onWaiting);
  audio.addEventListener("stalled", onStalled);
  audio.addEventListener("error", onError);
  audio.addEventListener("ended", onEnded);

  console.log("[RAM][Live] listeners attached");

  _cleanupListeners = () => {
    audio.removeEventListener("playing", onPlaying);
    audio.removeEventListener("pause", onPause);
    audio.removeEventListener("waiting", onWaiting);
    audio.removeEventListener("stalled", onStalled);
    audio.removeEventListener("error", onError);
    audio.removeEventListener("ended", onEnded);
    console.log("[RAM][Live] listeners detached");
  };
}

function _scheduleReconnect() {
  if (_reconnectTimer) return; // already scheduled
  if (_state.activeMode !== "upperVibeRadio") return;
  console.log("[RAM][Live] reconnect in 2.5s");
  _reconnectTimer = setTimeout(() => {
    _reconnectTimer = null;
    if (_state.activeMode !== "upperVibeRadio" || !_state.intendedToPlay) {
      console.log("[RAM][Live] reconnect cancelled — mode changed");
      return;
    }
    const audio = getAudio();
    console.log("[RAM][Live] reconnecting...");
    audio.src = LIVE_STREAM_URL;
    audio.load();
    audio.play().catch((e) => {
      console.warn("[RAM][Live] reconnect play blocked:", e.message);
      _setState({ audioStatus: "error", lastError: "Tap play to reconnect." });
    });
  }, 2500);
}

/**
 * Play Upper Vibe Radio (live stream).
 * MUST be called synchronously from a user gesture.
 */
export function playUpperVibeRadio() {
  console.log("[RAM] playUpperVibeRadio | current mode:", _state.activeMode);

  // Already playing live — nothing to do
  const audio = getAudio();
  if (_state.activeMode === "upperVibeRadio" && _state.intendedToPlay && !audio.paused) {
    console.log("[RAM] Already playing live radio — no-op");
    return;
  }

  // ── Save My Vibe position before switching to Live ────────────────────
  if (_state.activeMode === "myVibeRadio" && _state.currentTrack) {
    _savedMyVibeTrackId = _state.currentTrack.id;
    _savedMyVibePosition = audio.currentTime;
    console.log("[RAM] Saved My Vibe state before switching to Live | track:", _savedMyVibeTrackId, "| pos:", _savedMyVibePosition.toFixed(2));
  }

  // Stop whatever was playing
  _stopAudio("before live start");

  _setState({
    activeMode: "upperVibeRadio",
    audioType: "liveStream",
    intendedToPlay: true,
    currentStreamUrl: LIVE_STREAM_URL,
    currentTrack: null,
    audioStatus: "loading",
    lastError: null,
  });

  _attachLiveListeners();

  audio.src = LIVE_STREAM_URL;
  audio.load();

  // play() must be called synchronously in gesture — do it now
  const promise = audio.play();
  if (promise) {
    promise.catch((e) => {
      if (_state.activeMode !== "upperVibeRadio") return; // switched away already
      console.warn("[RAM][Live] play() blocked:", e.message);
      _setState({ audioStatus: "error", lastError: "Tap play to start.", intendedToPlay: false, isPlaying: false });
    });
  }
}

export function pauseUpperVibeRadio() {
  if (_state.activeMode !== "upperVibeRadio") return;
  console.log("[RAM] pauseUpperVibeRadio");
  _clearReconnect();
  _setState({ intendedToPlay: false });
  const audio = getAudio();
  if (!audio.paused) audio.pause();
  _setState({ isPlaying: false, audioStatus: "paused" });
}

export function resumeUpperVibeRadio() {
  if (_state.activeMode !== "upperVibeRadio") return;
  console.log("[RAM] resumeUpperVibeRadio");
  const audio = getAudio();
  _setState({ intendedToPlay: true, audioStatus: "loading" });
  if (!audio.src || audio.src === window.location.href) {
    // src got cleared — re-load
    audio.src = LIVE_STREAM_URL;
    audio.load();
  }
  audio.play().catch((e) => {
    console.warn("[RAM][Live] resume blocked:", e.message);
    _setState({ lastError: "Tap play to start.", isPlaying: false, audioStatus: "error" });
  });
}

// ── My Vibe Radio ─────────────────────────────────────────────────────────────

function _attachMyVibeListeners(track) {
  const audio = getAudio();

  const onPlaying = () => {
    if (_state.activeMode !== "myVibeRadio") return;
    console.log("[RAM][MyVibe] playing:", track?.title);
    _setState({ isPlaying: true, audioStatus: "playing", lastError: null });
  };

  const onPause = () => {
    if (_state.activeMode !== "myVibeRadio") return;
    console.log("[RAM][MyVibe] paused");
    _setState({ isPlaying: false, audioStatus: "paused", currentTime: audio.currentTime });
  };

  const onWaiting = () => {
    if (_state.activeMode !== "myVibeRadio") return;
    _setState({ audioStatus: "loading" });
  };

  const onTimeUpdate = () => {
    if (_state.activeMode !== "myVibeRadio") return;
    // Throttle state updates: only notify if position changed by >= 1s to avoid excessive renders
    const t = audio.currentTime;
    if (Math.abs(t - _state.currentTime) >= 1) {
      _setState({ currentTime: t, duration: audio.duration || _state.duration });
    }
  };

  const onDurationChange = () => {
    if (_state.activeMode !== "myVibeRadio") return;
    _setState({ duration: audio.duration || 0 });
  };

  const onEnded = () => {
    if (_state.activeMode !== "myVibeRadio") return;
    console.log("[RAM][MyVibe] ended:", track?.title);
    _setState({ isPlaying: false, audioStatus: "idle", currentTime: 0 });
    if (_onMyVibeEnded) _onMyVibeEnded(track);
  };

  const onError = () => {
    if (_state.activeMode !== "myVibeRadio") return;
    const code = audio.error?.code;
    console.warn("[RAM][MyVibe] error code:", code, "for track:", track?.title);
    _setState({ isPlaying: false, audioStatus: "error", lastError: `Track error (${code})` });
    if (_onMyVibeError) _onMyVibeError(track);
  };

  audio.addEventListener("playing", onPlaying);
  audio.addEventListener("pause", onPause);
  audio.addEventListener("waiting", onWaiting);
  audio.addEventListener("timeupdate", onTimeUpdate);
  audio.addEventListener("durationchange", onDurationChange);
  audio.addEventListener("ended", onEnded);
  audio.addEventListener("error", onError);

  console.log("[RAM][MyVibe] listeners attached for:", track?.title);

  _cleanupListeners = () => {
    audio.removeEventListener("playing", onPlaying);
    audio.removeEventListener("pause", onPause);
    audio.removeEventListener("waiting", onWaiting);
    audio.removeEventListener("timeupdate", onTimeUpdate);
    audio.removeEventListener("durationchange", onDurationChange);
    audio.removeEventListener("ended", onEnded);
    audio.removeEventListener("error", onError);
    console.log("[RAM][MyVibe] listeners detached for:", track?.title);
  };
}

/**
 * Play a My Vibe track.
 * MUST be called synchronously from a user gesture on first play.
 *
 * Idempotent: if the same track is already loaded (same audio_url), this will
 * resume from the current position instead of restarting from 0:00.
 * This prevents songs from restarting when navigating between pages.
 */
export function playMyVibeTrack(track) {
  if (!track?.audio_url) {
    console.warn("[RAM] playMyVibeTrack — no audio_url for:", track?.title);
    if (_onMyVibeError) _onMyVibeError(track);
    return;
  }

  const audio = getAudio();

  // ── SAME TRACK ALREADY LOADED — just resume, don't restart ──────────────
  const alreadySameTrack =
    _state.activeMode === "myVibeRadio" &&
    _state.currentTrack?.id === track.id &&
    audio.src &&
    audio.src !== "" &&
    audio.src !== window.location.href;

  if (alreadySameTrack) {
    console.log("[RAM] playMyVibeTrack — same track already loaded, resuming:", track.title, "| pos:", audio.currentTime.toFixed(2));
    _setState({ intendedToPlay: true, currentTrack: track });
    if (audio.paused) {
      audio.play().catch((e) => {
        console.warn("[RAM][MyVibe] resume blocked:", e.message);
        _setState({ audioStatus: "error", lastError: "Tap play to start.", isPlaying: false, intendedToPlay: false });
      });
    }
    return;
  }

  // ── RESTORE SAVED POSITION when switching back from Live mode ──────────
  // _savedMyVibeTrackId is set by playUpperVibeRadio before it stops My Vibe
  const isRestoringFromLive = _savedMyVibeTrackId === track.id && _savedMyVibePosition > 0;
  const restoreTime = isRestoringFromLive ? _savedMyVibePosition : 0;

  console.log("[RAM] playMyVibeTrack:", track.title, "| url:", track.audio_url.substring(0, 60),
    "| restore:", isRestoringFromLive, "| restoreTime:", restoreTime.toFixed(2));

  // Stop whatever was playing
  _stopAudio("before myVibe track");

  // Clear saved state after using it
  _savedMyVibeTrackId = null;
  _savedMyVibePosition = 0;

  // Persist as lastTrack so it survives stopAll()
  _state.lastTrack = track;

  _setState({
    activeMode: "myVibeRadio",
    audioType: "internalTrack",
    intendedToPlay: true,
    currentStreamUrl: track.audio_url,
    currentTrack: track,
    audioStatus: "loading",
    lastError: null,
    isPlaying: false,
    currentTime: restoreTime,
    duration: 0,
  });

  _attachMyVibeListeners(track);

  audio.src = track.audio_url;
  audio.load();

  // Seek to saved position once metadata loads
  if (isRestoringFromLive && restoreTime > 0) {
    const seekTarget = restoreTime;
    const doSeek = () => {
      if (_state.activeMode !== "myVibeRadio") return;
      try {
        if (Math.abs(audio.currentTime - seekTarget) > 0.5) {
          audio.currentTime = seekTarget;
          _setState({ currentTime: seekTarget });
        }
      } catch {}
    };
    audio.addEventListener("loadedmetadata", doSeek, { once: true });
    // Also try immediately if already ready
    if (audio.readyState >= 1) {
      try { audio.currentTime = seekTarget; _setState({ currentTime: seekTarget }); } catch {}
    }
  }

  const promise = audio.play();
  if (promise) {
    promise.catch((e) => {
      if (_state.activeMode !== "myVibeRadio") return;
      console.warn("[RAM][MyVibe] play() blocked:", e.message);
      _setState({ audioStatus: "error", lastError: "Tap play to start.", isPlaying: false, intendedToPlay: false });
    });
  }
}

export function pauseMyVibe() {
  if (_state.activeMode !== "myVibeRadio") return;
  console.log("[RAM] pauseMyVibe");
  const audio = getAudio();
  if (!audio.paused) audio.pause();
  _setState({ isPlaying: false, audioStatus: "paused", intendedToPlay: false });
}

export function resumeMyVibe() {
  if (_state.activeMode !== "myVibeRadio") return;
  console.log("[RAM] resumeMyVibe | pos:", getAudio().currentTime.toFixed(2));
  const audio = getAudio();
  _setState({ intendedToPlay: true, audioStatus: "loading" });
  audio.play().catch((e) => {
    console.warn("[RAM][MyVibe] resume blocked:", e.message);
    _setState({ lastError: "Tap play to start.", isPlaying: false, audioStatus: "error" });
  });
}

/**
 * Save the current My Vibe playback position before entering dance floor.
 * Returns the saved time so callers can stash it.
 */
export function saveMyVibePosition() {
  const audio = getAudio();
  const t = _state.activeMode === "myVibeRadio" ? audio.currentTime : 0;
  console.log("[RAM] saveMyVibePosition:", t.toFixed(2));
  return t;
}

/**
 * Restore My Vibe to a previously saved position and resume playback.
 * Safe to call even if position is 0.
 */
export function restoreMyVibePosition(savedTime) {
  if (_state.activeMode !== "myVibeRadio") return;
  const audio = getAudio();
  if (savedTime > 0 && isFinite(savedTime)) {
    console.log("[RAM] restoreMyVibePosition:", savedTime.toFixed(2));
    try { audio.currentTime = savedTime; } catch {}
    _setState({ currentTime: savedTime });
  }
  _setState({ intendedToPlay: true, audioStatus: "loading" });
  audio.play().catch((e) => {
    console.warn("[RAM][MyVibe] restore/resume blocked:", e.message);
    _setState({ lastError: "Tap play to start.", isPlaying: false, audioStatus: "error" });
  });
}

/**
 * Stop all radio audio completely (e.g. user navigates away or closes radio).
 */
export function stopAll() {
  console.log("[RAM] stopAll");
  // Preserve lastTrack so the player can still show the last song
  const keep = _state.lastTrack;
  _stopAudio("stopAll");
  _setState({
    activeMode: null,
    audioType: null,
    currentTrack: null,
    currentStreamUrl: null,
    lastTrack: keep,
  });
}

/**
 * Get the audio element ref-like object for the visualizer.
 * Returns a stable object with a .current property pointing to the audio element.
 */
export function getAudioElementRef() {
  return { get current() { return _audio; } };
}

export function getAudioElement() {
  return _audio;
}