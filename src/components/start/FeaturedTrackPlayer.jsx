import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Play, Music2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

function MusicBars() {
  return (
    <span style={{ display: "flex", alignItems: "flex-end", gap: "2px", height: "16px" }}>
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          style={{
            display: "block",
            width: "3px",
            borderRadius: "2px",
            background: "#00A0DC",
            animation: `musicBar${i} 0.7s ease-in-out infinite alternate`,
            animationDelay: `${(i - 1) * 0.15}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes musicBar1 { from { height: 4px } to { height: 14px } }
        @keyframes musicBar2 { from { height: 8px } to { height: 6px } }
        @keyframes musicBar3 { from { height: 4px } to { height: 12px } }
      `}</style>
    </span>
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

        {/* Play button */}
        {track.audio_url && (
          <button
            onClick={handlePlay}
            className="flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center transition-all active:scale-95"
            style={{
              background: playing
                ? "rgba(0,160,220,0.2)"
                : "linear-gradient(135deg,#0090C8,#00B8D4)",
              border: playing ? "1px solid rgba(0,160,220,0.5)" : "none",
              boxShadow: playing ? "none" : "0 0 16px rgba(0,160,220,0.4)",
            }}
          >
            {playing
              ? <MusicBars />
              : <Play className="w-4 h-4 ml-0.5" style={{ color: "#000" }} />
            }
          </button>
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