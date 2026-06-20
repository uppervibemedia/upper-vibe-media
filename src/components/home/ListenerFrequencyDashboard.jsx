import React, { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Play, Pause, Music4, Heart, Download, Lock,
  Flame, Zap, ArrowRight, TrendingUp, Star, Crown
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import FavoriteButton from "@/components/shared/FavoriteButton";
import { useTheme } from "@/context/ThemeContext";
import { RADIO_THEMES } from "@/components/radio/RadioThemePicker";

// ── Scoring ────────────────────────────────────────────────────────────────
function computeScores(tracks, streams, favCounts, downloadCounts) {
  const byTrack = {};
  for (const s of streams) {
    if (!s.song_id) continue;
    if (!byTrack[s.song_id]) byTrack[s.song_id] = { plays: 0, completions: 0 };
    byTrack[s.song_id].plays += 1;
    if (s.completed) byTrack[s.song_id].completions += 1;
  }
  return tracks
    .filter((t) => t.status === "published" && t.audio_url)
    .map((t) => {
      const stats = byTrack[t.id] || { plays: 0, completions: 0 };
      const totalPlays = (t.plays || 0) + stats.plays;
      const completionRate = stats.plays > 0 ? stats.completions / stats.plays : 0;
      const favorites = favCounts[t.id] || 0;
      const downloads = downloadCounts[t.id] || 0;
      const score = completionRate * 40 + favorites * 20 + totalPlays * 0.05 + downloads * 5;
      return { ...t, _score: score, _totalPlays: totalPlays, _favorites: favorites, _downloads: downloads };
    })
    .sort((a, b) => b._score - a._score);
}

// ── Badge logic ────────────────────────────────────────────────────────────
const BADGES = {
  mostPlayed:    { text: "🔥 Most Played Today",  bg: "rgba(245,158,11,0.12)",  border: "rgba(245,158,11,0.3)",  color: "#F59E0B" },
  favorite:      { text: "❤️ Listener Favorite",  bg: "rgba(239,68,68,0.1)",    border: "rgba(239,68,68,0.28)",  color: "#F87171" },
  risingFast:    { text: "⬆️ Rising Fast",         bg: "rgba(74,222,128,0.1)",   border: "rgba(74,222,128,0.28)", color: "#4ADE80" },
  trending:      { text: "⚡ Trending Now",         bg: "rgba(0,229,255,0.1)",    border: "rgba(0,229,255,0.25)",  color: "#00E5FF" },
  hiddenGem:     { text: "🌟 Hidden Gem",          bg: "rgba(155,126,255,0.1)",  border: "rgba(155,126,255,0.3)", color: "#9B7EFF" },
  top10:         { text: "👑 Top 10",              bg: "rgba(212,168,67,0.12)",  border: "rgba(212,168,67,0.3)",  color: "#D4A843" },
  mostDownloaded:{ text: "⬇️ Most Downloaded",     bg: "rgba(56,189,248,0.1)",   border: "rgba(56,189,248,0.28)", color: "#38BDF8" },
};

function getBadge(track, index, filter, statsRanks) {
  if (filter === "mostPlayed")    return BADGES.mostPlayed;
  if (filter === "mostSaved")     return BADGES.favorite;
  if (filter === "mostDownloaded")return BADGES.mostDownloaded;
  if (filter === "rising")        return BADGES.risingFast;
  // 'all' tab — assign by position or data
  if (index === 0)                            return BADGES.mostPlayed;
  if (track._favorites > 0 && index === 1)   return BADGES.favorite;
  if (index === 2)                            return BADGES.risingFast;
  if (index < 6)                             return BADGES.trending;
  if (track._score < 2)                      return BADGES.hiddenGem;
  return BADGES.top10;
}

// ── TABS ───────────────────────────────────────────────────────────────────
const TABS = [
  { id: "all",            label: "All" },
  { id: "mostPlayed",     label: "Most Played" },
  { id: "mostSaved",      label: "Most Saved" },
  { id: "mostDownloaded", label: "Most Downloaded" },
  { id: "rising",         label: "Rising" },
];

export default function ListenerFrequencyDashboard({
  allTracks, currentTrack, isPlaying, handlePlayTrack,
  user, onToggleFav, isFaved, themeColor, onNeedLogin,
}) {
  const [streams, setStreams]       = useState([]);
  const [favCounts, setFavCounts]   = useState({});
  const [dlCounts, setDlCounts]     = useState({});
  const [loading, setLoading]       = useState(true);
  const [tab, setTab]               = useState("all");
  const { accentId } = useTheme();
  const radioTheme = RADIO_THEMES[accentId] || RADIO_THEMES.cyan;
  const rtp = themeColor || radioTheme.vars["--rt-primary"];
  const navigate = useNavigate();

  const isPremium = user?.role === "premium" || user?.tier === "premium"
    || user?.role === "admin" || user?.role === "plus" || user?.tier === "plus";

  useEffect(() => {
    if (!allTracks?.length) return;
    // Sequenced to avoid rate limiting
    (async () => {
      const streamData = await base44.entities.SongStream.list("-created_date", 500);
      const favData = await base44.entities.Favorite.filter({ type: "track" }, "-created_date", 1000);
      const dlData = await base44.entities.Download.filter({ content_type: "track" }, "-created_date", 1000);
      return [streamData, favData, dlData];
    })().then(([streamData, favData, dlData]) => {
      setStreams(streamData);
      const fc = {};
      favData.forEach((f) => { if (f.track_id) fc[f.track_id] = (fc[f.track_id] || 0) + 1; });
      setFavCounts(fc);
      const dc = {};
      dlData.forEach((d) => { if (d.content_id) dc[d.content_id] = (dc[d.content_id] || 0) + 1; });
      setDlCounts(dc);
      setLoading(false);
    });
  }, [allTracks?.length]);

  const scored = useMemo(
    () => computeScores(allTracks || [], streams, favCounts, dlCounts),
    [allTracks, streams, favCounts, dlCounts]
  );

  const filtered = useMemo(() => {
    if (tab === "mostPlayed")     return [...scored].sort((a,b) => b._totalPlays - a._totalPlays);
    if (tab === "mostSaved")      return [...scored].sort((a,b) => b._favorites - a._favorites);
    if (tab === "mostDownloaded") return [...scored].sort((a,b) => b._downloads - a._downloads);
    if (tab === "rising")         return [...scored].slice().reverse().slice(0, 12); // lower scores = newer/rising
    return scored;
  }, [scored, tab]);

  const pulse = useMemo(() => {
    if (!scored.length) return {};
    const byPlays = [...scored].sort((a,b) => b._totalPlays - a._totalPlays);
    const byFavs  = [...scored].sort((a,b) => b._favorites  - a._favorites);
    const byDl    = [...scored].sort((a,b) => b._downloads  - a._downloads);
    return {
      mostPlayed:    byPlays[0],
      mostSaved:     byFavs[0],
      mostDownloaded:byDl[0],
      fastestGrowing:scored[2] || scored[0], // 3rd overall trending = fast mover
    };
  }, [scored]);

  if (loading || !scored.length) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10">

      {/* ── Section header ── */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-px h-4 rounded-full" style={{ background: `rgb(${rtp})` }} />
          <span className="text-[10px] font-black tracking-[0.35em] uppercase" style={{ color: `rgb(${rtp})` }}>Listener Frequency</span>
        </div>
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h2 className="font-heading font-black text-3xl md:text-4xl text-white leading-tight">
              Frequency Pulse
            </h2>
            <p className="text-white/40 text-sm mt-1">
              The songs the community is vibing with right now.
            </p>
            <p className="text-[10px] text-white/20 mt-0.5">
              Updated daily based on plays, saves, and downloads.
            </p>
          </div>
          <Link to="/music"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-black tracking-wide transition-all hover:brightness-110 flex-shrink-0"
            style={{ background: `rgba(${rtp},0.08)`, border: `1px solid rgba(${rtp},0.25)`, color: `rgb(${rtp})` }}>
            All Music <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* ── Frequency Pulse summary card ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="relative rounded-2xl p-5 mb-7 overflow-hidden"
        style={{
          background: "linear-gradient(135deg,rgba(155,126,255,0.08),rgba(0,160,220,0.05))",
          border: "1px solid rgba(155,126,255,0.22)",
          boxShadow: "0 0 40px rgba(155,126,255,0.08)",
        }}>
        {/* Subtle glow */}
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full blur-[60px] pointer-events-none"
          style={{ background: `rgba(${rtp},0.15)` }} />
        <p className="text-[9px] font-black tracking-[0.3em] uppercase text-white/40 mb-4 relative z-10">Frequency Pulse</p>
        <div className="grid grid-cols-2 gap-y-4 gap-x-6 relative z-10">
          <PulseStat icon={<Flame className="w-3.5 h-3.5 text-orange-400" />} label="Most Played Today"  track={pulse.mostPlayed} />
          <PulseStat icon={<Heart className="w-3.5 h-3.5 text-red-400" />}   label="Most Saved"         track={pulse.mostSaved} />
          <PulseStat icon={<Download className="w-3.5 h-3.5 text-cyan-400" />} label="Most Downloaded"  track={pulse.mostDownloaded} />
          <PulseStat icon={<Zap className="w-3.5 h-3.5 text-purple-400" />}  label="Fastest Growing"    track={pulse.fastestGrowing} />
        </div>
      </motion.div>

      {/* ── Filter tabs ── */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1 no-scrollbar">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all flex-shrink-0"
            style={tab === t.id ? {
              background: `rgba(${rtp},0.15)`,
              border: `1px solid rgba(${rtp},0.4)`,
              color: `rgb(${rtp})`,
            } : {
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "rgba(255,255,255,0.4)",
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Ranked list ── */}
      <div className="space-y-2">
        {filtered.slice(0, 8).map((track, i) => {
          const isCurrent = currentTrack?.id === track.id;
          const badge = getBadge(track, i, tab, {});
          const isGold = i === 0;
          return (
            <motion.div
              key={track.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-center gap-3 p-3.5 rounded-2xl group cursor-pointer transition-all active:scale-[0.98]"
              style={{
                background: isCurrent
                  ? `rgba(${rtp},0.07)`
                  : isGold
                    ? "rgba(212,168,67,0.04)"
                    : "rgba(255,255,255,0.025)",
                border: isCurrent
                  ? `1px solid rgba(${rtp},0.25)`
                  : isGold
                    ? "1px solid rgba(212,168,67,0.18)"
                    : "1px solid rgba(255,255,255,0.06)",
                boxShadow: isCurrent ? `0 0 18px rgba(${rtp},0.09)` : isGold ? "0 0 20px rgba(212,168,67,0.08)" : "none",
              }}
              onClick={() => track.audio_url && handlePlayTrack(track)}
            >
              {/* Rank */}
              <span className="flex-shrink-0 w-6 text-center text-[11px] font-black tabular-nums"
                style={{ color: i === 0 ? "#D4A843" : i < 3 ? `rgb(${rtp})` : "rgba(255,255,255,0.18)" }}>
                {i + 1}
              </span>

              {/* Art */}
              <div className="relative flex-shrink-0">
                {track.cover_url ? (
                  <img src={track.cover_url} alt={track.title} width={44} height={44} loading="lazy"
                    className="w-11 h-11 rounded-xl object-cover" />
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
                    : <Play className="w-3.5 h-3.5 text-white ml-0.5" />}
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <Link to={`/song/${track.id}`} onClick={(e) => e.stopPropagation()}
                  className="text-sm font-bold text-white hover:underline leading-snug"
                  style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {track.title}
                </Link>
                <p className="text-[11px] text-white/35 truncate mt-0.5">{track.artist_display || "Upper Vibe Media"}</p>
                <span className="inline-block mt-0.5 text-[9px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: badge.bg, border: `1px solid ${badge.border}`, color: badge.color }}>
                  {badge.text}
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <FavoriteButton
                  type="track"
                  id={track.id}
                  meta={{ title: track.title, artist: track.artist_display, cover_url: track.cover_url }}
                  onNeedLogin={onNeedLogin}
                />
                <button
                  onClick={(e) => { e.stopPropagation(); navigate(`/song/${track.id}?downloadIntent=true`); }}
                  className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:scale-110"
                  style={{
                    background: isPremium ? "rgba(212,168,67,0.1)" : "rgba(212,168,67,0.05)",
                    border: `1px solid ${isPremium ? "rgba(212,168,67,0.25)" : "rgba(212,168,67,0.12)"}`,
                    color: isPremium ? "#D4A843" : "rgba(212,168,67,0.35)",
                  }}>
                  {isPremium ? <Download className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ── CTA ── */}
      <div className="text-center mt-8">
        <Link to="/music"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-black text-sm tracking-wide transition-all hover:brightness-110 active:scale-[0.97]"
          style={{
            background: `rgba(${rtp},0.09)`,
            border: `1px solid rgba(${rtp},0.3)`,
            color: `rgb(${rtp})`,
            boxShadow: `0 0 20px rgba(${rtp},0.1)`,
          }}>
          View All Listener Picks <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </section>
  );
}

function PulseStat({ icon, label, track }) {
  return (
    <div className="flex items-start gap-2.5 min-w-0">
      <div className="flex-shrink-0 mt-0.5">{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] text-white/35 mb-0.5">{label}</p>
        {track
          ? <p className="text-sm font-bold text-white truncate">{track.title}</p>
          : <p className="text-xs text-white/20">Building data…</p>}
      </div>
    </div>
  );
}