import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Play, Pause, Music2, Waves } from "lucide-react";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useTheme } from "@/context/ThemeContext";
import { RADIO_THEMES } from "../radio/RadioThemePicker";

// The default featured track title — used as fallback when no admin override is set
const DEFAULT_FEATURED_TITLE = "Fourth Dimension Hustler";
const DEFAULT_FEATURED_ARTIST = "Montae DeVine";

// Music bars — always animate
function MusicBars({ color = "#00A0DC" }) {
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
              animation: `${anim} 0.65s ease-in-out infinite`,
              animationDelay: delay,
            }}
          />
        ))}
      </span>
    </>
  );
}

export default function FeaturedTrackPlayer({ onTrackLoaded }) {
  const [track, setTrack] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const audioRef = useRef(null);

  const { accentId } = useTheme();
  const radioTheme = RADIO_THEMES[accentId] || RADIO_THEMES.cyan;
  const rtPrimary = radioTheme.vars["--rt-primary"];
  const rtPrimaryDark = radioTheme.vars["--rt-primary-dark"];
  const primaryColor = `rgb(${rtPrimary})`;
  const primaryRgba = (a) => `rgba(${rtPrimary},${a})`;

  useEffect(() => {
    async function loadTrack() {
      try {
        // 1. Check for admin-selected featured track on /start
        const featuredSetting = await base44.entities.AppSettings.filter({ key: "start_featured_track_id" });
        const featuredId = featuredSetting?.[0]?.value;

        if (featuredId) {
          const all = await base44.entities.Track.filter({ status: "published" }, "-created_date", 100);
          const found = all.find((t) => t.id === featuredId && t.audio_url);
          if (found) {
            setTrack(found);
            onTrackLoaded?.(found);
            setLoading(false);
            return;
          }
        }

        // 2. Look up "Fourth Dimension Hustler" by title as the default featured track
        const allPublished = await base44.entities.Track.filter({ status: "published" }, "-release_date", 50);
        const byTitle = allPublished.find(
          (t) => t.audio_url && t.title?.toLowerCase().includes("fourth dimension hustler")
        );
        if (byTitle) {
          setTrack(byTitle);
          onTrackLoaded?.(byTitle);
          setLoading(false);
          return;
        }

        // 3. Fall back to newest published track with audio
        const withAudio = allPublished.filter((t) => t.audio_url);
        if (withAudio.length) {
          setTrack(withAudio[0]);
          onTrackLoaded?.(withAudio[0]);
        }
      } catch {
        // silently fail
      }
      setLoading(false);
    }
    loadTrack();
  }, []);

  const handlePlay = () => {
    if (!audioRef.current || !track?.audio_url) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play();
      setPlaying(true);
    }
  };

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onEnded = () => setPlaying(false);
    el.addEventListener("ended", onEnded);
    return () => el.removeEventListener("ended", onEnded);
  }, [track]);

  if (loading) return null;

  const freqLabel = track?.frequency_type === "432hz" ? "432 Hz"
    : track?.frequency_type === "528hz" ? "528 Hz"
    : "High-Vibe";

  const displayTitle = track?.title || DEFAULT_FEATURED_TITLE;
  const displayArtist = track?.artist_display || DEFAULT_FEATURED_ARTIST;
  const displayCover = track?.cover_url || null;

  return (
    <div className="w-full relative rounded-2xl" style={{ overflow: "visible" }}>
      <style>{`
        @keyframes featuredSectionPulse {
          0%, 100% { box-shadow: 0 0 35px rgba(${rtPrimary},0.55), 0 0 80px rgba(${rtPrimary},0.2); border-color: rgba(${rtPrimary},0.55); }
          50% { box-shadow: 0 0 80px rgba(${rtPrimary},1), 0 0 160px rgba(${rtPrimary},0.6), 0 0 240px rgba(${rtPrimary},0.25); border-color: rgba(${rtPrimary},1); }
        }
        @keyframes featuredBackBlast {
          0%, 100% { opacity: 0.12; transform: scale(0.95); }
          50% { opacity: 0.45; transform: scale(1.12); }
        }
      `}</style>
      {/* Hard background blast glow — behind everything */}
      <div
        className="absolute pointer-events-none rounded-3xl"
        style={{
          inset: "-20px",
          background: `radial-gradient(ellipse at center, rgba(${rtPrimary},0.55) 0%, rgba(${rtPrimary},0.2) 45%, transparent 75%)`,
          animation: "featuredBackBlast 2.8s ease-in-out infinite",
          zIndex: -1,
        }}
      />

      {/* Card body */}
      <div
        className="relative z-10 rounded-2xl overflow-hidden"
        style={{
          background: primaryRgba(0.06),
          border: `1px solid rgba(${rtPrimary},0.45)`,
          animation: "featuredSectionPulse 2.8s ease-in-out infinite",
        }}
      >
        {track?.audio_url && (
          <audio ref={audioRef} src={track.audio_url} preload="none" />
        )}

        {/* Label */}
        <div className="px-4 pt-4 pb-2 flex items-center justify-between">
          <span style={{
            fontSize: "8px", fontWeight: 900, letterSpacing: "0.38em",
            textTransform: "uppercase", color: primaryColor,
            fontFamily: "var(--font-heading)",
          }}>
            Featured Track
          </span>
          {track && (
            <span className="inline-flex items-center gap-1 text-[8px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: primaryRgba(0.1), border: `1px solid ${primaryRgba(0.2)}`, color: primaryColor }}>
              <Waves className="w-2 h-2" /> {freqLabel}
            </span>
          )}
        </div>

        {/* Track row */}
        <div className="flex items-center gap-4 px-4 pb-4">
          {/* Artwork */}
          <div
            className="flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden flex items-center justify-center relative"
            style={{ background: primaryRgba(0.1), border: `1px solid ${primaryRgba(0.2)}` }}
          >
            {displayCover ? (
              <img src={displayCover} alt={displayTitle} className="w-full h-full object-cover" />
            ) : (
              <Music2 className="w-6 h-6" style={{ color: primaryRgba(0.5) }} />
            )}
            {playing && (
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

          {/* Play button + animated bars */}
          {track?.audio_url && (
            <div className="flex-shrink-0 flex flex-col items-center gap-2">
              <motion.button
                onClick={handlePlay}
                whileTap={{ scale: 0.92 }}
                className="w-11 h-11 rounded-full flex items-center justify-center transition-all"
                style={{
                  background: playing
                    ? primaryRgba(0.15)
                    : `linear-gradient(135deg,rgb(${rtPrimaryDark}),${primaryColor})`,
                  border: playing ? `1px solid ${primaryRgba(0.5)}` : "none",
                  boxShadow: `0 0 20px ${primaryRgba(playing ? 0.35 : 0.45)}`,
                }}
              >
                {playing
                  ? <Pause className="w-4 h-4" style={{ color: primaryColor }} />
                  : <Play className="w-4 h-4 ml-0.5" style={{ color: "#000" }} />}
              </motion.button>
              <MusicBars color={playing ? primaryColor : primaryRgba(0.35)} />
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