/**
 * useWorldDJStream — Dance floor DJ audio stream.
 * Plays music from the active DJ playlist when user is on the dance floor.
 * Handles browser autoplay policy by retrying on user interaction.
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";

const MAX_VOL = 0.85;
const FADE_MS = 500;

function fadeIn(el, targetVol, ms) {
  if (!el) return;
  el.volume = 0;
  const start = performance.now();
  const tick = (now) => {
    const t = Math.min(1, (now - start) / ms);
    el.volume = Math.max(0, Math.min(1, targetVol * t));
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

export default function useWorldDJStream({ enabled = true, danceFloorMode = false }) {
  const audioRef = useRef(null);
  const [djTrack, setDjTrack] = useState(null);
  const tracksRef = useRef([]);        // resolved track objects from active playlist
  const currentIdxRef = useRef(0);
  const danceFloorRef = useRef(false);
  danceFloorRef.current = danceFloorMode;

  const loadedRef = useRef(false);     // tracks loaded at least once
  const playBlockedRef = useRef(false); // browser blocked autoplay

  // ── Get or create audio element ──────────────────────────────────────────
  const getAudio = useCallback(() => {
    if (!audioRef.current) {
      const el = new Audio();
      el.volume = 0;
      el.preload = "auto";
      audioRef.current = el;
    }
    return audioRef.current;
  }, []);

  // ── Load tracks from active DJ playlist ──────────────────────────────────
  const loadPlaylist = useCallback(async () => {
    try {
      // Try active DJ playlist first
      const playlists = await base44.entities.DJPlaylist.list("-updatedAt", 20);
      const active = playlists.find(p => p.isActive);

      if (active?.trackIds?.length) {
        // Fetch all tracks from pool and map by ID
        const pool = await base44.entities.Track.filter({ status: "published" }, "-display_order", 500);
        const poolMap = Object.fromEntries(pool.filter(t => t.audio_url).map(t => [t.id, t]));
        const resolved = active.trackIds.map(id => poolMap[id]).filter(Boolean);
        if (resolved.length) {
          // Shuffle
          for (let i = resolved.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [resolved[i], resolved[j]] = [resolved[j], resolved[i]];
          }
          tracksRef.current = resolved;
          currentIdxRef.current = 0;
          loadedRef.current = true;
          return;
        }
      }

      // Fallback: use published tracks pool
      const fallback = await base44.entities.Track.filter({ status: "published" }, "-display_order", 100);
      const withAudio = fallback.filter(t => t.audio_url);
      if (withAudio.length) {
        // Shuffle
        for (let i = withAudio.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [withAudio[i], withAudio[j]] = [withAudio[j], withAudio[i]];
        }
        tracksRef.current = withAudio;
        currentIdxRef.current = 0;
        loadedRef.current = true;
      }
    } catch (e) {
      console.warn("[DJStream] loadPlaylist error:", e);
    }
  }, []);

  // ── Play current track ────────────────────────────────────────────────────
  const playCurrentTrack = useCallback(() => {
    const tracks = tracksRef.current;
    if (!tracks.length) return;

    const track = tracks[currentIdxRef.current % tracks.length];
    if (!track?.audio_url) return;

    const el = getAudio();

    // Load track if different
    if (el.src !== track.audio_url) {
      el.src = track.audio_url;
      el.load();
    }

    setDjTrack(track);

    const doPlay = () => {
      if (!danceFloorRef.current) return; // don't unmute if user left floor
      el.play()
        .then(() => {
          playBlockedRef.current = false;
          fadeIn(el, MAX_VOL, FADE_MS);
        })
        .catch((err) => {
          console.warn("[DJStream] play() blocked:", err.message);
          playBlockedRef.current = true;
          // Will retry on next user interaction via the gesture listener
        });
    };

    if (el.readyState >= 2) {
      doPlay();
    } else {
      el.oncanplay = () => { el.oncanplay = null; doPlay(); };
    }
  }, [getAudio]);

  // ── Advance to next track on end ──────────────────────────────────────────
  const advanceTrack = useCallback(() => {
    currentIdxRef.current = (currentIdxRef.current + 1) % Math.max(1, tracksRef.current.length);
    playCurrentTrack();
  }, [playCurrentTrack]);

  // ── Init: load playlist, set up ended listener ────────────────────────────
  useEffect(() => {
    if (!enabled) return;
    loadPlaylist();
    const el = getAudio();
    const onEnded = () => advanceTrack();
    el.addEventListener("ended", onEnded);
    return () => el.removeEventListener("ended", onEnded);
  }, [enabled, loadPlaylist, getAudio, advanceTrack]);

  // ── Dance floor gate: start/stop audio based on proximity ────────────────
  useEffect(() => {
    if (!enabled) return;
    const el = audioRef.current;

    if (danceFloorMode) {
      // Ensure tracks are loaded, then play
      if (!loadedRef.current) {
        // Playlist still loading — wait for it then play
        const wait = setInterval(() => {
          if (loadedRef.current) {
            clearInterval(wait);
            playCurrentTrack();
          }
        }, 300);
        return () => clearInterval(wait);
      } else {
        // Tracks ready — if audio is paused or at wrong volume, start it
        const audioEl = getAudio();
        if (audioEl.paused || audioEl.volume < 0.1) {
          playCurrentTrack();
        } else {
          // Already playing, just unmute/fade up
          fadeIn(audioEl, MAX_VOL, FADE_MS);
        }
      }
    } else {
      // Left dance floor — silence immediately
      if (el) {
        el.volume = 0;
        // Don't pause — keep buffered so re-entry is instant
      }
    }
  }, [danceFloorMode, enabled, playCurrentTrack, getAudio]);

  // ── Retry on user gesture if autoplay was blocked ─────────────────────────
  useEffect(() => {
    if (!enabled) return;
    const retry = () => {
      if (playBlockedRef.current && danceFloorRef.current) {
        playBlockedRef.current = false;
        playCurrentTrack();
      }
    };
    window.addEventListener("click", retry, { passive: true });
    window.addEventListener("touchend", retry, { passive: true });
    window.addEventListener("keydown", retry, { passive: true });
    return () => {
      window.removeEventListener("click", retry);
      window.removeEventListener("touchend", retry);
      window.removeEventListener("keydown", retry);
    };
  }, [enabled, playCurrentTrack]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      const el = audioRef.current;
      if (el) { el.pause(); el.src = ""; }
      audioRef.current = null;
    };
  }, []);

  return { djAudioRef: audioRef, djTrack };
}