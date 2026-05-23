import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Play, Music2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

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

export default function FeaturedTrackPlayer() {
  const [track, setTrack] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const audioRef = useRef(null);

  useEffect(() => {
    async function loadTrack() {
      try {
        // Try featured first
        const featured = await base44.entities.Track.filter(
          { is_featured: true, status: "published" },
          "-release_date",
          1
        );
        if (featured?.length > 0 && featured[0].audio_url) {
          setTrack(featured[0]);
        } else {
          // Fall back to newest published
          const newest = await base44.entities.Track.filter(
            { status: "published" },
            "-created_date",
            1
          );
          if (newest?.length > 0) setTrack(newest[0]);
        }
      } catch (e) {
        // silently fail — player just won't show
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

  return (
    <div
      className="w-full rounded-2xl overflow-hidden"
      style={{
        background: "rgba(0,144,200,0.07)",
        border: "1px solid rgba(0,160,220,0.22)",
        boxShadow: "0 0 28px rgba(0,160,220,0.08)",
      }}
    >
      {/* Hidden audio element — no autoplay */}
      {track.audio_url && (
        <audio ref={audioRef} src={track.audio_url} preload="none" />
      )}

      {/* Label */}
      <div className="px-4 pt-4 pb-2">
        <span style={{
          fontSize: "8px", fontWeight: 900, letterSpacing: "0.38em",
          textTransform: "uppercase", color: "#00A0DC",
          fontFamily: "var(--font-heading)",
        }}>
          Featured Track
        </span>
      </div>

      {/* Track row */}
      <div className="flex items-center gap-4 px-4 pb-4">
        {/* Artwork */}
        <div
          className="flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden flex items-center justify-center"
          style={{ background: "rgba(0,160,220,0.1)", border: "1px solid rgba(0,160,220,0.18)" }}
        >
          {track.cover_url ? (
            <img src={track.cover_url} alt={track.title} className="w-full h-full object-cover" />
          ) : (
            <Music2 className="w-6 h-6" style={{ color: "rgba(0,160,220,0.5)" }} />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="font-black text-white text-sm truncate" style={{ fontFamily: "var(--font-heading)" }}>
            {track.title}
          </p>
          <p className="text-xs truncate" style={{ color: "rgba(255,255,255,0.42)" }}>
            {track.artist_display || "Upper Vibe Media"}
          </p>
          <p className="text-[10px] mt-0.5 font-semibold" style={{ color: "rgba(0,160,220,0.65)" }}>
            {track.frequency_type === "432hz" ? "432 Hz" : track.frequency_type === "528hz" ? "528 Hz" : "High-Vibe"}
          </p>
        </div>

        {/* Play button + bars */}
        {track.audio_url && (
          <div className="flex-shrink-0 flex flex-col items-center gap-2">
            <button
              onClick={handlePlay}
              className="w-11 h-11 rounded-full flex items-center justify-center transition-all active:scale-95"
              style={{
                background: playing
                  ? "rgba(0,160,220,0.15)"
                  : "linear-gradient(135deg,#0090C8,#00B8D4)",
                border: playing ? "1px solid rgba(0,160,220,0.5)" : "none",
                boxShadow: playing ? "0 0 16px rgba(0,160,220,0.3)" : "0 0 16px rgba(0,160,220,0.4)",
              }}
            >
              <Play className="w-4 h-4 ml-0.5" style={{ color: playing ? "#00A0DC" : "#000" }} />
            </button>
            <MusicBars color={playing ? "#00A0DC" : "rgba(0,160,220,0.35)"} />
          </div>
        )}
      </div>

      {/* Tap In headline + CTA */}
      <div
        className="px-4 py-3 flex items-center justify-between gap-3"
        style={{ borderTop: "1px solid rgba(0,160,220,0.1)" }}
      >
        <p className="text-xs font-bold" style={{ color: "rgba(255,255,255,0.35)" }}>
          Tap In To The Frequency
        </p>
        <Link
          to="/music"
          className="flex-shrink-0 px-4 py-2 rounded-xl text-xs font-black tracking-wide transition-all active:scale-[0.97]"
          style={{
            background: "rgba(0,160,220,0.12)",
            border: "1px solid rgba(0,160,220,0.3)",
            color: "#00A0DC",
            fontFamily: "var(--font-heading)",
          }}
        >
          Explore Music Library
        </Link>
      </div>
    </div>
  );
}