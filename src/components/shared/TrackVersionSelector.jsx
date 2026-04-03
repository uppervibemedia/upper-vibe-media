import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Lock, Download, Waves, Music, Crown, Sparkles } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { usePlayer } from "../../context/PlayerContext";
import DownloadButton from "./DownloadButton";

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

const EXCLUSIVE_FREQ = ["432hz", "528hz", "binaural", "remastered"];

function canAccess(version, userTier) {
  const tiers = version.tier_access || ["free"];
  if (tiers.includes("free")) return true;
  if (userTier === "premium") return true;
  if (userTier === "supporter" && tiers.includes("supporter")) return true;
  return false;
}

export default function TrackVersionSelector({ track, userTier = "free", userEmail, onUpgrade }) {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeVersion, setActiveVersion] = useState(null);
  const { playTrack, currentTrack, isPlaying, togglePlay } = usePlayer();

  useEffect(() => {
    if (!track?.id) return;
    base44.entities.TrackVersion.filter({ track_id: track.id, is_active: true }, "display_order", 20)
      .then((v) => {
        setVersions(v);
        // Default to first accessible version
        const accessible = v.find((ver) => canAccess(ver, userTier));
        setActiveVersion(accessible || v[0] || null);
        setLoading(false);
      });
  }, [track?.id, userTier]);

  if (loading) return null;

  // No versions defined — fall back silently (main track audio used elsewhere)
  if (versions.length === 0) return null;

  const handleVersionClick = (version) => {
    if (!canAccess(version, userTier)) {
      onUpgrade?.(track, version);
      return;
    }
    setActiveVersion(version);
    const versionTrack = { ...track, audio_url: version.audio_url, title: `${track.title} (${version.version_name})` };
    if (currentTrack?.id === track.id && activeVersion?.id === version.id) {
      togglePlay();
    } else {
      playTrack(versionTrack);
    }
  };

  const handlePlay = () => {
    if (!activeVersion) return;
    if (!canAccess(activeVersion, userTier)) {
      onUpgrade?.(track, activeVersion);
      return;
    }
    const versionTrack = { ...track, audio_url: activeVersion.audio_url, title: `${track.title} (${activeVersion.version_name})` };
    playTrack(versionTrack);
  };

  return (
    <div className="mt-4">
      <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground mb-2">
        Available Versions
      </p>
      <div className="space-y-2">
        <AnimatePresence>
          {versions.map((version, i) => {
            const accessible = canAccess(version, userTier);
            const isSelected = activeVersion?.id === version.id;
            const Icon = FREQ_ICONS[version.frequency_type] || Music;
            const isExclusive = EXCLUSIVE_FREQ.includes(version.frequency_type);
            const tierLabel = version.tier_access?.includes("free") ? null
              : version.tier_access?.includes("supporter") ? "Supporter+"
              : "Premium";

            return (
              <motion.div
                key={version.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => handleVersionClick(version)}
                className={`group relative flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? "bg-primary/10 border-primary/40"
                    : accessible
                    ? "bg-card/30 border-border/20 hover:border-border/50 hover:bg-card/50"
                    : "bg-muted/10 border-border/10 opacity-70"
                }`}
              >
                {/* Icon */}
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  isSelected ? "bg-primary/20" : "bg-muted/30"
                }`}>
                  <Icon className={`w-4 h-4 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-sm font-semibold ${isSelected ? "text-primary" : "text-foreground"}`}>
                      {version.version_name}
                    </span>
                    {isExclusive && (
                      <span className="text-[9px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded-full border border-secondary/30 bg-secondary/10 text-secondary">
                        Exclusive
                      </span>
                    )}
                    {tierLabel && (
                      <span className="text-[9px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded-full border border-primary/20 bg-primary/5 text-primary flex items-center gap-0.5">
                        <Crown className="w-2.5 h-2.5" />
                        {tierLabel}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground">{FREQ_LABELS[version.frequency_type] || version.frequency_type}</p>
                </div>

                {/* Right side: lock or play/download */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {!accessible ? (
                    <div className="w-7 h-7 rounded-full bg-muted/30 flex items-center justify-center">
                      <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                  ) : (
                    <>
                      {isSelected && (
                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                      )}
                      {version.is_downloadable && (
                        <div onClick={(e) => e.stopPropagation()}>
                          <DownloadButton
                            item={{ ...track, audio_url: version.audio_url, title: `${track.title} - ${version.version_name}` }}
                            contentType="track"
                            userTier={userTier}
                            userEmail={userEmail}
                            onUpgrade={() => onUpgrade?.(track, version)}
                            size="sm"
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}