import { base44 } from "@/api/base44Client";
import { LIVE_STREAM_URL } from "@/lib/liveStreamConfig";
import {
  getState as getRamState,
  getAudioElement,
  playMyVibeTrack,
  pauseMyVibe,
  restoreMyVibePosition,
  pauseUpperVibeRadio,
  resumeUpperVibeRadio,
} from "@/lib/radioAudioManager";

const DJ_EPOCH = 1700000000000;
const DJ_TARGET_VOLUME = 0.82;
const GLOBAL_TARGET_VOLUME = 0.85;

let cityAudioMode = "globalMusic";
let defaultGlobalTrack = null;
let userManuallyPausedGlobal = false;
let previousGlobal = { activeMode: null, track: null, time: 0, volume: GLOBAL_TARGET_VOLUME, wasPlaying: false, userManuallyPaused: false };
let djAudio = null;
let djReady = false;
let djUsesLiveStream = false;
let djTracks = [];
let currentDjTrack = null;
let preloadPromise = null;
let recentDjTrackIds = [];
const DJ_RECENT_LIMIT = 8;
const listeners = new Set();

function isIOS() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent || "");
}

function isPWA() {
  return window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator?.standalone === true;
}

function emit() {
  const snapshot = getCityAudioDebugSnapshot();
  listeners.forEach((fn) => {
    try { fn(snapshot); } catch {}
  });
}

export function subscribeCityAudio(fn) {
  listeners.add(fn);
  try { fn(getCityAudioDebugSnapshot()); } catch {}
  return () => listeners.delete(fn);
}

export function setCityDefaultTrack(track) {
  if (track?.audio_url) defaultGlobalTrack = track;
  emit();
}

export function setCityGlobalUserManuallyPaused(paused) {
  userManuallyPausedGlobal = !!paused;
  emit();
}

export function getCityGlobalUserManuallyPaused() {
  return userManuallyPausedGlobal;
}

function ensureDjAudio() {
  if (!djAudio) {
    djAudio = new Audio();
    djAudio.crossOrigin = "anonymous";
    djAudio.preload = "auto";
    djAudio.volume = 0;
    djAudio.muted = true;
    djAudio.setAttribute("playsinline", "");
    djAudio.setAttribute("x-webkit-airplay", "allow");
    djAudio.setAttribute("aria-hidden", "true");
    djAudio.style.cssText = "position:absolute;width:0;height:0;opacity:0;pointer-events:none;";
    document.body.appendChild(djAudio);
  }
  return djAudio;
}

function getDurationSeconds(track) {
  if (typeof track?.duration === "string" && track.duration.includes(":")) {
    const parts = track.duration.split(":").map((p) => parseInt(p, 10) || 0);
    return Math.max(30, (parts[0] || 0) * 60 + (parts[1] || 0));
  }
  return Math.max(30, parseFloat(track?.duration) || 210);
}

function rememberDjTrack(track) {
  if (!track?.id || recentDjTrackIds[0] === track.id) return;
  recentDjTrackIds = [track.id, ...recentDjTrackIds.filter((id) => id !== track.id)].slice(0, DJ_RECENT_LIMIT);
}

function seededRandom(seed) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += h << 13; h ^= h >>> 7;
    h += h << 3;  h ^= h >>> 17;
    h += h << 5;
    return ((h >>> 0) / 4294967296);
  };
}

function buildSharedDjShuffle(tracks, seed) {
  const unique = [];
  const seen = new Set();
  tracks.forEach((track) => {
    if (!track?.id || seen.has(track.id)) return;
    seen.add(track.id);
    unique.push(track);
  });
  if (unique.length <= 2) return unique;
  const rand = seededRandom(seed || unique.map((t) => t.id).join("|"));
  const shuffled = [...unique];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function getSharedDjPosition() {
  if (!djTracks.length) return { track: null, offset: 0 };
  const durations = djTracks.map(getDurationSeconds);
  const total = durations.reduce((sum, n) => sum + n, 0);
  if (!total) return { track: djTracks[0], offset: 0 };
  const elapsed = ((Date.now() - DJ_EPOCH) % (total * 1000)) / 1000;
  let cursor = 0;
  for (let i = 0; i < djTracks.length; i++) {
    if (elapsed < cursor + durations[i]) return { track: djTracks[i], offset: elapsed - cursor };
    cursor += durations[i];
  }
  return { track: djTracks[0], offset: 0 };
}

function applyDjSource() {
  const audio = ensureDjAudio();
  if (djUsesLiveStream) {
    if (audio.dataset.cityDjSrc !== LIVE_STREAM_URL) {
      audio.src = LIVE_STREAM_URL;
      audio.dataset.cityDjSrc = LIVE_STREAM_URL;
      audio.load();
    }
    currentDjTrack = { title: "Upper Vibe Radio", artist_display: "Live Stream" };
    return;
  }

  const { track, offset } = getSharedDjPosition();
  if (!track?.audio_url) return;
  if (audio.dataset.cityDjSrc !== track.audio_url) {
    audio.src = track.audio_url;
    audio.dataset.cityDjSrc = track.audio_url;
    audio.load();
  }
  currentDjTrack = track;
  rememberDjTrack(track);
  const seek = () => {
    try { if (offset > 0 && Math.abs(audio.currentTime - offset) > 1) audio.currentTime = offset; } catch {}
  };
  if (audio.readyState >= 1) seek();
  else audio.addEventListener("loadedmetadata", seek, { once: true });
}

export async function preloadCityDj() {
  if (preloadPromise) return preloadPromise;
  preloadPromise = (async () => {
    try {
      ensureDjAudio();
      const playlists = await base44.entities.DJPlaylist.list("-updatedAt", 20);
      const active = playlists.find((p) => p.isActive);
      if (active?.trackIds?.length) {
        const pool = await base44.entities.Track.filter({ status: "published" }, "-display_order", 500);
        const map = Object.fromEntries(pool.filter((t) => t.audio_url).map((t) => [t.id, t]));
        const orderedTracks = active.trackIds.map((id) => map[id]).filter(Boolean);
        const seed = `${active.id || "dj"}|${active.updatedAt || ""}|${active.trackIds.join("|")}`;
        djTracks = buildSharedDjShuffle(orderedTracks, seed);
      }
      recentDjTrackIds = [];
      djUsesLiveStream = djTracks.length === 0;
      djReady = true;
      applyDjSource();
      emit();
    } catch {
      djTracks = [];
      djUsesLiveStream = true;
      djReady = true;
      applyDjSource();
      emit();
    }
  })();
  return preloadPromise;
}

function getPreferredGlobalTrack(track) {
  const ram = getRamState();
  return track || (ram.activeMode === "myVibeRadio" ? ram.currentTrack : null) || defaultGlobalTrack;
}

export function startGlobalMusic(track) {
  if (userManuallyPausedGlobal) {
    cityAudioMode = "globalMusic";
    emit();
    return;
  }
  const chosen = getPreferredGlobalTrack(track);
  if (chosen?.audio_url) playMyVibeTrack(chosen);
  const audio = getAudioElement();
  if (audio) {
    audio.muted = false;
    audio.volume = previousGlobal.volume || GLOBAL_TARGET_VOLUME;
    if (audio.paused) audio.play().catch(() => {});
  }
  cityAudioMode = "globalMusic";
  emit();
}

export function pauseGlobalMusicImmediately() {
  const ram = getRamState();
  const audio = getAudioElement();
  previousGlobal = {
    activeMode: ram.activeMode,
    track: ram.currentTrack || defaultGlobalTrack,
    time: audio?.currentTime || ram.currentTime || 0,
    volume: audio?.volume || GLOBAL_TARGET_VOLUME,
    wasPlaying: ram.isPlaying || !!(audio && !audio.paused),
    userManuallyPaused: userManuallyPausedGlobal,
  };

  if (ram.activeMode === "myVibeRadio") pauseMyVibe();
  else if (ram.activeMode === "upperVibeRadio") pauseUpperVibeRadio();

  if (audio) {
    try { audio.pause(); } catch {}
    audio.muted = true;
    audio.volume = 0;
  }
  emit();
}

export function restoreGlobalMusic() {
  const track = previousGlobal.track || defaultGlobalTrack;
  const shouldResume = previousGlobal.wasPlaying && !previousGlobal.userManuallyPaused && !userManuallyPausedGlobal;

  if (shouldResume) {
    if (previousGlobal.activeMode === "upperVibeRadio") {
      resumeUpperVibeRadio();
    } else if (track?.audio_url) {
      const ram = getRamState();
      if (ram.activeMode === "myVibeRadio" && ram.currentTrack?.id === track.id) {
        restoreMyVibePosition(previousGlobal.time || 0);
      } else {
        playMyVibeTrack(track);
      }
    }
  }

  const audio = getAudioElement();
  if (audio) {
    audio.muted = false;
    audio.volume = previousGlobal.volume || GLOBAL_TARGET_VOLUME;
    if (previousGlobal.time > 0 && previousGlobal.activeMode !== "upperVibeRadio") {
      try { audio.currentTime = previousGlobal.time; } catch {}
    }
    if (!shouldResume) {
      try { audio.pause(); } catch {}
    } else if (audio.paused) audio.play().catch(() => {});
  }
  cityAudioMode = "globalMusic";
  emit();
}

export function prepareLiveDjAudioMuted() {
  const audio = ensureDjAudio();
  if (djReady) applyDjSource();
  audio.muted = true;
  audio.volume = 0;
  if (audio.src && audio.src !== window.location.href && audio.paused) {
    audio.play().then(() => {
      audio.pause();
      audio.muted = true;
      audio.volume = 0;
      emit();
    }).catch(() => {});
  }
  emit();
}

export function startLiveDj() {
  const audio = ensureDjAudio();
  if (!djReady) {
    preloadCityDj().then(() => { if (cityAudioMode === "enteringDanceFloor" || cityAudioMode === "danceFloor") startLiveDj(); });
    return;
  }
  applyDjSource();
  audio.muted = false;
  audio.volume = DJ_TARGET_VOLUME;
  audio.play().catch(() => {});
  emit();
}

export function pauseLiveDjImmediately() {
  const audio = ensureDjAudio();
  try { audio.pause(); } catch {}
  audio.muted = true;
  audio.volume = 0;
  emit();
}

export function enterCityDanceFloor() {
  if (cityAudioMode === "danceFloor" || cityAudioMode === "enteringDanceFloor") return;
  cityAudioMode = "enteringDanceFloor";
  emit();
  pauseGlobalMusicImmediately();
  startLiveDj();
  cityAudioMode = "danceFloor";
  emit();
}

export function leaveCityDanceFloor() {
  if (cityAudioMode === "globalMusic" || cityAudioMode === "leavingDanceFloor") return;
  cityAudioMode = "leavingDanceFloor";
  emit();
  pauseLiveDjImmediately();
  restoreGlobalMusic();
  cityAudioMode = "globalMusic";
  emit();
}

export function enforceCityAudioState() {
  const ramEl = getAudioElement();
  const djEl = ensureDjAudio();
  if (cityAudioMode === "danceFloor" || cityAudioMode === "enteringDanceFloor") {
    if (ramEl) {
      try { ramEl.pause(); } catch {}
      ramEl.muted = true;
      ramEl.volume = 0;
    }
    djEl.muted = false;
    djEl.volume = DJ_TARGET_VOLUME;
    if (djEl.src && djEl.paused) djEl.play().catch(() => {});
  } else {
    try { djEl.pause(); } catch {}
    djEl.muted = true;
    djEl.volume = 0;
  }
  emit();
}

export function unlockCityAudioForIOS(track) {
  if (track?.audio_url) setCityDefaultTrack(track);
  preloadCityDj();
  startGlobalMusic(track);
  prepareLiveDjAudioMuted();
}

export function retryCityAudioFromGesture(track) {
  if (track?.audio_url) setCityDefaultTrack(track);
  if (cityAudioMode === "danceFloor" || cityAudioMode === "enteringDanceFloor") {
    startLiveDj();
  } else {
    if (!userManuallyPausedGlobal) startGlobalMusic(track);
    prepareLiveDjAudioMuted();
  }
}

export function getCityAudioMode() {
  return cityAudioMode;
}

export function getCityAudioDebugSnapshot() {
  const ramEl = getAudioElement();
  const djEl = djAudio;
  const ram = getRamState();
  return {
    isIOS: isIOS(),
    isPWA: isPWA(),
    cityAudioMode,
    isUserInsideDanceFloor: cityAudioMode === "danceFloor" || cityAudioMode === "enteringDanceFloor",
    globalAudioPaused: ramEl ? ramEl.paused : true,
    globalAudioMuted: ramEl ? ramEl.muted : true,
    globalAudioVolume: ramEl ? Number(ramEl.volume || 0).toFixed(2) : "0.00",
    liveDjPaused: djEl ? djEl.paused : true,
    liveDjMuted: djEl ? djEl.muted : true,
    liveDjVolume: djEl ? Number(djEl.volume || 0).toFixed(2) : "0.00",
    currentGlobalTrack: (ram.currentTrack || defaultGlobalTrack)?.title || "none",
    currentDjTrack: currentDjTrack?.title || "none",
    djTrackObject: currentDjTrack || null,
    userManuallyPausedGlobal,
  };
}