import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, X, Mic2, Music4, Radio } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ShareVibeButton from "../shared/ShareVibeButton";
import ThumbsDownButton from "../shared/ThumbsDownButton";
import { Slider } from "@/components/ui/slider";
import { usePlayer, sharedHiddenRef } from "../../context/PlayerContext";
import { useRadio } from "@/context/RadioContext";
import { useTheme } from "../../context/ThemeContext";
import { RADIO_THEMES } from "../radio/RadioThemePicker";
import usePageVisible from "@/hooks/usePageVisible";
import { useAuth } from "@/lib/AuthContext";
import { subscribe as ramSubscribe, getState as ramGetState } from "@/lib/radioAudioManager";
import { getPublishedTracks } from "@/lib/trackCache";

export default function AudioPlayer() {
  const navigate = useNavigate();
  const {
    currentTrack,
    isPlaying,
    togglePlay,
    stopPlaying,
    audioRef,
    handleNext,
    handlePrev,
    skipTrack,
    lastTimeRef,
    sourceType,
    queue,
    playTrack,
  } = usePlayer();

  const { currentRadioSong, startMyVibeQueue } = useRadio();
  const { user } = useAuth();
  const { accentId } = useTheme();
  const theme = RADIO_THEMES[accentId] || RADIO_THEMES.cyan;
  const themeRgb = theme.vars["--rt-primary"];
  const themeHex = theme.swatch;

  // Fixed brand tri-color gradient — electric blue → gold → deep purple
  // Always uses all three brand colors regardless of the selected accent/theme
  const TRI_COLORS = {
    blue:  "0,160,220",
    gold:  "245,168,0",
    purple: "155,126,255",
  };

  const isPageVisible = usePageVisible();

  const [progress,   setProgress]   = useState(0);
  const [duration,   setDuration]   = useState(0);
  const [currentSec, setCurrentSec] = useState(0);
  const [volume,     setVolume]     = useState(80);
  const [muted,      setMuted]      = useState(false);

  // Local ref mirrors lastTimeRef — lets us detect real forward movement
  const localLastTimeRef = useRef(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return; // guard: audio element not yet created

    const onTimeUpdate = () => {
      if (audio.paused)         return;
      if (audio.readyState < 2) return;

      const ct = audio.currentTime;
      // If time hasn't moved forward — freeze (handles iOS buffering stalls)
      if (ct <= localLastTimeRef.current && localLastTimeRef.current > 0) return;

      localLastTimeRef.current = ct;
      if (lastTimeRef) lastTimeRef.current = ct; // keep PlayerContext in sync

      // Skip React state updates while page is hidden — no point rendering an
      // invisible bar. Audio continues uninterrupted; bar will snap on show.
      if (sharedHiddenRef.current) return;

      const pct = (ct / audio.duration) * 100 || 0;
      setProgress(pct);
      setCurrentSec(ct);
    };

    const onLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    // On every play event, snap the bar to the real current position immediately.
    // This handles resume-after-hide: shows correct position before timeupdate fires.
    const onPlay = () => {
      const ct  = audio.currentTime;
      const pct = (ct / audio.duration) * 100 || 0;
      localLastTimeRef.current = ct;
      setProgress(pct);
      setCurrentSec(ct);
    };

    // On pause — freeze bar at current real position, do not reset to 0
    const onPause = () => {
      const ct  = audio.currentTime;
      const pct = (ct / audio.duration) * 100 || 0;
      setProgress(pct);
      setCurrentSec(ct);
    };

    // On new src load — reset local tracking
    const onEmptied = () => {
      localLastTimeRef.current = 0;
      setProgress(0);
      setCurrentSec(0);
      setDuration(0);
    };

    // Snap progress bar when user returns to tab after background playback
    const onVisibilityShow = () => {
      if (document.visibilityState !== "hidden") {
        const ct = audio.currentTime;
        if (ct > 0 && audio.duration) {
          localLastTimeRef.current = ct;
          if (lastTimeRef) lastTimeRef.current = ct;
          setProgress((ct / audio.duration) * 100 || 0);
          setCurrentSec(ct);
        }
      }
    };

    audio.addEventListener("timeupdate",     onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("play",           onPlay);
    audio.addEventListener("pause",          onPause);
    audio.addEventListener("emptied",        onEmptied);
    document.addEventListener("visibilitychange", onVisibilityShow);

    return () => {
      audio.removeEventListener("timeupdate",     onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("play",           onPlay);
      audio.removeEventListener("pause",          onPause);
      audio.removeEventListener("emptied",        onEmptied);
      document.removeEventListener("visibilitychange", onVisibilityShow);
    };
  }, [audioRef, lastTimeRef]);

  // Reset local tracking when track changes
  useEffect(() => {
    localLastTimeRef.current = 0;
    setProgress(0);
    setCurrentSec(0);
    setDuration(0);
  }, [currentTrack?.audio_url]);

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = muted ? 0 : volume / 100;
  }, [volume, muted, audioRef]);

  // ── RAM state subscription ──────────────────────────────────────
  const [ramState, setRamState] = useState(() => ramGetState());
  const [heroFallbackTrack, setHeroFallbackTrack] = useState(null);
  useEffect(() => ramSubscribe((s) => setRamState(s)), []);

  useEffect(() => {
    getPublishedTracks("-created_date", 50)
      .then((tracks) => {
        const playable = tracks.find((t) => t.audio_url && t.cover_url && t.status === "published")
          || tracks.find((t) => t.audio_url && t.status === "published");
        if (playable) setHeroFallbackTrack(playable);
      })
      .catch(() => {});
  }, []);

  // Derive effective display track and playing state from all sources.
  // Priority: My Vibe current/queue → active global song → last My Vibe track → homepage fallback.
  const ramActive = ramState.activeMode !== null;
  const isRamRadio = ramActive && ramState.audioType === "liveStream";
  const myVibeTrack = !isRamRadio ? ramState.currentTrack : null;
  const displayTrack = isRamRadio ? null : (myVibeTrack || currentRadioSong || currentTrack || ramState.lastTrack || heroFallbackTrack);
  const effectiveIsPlaying = ramActive ? ramState.isPlaying : (currentTrack ? isPlaying : false);

  // Normalize cover art from various field names
  const displayCover = displayTrack?.cover_url || displayTrack?.coverArt || displayTrack?.image || displayTrack?.artwork || null;

  const handleIdlePlay = () => {
    if (ramActive) return; // RAM already active — nothing to play here
    import("@/lib/radioAudioManager").then((mod) => {
      if (ramState.lastTrack?.audio_url) {
        mod.playMyVibeTrack(ramState.lastTrack);
        return;
      }
      startMyVibeQueue((firstTrack) => {
        if (firstTrack?.audio_url) mod.playMyVibeTrack(firstTrack);
      });
    });
  };

  // Toggle play: delegate to RAM when RAM is active, otherwise start My Vibe with lastTrack or use PlayerContext
  const handleTogglePlay = useCallback(() => {
    if (ramActive) {
      // RAM handles its own toggle internally — user taps to start/stop radio/myVibe
      import("@/lib/radioAudioManager").then((mod) => {
        if (ramState.activeMode === "upperVibeRadio") {
          if (ramState.isPlaying) mod.pauseUpperVibeRadio();
          else mod.resumeUpperVibeRadio();
        } else if (ramState.activeMode === "myVibeRadio") {
          if (ramState.isPlaying) mod.pauseMyVibe();
          else mod.resumeMyVibe();
        }
      });
    } else if (ramState.lastTrack) {
      // Not active but we have a last track — start My Vibe Radio with it
      import("@/lib/radioAudioManager").then((mod) => mod.playMyVibeTrack(ramState.lastTrack));
    } else if (currentTrack) {
      togglePlay();
    } else {
      startMyVibeQueue((firstTrack) => {
        if (firstTrack?.audio_url) {
          import("@/lib/radioAudioManager").then((mod) => mod.playMyVibeTrack(firstTrack));
        }
      });
    }
  }, [ramActive, ramState.activeMode, ramState.isPlaying, ramState.lastTrack, currentTrack, togglePlay, startMyVibeQueue]);

  // Skip: delegate to RAM when RAM is active
  const handleSkip = useCallback(() => {
    if (ramActive && ramState.activeMode === "myVibeRadio") {
      // My Vibe Radio skip is handled via RadioContext's nextRadioSong
      skipTrack?.();
    } else if (!ramActive) {
      skipTrack?.();
    }
  }, [ramActive, ramState.activeMode, skipTrack]);

  const handlePrevAction = useCallback(() => {
    if (!ramActive) {
      if (sourceType !== "radio") {
        const a = audioRef.current;
        if (a && a.currentTime > 3) a.currentTime = 0;
      }
      handlePrev?.();
    }
  }, [ramActive, sourceType, handlePrev, audioRef]);

  const handleSeek = (val) => {
    const audio = audioRef.current;
    if (!audio.duration) return;
    const newTime = (val[0] / 100) * audio.duration;
    audio.currentTime        = newTime;
    localLastTimeRef.current = newTime;
    setProgress(val[0]);
    setCurrentSec(newTime);
  };

  const formatTime = (secs) => {
    if (!secs || isNaN(secs)) return "0:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // ── Always-rendered persistent player bar ──
  return (
    <div
      className="fixed left-0 right-0 lg:left-[72px] z-40 border-t border-border/30 player-bar"
      style={{
        background: "hsl(var(--card) / 0.98)",
        backdropFilter: "blur(40px)",
        WebkitBackdropFilter: "blur(40px)",
      }}
    >
      {displayTrack ? (
        <>
          {/* Seek bar (only for non-live tracks) */}
          {!isRamRadio && (
          <div
            className="relative h-[3px] w-full cursor-pointer group"
            style={{ background: "rgba(255,255,255,0.08)" }}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const pct = ((e.clientX - rect.left) / rect.width) * 100;
              handleSeek([pct]);
            }}
          >
            <div
              className="h-full"
              style={{
                width: `${progress}%`,
                background: `linear-gradient(90deg,
                  rgba(${TRI_COLORS.blue},0.5) 0%,
                  rgb(${TRI_COLORS.blue}) 25%,
                  rgba(${TRI_COLORS.gold},0.9) 45%,
                  rgb(${TRI_COLORS.gold}) 60%,
                  rgba(${TRI_COLORS.purple},0.8) 78%,
                  rgb(${TRI_COLORS.purple}) 92%,
                  rgb(${TRI_COLORS.purple}) 100%
                )`
              }}
            />
            <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            style={{
              left: `calc(${progress}% - 6px)`,
              background: "#00A0DC",
              boxShadow: "0 0 10px rgba(0,160,220,0.9), 0 0 20px rgba(0,160,220,0.5)"
            }}
            />
          </div>
          )}

          <div className="flex items-center gap-3 md:gap-5 px-4 py-3 md:px-6">
            {/* Track info */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {displayCover ? (
                <div className="relative flex-shrink-0">
                  <img
                    src={displayCover}
                    alt={displayTrack.title}
                    className="w-11 h-11 rounded-lg object-cover"
                    style={{ boxShadow: `0 0 16px rgba(${themeRgb},0.25)` }}
                  />
                  {effectiveIsPlaying && (
                    <div className="absolute inset-0 rounded-lg flex items-end justify-center pb-1 gap-0.5 bg-black/20">
                      {[1, 2, 3].map(i => (
                        <motion.div
                          key={i}
                          animate={{ height: ["2px", "8px", "2px"] }}
                          transition={{ duration: 0.5, repeat: isPageVisible ? Infinity : 0, delay: i * 0.12 }}
                          className="w-0.5 rounded-full"
                          style={{ background: themeHex }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div
                  className="w-11 h-11 rounded-lg flex-shrink-0 flex items-center justify-center"
                  style={displayTrack?._isHostDrop
                    ? { background: "rgba(168,85,247,0.12)", border: "1px solid rgba(168,85,247,0.25)" }
                    : { background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.15)" }}
                >
                  {displayTrack?._isHostDrop
                    ? <Mic2 className="w-4 h-4" style={{ color: "#A855F7" }} />
                    : <span className="text-cyan-400/60 text-xs">♪</span>}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate leading-tight">{displayTrack.title}</p>
                <p className="text-[11px] text-muted-foreground/70 truncate mt-0.5">
                  {displayTrack.artist_display || displayTrack.artist || "Upper Vibe Media"}
                </p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
              <button
                onClick={handlePrevAction}
                className="text-muted-foreground/40 hover:text-foreground/70 transition-colors flex"
                style={{ minWidth: "44px", minHeight: "44px", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <SkipBack className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleTogglePlay}
                className="w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95"
                style={{
                  background: `linear-gradient(135deg, rgba(${themeRgb},0.9), rgb(${themeRgb}))`,
                  boxShadow: `0 0 20px rgba(${themeRgb},0.45)`,
                  minWidth: "44px",
                  minHeight: "44px",
                  touchAction: "manipulation",
                }}
              >
                {effectiveIsPlaying
                  ? <Pause className="w-3.5 h-3.5 md:w-4 md:h-4 text-black" />
                  : <Play  className="w-3.5 h-3.5 md:w-4 md:h-4 text-black ml-0.5" />
                }
              </button>
              <button
                onClick={handleSkip}
                className="text-muted-foreground/40 hover:text-foreground/70 transition-colors flex"
                style={{ minWidth: "44px", minHeight: "44px", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <SkipForward className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Time + Volume + Close (desktop) */}
            <div className="hidden md:flex items-center gap-3 flex-1 justify-end">
              <span className="text-[11px] text-muted-foreground/60 tabular-nums">{formatTime(currentSec)}</span>
              <span className="text-[11px] text-muted-foreground/30">/</span>
              <span className="text-[11px] text-muted-foreground/60 tabular-nums">{formatTime(duration)}</span>

              <div className="w-px h-4 bg-border mx-1" />

              <button onClick={() => setMuted(!muted)} className="text-muted-foreground/50 hover:text-foreground/70 transition-colors">
                {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>
              <div className="w-20">
                <Slider
                  value={[muted ? 0 : volume]}
                  onValueChange={(v) => { setVolume(v[0]); setMuted(false); }}
                  max={100}
                  step={1}
                  className="cursor-pointer"
                />
              </div>

              <ShareVibeButton
                type={displayTrack?._isHostDrop ? "radio" : "song"}
                track={displayTrack}
                size="sm"
              />

              {!displayTrack?._isHostDrop && (
                <ThumbsDownButton track={displayTrack} user={user} size="sm" />
              )}

              <div className="w-px h-4 bg-border mx-1" />
              <button
                onClick={stopPlaying}
                className="text-muted-foreground/40 hover:text-foreground/60 transition-colors"
                title="Close player"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Mobile close */}
            <button onClick={stopPlaying} className="md:hidden text-muted-foreground/40 hover:text-foreground/60 transition-colors ml-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        </>
      ) : isRamRadio ? (
        /* ── Upper Vibe Live Radio playing ── */
        <div className="flex items-center gap-3 px-4 py-3 md:px-6">
          <div
            className="w-11 h-11 rounded-lg flex-shrink-0 flex items-center justify-center"
            style={{ background: "rgba(0,229,255,0.1)", border: "1px solid rgba(0,229,255,0.25)" }}
          >
            <Radio className="w-4 h-4" style={{ color: "rgba(0,229,255,0.7)" }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate leading-tight">Upper Vibe Live Radio</p>
            <p className="text-[11px] text-muted-foreground/70 truncate mt-0.5">Upper Vibe Media</p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleTogglePlay}
              className="w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95"
              style={{
                background: `linear-gradient(135deg, rgba(${themeRgb},0.9), rgb(${themeRgb}))`,
                boxShadow: `0 0 20px rgba(${themeRgb},0.45)`,
                minWidth: "44px",
                minHeight: "44px",
                touchAction: "manipulation",
              }}
            >
              {effectiveIsPlaying
                ? <Pause className="w-3.5 h-3.5 md:w-4 md:h-4 text-black" />
                : <Play  className="w-3.5 h-3.5 md:w-4 md:h-4 text-black ml-0.5" />
              }
            </button>
          </div>
        </div>
      ) : (
        /* ── Fallback: show My Vibe last track or placeholder instead of "No Music Playing" ── */
        <div className="flex items-center gap-3 px-4 py-3 md:px-6">
          <div
            className="w-11 h-11 rounded-lg flex-shrink-0 flex items-center justify-center"
            style={{ background: "rgba(0,229,255,0.1)", border: "1px solid rgba(0,229,255,0.2)" }}
          >
            <Music4 className="w-4 h-4" style={{ color: "rgba(0,229,255,0.5)" }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground/45 truncate leading-tight">Loading current song</p>
            <p className="text-[11px] text-muted-foreground/50 truncate mt-0.5">Finding the hero track...</p>
          </div>

          <button
            onClick={handleIdlePlay}
            className="w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 flex-shrink-0"
            style={{
              background: `linear-gradient(135deg, rgba(${themeRgb},0.9), rgb(${themeRgb}))`,
              boxShadow: `0 0 20px rgba(${themeRgb},0.45)`,
              minWidth: "44px",
              minHeight: "44px",
              touchAction: "manipulation",
            }}
            aria-label="Start playing music"
          >
            <Play className="w-3.5 h-3.5 md:w-4 md:h-4 text-black ml-0.5" />
          </button>
        </div>
      )}
    </div>
  );
}