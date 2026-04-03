import React from "react";
import { motion } from "framer-motion";
import { Play, Lock, Crown } from "lucide-react";
import { usePlayer } from "../../context/PlayerContext";
import { getAccessBadge, getEffectiveAccess } from "@/lib/tierAccess";

export default function TrackCard({ track, locked, onLockedClick }) {
  const { playTrack, currentTrack, isPlaying, togglePlay } = usePlayer();
  const isCurrentTrack = currentTrack?.id === track.id;
  const effectiveAccess = getEffectiveAccess(track);
  const isFree = effectiveAccess.includes("free");
  // Use prop-based locked override, or derive from access
  const isLocked = locked !== undefined ? locked : !isFree;

  const handlePlay = () => {
    if (isLocked) {
      onLockedClick?.(track);
      return;
    }
    if (isCurrentTrack) {
      togglePlay();
    } else {
      playTrack(track);
    }
  };

  const badge = !isFree ? getAccessBadge(track) : null;

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -4 }}
      transition={{ type: "spring", damping: 20 }}
      className="group relative rounded-xl overflow-hidden bg-card/60 border border-border/30 hover:border-primary/30 transition-all cursor-pointer"
      onClick={handlePlay}
    >
      {/* Cover art */}
      <div className="relative aspect-square overflow-hidden">
        <img
          src={track.cover_url || ""}
          alt={track.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent" />

        {/* Play button overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          {isLocked ? (
            <div className="w-12 h-12 rounded-full bg-muted/80 backdrop-blur-md flex items-center justify-center">
              <Lock className="w-5 h-5 text-muted-foreground" />
            </div>
          ) : (
            <div className="w-12 h-12 rounded-full bg-primary/80 backdrop-blur-md flex items-center justify-center glow-blue">
              <Play className="w-5 h-5 text-primary-foreground ml-0.5" />
            </div>
          )}
        </div>

        {/* Tier badge */}
        {badge && (
          <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase border ${badge.color} backdrop-blur-md`}>
            {badge.label}
          </div>
        )}


        {/* Now playing indicator */}
        {isCurrentTrack && isPlaying && (
          <div className="absolute bottom-2 left-2 flex gap-0.5 items-end h-4">
            {[1,2,3].map(i => (
              <motion.div
                key={i}
                animate={{ height: ["4px", "16px", "4px"] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                className="w-1 bg-primary rounded-full"
              />
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-sm font-medium text-foreground truncate">{track.title}</p>
        <p className="text-xs text-muted-foreground truncate mt-0.5">{track.artist}</p>
        {track.duration && (
          <p className="text-[10px] text-muted-foreground/60 mt-1">{track.duration}</p>
        )}
      </div>
    </motion.div>
  );
}