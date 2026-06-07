import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Play, Pause, Music4, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { MOOD_MUSIC_MAP } from "@/lib/vibeCheckQuestions";

/**
 * Shows 3 track recommendations based on the user's Vibe Score category
 * after completing a Vibe Check.
 */
export default function VibeFrequencyRecs({ moodTag, rtPrimary, currentTrack, isPlaying, onPlay }) {
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // Fetch published tracks with mood tags matching this category
        const allTracks = await base44.entities.Track.filter({ status: "published" }, "-plays", 100);
        const tags = MOOD_MUSIC_MAP[moodTag] || [];

        // Score each track by how many matching mood/category tags it has
        const scored = allTracks.map((t) => {
          const trackTags = [
            ...(t.mood_tags || []),
            t.frequency_type || "",
            t.category_ids?.join(" ") || "",
          ].join(" ").toLowerCase();

          let score = 0;
          for (const tag of tags) {
            if (trackTags.includes(tag.toLowerCase())) score++;
          }
          return { track: t, score };
        });

        // Sort by relevance then by plays, take top 3
        const sorted = scored
          .filter((s) => s.score > 0 || moodTag === "high_vibe")
          .sort((a, b) => b.score - a.score || (b.track.plays || 0) - (a.track.plays || 0))
          .map((s) => s.track)
          .slice(0, 3);

        // Fallback: if not enough matches, fill with featured/popular tracks
        if (sorted.length < 3) {
          const featured = allTracks
            .filter((t) => !sorted.find((s) => s.id === t.id))
            .sort((a, b) => (b.plays || 0) - (a.plays || 0))
            .slice(0, 3 - sorted.length);
          sorted.push(...featured);
        }

        setTracks(sorted.slice(0, 3));
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    load();
  }, [moodTag]);

  const categoryLabel = {
    low_energy:  "Uplifting & Grounding",
    neutral:     "Activation Energy",
    intentional: "Focus & Manifestation",
    high_vibe:   "High Vibe Celebration",
  }[moodTag] || "Your Frequency";

  return (
    <div className="rounded-3xl p-5"
      style={{ background: "rgba(8,8,24,0.85)", border: `1px solid rgba(${rtPrimary},0.18)`, backdropFilter: "blur(20px)" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[10px] font-black tracking-[0.25em] uppercase mb-0.5"
            style={{ color: `rgba(${rtPrimary},0.7)` }}>
            Recommended For Your Frequency
          </p>
          <p className="text-white/50 text-xs">{categoryLabel}</p>
        </div>
        <Link to="/music"
          className="flex items-center gap-1 text-[10px] font-black tracking-wide uppercase transition-all hover:opacity-80"
          style={{ color: `rgb(${rtPrimary})` }}>
          All Music <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Track list */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 rounded-2xl animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {tracks.map((track, i) => {
            const isCurrent = currentTrack?.id === track.id;
            return (
              <motion.div key={track.id}
                initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className="flex items-center gap-3 p-2.5 rounded-2xl group transition-all cursor-pointer"
                style={{
                  background: isCurrent ? `rgba(${rtPrimary},0.08)` : "rgba(255,255,255,0.025)",
                  border: `1px solid ${isCurrent ? `rgba(${rtPrimary},0.25)` : "rgba(255,255,255,0.06)"}`,
                }}
                onClick={() => onPlay && onPlay(track)}>
                {/* Cover */}
                <div className="relative flex-shrink-0">
                  {track.cover_url ? (
                    <img src={track.cover_url} alt={track.title}
                      className="w-11 h-11 rounded-xl object-cover" />
                  ) : (
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center"
                      style={{ background: `rgba(${rtPrimary},0.1)` }}>
                      <Music4 className="w-4 h-4" style={{ color: `rgba(${rtPrimary},0.5)` }} />
                    </div>
                  )}
                  <div className="absolute inset-0 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: "rgba(0,0,0,0.55)" }}>
                    {isCurrent && isPlaying
                      ? <Pause className="w-3.5 h-3.5 text-white" />
                      : <Play className="w-3.5 h-3.5 text-white ml-0.5" />}
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate leading-snug">{track.title}</p>
                  <p className="text-[11px] text-white/35 truncate">{track.artist_display || "Upper Vibe Media"}</p>
                </div>

                {/* Play button */}
                <button
                  className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all hover:brightness-110"
                  style={{ background: `rgba(${rtPrimary},0.1)`, border: `1px solid rgba(${rtPrimary},0.3)`, color: `rgb(${rtPrimary})` }}
                  onClick={(e) => { e.stopPropagation(); onPlay && onPlay(track); }}>
                  {isCurrent && isPlaying
                    ? <Pause className="w-3 h-3" />
                    : <Play className="w-3 h-3 ml-0.5" />}
                </button>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}