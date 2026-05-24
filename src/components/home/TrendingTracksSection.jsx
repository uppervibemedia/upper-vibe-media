import React, { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Play, Pause, Music4, TrendingUp, Lock, Heart, Download } from "lucide-react";
import FreqBadge from "@/components/shared/FreqBadge";
import { Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import SectionHeader from "../shared/SectionHeader";
import { useTheme } from "@/context/ThemeContext";
import { RADIO_THEMES } from "@/components/radio/RadioThemePicker";

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

// Fixed accent colors — always the same regardless of theme
const PURPLE  = "155,126,255";   // hearts — always purple
const BLUE    = "0,160,220";     // 432 Hz badge — always electric blue
const AMBER   = "212,168,67";    // download lock — always midnight amber

// Cycling insight colors (theme-independent, rotates through all 3)
const INSIGHT_COLORS = [
  { color: "0,160,220",   label: "🔥 Most Played Today" },   // electric blue
  { color: "155,126,255", label: "Listener Favorite" },       // purple
  { color: "212,168,67",  label: "Rising" },                  // amber
  { color: "0,160,220",   label: "High Energy" },             // electric blue
  { color: "155,126,255", label: "Fan Favorite" },            // purple
  { color: "212,168,67",  label: "Trending" },                // amber
];

export default function TrendingTracksSection({ allTracks, currentTrack, isPlaying, handlePlayTrack, user, onToggleFav, isFaved, themeColor }) {
  const [streams, setStreams]     = useState([]);
  const [favCounts, setFavCounts] = useState({});
  const [loading, setLoading]     = useState(true);
  const { accentId } = useTheme();
  const radioTheme = RADIO_THEMES[accentId] || RADIO_THEMES.cyan;
  const rtp = themeColor || radioTheme.vars["--rt-primary"];   // theme primary — used for rank #1-3 & card active state

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

  const isPremium = user?.role === "premium" || user?.tier === "premium" || user?.role === "admin" || user?.role === "plus" || user?.tier === "plus";
  const navigate = useNavigate();

  if (loading || trendingTracks.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-6 py-10">
      <SectionHeader
        label="Listener Picks"
        title="Trending Tracks"
        link="/music"
        linkLabel="All Music"
        labelColor={`rgb(${rtp})`}
        labelIcon={<TrendingUp className="w-3 h-3" />}
        themeColor={rtp}
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
              className="flex items-center gap-3 p-3.5 rounded-2xl group cursor-pointer transition-all active:scale-[0.98]"
              style={{
                background: isCurrent ? `rgba(${rtp},0.06)` : "rgba(255,255,255,0.025)",
                border: `1px solid ${isCurrent ? `rgba(${rtp},0.22)` : "rgba(255,255,255,0.06)"}`,
                boxShadow: isCurrent ? `0 0 18px rgba(${rtp},0.08)` : "none",
              }}
              onClick={() => track.audio_url && handlePlayTrack(track)}
            >
              {/* Rank number — theme color for top 3, faded for rest */}
              <span className="flex-shrink-0 w-5 text-center text-[10px] font-black tabular-nums"
                style={{ color: i < 3 ? `rgb(${rtp})` : "rgba(255,255,255,0.18)" }}>
                {i + 1}
              </span>

              {/* Art */}
              <div className="relative flex-shrink-0">
                {track.cover_url ? (
                  <img src={track.cover_url} alt={track.title} className="w-11 h-11 rounded-xl object-cover" />
                ) : (
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center"
                    style={{ background: `rgba(${rtp},0.08)` }}>
                    <Music4 className="w-4 h-4" style={{ color: `rgba(${rtp},0.3)` }} />
                  </div>
                )}
                <div className="absolute inset-0 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: "rgba(0,0,0,0.65)" }}>
                  {isCurrent && isPlaying
                    ? <Pause className="w-3.5 h-3.5" style={{ color: `rgb(${rtp})` }} />
                    : <Play  className="w-3.5 h-3.5 text-white ml-0.5" />}
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <Link to={`/song/${track.id}`} onClick={(e) => e.stopPropagation()}
                  className="text-sm font-bold text-white truncate block transition-colors"
                  style={{ ["--hover-color"]: `rgb(${rtp})` }}
                  onMouseEnter={e => e.currentTarget.style.color = `rgb(${rtp})`}
                  onMouseLeave={e => e.currentTarget.style.color = ""}>
                  {track.title}
                </Link>
                <p className="text-xs text-white/35 truncate">{track.artist_display || "Upper Vibe Media"}</p>
                {/* Insights — cycle through cyan / purple / amber in order */}
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[9px] font-bold tracking-wide"
                    style={{ color: `rgba(${INSIGHT_COLORS[i % INSIGHT_COLORS.length].color},0.75)` }}>
                    {INSIGHT_COLORS[i].label}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-0.5 flex-shrink-0">
                {/* 432 badge — always electric blue */}
                <FreqBadge label="432" />
                {/* Heart — always purple */}
                <button
                  onClick={(e) => { e.stopPropagation(); onToggleFav && onToggleFav(track); }}
                  className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-110"
                  style={isFaved && isFaved("track", track.id) ? {
                    background: "rgba(155,126,255,0.22)", border: "1px solid rgba(155,126,255,0.55)", color: "#9B7EFF"
                  } : {
                    background: "rgba(155,126,255,0.06)", border: "1px solid rgba(155,126,255,0.35)", color: "rgba(155,126,255,0.6)"
                  }}>
                  <Heart className={`w-3.5 h-3.5 ${isFaved && isFaved("track", track.id) ? "fill-current" : ""}`} />
                </button>
                {/* Download — routes to song page */}
                <button
                  onClick={(e) => { e.stopPropagation(); navigate(`/song/${track.id}?downloadIntent=true`); }}
                  className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-110"
                  style={{
                    background: isPremium ? "rgba(212,168,67,0.1)" : "rgba(212,168,67,0.06)",
                    border: `1px solid ${isPremium ? "rgba(212,168,67,0.25)" : "rgba(212,168,67,0.15)"}`,
                    color: isPremium ? "#D4A843" : `rgba(${AMBER},0.4)`,
                  }}
                  title={isPremium ? "Download on song page" : "Upgrade to Plus to download"}>
                  {isPremium ? <Download className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}