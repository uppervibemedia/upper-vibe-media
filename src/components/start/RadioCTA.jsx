import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Radio } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { usePlayer } from "@/context/PlayerContext";

const BLUE = "0,160,220";

// Identical MusicBars to FeaturedTrackPlayer — always visible, fast when playing
function MusicBars({ color = `rgb(${BLUE})`, active = false }) {
  return (
    <>
      <style>{`
        @keyframes rcBar1 { 0%,100% { height: 4px } 50% { height: 14px } }
        @keyframes rcBar2 { 0%,100% { height: 10px } 50% { height: 4px } }
        @keyframes rcBar3 { 0%,100% { height: 6px } 50% { height: 13px } }
        @keyframes rcBar4 { 0%,100% { height: 12px } 50% { height: 5px } }
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
  const { playTrack, currentTrack, isPlaying, togglePlay } = usePlayer();

  useEffect(() => {
    base44.entities.Track.filter({ status: "published" }, "-release_date", 6)
      .then((rows) => setTracks(rows.filter((t) => t.audio_url || t.cover_url)))
      .catch(() => {});
  }, []);

  const handlePlay = (track) => {
    if (currentTrack?.id === track.id) togglePlay();
    else playTrack(track);
  };

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


      </div>
    </section>
  );
}