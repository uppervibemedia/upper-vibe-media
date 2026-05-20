import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, X } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { usePlayer, sharedHiddenRef } from "../../context/PlayerContext";

export default function AudioPlayer() {
  const { currentTrack, isPlaying, togglePlay, stopPlaying, audioRef, handleNext, handlePrev } = usePlayer();
  const [progress,   setProgress]   = useState(0);
  const [duration,   setDuration]   = useState(0);
  const [currentSec, setCurrentSec] = useState(0);
  const [volume,     setVolume]     = useState(80);
  const [muted,      setMuted]      = useState(false);

  useEffect(() => {
    const audio = audioRef.current;

    const onTimeUpdate = () => {
      // Freeze progress bar when page is hidden (sharedHiddenRef set by PlayerContext)
      if (sharedHiddenRef.current || audio.paused) return;
      const pct = (audio.currentTime / audio.duration) * 100 || 0;
      setProgress(pct);
      setCurrentSec(audio.currentTime);
    };

    const onLoadedMetadata = () => setDuration(audio.duration);

    // Snap progress when play resumes (so bar reflects real position after restore)
    const onPlay = () => {
      const pct = (audio.currentTime / audio.duration) * 100 || 0;
      setProgress(pct);
      setCurrentSec(audio.currentTime);
    };

    audio.addEventListener("timeupdate",     onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("play",           onPlay);

    return () => {
      audio.removeEventListener("timeupdate",     onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("play",           onPlay);
    };
  }, [audioRef]);

  useEffect(() => {
    audioRef.current.volume = muted ? 0 : volume / 100;
  }, [volume, muted, audioRef]);

  const handleSeek = (val) => {
    const audio = audioRef.current;
    if (!audio.duration) return;
    audio.currentTime = (val[0] / 100) * audio.duration;
    setProgress(val[0]);
    setCurrentSec(audio.currentTime);
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
                  style={{ background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.15)" }}
                >
                  <span className="text-cyan-400/60 text-xs">♪</span>
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