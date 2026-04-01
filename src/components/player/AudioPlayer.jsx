import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Maximize2 } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { usePlayer } from "../../context/PlayerContext";

export default function AudioPlayer() {
  const { currentTrack, isPlaying, togglePlay } = usePlayer();
  const [progress, setProgress] = useState(35);
  const [volume, setVolume] = useState(75);
  const [muted, setMuted] = useState(false);

  if (!currentTrack) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-0 left-0 right-0 lg:left-[72px] z-40 glass border-t border-primary/10"
      >
        {/* Progress bar on top */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-muted/30">
          <div
            className="h-full bg-gradient-to-r from-primary to-secondary transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex items-center gap-4 px-4 py-3 md:px-6">
          {/* Track info */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {currentTrack.cover_url && (
              <img
                src={currentTrack.cover_url}
                alt={currentTrack.title}
                className="w-10 h-10 md:w-12 md:h-12 rounded-md object-cover glow-blue"
              />
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{currentTrack.title}</p>
              <p className="text-xs text-muted-foreground truncate">{currentTrack.artist}</p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 md:gap-4">
            <button className="text-muted-foreground hover:text-foreground transition-colors hidden md:block">
              <SkipBack className="w-4 h-4" />
            </button>
            <button
              onClick={togglePlay}
              className="w-10 h-10 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-primary hover:bg-primary/20 transition-all"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>
            <button className="text-muted-foreground hover:text-foreground transition-colors hidden md:block">
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          {/* Time & volume */}
          <div className="hidden md:flex items-center gap-3 flex-1 justify-end">
            <span className="text-xs text-muted-foreground">1:23</span>
            <div className="w-24">
              <Slider
                value={[progress]}
                onValueChange={(v) => setProgress(v[0])}
                max={100}
                step={1}
                className="cursor-pointer"
              />
            </div>
            <span className="text-xs text-muted-foreground">{currentTrack.duration || "3:45"}</span>
            <button onClick={() => setMuted(!muted)} className="text-muted-foreground hover:text-foreground ml-2">
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <div className="w-16">
              <Slider
                value={[muted ? 0 : volume]}
                onValueChange={(v) => { setVolume(v[0]); setMuted(false); }}
                max={100}
                step={1}
                className="cursor-pointer"
              />
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}