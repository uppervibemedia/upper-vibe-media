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

// Small song card — same sizing as YouTube secondary cards
function SmallTrackCard({ track, isPlaying, onPlay }) {
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
        maxWidth: 160,
        aspectRatio: "1 / 1",
        background: "#111",
        border: isPlaying
          ? `1.5px solid rgba(${BLUE},0.7)`
          : `1px solid rgba(255,255,255,0.08)`,
        scrollSnapAlign: "start",
        boxShadow: isPlaying ? `0 0 14px rgba(${BLUE},0.35)` : "none",
      }}
    >
      {track.cover_url ? (
        <img src={track.cover_url} alt={track.title} loading="lazy" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center" style={{ background: `rgba(${BLUE},0.07)` }}>
          <Music2 style={{ width: 22, height: 22, color: `rgba(${BLUE},0.4)` }} />
        </div>
      )}

      <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 55%)" }} />

      {isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.3)" }}>
          <div style={{
            width: 28, height: 28, borderRadius: "50%",
            background: `rgba(${BLUE},0.25)`, border: `1.5px solid rgba(${BLUE},0.7)`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <MusicBars color={`rgb(${BLUE})`} active />
          </div>
        </div>
      )}

      {!isPlaying && pressed && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div style={{
            width: 28, height: 28, borderRadius: "50%",
            background: "rgba(0,0,0,0.65)", border: "1.5px solid rgba(255,255,255,0.7)",
            display: "flex", alignItems: "center", justifyContent: "center",
            backdropFilter: "blur(4px)",
          }}>
            <svg viewBox="0 0 24 24" fill="white" style={{ width: 9, height: 9, marginLeft: 2 }}>
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      )}

      <p className="absolute bottom-1.5 left-2 right-2 text-white truncate"
        style={{ fontSize: "9px", fontWeight: 700, lineHeight: 1.2, textShadow: "0 1px 4px rgba(0,0,0,0.9)" }}>
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
      if (featuredId) featured = recent.find((t) => t.id === featuredId && t.audio_url) || null;
      if (!featured) featured = recent.find((t) => t.audio_url) || null;
      setFeaturedTrack(featured);
      const withMedia = recent.filter((t) => (t.audio_url || t.cover_url) && t.id !== featured?.id);
      setTracks(withMedia.slice(0, 3));
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

  const freqLabel = featuredTrack?.frequency_type === "432hz" ? "432 Hz"
    : featuredTrack?.frequency_type === "528hz" ? "528 Hz"
    : "High-Vibe";

  return (
    <section
      className="flex flex-col gap-4 rounded-3xl relative overflow-hidden"
      style={{
        background: rgba(0.06),
        border: `1px solid ${rgba(0.4)}`,
        boxShadow: `0 0 24px rgba(${r},0.1)`,
      }}
    >
      {/* Ambient glow */}
      <div className="absolute pointer-events-none" style={{
        inset: 0,
        background: `radial-gradient(ellipse at top, rgba(${r},0.1) 0%, transparent 70%)`,
        zIndex: 0,
      }} />

      <div className="relative z-10 flex flex-col gap-4 p-5">

        {/* Label */}
        <div className="flex items-center justify-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: rgba(0.15), border: `1px solid ${rgba(0.35)}` }}>
            <Radio style={{ width: 14, height: 14, color: primaryColor }} />
          </div>
          <span style={{
            fontSize: "9px", fontWeight: 900, letterSpacing: "0.32em",
            textTransform: "uppercase", color: rgba(0.9),
            fontFamily: "var(--font-heading)",
          }}>
            Featured Music
          </span>
        </div>

        {/* ── Featured Track — full width, same as YouTube main video ── */}
        {featuredTrack && (
          <div className="rounded-2xl overflow-hidden"
            style={{ background: "rgba(0,0,0,0.3)", border: `1px solid ${rgba(0.3)}` }}>

            {/* Cover art — full width, same aspect ratio as YT main video */}
            <div className="relative w-full overflow-hidden" style={{ aspectRatio: "16/9" }}>
              {featuredTrack.cover_url ? (
                <img
                  src={featuredTrack.cover_url}
                  alt={featuredTrack.title}
                  loading="eager"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center" style={{ background: rgba(0.08) }}>
                  <Music2 className="w-10 h-10" style={{ color: rgba(0.4) }} />
                </div>
              )}

              {/* Gradient overlay */}
              <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 50%)" }} />

              {/* Play button overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.button
                  onClick={handlePlayFeatured}
                  whileTap={{ scale: 0.9 }}
                  className="flex items-center justify-center rounded-full transition-all"
                  style={{
                    width: 52, height: 52,
                    background: featuredPlaying ? rgba(0.2) : "rgba(0,0,0,0.6)",
                    border: `2px solid ${featuredPlaying ? primaryColor : "rgba(255,255,255,0.8)"}`,
                    backdropFilter: "blur(6px)",
                    boxShadow: featuredPlaying ? `0 0 24px ${rgba(0.6)}` : "0 4px 20px rgba(0,0,0,0.5)",
                  }}
                >
                  {featuredPlaying
                    ? <Pause className="w-5 h-5" style={{ color: primaryColor }} />
                    : <Play className="w-6 h-6 ml-1" style={{ color: "#fff" }} />}
                </motion.button>
              </div>

              {/* Title + artist overlay at bottom */}
              <div className="absolute bottom-0 left-0 right-0 px-3 pb-3">
                <p className="font-black text-white truncate" style={{ fontFamily: "var(--font-heading)", fontSize: "0.9rem", lineHeight: 1.2 }}>
                  {featuredTrack.title}
                </p>
                <p className="truncate mt-0.5 flex items-center gap-1.5" style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.6)" }}>
                  {featuredTrack.artist_display || "Upper Vibe Media"}
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full flex-shrink-0"
                    style={{ fontSize: "7px", fontWeight: 700, background: rgba(0.2), border: `1px solid ${rgba(0.4)}`, color: primaryColor }}>
                    <Waves className="w-2 h-2" />
                    {freqLabel}
                  </span>
                  {featuredPlaying && <MusicBars color={primaryColor} active />}
                </p>
              </div>
            </div>

            {/* Explore Library button */}
            <div className="px-3 py-2.5">
              <Link to="/music"
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black tracking-wide transition-all active:scale-[0.97]"
                style={{ background: rgba(0.1), border: `1px solid ${rgba(0.25)}`, color: primaryColor, fontFamily: "var(--font-heading)" }}>
                Explore Library →
              </Link>
            </div>
          </div>
        )}

        {/* ── Small song cards — same size as YouTube secondary cards ── */}
        {tracks.length > 0 && (
          <div className="flex gap-3 overflow-x-auto pb-1"
            style={{ scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch", msOverflowStyle: "none", scrollbarWidth: "none", paddingRight: "16px" }}>
            {tracks.map((track) => (
              <SmallTrackCard
                key={track.id}
                track={track}
                isPlaying={currentTrack?.id === track.id && isPlaying}
                onPlay={handlePlay}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}