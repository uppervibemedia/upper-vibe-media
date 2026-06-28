/**
 * useWorldDJStream — Shared live DJ audio for the dance floor.
 *
 * Design: simulates a "radio station" by calculating the current track and
 * playback position from a shared epoch (a fixed reference timestamp). All
 * users derive the same track + offset from the same math, so they stay in
 * sync without any server round-trip.
 *
 * Audio ownership rules (enforced here):
 *   • When danceFloorMode=true  → DJ audio is unsilenced; caller must silence global player.
 *   • When danceFloorMode=false → DJ audio is immediately silenced (volume=0, paused).
 *   • Only one audio element exists for the lifetime of the hook.
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { LIVE_STREAM_URL } from "@/lib/liveStreamConfig";

const MAX_VOL = 0.82;
const FADE_MS = 600;

// ── Shared epoch: fixed reference point in ms.
// All users compute position as (Date.now() - EPOCH) % total_playlist_duration.
// This makes the "stream" deterministic for all clients simultaneously.
const DJ_EPOCH = 1700000000000; // arbitrary fixed past timestamp (ms)

function computeSharedPosition(tracks) {
  if (!tracks?.length) return { idx: 0, offset: 0 };

  // Build cumulative durations (prefer audio duration hint, fallback to 210s)
  const durations = tracks.map(t => {
    const d = parseFloat(t.duration) || 210;
    // duration field may be "3:30" or seconds as string
    if (typeof t.duration === "string" && t.duration.includes(":")) {
      const parts = t.duration.split(":");
      return parseInt(parts[0]) * 60 + parseInt(parts[1] || "0");
    }
    return Math.max(30, d);
  });

  const total = durations.reduce((s, d) => s + d, 0);
  if (total <= 0) return { idx: 0, offset: 0 };

  const elapsed = (Date.now() - DJ_EPOCH) % (total * 1000); // ms
  const elapsedSec = elapsed / 1000;

  let cum = 0;
  for (let i = 0; i < durations.length; i++) {
    if (elapsedSec < cum + durations[i]) {
      return { idx: i, offset: elapsedSec - cum };
    }
    cum += durations[i];
  }
  return { idx: 0, offset: 0 };
}

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
  const tracksRef = useRef([]);
  const currentIdxRef = useRef(0);
  const loadedRef = useRef(false);
  const useLiveStreamRef = useRef(false); // true when no active playlist — fall back to Citrus3
  const danceFloorRef = useRef(false);
  danceFloorRef.current = danceFloorMode;
  // Guard: prevent double-play calls from overlapping
  const playingRef = useRef(false);
  const mountedRef = useRef(true);

  // ── Create ONE audio element for the lifetime of the hook ────────────────
  const getAudio = useCallback(() => {
    if (!audioRef.current) {
      const el = new Audio();
      el.volume = 0;
      el.preload = "auto";
      // Attach to DOM so iOS doesn't garbage-collect the audio element
      el.style.cssText = "position:absolute;width:0;height:0;opacity:0;pointer-events:none;";
      el.setAttribute("aria-hidden", "true");
      document.body.appendChild(el);
      audioRef.current = el;
    }
    return audioRef.current;
  }, []);

  // ── Load tracks from active DJ playlist ──────────────────────────────────
  const loadPlaylist = useCallback(async () => {
    try {
      const playlists = await base44.entities.DJPlaylist.list("-updatedAt", 20);
      const active = playlists.find(p => p.isActive);

      if (active?.trackIds?.length) {
        const pool = await base44.entities.Track.filter({ status: "published" }, "-display_order", 500);
        const poolMap = Object.fromEntries(pool.filter(t => t.audio_url).map(t => [t.id, t]));
        const resolved = active.trackIds.map(id => poolMap[id]).filter(Boolean);
        if (resolved.length) {
          tracksRef.current = resolved;
          loadedRef.current = true;
          return;
        }
      }

      // No active playlist — use the Citrus3 live stream
      console.log("[DJStream] No active DJ playlist — using Citrus3 live stream");
      useLiveStreamRef.current = true;
      loadedRef.current = true;
    } catch (e) {
      console.warn("[DJStream] loadPlaylist error:", e);
      // On error, fall back to live stream
      useLiveStreamRef.current = true;
      loadedRef.current = true;
    }
  }, []);

  // ── Start playing from the shared clock position (or live stream) ────────
  const startAtSharedPosition = useCallback(() => {
    if (playingRef.current) return;
    if (!danceFloorRef.current) return;

    const el = getAudio();
    playingRef.current = true;

    // ── Live stream mode (Citrus3) ─────────────────────────────────────────
    if (useLiveStreamRef.current) {
      if (el.dataset.djSrc !== LIVE_STREAM_URL) {
        el.src = LIVE_STREAM_URL;
        el.dataset.djSrc = LIVE_STREAM_URL;
        el.load();
      }
      setDjTrack({ title: "Upper Vibe Radio", artist_display: "Live Stream" });
      el.play().then(() => {
        if (!danceFloorRef.current) { el.pause(); el.volume = 0; playingRef.current = false; return; }
        fadeIn(el, MAX_VOL, FADE_MS);
        playingRef.current = false;
      }).catch(err => {
        console.warn("[DJStream] live stream play() blocked:", err.message);
        playingRef.current = false;
      });
      return;
    }

    // ── Playlist mode (epoch-synced) ──────────────────────────────────────
    const tracks = tracksRef.current;
    if (!tracks.length) { playingRef.current = false; return; }

    const { idx, offset } = computeSharedPosition(tracks);
    const track = tracks[idx];
    if (!track?.audio_url) { playingRef.current = false; return; }

    const doPlay = () => {
      if (!mountedRef.current || !danceFloorRef.current) { playingRef.current = false; return; }

      if (el.dataset.djSrc !== track.audio_url) {
        el.src = track.audio_url;
        el.dataset.djSrc = track.audio_url;
        el.load();
      }

      setDjTrack(track);
      currentIdxRef.current = idx;

      const seekAndPlay = () => {
        const { idx: newIdx, offset: newOffset } = computeSharedPosition(tracks);
        const currentTrack = tracks[newIdx];

        if (currentTrack?.audio_url !== el.dataset.djSrc) {
          el.src = currentTrack.audio_url;
          el.dataset.djSrc = currentTrack.audio_url;
          el.load();
          setDjTrack(currentTrack);
          currentIdxRef.current = newIdx;
          el.addEventListener("canplay", seekAndPlay, { once: true });
          return;
        }

        try { if (newOffset > 0) el.currentTime = newOffset; } catch {}

        el.play().then(() => {
          if (!danceFloorRef.current) { el.pause(); el.volume = 0; playingRef.current = false; return; }
          fadeIn(el, MAX_VOL, FADE_MS);
          playingRef.current = false;
        }).catch(err => {
          console.warn("[DJStream] play() blocked:", err.message);
          playingRef.current = false;
        });
      };

      if (el.readyState >= 2) seekAndPlay();
      else el.addEventListener("canplay", seekAndPlay, { once: true });
    };

    doPlay();
  }, [getAudio]);

  // ── Silence DJ audio (does NOT destroy the element) ──────────────────────
  const silenceDJ = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    el.volume = 0;
    if (!el.paused) el.pause();
    playingRef.current = false;
  }, []);

  // ── Init: load playlist ───────────────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;
    if (!enabled) return;
    loadPlaylist();
    return () => {
      mountedRef.current = false;
    };
  }, [enabled, loadPlaylist]);

  // ── Track ended → advance to next shared position ────────────────────────
  useEffect(() => {
    if (!enabled) return;
    const el = getAudio();
    const onEnded = () => {
      // Recompute shared position (epoch-based), not just +1
      if (danceFloorRef.current && tracksRef.current.length > 0) {
        const { idx, offset } = computeSharedPosition(tracksRef.current);
        const track = tracksRef.current[idx];
        if (track?.audio_url) {
          el.src = track.audio_url;
          el.dataset.djSrc = track.audio_url;
          el.load();
          setDjTrack(track);
          currentIdxRef.current = idx;
          el.addEventListener("canplay", () => {
            try { if (offset > 0) el.currentTime = offset; } catch {}
            el.play().then(() => {
              if (danceFloorRef.current) fadeIn(el, MAX_VOL, FADE_MS);
              else { el.volume = 0; el.pause(); }
            }).catch(() => {});
          }, { once: true });
        }
      }
    };
    el.addEventListener("ended", onEnded);
    return () => el.removeEventListener("ended", onEnded);
  }, [enabled, getAudio]);

  // ── Dance floor gate: enter/exit audio ───────────────────────────────────
  useEffect(() => {
    if (!enabled) return;

    if (danceFloorMode) {
      // Entering dance floor
      if (!loadedRef.current) {
        // Wait for tracks to load then play
        const wait = setInterval(() => {
          if (loadedRef.current) {
            clearInterval(wait);
            startAtSharedPosition();
          }
        }, 200);
        return () => clearInterval(wait);
      } else {
        const el = audioRef.current;
        if (el && !el.paused && el.volume > 0) {
          // Already playing — just ensure volume is up
          return;
        }
        startAtSharedPosition();
      }
    } else {
      // Leaving dance floor — silence immediately, no partial fade
      silenceDJ();
    }
  }, [danceFloorMode, enabled, startAtSharedPosition, silenceDJ]);

  // ── Retry on user gesture if autoplay was blocked ─────────────────────────
  useEffect(() => {
    if (!enabled) return;
    const retry = () => {
      if (!danceFloorRef.current) return;
      const el = audioRef.current;
      if (!el) return;
      // Only retry if we're on the floor but audio is silent/paused
      if (el.paused || el.volume < 0.01) {
        startAtSharedPosition();
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
  }, [enabled, startAtSharedPosition]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      const el = audioRef.current;
      if (el) {
        el.pause();
        el.src = "";
        // Remove from DOM
        try { if (el.parentNode) el.parentNode.removeChild(el); } catch {}
      }
      audioRef.current = null;
    };
  }, []);

  return { djAudioRef: audioRef, djTrack };
}