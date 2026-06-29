import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Play, Pause, Music2, Waves } from "lucide-react";
import FreqBadge from "@/components/shared/FreqBadge";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { getPublishedTracks } from "@/lib/trackCache";
import { optimizedImageUrl } from "@/lib/imageUtils";
import { useTheme } from "@/context/ThemeContext";
import { RADIO_THEMES } from "../radio/RadioThemePicker";
import {
  subscribe as ramSubscribe,
  getState as ramGetState,
  playMyVibeTrack,
  pauseMyVibe,
  resumeMyVibe,
} from "@/lib/radioAudioManager";
import { useRadio } from "@/context/RadioContext";
import { usePlayer } from "@/context/PlayerContext";

// The default featured track title — used as fallback when no admin override is set
const DEFAULT_FEATURED_TITLE = "Fourth Dimension Hustler";
const DEFAULT_FEATURED_ARTIST = "Montae DeVine";

// Music bars — always animate (shows motion even before play)
function MusicBars({ color = "#00A0DC", active = false }) {
  return (
    <>
      <style>{`
        @keyframes uvBar1 { 0%,100% { height: 4px } 50% { height: 14px } }
        @keyframes uvBar2 { 0%,100% { height: 10px } 50% { height: 4px } }
        @keyframes uvBar3 { 0%,100% { height: 6px } 50% { height: 13px } }
        @keyframes uvBar4 { 0%,100% { height: 12px } 50% { height: 5px } }
      `}</style>
      <span style={{ display: "inline-flex", alignItems: "flex-end", gap: "3px", height: "18px" }}>
        {[
          { anim: "uvBar1", delay: "0s" },
          { anim: "uvBar2", delay: "0.18s" },
          { anim: "uvBar3", delay: "0.09s" },
          { anim: "uvBar4", delay: "0.27s" },
        ].map(({ anim, delay }, i) => (
          <span
            key={i}
            style={{
              display: "inline-block",
              width: "3px",
              borderRadius: "2px",
              background: color,
              height: "6px",
              animation: `${anim} ${active ? "0.65s" : "1.8s"} ease-in-out infinite`,
              animationDelay: delay,
              opacity: active ? 1 : 0.45,
            }}
          />
        ))}
      </span>
    </>
  );
}

export default function FeaturedTrackPlayer({ onTrackLoaded }) {
  const [track, setTrack] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ramState, setRamState] = useState(() => ramGetState());
  const { startMyVibeQueue } = useRadio();
  const { currentTrack: playerTrack, isPlaying: playerIsPlaying, togglePlay } = usePlayer();

  const { accentId } = useTheme();
  const radioTheme = RADIO_THEMES[accentId] || RADIO_THEMES.cyan;
  const rtPrimary = radioTheme.vars["--rt-primary"];
  const rtPrimaryDark = radioTheme.vars["--rt-primary-dark"];
  const primaryColor = `rgb(${rtPrimary})`;
  const primaryRgba = (a) => `rgba(${rtPrimary},${a})`;

  // Subscribe to RAM so play/pause state stays in sync with all other surfaces
  useEffect(() => ramSubscribe((next) => {
    setRamState((prev) => (
      prev.activeMode === next.activeMode &&
      prev.audioType === next.audioType &&
      prev.isPlaying === next.isPlaying &&
      prev.currentTrack?.id === next.currentTrack?.id
    ) ? prev : next);
  }), []);

  useEffect(() => {
    async function loadTrack() {
      try {
        const [settingRows, recent] = await Promise.all([
          base44.entities.AppSettings.filter({ key: "start_featured_track_id" }),
          getPublishedTracks("-created_date", 200),
        ]);

        const featuredId = settingRows?.[0]?.value;

        if (featuredId) {
          const found = recent.find((t) => t.id === featuredId && t.audio_url);
          if (found) { setTrack(found); onTrackLoaded?.(found); setLoading(false); return; }
        }

        const byTitle = recent.find((t) => t.audio_url && t.title?.toLowerCase().includes("fourth dimension hustler"));
        if (byTitle) { setTrack(byTitle); onTrackLoaded?.(byTitle); setLoading(false); return; }

        const withAudio = recent.find((t) => t.audio_url);
        if (withAudio) { setTrack(withAudio); onTrackLoaded?.(withAudio); }
      } catch {}
      setLoading(false);
    }
    loadTrack();
  }, []);

  // ── Derive effective display state from all three sources ─────────────
  // Priority: RAM (myVibeRadio/upperVibeRadio) > PlayerContext > featured track
  const ramActive = ramState.activeMode !== null;
  const isRamRadio = ramActive && ramState.audioType === "liveStream";

  // Display track: the currently-playing track from any source
  const displayTrack = ramActive ? ramState.currentTrack : (playerIsPlaying && playerTrack ? playerTrack : null);
  // Fall back to the loaded featured track when nothing is playing
  const effectiveTrack = displayTrack || track;

  // Whether "now playing" is actually happening
  const effectivePlaying = ramActive ? ramState.isPlaying : playerIsPlaying;

  // True when the user's previous playback is using the exact same track as the default loaded track.
  // We still show the playing state — just use the actively playing track's metadata.
  const showPlaying = effectivePlaying && !!effectiveTrack;

  const handlePlay = () => {
    if (!track?.audio_url && !playerTrack?.audio_url) return;

    // RAM is active — toggle RAM playback
    if (ramActive) {
      if (ramState.activeMode === "upperVibeRadio") {
        import("@/lib/radioAudioManager").then((mod) => {
          if (ramState.isPlaying) mod.pauseUpperVibeRadio();
          else mod.resumeUpperVibeRadio();
        });
        return;
      }
      // myVibeRadio
      if (ramState.isPlaying) pauseMyVibe();
      else resumeMyVibe();
      return;
    }

    // PlayerContext is active — toggle it
    if (playerTrack && playerIsPlaying !== undefined) {
      togglePlay?.();
      return;
    }

    // Nothing is playing — start My Vibe Radio from the featured track
    startMyVibeQueue((firstTrack) => {
      playMyVibeTrack(firstTrack || track);
    });
  };

  if (loading) return null;

  // Use displayed track's metadata for the UI
  const displayTitle = effectiveTrack?.title || DEFAULT_FEATURED_TITLE;
  const displayArtist = effectiveTrack?.artist_display || DEFAULT_FEATURED_ARTIST;
  const displayCover = effectiveTrack?.cover_url || null;

  // Frequency label for the badge
  const freqLabel = effectiveTrack?.frequency_type === "432hz" ? "432 Hz"
    : effectiveTrack?.frequency_type === "528hz" ? "528 Hz"
    : "High-Vibe";

  // The play button track — use displayTrack when available (what's actually playing),
  // fall back to the loaded featured track
  const playButtonTrack = displayTrack || track;

  return (
    <div className="w-full relative rounded-2xl" style={{ overflow: "visible" }}>
      {/* Static ambient glow — no animation, GPU-friendly */}
      <div
        className="absolute pointer-events-none rounded-3xl"
        style={{
          inset: "-16px",
          background: `radial-gradient(ellipse at center, rgba(${rtPrimary},0.22) 0%, rgba(${rtPrimary},0.08) 50%, transparent 75%)`,
          zIndex: -1,
        }}
      />

      {/* Card body — static border glow, no animation */}
      <div
        className="relative z-10 rounded-2xl overflow-hidden"
        style={{
          background: primaryRgba(0.06),
          border: `1px solid rgba(${rtPrimary},0.45)`,
          boxShadow: `0 0 28px rgba(${rtPrimary},0.18)`,
        }}
      >
        {/* Label */}
        <div className="px-4 pt-4 pb-2 flex items-center justify-between">
          <span style={{
            fontSize: "8px", fontWeight: 900, letterSpacing: "0.38em",
            textTransform: "uppercase", color: primaryColor,
            fontFamily: "var(--font-heading)",
          }}>
            {isRamRadio ? "Live Radio" : (showPlaying && displayTrack ? "Now Playing" : "Featured Track")}
          </span>
          {effectiveTrack && <FreqBadge label={freqLabel} color={rtPrimary} />}
        </div>

        {/* Track row */}
        <div className="flex items-center gap-4 px-4 pb-4">
          {/* Artwork */}
          <div
            className="flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden flex items-center justify-center relative"
            style={{ background: primaryRgba(0.1), border: `1px solid ${primaryRgba(0.2)}` }}
          >
            {displayCover ? (
              <img src={optimizedImageUrl(displayCover, 240)} alt={displayTitle} loading="eager" fetchPriority="high" decoding="async" className="w-full h-full object-cover" />
            ) : (
              <Music2 className="w-6 h-6" style={{ color: primaryRgba(0.5) }} />
            )}
            {showPlaying && (
              <div className="absolute inset-0 flex items-center justify-center rounded-xl"
                style={{ background: "rgba(0,0,0,0.45)" }}>
                <Waves className="w-4 h-4 animate-pulse" style={{ color: primaryColor }} />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="font-black text-white text-sm truncate" style={{ fontFamily: "var(--font-heading)" }}>
              {displayTitle}
            </p>
            <p className="text-xs truncate mt-0.5" style={{ color: "rgba(255,255,255,0.42)" }}>
              {displayArtist}
            </p>
          </div>

          {/* Play button + animated bars — uses effectiveTrack for display, playButtonTrack for audio_url */}
          {playButtonTrack?.audio_url && (
            <div className="flex-shrink-0 flex flex-col items-center gap-2">
              <motion.button
                onClick={handlePlay}
                whileTap={{ scale: 0.92 }}
                className="w-11 h-11 rounded-full flex items-center justify-center transition-all"
                style={{
                  background: showPlaying
                    ? primaryRgba(0.15)
                    : `linear-gradient(135deg,rgb(${rtPrimaryDark}),${primaryColor})`,
                  border: showPlaying ? `1px solid ${primaryRgba(0.5)}` : "none",
                  boxShadow: `0 0 20px ${primaryRgba(showPlaying ? 0.35 : 0.45)}`,
                }}
              >
                {showPlaying
                  ? <Pause className="w-4 h-4" style={{ color: primaryColor }} />
                  : <Play className="w-4 h-4 ml-0.5" style={{ color: "#000" }} />}
              </motion.button>
              <MusicBars color={showPlaying ? primaryColor : primaryRgba(0.35)} active={showPlaying} />
            </div>
          )}
        </div>

        {/* Footer CTA */}
        <div
          className="px-4 py-3 flex items-center justify-between gap-3"
          style={{ borderTop: `1px solid ${primaryRgba(0.1)}` }}
        >
          <p className="text-xs font-bold" style={{ color: "rgba(255,255,255,0.35)" }}>
            Tap In To The Frequency
          </p>
          <Link
            to="/music"
            className="flex-shrink-0 px-4 py-2 rounded-xl text-xs font-black tracking-wide transition-all active:scale-[0.97]"
            style={{
              background: primaryRgba(0.12),
              border: `1px solid ${primaryRgba(0.3)}`,
              color: primaryColor,
              fontFamily: "var(--font-heading)",
            }}
          >
            Explore Library
          </Link>
        </div>
      </div>
    </div>
  );
}