import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Radio, Play, Pause, Waves, Music2 } from "lucide-react";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { usePlayer } from "@/context/PlayerContext";

const BLUE = "0,160,220";

// Music bars — always animate, fast when playing
function MusicBars({ color = `rgb(${BLUE})`, active = false }) {
  return (
    <>
      <style>{`
        @keyframes rcBar1 { 0%,100% { height: 3px } 50% { height: 14px } }
        @keyframes rcBar2 { 0%,100% { height: 10px } 50% { height: 3px } }
        @keyframes rcBar3 { 0%,100% { height: 5px } 50% { height: 13px } }
        @keyframes rcBar4 { 0%,100% { height: 12px } 50% { height: 4px } }
      `}</style>
      <span style={{ display: "inline-flex", alignItems: "flex-end", gap: "3px", height: "18px" }}>
        {[
          { anim: "rcBar1", delay: "0s" },
          { anim: "rcBar2", delay: "0.18s" },
          { anim: "rcBar3", delay: "0.09s" },
          { anim: "rcBar4", delay: "0.27s" },
        ].map(({ anim, delay }, i) => (
          <span
            key={i}
            style={{
              display: "inline-block",
              width: "3px",
              borderRadius: "2px",
              background: color,
              height: "6px",
              animation: `${anim} ${active ? "0.55s" : "2.2s"} ease-in-out infinite`,
              animationDelay: delay,
              opacity: active ? 1 : 0.5,
            }}
          />
        ))}
      </span>
    </>
  );
}

// Swipeable radio station card
function RadioCard({ track, isPlaying, onPlay }) {
  const [pressed, setPressed] = React.useState(false);

  return (
    <div
      onMouseEnter={() => setPressed(true)}
      onMouseLeave={() => setPressed(false)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      onClick={() => onPlay(track)}
      className="relative flex-shrink-0 rounded-xl overflow-hidden cursor-pointer transition-all active:scale-[0.97]"
      style={{
        width: "calc(50vw - 28px)",
        maxWidth: 155,
        aspectRatio: "1 / 1",
        background: "#111",
        border: isPlaying
          ? `1.5px solid rgba(${BLUE},0.7)`
          : `1px solid rgba(${BLUE},0.15)`,
        scrollSnapAlign: "start",
        boxShadow: isPlaying ? `0 0 16px rgba(${BLUE},0.35)` : "none",
      }}
    >
      {/* Album art */}
      {track.cover_url ? (
        <img
          src={track.cover_url}
          alt={track.title}
          loading="lazy"
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center"
          style={{ background: `rgba(${BLUE},0.07)` }}>
          <Radio style={{ width: 28, height: 28, color: `rgba(${BLUE},0.4)` }} />
        </div>
      )}

      {/* Overlay */}
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.72) 0%, transparent 55%)" }}
      />

      {/* Playing overlay */}
      {isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.35)" }}>
          <div style={{
            width: 34, height: 34, borderRadius: "50%",
            background: `rgba(${BLUE},0.25)`,
            border: `1.5px solid rgba(${BLUE},0.7)`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <MusicBars color={`rgb(${BLUE})`} active />
          </div>
        </div>
      )}

      {/* Hover play icon (not playing) */}
      {!isPlaying && pressed && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div style={{
            width: 34, height: 34, borderRadius: "50%",
            background: "rgba(0,0,0,0.65)",
            border: "1.5px solid rgba(255,255,255,0.7)",
            display: "flex", alignItems: "center", justifyContent: "center",
            backdropFilter: "blur(4px)",
          }}>
            <svg viewBox="0 0 24 24" fill="white" style={{ width: 10, height: 10, marginLeft: 2 }}>
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      )}

      {/* Title */}
      <p
        className="absolute bottom-1.5 left-2 right-2 text-white truncate"
        style={{ fontSize: "9px", fontWeight: 700, lineHeight: 1.2, textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}
      >
        {track.title}
      </p>
    </div>
  );
}

export default function RadioCTA() {
  const [tracks, setTracks] = useState([]);
  const [featuredTrack, setFeaturedTrack] = useState(null);
  const { playTrack, currentTrack, isPlaying, togglePlay } = usePlayer();

  useEffect(() => {
    Promise.all([
      base44.entities.AppSettings.filter({ key: "start_featured_track_id" }),
      base44.entities.Track.filter({ status: "published" }, "-release_date", 10),
    ]).then(([settings, recent]) => {
      const featuredId = settings?.[0]?.value;
      let featured = null;
      // 1. Admin-pinned track
      if (featuredId) featured = recent.find((t) => t.id === featuredId && t.audio_url) || null;
      // 2. Newest track with audio
      if (!featured) featured = recent.find((t) => t.audio_url) || null;
      setFeaturedTrack(featured);
      const withMedia = recent.filter((t) => (t.audio_url || t.cover_url) && t.id !== featured?.id);
      setTracks(withMedia.slice(0, 6));
    }).catch(() => {});
  }, []);

  const handlePlayFeatured = () => {
    if (!featuredTrack) return;
    if (currentTrack?.id === featuredTrack.id) togglePlay();
    else playTrack(featuredTrack);
  };

  const handlePlay = (track) => {
    if (currentTrack?.id === track.id) togglePlay();
    else playTrack(track);
  };

  const featuredPlaying = currentTrack?.id === featuredTrack?.id && isPlaying;
  const r = BLUE;
  const primaryColor = `rgb(${r})`;
  const rgba = (a) => `rgba(${r},${a})`;

  return (
    <section
      className="flex flex-col gap-4 rounded-3xl relative overflow-hidden"
      style={{
        background: rgba(0.06),
        border: `1px solid rgba(${r},0.4)`,
        boxShadow: `0 0 24px rgba(${r},0.12)`,
      }}
    >
      {/* Static ambient glow */}
      <div className="absolute pointer-events-none rounded-3xl" style={{
        inset: "-16px",
        background: `radial-gradient(ellipse at center, rgba(${r},0.18) 0%, rgba(${r},0.06) 50%, transparent 75%)`,
        zIndex: 0,
      }} />

      <div className="relative z-10 flex flex-col gap-4 p-5">
        {/* Label */}
        <div className="flex items-center justify-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: rgba(0.15), border: `1px solid rgba(${r},0.35)` }}>
            <Radio style={{ width: 14, height: 14, color: primaryColor }} />
          </div>
          <span style={{
            fontSize: "9px", fontWeight: 900, letterSpacing: "0.32em",
            textTransform: "uppercase", color: rgba(0.9),
            fontFamily: "var(--font-heading)",
          }}>
            Live Radio &amp; Music
          </span>
        </div>

        {/* Headline */}
        <div className="text-center">
          <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1.15rem", fontWeight: 900, color: "#fff", marginBottom: "0.4rem", lineHeight: 1.2 }}>
            Tune Into The Frequency
          </h2>
          <p style={{ fontSize: "0.8rem", lineHeight: 1.6, color: "rgba(255,255,255,0.45)" }}>
            Stream 432 Hz high-vibe music live, anytime, for free.
          </p>
        </div>

        {/* ── Featured Track Player — identical to top card ── */}
        {featuredTrack && (
          <div className="rounded-2xl overflow-hidden"
            style={{ background: rgba(0.06), border: `1px solid rgba(${r},0.45)`, boxShadow: `0 0 28px rgba(${r},0.18)` }}>
            {/* Label row */}
            <div className="px-4 pt-4 pb-2 flex items-center justify-between">
              <span style={{ fontSize: "8px", fontWeight: 900, letterSpacing: "0.38em", textTransform: "uppercase", color: primaryColor, fontFamily: "var(--font-heading)" }}>
                Featured Track
              </span>
              <span className="inline-flex items-center gap-1 text-[8px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: rgba(0.1), border: `1px solid rgba(${r},0.2)`, color: primaryColor }}>
                <Waves className="w-2 h-2" />
                {featuredTrack.frequency_type === "432hz" ? "432 Hz" : featuredTrack.frequency_type === "528hz" ? "528 Hz" : "High-Vibe"}
              </span>
            </div>

            {/* Track row */}
            <div className="flex items-center gap-4 px-4 pb-4">
              {/* Artwork */}
              <div className="flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden flex items-center justify-center relative"
                style={{ background: rgba(0.1), border: `1px solid rgba(${r},0.2)` }}>
                {featuredTrack.cover_url ? (
                  <img src={featuredTrack.cover_url} alt={featuredTrack.title} loading="eager" fetchpriority="high" className="w-full h-full object-cover" />
                ) : (
                  <Music2 className="w-6 h-6" style={{ color: rgba(0.5) }} />
                )}
                {featuredPlaying && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-xl"
                    style={{ background: "rgba(0,0,0,0.45)" }}>
                    <Waves className="w-4 h-4 animate-pulse" style={{ color: primaryColor }} />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-black text-white text-sm truncate" style={{ fontFamily: "var(--font-heading)" }}>
                  {featuredTrack.title}
                </p>
                <p className="text-xs truncate mt-0.5" style={{ color: "rgba(255,255,255,0.42)" }}>
                  {featuredTrack.artist_display || "Upper Vibe Media"}
                </p>
              </div>

              {/* Play + bars — bars always visible */}
              <div className="flex-shrink-0 flex flex-col items-center gap-2">
                <motion.button
                  onClick={handlePlayFeatured}
                  whileTap={{ scale: 0.92 }}
                  className="w-11 h-11 rounded-full flex items-center justify-center transition-all"
                  style={{
                    background: featuredPlaying
                      ? rgba(0.15)
                      : `linear-gradient(135deg,rgba(${r},0.7),${primaryColor})`,
                    border: featuredPlaying ? `1px solid rgba(${r},0.5)` : "none",
                    boxShadow: `0 0 20px rgba(${r},${featuredPlaying ? 0.35 : 0.45})`,
                  }}
                >
                  {featuredPlaying
                    ? <Pause className="w-4 h-4" style={{ color: primaryColor }} />
                    : <Play className="w-4 h-4 ml-0.5" style={{ color: "#000" }} />}
                </motion.button>
                <MusicBars color={primaryColor} active={featuredPlaying} />
              </div>
            </div>

            {/* Footer */}
            <div className="px-4 py-3 flex items-center justify-between gap-3"
              style={{ borderTop: `1px solid rgba(${r},0.1)` }}>
              <p className="text-xs font-bold" style={{ color: "rgba(255,255,255,0.35)" }}>Tap In To The Frequency</p>
              <Link to="/music"
                className="flex-shrink-0 px-4 py-2 rounded-xl text-xs font-black tracking-wide transition-all active:scale-[0.97]"
                style={{ background: rgba(0.12), border: `1px solid rgba(${r},0.3)`, color: primaryColor, fontFamily: "var(--font-heading)" }}>
                Explore Library
              </Link>
            </div>
          </div>
        )}

        {/* Swipeable track cards */}
        {tracks.length > 0 && (
          <div className="flex gap-3 overflow-x-auto pb-1"
            style={{ scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch", msOverflowStyle: "none", scrollbarWidth: "none", paddingRight: "16px" }}>
            {tracks.map((track) => (
              <RadioCard
                key={track.id}
                track={track}
                isPlaying={currentTrack?.id === track.id && isPlaying}
                onPlay={handlePlay}
              />
            ))}
          </div>
        )}

        {/* CTA */}
        <Link
          to="/radio"
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-black tracking-wide transition-all active:scale-[0.97]"
          style={{
            background: `linear-gradient(135deg,${primaryColor},rgba(${r},0.75))`,
            color: "#000",
            fontFamily: "var(--font-heading)",
            letterSpacing: "0.05em",
            boxShadow: `0 4px 24px rgba(${r},0.4)`,
          }}
        >
          <Radio style={{ width: 15, height: 15 }} />
          Listen To Live Radio
        </Link>
      </div>
    </section>
  );
}