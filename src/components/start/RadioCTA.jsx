import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Play, Pause, Waves, Music2 } from "lucide-react";
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

// Small swipeable song card — tapping card navigates to song page, play icon plays directly
function SmallTrackCard({ track, isPlaying, onPlay }) {
  const navigate = useNavigate();
  const [hovered, setHovered] = React.useState(false);

  return (
    <div
      onClick={() => navigate(`/song/${track.id}`)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onTouchStart={() => setHovered(true)}
      onTouchEnd={() => setTimeout(() => setHovered(false), 400)}
      className="relative flex-shrink-0 rounded-xl overflow-hidden cursor-pointer transition-all active:scale-[0.97]"
      style={{
        width: 112,
        height: 112,
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

      {/* Dark gradient overlay */}
      <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 45%)" }} />

      {/* Play button — centered, only visible on hover/touch or when playing */}
      {(hovered || isPlaying) && (
        <button
          onClick={(e) => { e.stopPropagation(); onPlay(track); }}
          className="absolute inset-0 flex items-center justify-center transition-all active:scale-90"
          style={{ background: "rgba(0,0,0,0.25)", backdropFilter: "blur(2px)" }}
        >
          <div style={{
            width: 36, height: 36, borderRadius: "50%",
            background: isPlaying ? `rgba(${BLUE},0.3)` : "rgba(0,0,0,0.7)",
            border: isPlaying ? `1.5px solid rgba(${BLUE},0.85)` : "1.5px solid rgba(255,255,255,0.85)",
            display: "flex", alignItems: "center", justifyContent: "center",
            backdropFilter: "blur(6px)",
            boxShadow: isPlaying ? `0 0 14px rgba(${BLUE},0.5)` : "0 2px 12px rgba(0,0,0,0.5)",
          }}>
            {isPlaying
              ? <MusicBars color={`rgb(${BLUE})`} active />
              : <svg viewBox="0 0 24 24" fill="white" style={{ width: 12, height: 12, marginLeft: 2 }}><path d="M8 5v14l11-7z" /></svg>
            }
          </div>
        </button>
      )}

      <p className="absolute bottom-2 left-2 right-2 text-white truncate"
        style={{ fontSize: "10px", fontWeight: 700, lineHeight: 1.2, textShadow: "0 1px 4px rgba(0,0,0,0.9)" }}>
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
      className="flex flex-col gap-3 rounded-3xl relative overflow-hidden"
      style={{
        background: rgba(0.06),
        border: `1px solid ${rgba(0.35)}`,
        boxShadow: `0 0 24px rgba(${r},0.1)`,
      }}
    >
      {/* Ambient glow */}
      <div className="absolute pointer-events-none" style={{
        inset: 0,
        background: `radial-gradient(ellipse at top, rgba(${r},0.1) 0%, transparent 70%)`,
        zIndex: 0,
      }} />

      <div className="relative z-10 flex flex-col gap-3 p-4">

        {/* ── Featured Player Card ── */}
        {featuredTrack && (
          <div className="rounded-2xl overflow-hidden"
            style={{ background: "rgba(0,0,0,0.35)", border: `1px solid ${rgba(0.3)}` }}>

            {/* Cover art */}
            {featuredTrack.cover_url && (
              <div className="relative w-full overflow-hidden" style={{ aspectRatio: "16 / 7" }}>
                <img
                  src={featuredTrack.cover_url}
                  alt={featuredTrack.title}
                  loading="eager"
                  className="w-full h-full object-cover"
                />
                {/* Gradient overlay */}
                <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, transparent 35%, rgba(0,0,0,0.88) 100%)" }} />

                {/* 432 Hz badge top-right */}
                <span className="absolute top-3 right-3 inline-flex items-center gap-1 px-2 py-1 rounded-full"
                  style={{ fontSize: "8px", fontWeight: 800, background: "rgba(0,0,0,0.55)", border: `1px solid ${rgba(0.4)}`, color: primaryColor, backdropFilter: "blur(6px)" }}>
                  <Waves className="w-2.5 h-2.5" />
                  {freqLabel}
                </span>

                {/* Title + artist + controls overlaid at bottom */}
                <div className="absolute bottom-0 left-0 right-0 px-4 pb-4">
                  <p className="font-black text-white" style={{ fontFamily: "var(--font-heading)", fontSize: "1rem", lineHeight: 1.2, marginBottom: "2px" }}>
                    {featuredTrack.title}
                  </p>
                  <p style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.55)", marginBottom: "12px" }}>
                    {featuredTrack.artist_display || "Upper Vibe Media"}
                  </p>

                  {/* Controls row */}
                  <div className="flex items-center gap-3">
                    <motion.button
                      onClick={handlePlayFeatured}
                      whileTap={{ scale: 0.9 }}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs transition-all"
                      style={{
                        background: featuredPlaying ? rgba(0.2) : `linear-gradient(135deg,rgba(${r},0.85),${primaryColor})`,
                        border: featuredPlaying ? `1px solid ${rgba(0.6)}` : "none",
                        color: featuredPlaying ? primaryColor : "#000",
                        boxShadow: `0 0 20px ${rgba(0.45)}`,
                        fontFamily: "var(--font-heading)",
                        letterSpacing: "0.04em",
                      }}
                    >
                      {featuredPlaying
                        ? <><Pause className="w-3.5 h-3.5" /> Playing</>
                        : <><Play className="w-3.5 h-3.5 ml-0.5" /> Play Now</>}
                    </motion.button>
                    <MusicBars color={primaryColor} active={featuredPlaying} />
                  </div>
                </div>
              </div>
            )}

            {/* No-cover fallback row */}
            {!featuredTrack.cover_url && (
              <div className="flex items-center gap-3 p-4">
                <div className="flex-shrink-0 rounded-xl flex items-center justify-center"
                  style={{ width: 64, height: 64, background: rgba(0.1), border: `1px solid ${rgba(0.2)}` }}>
                  <Music2 className="w-6 h-6" style={{ color: rgba(0.5) }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-white truncate" style={{ fontFamily: "var(--font-heading)", fontSize: "0.9rem" }}>{featuredTrack.title}</p>
                  <p className="truncate mt-0.5" style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.45)" }}>{featuredTrack.artist_display || "Upper Vibe Media"}</p>
                </div>
                <motion.button onClick={handlePlayFeatured} whileTap={{ scale: 0.9 }}
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: `linear-gradient(135deg,rgba(${r},0.75),${primaryColor})`, boxShadow: `0 0 16px ${rgba(0.45)}` }}>
                  {featuredPlaying ? <Pause className="w-4 h-4" style={{ color: primaryColor }} /> : <Play className="w-4 h-4 ml-0.5" style={{ color: "#000" }} />}
                </motion.button>
              </div>
            )}

            {/* Explore Library footer */}
            <div className="px-3 pb-3 pt-2">
              <Link to="/music"
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-black tracking-wide transition-all active:scale-[0.97]"
                style={{ background: rgba(0.08), border: `1px solid ${rgba(0.2)}`, color: primaryColor, fontFamily: "var(--font-heading)" }}>
                Explore Library →
              </Link>
            </div>
          </div>
        )}

        {/* ── Small song cards (3) ── */}
        {tracks.length > 0 && (
          <div className="flex gap-2.5 overflow-x-auto"
            style={{ scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch", msOverflowStyle: "none", scrollbarWidth: "none" }}>
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