/**
 * usePwaRadioLockscreen
 *
 * PWA + Radio only. Handles the iOS lock-screen "Play" edge case where:
 *  - The user locks the phone without pressing Pause
 *  - iOS may have suspended the PWA and cleared the audio src
 *  - Pressing Play on the lock screen must resume the same Radio track
 *
 * DOES NOT affect Safari mode, normal browser, or non-Radio playback.
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
  playLockRef,
  clearPosition,
  safePlay,
  playTrack,
  setIsPlaying,
}) {
  // Keep a stable ref to all values so the handler never goes stale
  const stateRef = useRef({});
  useEffect(() => {
    stateRef.current = {
      sourceType,
      currentTrack,
      allTracks,
      savedTimeRef,
      playLockRef,
      clearPosition,
      safePlay,
      playTrack,
      setIsPlaying,
    };
  }, [sourceType, currentTrack, allTracks, savedTimeRef, playLockRef, clearPosition, safePlay, playTrack, setIsPlaying]);

  useEffect(() => {
    // Only activate in PWA mode
    if (!isPwa()) return;
    if (!("mediaSession" in navigator)) return;

    const audio = audioRef.current;
    if (!audio) return;

    // This handler OVERRIDES the base MediaSession "play" handler for PWA Radio.
    // It is registered AFTER PlayerContext registers its own, so it wins.
    // We only act when sourceType === "radio"; otherwise we fall back to the
    // normal PlayerContext behaviour by calling the same resume logic.
    const handlePwaRadioPlay = () => {
      const {
        sourceType: st,
        currentTrack: ct,
        allTracks: aT,
        savedTimeRef: stRef,
        clearPosition: clrPos,
        safePlay: sPlay,
        playTrack: pTrack,
        setIsPlaying: setPlaying,
      } = stateRef.current;

      console.log("[PWA Radio] lock-screen play — sourceType:", st, "audio.src:", !!audio.src, "readyState:", audio.readyState);

      // ── Case 1: Not in radio mode — use standard resume (do not interfere) ──
      if (st !== "radio") {
        if (!audio.src) return;
        const resumeStandard = () => {
          if (stRef.current > 0) {
            try { audio.currentTime = stRef.current; } catch {}
            clrPos();
          }
          audio.playbackRate = 1;
          audio.defaultPlaybackRate = 1;
          sPlay(audio);
        };
        if (!isFinite(audio.duration) || audio.duration === 0) {
          const onCan = () => { audio.removeEventListener("canplay", onCan); resumeStandard(); };
          audio.addEventListener("canplay", onCan);
          if (audio.readyState < 1) audio.load();
        } else {
          resumeStandard();
        }
        return;
      }

      // ── Case 2: Radio mode — recover track if src was cleared ──
      const savedTime = stRef.current;

      const doResume = () => {
        if (savedTime > 0) {
          try { audio.currentTime = savedTime; } catch {}
          clrPos();
        }
        audio.playbackRate = 1;
        audio.defaultPlaybackRate = 1;
        sPlay(audio);
        setPlaying(true);
      };

      // If audio src is still loaded, just resume
      if (audio.src && audio.readyState >= 1) {
        if (!isFinite(audio.duration) || audio.duration === 0) {
          const onCan = () => { audio.removeEventListener("canplay", onCan); doResume(); };
          audio.addEventListener("canplay", onCan);
        } else {
          doResume();
        }
        return;
      }

      // Audio src was cleared by iOS — recover from persisted Radio state
      let trackToLoad = ct;

      if (!trackToLoad && aT?.length) {
        try {
          const raw = localStorage.getItem(LS_KEY);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed.currentRadioSongId) {
              trackToLoad = aT.find((t) => t.id === parsed.currentRadioSongId) || null;
            }
          }
        } catch {}
      }

      if (!trackToLoad?.audio_url) {
        console.warn("[PWA Radio] lock-screen play — no track to recover");
        return;
      }

      console.log("[PWA Radio] recovering src for:", trackToLoad.title, "savedTime:", savedTime);

      // Re-load the src without calling playTrack() (avoids resetting queue/history)
      audio.src = trackToLoad.audio_url;
      audio.load();

      // Update MediaSession metadata so lock screen shows the right info
      if (trackToLoad) {
        const art = trackToLoad.cover_url?.startsWith("https://") ? trackToLoad.cover_url
          : "https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?w=512&h=512&fit=crop&q=80";
        navigator.mediaSession.metadata = new MediaMetadata({
          title:  trackToLoad.title || "Radio",
          artist: trackToLoad.artist_display || "Upper Vibe Media",
          album:  "Upper Vibe Media",
          artwork: [
            { src: art, sizes: "512x512",   type: "image/jpeg" },
            { src: art, sizes: "1024x1024", type: "image/jpeg" },
          ],
        });
      }

      const onCanPlay = () => {
        audio.removeEventListener("canplay", onCanPlay);
        doResume();
      };
      audio.addEventListener("canplay", onCanPlay);
    };

    // Register AFTER PlayerContext — this override wins for PWA Radio
    // Use a small delay so PlayerContext finishes its own registration first
    const timerId = setTimeout(() => {
      try {
        navigator.mediaSession.setActionHandler("play", handlePwaRadioPlay);
        console.log("[PWA Radio] ✅ lock-screen play handler installed (PWA mode)");
      } catch (e) {
        console.warn("[PWA Radio] could not set MediaSession handler:", e);
      }
    }, 200);

    return () => {
      clearTimeout(timerId);
      // Do NOT null out the handler on cleanup — that would break the lock screen.
      // PlayerContext will re-register its own handler on its next effect cycle.
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once — all live state accessed via stateRef
}