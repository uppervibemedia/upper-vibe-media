import React, { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Play, Pause, Music4, Waves, TrendingUp, ExternalLink, Download, Heart, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import SectionHeader from "../shared/SectionHeader";

/**
 * Scores tracks by real listener engagement:
 *   completionRate  × 40
 *   repeatPlayRate  × 30
 *   favoriteCount   × 20
 *   totalPlays      × 0.05   (raw plays, lower weight so it doesn't dominate)
 *   skipPenalty     × -25    (skip rate hurts ranking)
 */
function computeTrendingScores(tracks, streams, favCounts) {
  // Aggregate stream data per song_id
  const byTrack = {};
  for (const s of streams) {
    if (!s.song_id) continue;
    if (!byTrack[s.song_id]) byTrack[s.song_id] = { plays: 0, completions: 0 };
    byTrack[s.song_id].plays += 1;
    if (s.completed) byTrack[s.song_id].completions += 1;
  }

  return tracks
    .map((t) => {
      const stats      = byTrack[t.id] || { plays: 0, completions: 0 };
      const totalPlays = (t.plays || 0) + stats.plays; // Track.plays + SongStream sessions
      const completionRate = stats.plays > 0 ? stats.completions / stats.plays : 0;
      // Repeat play rate: if total plays >> unique sessions, repeat listeners
      const repeatPlayRate = totalPlays > 1 ? Math.min(stats.plays / Math.max(totalPlays, 1), 1) : 0;
      const favorites  = favCounts[t.id] || 0;
      // Skip rate is unknown from data — use inverse of completionRate as proxy
      const skipPenalty = stats.plays > 0 ? (1 - completionRate) : 0;

      const score =
        completionRate * 40 +
        repeatPlayRate * 30 +
        favorites      * 20 +
        totalPlays     * 0.05 +
        skipPenalty    * -25;

      return { ...t, _trendScore: score, _totalPlays: totalPlays, _completionRate: completionRate, _favorites: favorites };
    })
    .filter((t) => t.status === "published")
    .sort((a, b) => b._trendScore - a._trendScore)
    .slice(0, 6);
}

export default function TrendingTracksSection({ allTracks, currentTrack, isPlaying, handlePlayTrack, heartButton, downloadButton, user }) {
  const [streams, setStreams]     = useState([]);
  const [favCounts, setFavCounts] = useState({});
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    if (!allTracks || allTracks.length === 0) return;
    Promise.all([
      base44.entities.SongStream.list("-created_date", 500),
      base44.entities.Favorite.filter({ type: "track" }, "-created_date", 1000),
    ]).then(([streamData, favData]) => {
      setStreams(streamData);
      // Count favorites per track_id
      const counts = {};
      favData.forEach((f) => { if (f.track_id) counts[f.track_id] = (counts[f.track_id] || 0) + 1; });
      setFavCounts(counts);
      setLoading(false);
    });
  }, [allTracks?.length]);

  const trendingTracks = useMemo(
    () => computeTrendingScores(allTracks || [], streams, favCounts),
    [allTracks, streams, favCounts]
  );

  const isPremium = user?.role === "premium" || user?.tier === "premium" || user?.role === "admin";

  if (loading || trendingTracks.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-6 py-10">
      <SectionHeader
        label="Listener Picks"
        title="Trending Tracks"
        link="/music"
        linkLabel="All Music"
        labelColor="#00E5FF"
        labelIcon={<TrendingUp className="w-3 h-3" />}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {trendingTracks.map((track, i) => {
          const isCurrent = currentTrack?.id === track.id;
          return (
            <motion.div
              key={track.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-3 p-3.5 rounded-2xl group cursor-pointer transition-all hover:border-white/15 active:scale-[0.98]"
              style={{
                background: isCurrent ? "rgba(0,229,255,0.06)" : "rgba(255,255,255,0.025)",
                border: `1px solid ${isCurrent ? "rgba(0,229,255,0.2)" : "rgba(255,255,255,0.06)"}`,
              }}
              onClick={() => track.audio_url && handlePlayTrack(track)}
            >
              {/* Rank number */}
              <span className="flex-shrink-0 w-5 text-center text-[10px] font-black tabular-nums"
                style={{ color: i < 3 ? "#00E5FF" : "rgba(255,255,255,0.18)" }}>
                {i + 1}
              </span>

              {/* Art */}
              <div className="relative flex-shrink-0">
                {track.cover_url ? (
                  <img src={track.cover_url} alt={track.title} className="w-11 h-11 rounded-xl object-cover" />
                ) : (
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center"
                    style={{ background: "rgba(0,229,255,0.08)" }}>
                    <Music4 className="w-4 h-4 text-cyan-400/30" />
                  </div>
                )}
                <div className="absolute inset-0 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: "rgba(0,0,0,0.65)" }}>
                  {isCurrent && isPlaying
                    ? <Pause className="w-3.5 h-3.5 text-cyan-400" />
                    : <Play  className="w-3.5 h-3.5 text-white ml-0.5" />}
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <Link to={`/song/${track.id}`} onClick={(e) => e.stopPropagation()}
                  className="text-sm font-bold text-white truncate block hover:text-cyan-300 transition-colors">
                  {track.title}
                </Link>
                <p className="text-xs text-white/35 truncate">{track.artist_display || "Upper Vibe Media"}</p>
                {/* Micro stats */}
                <div className="flex items-center gap-2 mt-0.5">
                  {track._totalPlays > 0 && (
                    <span className="text-[9px] text-white/25 tabular-nums">{track._totalPlays} plays</span>
                  )}
                  {track._favorites > 0 && (
                    <span className="text-[9px] text-white/25 tabular-nums flex items-center gap-0.5">
                      <Heart className="w-2 h-2" />{track._favorites}
                    </span>
                  )}
                  {track._completionRate > 0 && (
                    <span className="text-[9px] text-white/20 tabular-nums">
                      {Math.round(track._completionRate * 100)}% completed
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-0.5 flex-shrink-0">
                <span className="flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: "rgba(0,229,255,0.1)", color: "#00E5FF" }}>
                  <Waves className="w-2 h-2" /> 432
                </span>
                {heartButton("track", track.id, { title: track.title, artist: track.artist_display, cover_url: track.cover_url })}
                {isPremium ? downloadButton(track) : (
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ color: "rgba(212,168,67,0.35)" }}>
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}