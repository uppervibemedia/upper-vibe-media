import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Radio, Play, Pause, Waves } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { usePlayer } from "@/context/PlayerContext";

const BLUE = "0,160,220";

// Animated music bars — always moving when active
function MusicBars({ color = `rgb(${BLUE})`, active = false }) {
  return (
    <>
      {active && (
        <style>{`
          @keyframes rb1{0%,100%{height:3px}50%{height:12px}}
          @keyframes rb2{0%,100%{height:9px}50%{height:3px}}
          @keyframes rb3{0%,100%{height:5px}50%{height:11px}}
          @keyframes rb4{0%,100%{height:11px}50%{height:4px}}
        `}</style>
      )}
      <span style={{ display: "inline-flex", alignItems: "flex-end", gap: "2px", height: "14px" }}>
        {[
          { anim: "rb1", delay: "0s" },
          { anim: "rb2", delay: "0.14s" },
          { anim: "rb3", delay: "0.07s" },
          { anim: "rb4", delay: "0.21s" },
        ].map(({ anim, delay }, i) => (
          <span
            key={i}
            style={{
              display: "inline-block",
              width: "2.5px",
              borderRadius: "2px",
              background: color,
              height: "5px",
              animation: active ? `${anim} 0.6s ease-in-out infinite` : "none",
              animationDelay: active ? delay : "0s",
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
  const [localPlaying, setLocalPlaying] = useState(false);
  const [localTrackId, setLocalTrackId] = useState(null);
  const audioRef = React.useRef(null);
  const { playTrack, currentTrack, isPlaying } = usePlayer();

  useEffect(() => {
    base44.entities.Track.filter({ status: "published" }, "-release_date", 6)
      .then((rows) => setTracks(rows.filter((t) => t.audio_url || t.cover_url)))
      .catch(() => {});
  }, []);

  // Stop local audio if global player takes over
  useEffect(() => {
    if (isPlaying && audioRef.current && localPlaying) {
      audioRef.current.pause();
      setLocalPlaying(false);
      setLocalTrackId(null);
    }
  }, [isPlaying]);

  const handlePlay = (track) => {
    // Hand off to global player
    playTrack(track);
  };

  const r = BLUE;

  return (
    <section
      className="flex flex-col gap-4 p-5 rounded-3xl relative"
      style={{
        background: `rgba(${r},0.06)`,
        border: `1px solid rgba(${r},0.4)`,
        boxShadow: `0 0 24px rgba(${r},0.12)`,
      }}
    >
      {/* Label */}
      <div className="flex items-center justify-center gap-2">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: `rgba(${r},0.15)`, border: `1px solid rgba(${r},0.35)` }}
        >
          <Radio style={{ width: 14, height: 14, color: `rgb(${r})` }} />
        </div>
        <span style={{
          fontSize: "9px", fontWeight: 900, letterSpacing: "0.32em",
          textTransform: "uppercase", color: `rgba(${r},0.9)`,
          fontFamily: "var(--font-heading)",
        }}>
          Live Radio &amp; Music
        </span>
      </div>

      {/* Headline */}
      <div className="text-center">
        <h2 style={{
          fontFamily: "var(--font-heading)", fontSize: "1.15rem", fontWeight: 900,
          color: "#fff", marginBottom: "0.4rem", lineHeight: 1.2,
        }}>
          Tune Into The Frequency
        </h2>
        <p style={{ fontSize: "0.8rem", lineHeight: 1.6, color: "rgba(255,255,255,0.45)" }}>
          Stream 432 Hz high-vibe music live, anytime, for free.
        </p>
      </div>

      {/* Swipeable track cards */}
      {tracks.length > 0 && (
        <div
          className="flex gap-3 overflow-x-auto pb-1"
          style={{
            scrollSnapType: "x mandatory",
            WebkitOverflowScrolling: "touch",
            msOverflowStyle: "none",
            scrollbarWidth: "none",
            paddingRight: "16px",
          }}
        >
          {tracks.map((track) => {
            const playing = currentTrack?.id === track.id && isPlaying;
            return (
              <RadioCard
                key={track.id}
                track={track}
                isPlaying={playing}
                onPlay={handlePlay}
              />
            );
          })}
        </div>
      )}

      {/* CTA */}
      <Link
        to="/radio"
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-black tracking-wide transition-all active:scale-[0.97]"
        style={{
          background: `linear-gradient(135deg,rgb(${r}),rgba(${r},0.75))`,
          color: "#000",
          fontFamily: "var(--font-heading)",
          letterSpacing: "0.05em",
          boxShadow: `0 4px 24px rgba(${r},0.4)`,
        }}
      >
        <Radio style={{ width: 15, height: 15 }} />
        Listen To Live Radio
      </Link>
    </section>
  );
}