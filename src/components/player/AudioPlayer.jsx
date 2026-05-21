import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, X, Mic2 } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { usePlayer, sharedHiddenRef } from "../../context/PlayerContext";

export default function AudioPlayer() {
  const {
    currentTrack,
    isPlaying,
    togglePlay,
    stopPlaying,
    audioRef,
    handleNext,
    handlePrev,
    lastTimeRef,
  } = usePlayer();

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
      // ── Strict progress guard ─────────────────────────────────────────
      // Only advance the bar if the audio is truly playing forward.
      // Conditions that must ALL be true:
      //   1. Page is visible (sharedHiddenRef.current === false)
      //   2. Audio is not paused
      //   3. Audio has enough data (readyState >= 2 = HAVE_CURRENT_DATA)
      //   4. currentTime is actually moving forward (not stuck, not replaying)
      if (sharedHiddenRef.current) return;
      if (audio.paused)            return;
      if (audio.readyState < 2)    return;

      const ct = audio.currentTime;
      // If time hasn't moved forward — freeze (handles iOS buffering stalls)
      if (ct <= localLastTimeRef.current && localLastTimeRef.current > 0) return;

      localLastTimeRef.current = ct;
      if (lastTimeRef) lastTimeRef.current = ct; // keep PlayerContext in sync

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

    audio.addEventListener("timeupdate",     onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("play",           onPlay);
    audio.addEventListener("pause",          onPause);
    audio.addEventListener("emptied",        onEmptied);

    return () => {
      audio.removeEventListener("timeupdate",     onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("play",           onPlay);
      audio.removeEventListener("pause",          onPause);
      audio.removeEventListener("emptied",        onEmptied);
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

  return (
    <AnimatePresence>
      {currentTrack && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 200 }}
          className="fixed bottom-0 left-0 right-0 lg:left-[72px] z-40 border-t border-white/[0.06]"
          style={{
            background: "linear-gradient(180deg,rgba(6,6,18,0.97),rgba(4,4,12,0.99))",
            backdropFilter: "blur(40px)",
            paddingBottom: "env(safe-area-inset-bottom, 0px)",
          }}
        >
          {/* Seek bar */}
          <div
            className="relative h-[3px] w-full bg-white/5 cursor-pointer group"
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
                background: "linear-gradient(90deg,#00B8D4,#00E5FF,#D4A843)"
              }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-lg shadow-cyan-400/50 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ left: `calc(${progress}% - 5px)` }}
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
                    className="w-10 h-10 rounded-lg object-cover"
                    style={{ boxShadow: "0 0 16px rgba(0,229,255,0.2)" }}
                  />
                  {isPlaying && (
                    <div className="absolute inset-0 rounded-lg flex items-end justify-center pb-1 gap-0.5 bg-black/20">
                      {[1, 2, 3].map(i => (
                        <motion.div
                          key={i}
                          animate={{ height: ["2px", "8px", "2px"] }}
                          transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.12 }}
                          className="w-0.5 bg-cyan-400 rounded-full"
                        />
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div
                  className="w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center"
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
                <p className="text-sm font-semibold text-white/90 truncate leading-tight">{currentTrack.title}</p>
                <p className="text-[11px] text-white/35 truncate mt-0.5">
                  {currentTrack.artist_display || currentTrack.artist || "Upper Vibe Media"}
                </p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
              <button onClick={handlePrev} className="text-white/25 hover:text-white/60 transition-colors hidden md:flex">
                <SkipBack className="w-4 h-4" />
              </button>
              <button
                onClick={togglePlay}
                className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-105"
                style={{
                  background: "linear-gradient(135deg,#00B8D4,#00E5FF)",
                  boxShadow: "0 0 20px rgba(0,229,255,0.35)"
                }}
              >
                {isPlaying
                  ? <Pause className="w-4 h-4 text-black" />
                  : <Play  className="w-4 h-4 text-black ml-0.5" />
                }
              </button>
              <button onClick={handleNext} className="text-white/25 hover:text-white/60 transition-colors hidden md:flex">
                <SkipForward className="w-4 h-4" />
              </button>
            </div>

            {/* Time + Volume + Close (desktop) */}
            <div className="hidden md:flex items-center gap-3 flex-1 justify-end">
              <span className="text-[11px] text-white/30 tabular-nums">{formatTime(currentSec)}</span>
              <span className="text-[11px] text-white/20">/</span>
              <span className="text-[11px] text-white/30 tabular-nums">{formatTime(duration)}</span>

              <div className="w-px h-4 bg-white/10 mx-1" />

              <button onClick={() => setMuted(!muted)} className="text-white/30 hover:text-white/60 transition-colors">
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

              <div className="w-px h-4 bg-white/10 mx-1" />
              <button
                onClick={stopPlaying}
                className="text-white/20 hover:text-white/50 transition-colors"
                title="Close player"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Mobile close */}
            <button onClick={stopPlaying} className="md:hidden text-white/20 hover:text-white/50 transition-colors ml-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}