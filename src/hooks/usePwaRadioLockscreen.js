/**
 * usePwaRadioLockscreen
 *
 * PWA (Add-to-Home-Screen) ONLY. Handles the iOS lock-screen "Play" edge
 * case where iOS may have cleared audio.src after suspending the PWA.
 *
 * This hook ONLY runs when window.navigator.standalone === true or
 * display-mode: standalone. Safari browser users are completely unaffected.
 */
import { useEffect, useRef } from "react";

const LS_KEY = "uvm_radio_state";

function isPwa() {
  return (
    window.navigator.standalone === true ||
    window.matchMedia("(display-mode: standalone)").matches
  );
}

export function usePwaRadioLockscreen({
  audioRef,
  sourceType,
  currentTrack,
  allTracks,
  savedTimeRef,
  clearPosition,
  safePlay,
  setIsPlaying,
}) {
  const stateRef = useRef({});
  useEffect(() => {
    stateRef.current = { sourceType, currentTrack, allTracks };
  }, [sourceType, currentTrack, allTracks]);

  useEffect(() => {
    if (!isPwa()) return;
    if (!("mediaSession" in navigator)) return;

    const audio = audioRef.current;
    if (!audio) return;

    const handlePlay = () => {
      const { sourceType: st, currentTrack: ct, allTracks: aT } = stateRef.current;

      // ── Audio src still loaded — standard resume, no re-seek ──
      if (audio.src) {
        const doResume = () => {
          audio.playbackRate = 1;
          audio.defaultPlaybackRate = 1;
          safePlay(audio);
          setIsPlaying(true);
        };
        if (!isFinite(audio.duration) || audio.duration === 0) {
          const onCan = () => { audio.removeEventListener("canplay", onCan); doResume(); };
          audio.addEventListener("canplay", onCan);
          if (audio.readyState < 1) audio.load();
        } else {
          doResume();
        }
        return;
      }

      // ── Audio src was cleared by iOS — only happens in Radio mode ──
      if (st !== "radio") return;

      // Find the track to recover
      let trackToLoad = ct;
      if (!trackToLoad && aT?.length) {
        try {
          const raw = localStorage.getItem(LS_KEY);
          if (raw) {
            const parsed = JSON.parse(raw);
            const id = parsed.currentRadioSongId;
            if (id) trackToLoad = aT.find((t) => t.id === id) || null;
          }
        } catch {}
      }

      if (!trackToLoad?.audio_url) {
        console.warn("[PWA Radio] lock-screen play — no track to recover");
        return;
      }

      console.log("[PWA Radio] recovering src:", trackToLoad.title);
      clearPosition(); // start fresh — no stale seek
      audio.src = trackToLoad.audio_url;
      audio.load();

      // Update lock-screen metadata
      const art = trackToLoad.cover_url?.startsWith("https://")
        ? trackToLoad.cover_url
        : "https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?w=512&h=512&fit=crop&q=80";
      navigator.mediaSession.metadata = new MediaMetadata({
        title:   trackToLoad.title || "Radio",
        artist:  trackToLoad.artist_display || "Upper Vibe Media",
        album:   "Upper Vibe Media",
        artwork: [{ src: art, sizes: "512x512", type: "image/jpeg" }],
      });

      const onCanPlay = () => {
        audio.removeEventListener("canplay", onCanPlay);
        audio.playbackRate = 1;
        audio.defaultPlaybackRate = 1;
        safePlay(audio);
        setIsPlaying(true);
      };
      audio.addEventListener("canplay", onCanPlay);
    };

    const timerId = setTimeout(() => {
      try {
        navigator.mediaSession.setActionHandler("play", handlePlay);
        console.log("[PWA Radio] ✅ lock-screen handler installed");
      } catch (e) {
        console.warn("[PWA Radio] could not set MediaSession handler:", e);
      }
    }, 200);

    return () => { clearTimeout(timerId); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}