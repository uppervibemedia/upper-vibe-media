import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, X, Mic2, Music4 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ShareVibeButton from "../shared/ShareVibeButton";
import ThumbsDownButton from "../shared/ThumbsDownButton";
import { Slider } from "@/components/ui/slider";
import { usePlayer, sharedHiddenRef } from "../../context/PlayerContext";
import { useTheme } from "../../context/ThemeContext";
import { RADIO_THEMES } from "../radio/RadioThemePicker";
import usePageVisible from "@/hooks/usePageVisible";
import { useAuth } from "@/lib/AuthContext";

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

  const { user } = useAuth();
  const { accentId } = useTheme();
  const theme = RADIO_THEMES[accentId] || RADIO_THEMES.cyan;
  const themeRgb = theme.vars["--rt-primary"];
  const themeHex = theme.swatch;

  // The two colors NOT currently selected lead the tip of the progress bar
  const allThree = [
    { id: "amber",  rgb: "245,158,11",  hex: "#F59E0B" },
    { id: "violet", rgb: "168,85,247",  hex: "#A855F7" },
    { id: "cyan",   rgb: "0,160,220",   hex: "#00A0DC" },
  ];
  const others = allThree.filter(c => c.id !== accentId);

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

  const handleIdlePlay = () => {
    if (queue?.length > 0 && queue[0]?.audio_url) {
      playTrack(queue[0], "song", 0);
    } else {
      navigate("/start");
    }
  };

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
      {currentTrack ? (
        <>
          {/* Seek bar */}
          <div
            className="relative h-[3px] w-full cursor-pointer group"
            style={{ background: `rgba(${themeRgb}, 0.18)` }}
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
                  rgba(${themeRgb},0.5) 0%,
                  rgb(${themeRgb}) 60%,
                  ${others[0].hex} 78%,
                  ${others[0].hex} 88%,
                  ${others[1].hex} 92%,
                  ${others[1].hex} 100%
                )`
              }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              style={{
                left: `calc(${progress}% - 6px)`,
                background: themeHex,
                boxShadow: `0 0 10px rgba(${themeRgb},0.9), 0 0 20px rgba(${themeRgb},0.5)`
              }}
            />
          </div>

          <div className="flex items-center gap-3 md:gap-5 px-4 py-3 md:px-6">
            {/* Track info */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {currentTrack.cover_url ? (
                <div className="relative flex-shrink-0">
                  <img
                    src={currentTrack.cover_url}
                    alt={currentTrack.title}
                    className="w-11 h-11 rounded-lg object-cover"
                    style={{ boxShadow: `0 0 16px rgba(${themeRgb},0.25)` }}
                  />
                  {isPlaying && (
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
                  style={currentTrack?._isHostDrop
                    ? { background: "rgba(168,85,247,0.12)", border: "1px solid rgba(168,85,247,0.25)" }
                    : { background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.15)" }}
                >
                  {currentTrack?._isHostDrop
                    ? <Mic2 className="w-4 h-4" style={{ color: "#A855F7" }} />
                    : <span className="text-cyan-400/60 text-xs">♪</span>}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate leading-tight">{currentTrack.title}</p>
                <p className="text-[11px] text-muted-foreground/70 truncate mt-0.5">
                  {currentTrack.artist_display || currentTrack.artist || "Upper Vibe Media"}
                </p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
              <button
                onClick={() => {
                  handlePrev();
                  if (sourceType !== "radio") {
                    const a = audioRef.current;
                    if (a && a.currentTime > 3) a.currentTime = 0;
                  }
                }}
                className="text-muted-foreground/40 hover:text-foreground/70 transition-colors flex"
                style={{ minWidth: "44px", minHeight: "44px", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <SkipBack className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={togglePlay}
                className="w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95"
                style={{
                  background: `linear-gradient(135deg, rgba(${themeRgb},0.9), rgb(${themeRgb}))`,
                  boxShadow: `0 0 20px rgba(${themeRgb},0.45)`,
                  minWidth: "44px",
                  minHeight: "44px",
                  touchAction: "manipulation",
                }}
              >
                {isPlaying
                  ? <Pause className="w-3.5 h-3.5 md:w-4 md:h-4 text-black" />
                  : <Play  className="w-3.5 h-3.5 md:w-4 md:h-4 text-black ml-0.5" />
                }
              </button>
              <button
                onClick={() => { skipTrack?.(); }}
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
                type={currentTrack?._isHostDrop ? "radio" : "song"}
                track={currentTrack}
                size="sm"
              />

              {!currentTrack?._isHostDrop && (
                <ThumbsDownButton track={currentTrack} user={user} size="sm" />
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
      ) : (
        /* ── Idle state: compact bar when no track is loaded ── */
        <div className="flex items-center gap-3 px-4 py-3 md:px-6">
          <div
            className="w-11 h-11 rounded-lg flex-shrink-0 flex items-center justify-center"
            style={{ background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.15)" }}
          >
            <Music4 className="w-4 h-4" style={{ color: "rgba(0,229,255,0.45)" }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground/45 truncate leading-tight">Choose Music</p>
            <p className="text-[11px] text-muted-foreground/50 truncate mt-0.5">Upper Vibe Media</p>
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