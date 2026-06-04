import React from "react";
import { motion } from "framer-motion";
import { Play, Lock, Waves } from "lucide-react";
import { usePlayer } from "../../context/PlayerContext";
import { getAccessBadge, getEffectiveAccess } from "@/lib/tierAccess";
import DownloadButton from "./DownloadButton";
import TrackVersionSelector from "./TrackVersionSelector";
import { useTrackVersions, pickBestVersion, getVersionBadge } from "@/hooks/useTrackVersions";
import { isNewTrack } from "@/lib/isNewTrack";

export default function TrackCard({ track, locked, onLockedClick, userTier = "free", userEmail, onUpgrade, showVersions = false }) {
  const { playTrack, currentTrack, isPlaying, togglePlay } = usePlayer();
  const isCurrentTrack = currentTrack?.id === track.id;

  // Always call hook (rules of hooks), but only use data when showVersions=true
  const { versions: allVersions, loading: versionsLoading, bestVersion, badge: versionBadge } = useTrackVersions(
    showVersions ? track.id : null,
    userTier
  );
  const versions = showVersions ? allVersions : [];
  const hasVersions = versions.length > 0;

  // Determine locked state
  const effectiveAccess = getEffectiveAccess(track);
  const isFree = effectiveAccess.includes("free");
  const isLocked = locked !== undefined ? locked : !isFree;

  // Legacy badge fallback
  const legacyBadge = !isFree ? getAccessBadge(track) : null;

  const handlePlay = (e) => {
    if (hasVersions) return; // versions selector handles playback
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

  // When clicking the cover on a versioned track, play best accessible version
  const handleCoverPlay = () => {
    if (hasVersions && bestVersion) {
      const versionTrack = { ...track, audio_url: bestVersion.audio_url };
      if (isCurrentTrack) {
        togglePlay();
      } else {
        playTrack(versionTrack);
      }
      return;
    }
    handlePlay();
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -4 }}
      transition={{ type: "spring", damping: 20 }}
      className="group relative rounded-xl overflow-hidden bg-card/60 border border-border/30 hover:border-primary/30 transition-all cursor-pointer"
      onClick={handleCoverPlay}
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
          {isLocked && !hasVersions ? (
            <div className="w-12 h-12 rounded-full bg-muted/80 backdrop-blur-md flex items-center justify-center">
              <Lock className="w-5 h-5 text-muted-foreground" />
            </div>
          ) : (
            <div className="w-12 h-12 rounded-full bg-primary/80 backdrop-blur-md flex items-center justify-center glow-blue">
              <Play className="w-5 h-5 text-primary-foreground ml-0.5" />
            </div>
          )}
        </div>

        {/* NEW badge — auto-shown for tracks uploaded within 7 days */}
        {isNewTrack(track) && (
          <div className="absolute top-2 left-2">
            <span className="px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider"
              style={{ background: "linear-gradient(135deg,rgba(212,168,67,0.9),rgba(240,180,50,0.95))", color: "#000", boxShadow: "0 0 8px rgba(212,168,67,0.4)" }}>
              NEW
            </span>
          </div>
        )}

        {/* Version badge (dynamic, tier-aware) or legacy badge */}
        {hasVersions && versionBadge ? (
          <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border backdrop-blur-md ${versionBadge.color}`}>
            {versionBadge.isExclusive && <Waves className="w-2.5 h-2.5 inline mr-1" />}
            {versionBadge.label}
          </div>
        ) : legacyBadge ? (
          <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase border ${legacyBadge.color} backdrop-blur-md`}>
            {legacyBadge.label}
          </div>
        ) : null}

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
      <div className="p-3" onClick={(e) => hasVersions && e.stopPropagation()}>
        <div className="flex items-start justify-between gap-1">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{track.title}</p>
            <p className="text-xs text-muted-foreground truncate mt-0.5">{track.artist_display || track.artist}</p>
            {track.duration && (
              <p className="text-[10px] text-muted-foreground/60 mt-1">{track.duration}</p>
            )}
          </div>
          {!hasVersions && track.is_downloadable && (
            <div className="flex-shrink-0 mt-0.5">
              <DownloadButton
                item={track}
                contentType="track"
                userTier={userTier}
                userEmail={userEmail}
                onUpgrade={() => onUpgrade?.(track)}
                size="sm"
              />
            </div>
          )}
        </div>

        {/* Version selector — shown when showVersions=true and versions exist */}
        {showVersions && !versionsLoading && hasVersions && (
          <TrackVersionSelector
            track={track}
            versions={versions}
            userTier={userTier}
            userEmail={userEmail}
            onUpgrade={(t, v) => onLockedClick?.(t)}
          />
        )}
      </div>
    </motion.div>
  );
}