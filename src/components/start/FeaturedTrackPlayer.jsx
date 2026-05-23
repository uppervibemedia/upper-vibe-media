import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Play, Pause, Music2, Waves } from "lucide-react";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useTheme } from "@/context/ThemeContext";
import { RADIO_THEMES } from "../radio/RadioThemePicker";

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
              animation: active ? `${anim} 0.65s ease-in-out infinite` : "none",
              animationDelay: delay,
            }}
          />
        ))}
      </span>
    </>
  );
}

export default function FeaturedTrackPlayer() {
  const [track, setTrack] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const audioRef = useRef(null);

  // Theme
  const { accentId } = useTheme();
  const radioTheme = RADIO_THEMES[accentId] || RADIO_THEMES.cyan;
  const rtPrimary = radioTheme.vars["--rt-primary"];       // e.g. "0,160,220"
  const rtPrimaryDark = radioTheme.vars["--rt-primary-dark"];
  const primaryColor = `rgb(${rtPrimary})`;
  const primaryRgba = (a) => `rgba(${rtPrimary},${a})`;

  useEffect(() => {
    async function loadTrack() {
      try {
        // Get pool of published tracks with audio
        const all = await base44.entities.Track.filter(
          { status: "published" },
          "-created_date",
          50
        );
        const withAudio = all.filter((t) => t.audio_url);
        if (!withAudio.length) { setLoading(false); return; }

        // Prefer featured tracks; otherwise pick random from pool
        const featured = withAudio.filter((t) => t.is_featured);
        const pool = featured.length > 0 ? featured : withAudio;
        const picked = pool[Math.floor(Math.random() * pool.length)];
        setTrack(picked);
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

  if (loading || !track) return null;

  const freqLabel = track.frequency_type === "432hz" ? "432 Hz"
    : track.frequency_type === "528hz" ? "528 Hz"
    : "High-Vibe";

  return (
    <div className="w-full relative rounded-2xl overflow-hidden">
      {/* Pulsating glow ring — matches Radio page style */}
      <motion.div
        animate={{ scale: [1, 1.025, 1], opacity: [0.35, 0.9, 0.35] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-0 rounded-2xl pointer-events-none"
        style={{
          border: `2px solid ${primaryColor}`,
          boxShadow: `0 0 28px ${primaryRgba(0.45)}`,
        }}
      />

      {/* Card body */}
      <div
        className="relative z-10 rounded-2xl overflow-hidden"
        style={{
          background: primaryRgba(0.06),
          border: `1px solid ${primaryRgba(0.15)}`,
        }}
      >
        {track.audio_url && (
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
          <span className="inline-flex items-center gap-1 text-[8px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: primaryRgba(0.1), border: `1px solid ${primaryRgba(0.2)}`, color: primaryColor }}>
            <Waves className="w-2 h-2" /> {freqLabel}
          </span>
        </div>

        {/* Track row */}
        <div className="flex items-center gap-4 px-4 pb-4">
          {/* Artwork */}
          <div
            className="flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden flex items-center justify-center relative"
            style={{ background: primaryRgba(0.1), border: `1px solid ${primaryRgba(0.2)}` }}
          >
            {track.cover_url ? (
              <img src={track.cover_url} alt={track.title} className="w-full h-full object-cover" />
            ) : (
              <Music2 className="w-6 h-6" style={{ color: primaryRgba(0.5) }} />
            )}
            {/* Playing overlay */}
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
              {track.title}
            </p>
            <p className="text-xs truncate mt-0.5" style={{ color: "rgba(255,255,255,0.42)" }}>
              {track.artist_display || "Upper Vibe Media"}
            </p>
          </div>

          {/* Play button + bars */}
          {track.audio_url && (
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
              <MusicBars color={playing ? primaryColor : primaryRgba(0.4)} active={playing} />
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
            Explore Music Library
          </Link>
        </div>
      </div>
    </div>
  );
}