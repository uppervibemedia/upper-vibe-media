import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Lock, Waves, Music, Crown, Sparkles, CheckCircle2 } from "lucide-react";
import { usePlayer } from "../../context/PlayerContext";
import DownloadButton from "./DownloadButton";
import { canAccessVersion, pickBestVersion, getVersionBadge } from "@/hooks/useTrackVersions";

const FREQ_ICONS = {
  "432hz": Waves,
  "528hz": Waves,
  binaural: Waves,
  remastered: Sparkles,
  standard: Music,
  other: Music,
};

const FREQ_LABELS = {
  standard: "Standard",
  "432hz": "432 Hz",
  "528hz": "528 Hz",
  binaural: "Binaural",
  remastered: "Remastered",
  other: "Other",
};

export default function TrackVersionSelector({ track, versions, userTier = "free", userEmail, onUpgrade }) {
  const [activeVersion, setActiveVersion] = useState(null);
  const { playTrack, currentTrack, isPlaying } = usePlayer();

  // Set best default on mount / tier change
  useEffect(() => {
    const best = pickBestVersion(versions, userTier);
    setActiveVersion(best);
  }, [versions, userTier]);

  if (!versions || versions.length === 0) return null;

  const handleVersionClick = (version) => {
    if (!canAccessVersion(version, userTier)) {
      onUpgrade?.(track, version);
      return;
    }
    setActiveVersion(version);
    const versionTrack = {
      ...track,
      audio_url: version.audio_url,
      _versionLabel: version.version_name,
    };
    playTrack(versionTrack);
  };

  const isCurrentlyPlaying = currentTrack?.id === track.id && isPlaying;

  return (
    <div className="mt-3 space-y-1.5" onClick={(e) => e.stopPropagation()}>
      <p className="text-[9px] font-bold tracking-[0.2em] uppercase text-muted-foreground/60 mb-1.5">
        Versions
      </p>
      {versions.map((version, i) => {
        const accessible = canAccessVersion(version, userTier);
        const isSelected = activeVersion?.id === version.id;
        const isPlaying_ = isSelected && isCurrentlyPlaying;
        const Icon = FREQ_ICONS[version.frequency_type] || Music;
        const tiers = version.tier_access || ["free"];
        const isExclusive = !tiers.includes("free");
        const tierLabel = tiers.includes("free") ? null
          : tiers.includes("supporter") ? "Supporter+"
          : "Premium";

        return (
          <motion.div
            key={version.id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            onClick={() => handleVersionClick(version)}
            className={`relative flex items-center gap-2.5 px-3 py-2.5 rounded-xl border cursor-pointer transition-all ${
              isSelected && accessible
                ? "bg-primary/10 border-primary/40"
                : accessible
                ? "bg-card/20 border-border/20 hover:border-border/50 hover:bg-card/40"
                : "bg-muted/5 border-border/10 cursor-pointer"
            }`}
          >
            {/* Icon */}
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
              isSelected && accessible ? "bg-primary/20" : "bg-muted/20"
            }`}>
              {accessible
                ? <Icon className={`w-3.5 h-3.5 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                : <Lock className="w-3 h-3 text-muted-foreground/60" />
              }
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className={`text-xs font-semibold leading-tight ${
                  isSelected && accessible ? "text-primary" : accessible ? "text-foreground" : "text-muted-foreground"
                }`}>
                  {version.version_name}
                </span>
                {isExclusive && accessible && (
                  <span className="text-[8px] font-bold tracking-widest uppercase px-1 py-0.5 rounded border border-primary/30 bg-primary/5 text-primary">
                    {FREQ_LABELS[version.frequency_type] || "Exclusive"}
                  </span>
                )}
                {!accessible && tierLabel && (
                  <span className="text-[8px] font-bold tracking-widest uppercase px-1 py-0.5 rounded border border-muted/30 bg-muted/10 text-muted-foreground flex items-center gap-0.5">
                    <Crown className="w-2 h-2" /> {tierLabel}
                  </span>
                )}
              </div>
              {!accessible && (
                <p className="text-[9px] text-muted-foreground/50 mt-0.5">Upgrade to unlock</p>
              )}
            </div>

            {/* Right indicators */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {isPlaying_ && (
                <div className="flex gap-0.5 items-end h-3">
                  {[1,2,3].map(j => (
                    <motion.div
                      key={j}
                      animate={{ height: ["2px", "10px", "2px"] }}
                      transition={{ duration: 0.5, repeat: Infinity, delay: j * 0.12 }}
                      className="w-0.5 bg-primary rounded-full"
                    />
                  ))}
                </div>
              )}
              {isSelected && accessible && !isPlaying_ && (
                <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
              )}
              {version.is_downloadable && accessible && (
                <div onClick={(e) => e.stopPropagation()}>
                  <DownloadButton
                    item={{ ...track, audio_url: version.audio_url, title: `${track.title} — ${version.version_name}` }}
                    contentType="track"
                    userTier={userTier}
                    userEmail={userEmail}
                    onUpgrade={() => onUpgrade?.(track, version)}
                    size="sm"
                  />
                </div>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}