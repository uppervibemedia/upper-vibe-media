import React, { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play, Pause, Music4, Heart, Download, Lock,
  Tv2, ArrowRight, Waves, Sparkles
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useTheme } from "@/context/ThemeContext";
import { RADIO_THEMES } from "@/components/radio/RadioThemePicker";
// ── Badge definitions ────────────────────────────────────────────────────────
const BADGE_DEFS = {
  recommended:   { label: "💜 Recommended For You",  bg: "rgba(155,126,255,0.14)", border: "rgba(155,126,255,0.4)", color: "#c4aaff" },
  trending:      { label: "🔥 Trending Now",          bg: "rgba(245,158,11,0.12)",  border: "rgba(245,158,11,0.35)", color: "#F59E0B" },
  rising:        { label: "📈 Rising Fast",           bg: "rgba(74,222,128,0.12)",  border: "rgba(74,222,128,0.3)",  color: "#4ADE80" },
  communityFav:  { label: "❤️ Community Favorite",    bg: "rgba(239,68,68,0.1)",    border: "rgba(239,68,68,0.3)",   color: "#F87171" },
  mostSaved:     { label: "⭐ Most Saved",             bg: "rgba(212,168,67,0.12)",  border: "rgba(212,168,67,0.35)", color: "#D4A843" },
  mostDownloaded:{ label: "⬇️ Most Downloaded",        bg: "rgba(56,189,248,0.12)",  border: "rgba(56,189,248,0.3)",  color: "#38BDF8" },
  visualizer:    { label: "🎬 Visualizer",             bg: "rgba(0,229,255,0.1)",    border: "rgba(0,229,255,0.28)",  color: "#00E5FF" },
  academy:       { label: "🎓 Academy",               bg: "rgba(168,85,247,0.12)",  border: "rgba(168,85,247,0.3)",  color: "#A855F7" },
};

// Mood → track tags affinity map
const MOOD_AFFINITIES = {
  high_vibe:    ["high_vibe", "hiphop", "energy", "motivation"],
  intentional:  ["focus", "meditation_focus", "528hz", "432hz"],
  neutral:      ["432hz", "balance", "meditation_focus"],
  low_energy:   ["healing", "calm", "528hz", "432hz"],
  scattered:    ["focus", "grounding", "432hz"],
};

function scoreTagMatch(track, targetTags) {
  const haystack = [
    ...(track.mood_tags || []).map(t => t.toLowerCase()),
    ...(track.category_ids || []).map(t => t.toLowerCase()),
  ];
  let score = 0;
  targetTags.forEach(tag => {
    if (haystack.some(h => h.includes(tag) || tag.includes(h))) score += 2;
  });
  return score;
}

function computeCommunityScores(tracks, streams, favCounts, dlCounts) {
  const byTrack = {};
  for (const s of streams) {
    if (!s.song_id) continue;
    if (!byTrack[s.song_id]) byTrack[s.song_id] = { plays: 0, completions: 0 };
    byTrack[s.song_id].plays += 1;
    if (s.completed) byTrack[s.song_id].completions += 1;
  }
  return tracks.map(t => {
    const stats = byTrack[t.id] || { plays: 0, completions: 0 };
    const totalPlays = (t.plays || 0) + stats.plays;
    const completionRate = stats.plays > 0 ? stats.completions / stats.plays : 0;
    const favorites = favCounts[t.id] || 0;
    const downloads = dlCounts[t.id] || 0;
    return { ...t, _totalPlays: totalPlays, _completionRate: completionRate, _favorites: favorites, _downloads: downloads,
      _communityScore: completionRate * 40 + favorites * 20 + totalPlays * 0.05 + downloads * 5 };
  });
}

// ── Build the unified feed — 5 tracks + 3 visualizers, no academy ────────────
function buildFeed({ allTracks, allViz, streams, favCounts, dlCounts, userFavIds, targetTags, isLoggedIn }) {
  const publishedTracks = (allTracks || []).filter(t => t.status === "published" && t.audio_url);
  const scored = computeCommunityScores(publishedTracks, streams, favCounts, dlCounts);

  const byCommunity = [...scored].sort((a, b) => b._communityScore - a._communityScore);
  const byFavs = [...scored].sort((a, b) => b._favorites - a._favorites);
  const byDownloads = [...scored].sort((a, b) => b._downloads - a._downloads);
  const byRising = [...scored]
    .filter(t => t._totalPlays < 50)
    .sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0));

  const trackItems = [];
  const usedTrackIds = new Set();

  const addTrack = (track, badgeKey) => {
    if (!track || usedTrackIds.has(track.id) || trackItems.length >= 5) return;
    usedTrackIds.add(track.id);
    trackItems.push({ type: "track", data: track, badge: BADGE_DEFS[badgeKey] });
  };

  // 1. Personalized recommendations first
  if (isLoggedIn && targetTags.length) {
    const recommended = [...scored]
      .map(t => ({ ...t, _recScore: scoreTagMatch(t, targetTags) + (userFavIds.has(t.id) ? 3 : 0) }))
      .filter(t => t._recScore > 0)
      .sort((a, b) => b._recScore - a._recScore)
      .slice(0, 3);
    recommended.forEach(t => addTrack(t, "recommended"));
  }
  // 2. Fill remaining track slots with community scores
  byCommunity.slice(0, 3).forEach(t => addTrack(t, "trending"));
  addTrack(byFavs[0], "communityFav");
  addTrack(byDownloads[0], "mostDownloaded");
  byRising.slice(0, 2).forEach(t => addTrack(t, "rising"));
  byCommunity.forEach(t => addTrack(t, "trending"));

  // 3. Pick 3 visualizers
  const vizItems = (allViz || [])
    .filter(v => v.status === "published")
    .slice(0, 3)
    .map(v => ({ type: "visualizer", data: v, badge: BADGE_DEFS.visualizer }));

  // 4. Interleave: tracks at 0,1,2 → viz at 3 → tracks at 4,5 → viz at 6 → track at 7 → viz at 8
  const result = [];
  const t = [...trackItems];
  const v = [...vizItems];
  // positions: 0=track,1=track,2=track,3=viz,4=track,5=track,6=viz,7=track,8=viz
  const slots = ["t","t","t","v","t","t","v","t","v"];
  let ti = 0, vi = 0;
  for (const slot of slots) {
    if (slot === "t" && t[ti]) { result.push(t[ti++]); }
    else if (slot === "v" && v[vi]) { result.push(v[vi++]); }
  }
  // fill any remaining slots
  while (result.length < 8 && ti < t.length) result.push(t[ti++]);

  return result.slice(0, 8);
}

// ── Main component ────────────────────────────────────────────────────────────
export default function YourFrequencyFeed({
  allTracks, allViz,
  currentTrack, isPlaying, handlePlayTrack,
  user, isFaved, onToggleFav, themeColor,
}) {
  const [streams, setStreams] = useState([]);
  const [favCounts, setFavCounts] = useState({});
  const [dlCounts, setDlCounts] = useState({});
  const [userFavIds, setUserFavIds] = useState(new Set());
  const [checkIns, setCheckIns] = useState([]);
  const [loading, setLoading] = useState(true);

  const { accentId } = useTheme();
  const radioTheme = RADIO_THEMES[accentId] || RADIO_THEMES.cyan;
  const rtp = themeColor || radioTheme.vars["--rt-primary"];
  const navigate = useNavigate();

  const isPremium = user?.role === "premium" || user?.tier === "premium"
    || user?.role === "admin" || user?.role === "plus" || user?.tier === "plus";

  useEffect(() => {
    if (!allTracks?.length) return;
    const queries = [
      base44.entities.SongStream.list("-created_date", 500),
      base44.entities.Favorite.filter({ type: "track" }, "-created_date", 1000),
      base44.entities.Download.filter({ content_type: "track" }, "-created_date", 1000),
    ];
    if (user?.id) {
      queries.push(base44.entities.VibeCheckIn.filter({ user_id: user.id }, "-check_in_date", 7));
      queries.push(base44.entities.Favorite.filter({ user_email: user.email, type: "track" }, "-created_date", 200));
    }
    Promise.all(queries).then(([streamData, allFavs, dlData, ci, userFavs]) => {
      setStreams(streamData);
      const fc = {};
      allFavs.forEach(f => { if (f.track_id) fc[f.track_id] = (fc[f.track_id] || 0) + 1; });
      setFavCounts(fc);
      const dc = {};
      dlData.forEach(d => { if (d.content_id) dc[d.content_id] = (dc[d.content_id] || 0) + 1; });
      setDlCounts(dc);
      if (ci) setCheckIns(ci);
      if (userFavs) setUserFavIds(new Set(userFavs.map(f => f.track_id).filter(Boolean)));
      setLoading(false);
    });
  }, [allTracks?.length, user?.id]);

  // Dominant mood from recent check-ins
  const dominantMood = useMemo(() => {
    if (!checkIns.length) return null;
    const tally = {};
    checkIns.slice(0, 5).forEach(c => { tally[c.mood] = (tally[c.mood] || 0) + 1; });
    return Object.entries(tally).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  }, [checkIns]);

  const targetTags = useMemo(() =>
    dominantMood ? MOOD_AFFINITIES[dominantMood] || [] : [],
    [dominantMood]
  );

  const feed = useMemo(() => buildFeed({
    allTracks, allViz,
    streams, favCounts, dlCounts,
    userFavIds, targetTags,
    isLoggedIn: !!user,
  }), [allTracks, allViz, streams, favCounts, dlCounts, userFavIds, targetTags, user]);

  if (loading || !feed.length) return null;

  const MOOD_META = {
    high_vibe:    { emoji: "⚡", label: "High Vibe", color: "#4ADE80" },
    intentional:  { emoji: "🎯", label: "Intentional", color: "#38BDF8" },
    neutral:      { emoji: "😌", label: "Balanced", color: "#9B7EFF" },
    low_energy:   { emoji: "🌊", label: "Low Energy", color: "#60A5FA" },
    scattered:    { emoji: "🌀", label: "Scattered", color: "#FB923C" },
  };
  const moodMeta = dominantMood ? MOOD_META[dominantMood] : null;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10">

      {/* ── Header ── */}
      <div className="mb-7">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-px h-4 rounded-full" style={{ background: `rgb(${rtp})` }} />
          <span className="text-[10px] font-black tracking-[0.35em] uppercase" style={{ color: `rgb(${rtp})` }}>
            Personalized For You
          </span>
        </div>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap mb-1">
              <h2 className="font-heading font-black text-3xl md:text-4xl text-white leading-tight">
                My Vibe Feed
              </h2>
              {moodMeta && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black flex-shrink-0"
                  style={{ background: `rgba(${rtp},0.1)`, border: `1px solid rgba(${rtp},0.3)`, color: `rgb(${rtp})` }}>
                  {moodMeta.emoji} Current Vibe: {moodMeta.label}
                </span>
              )}
            </div>
            <p className="text-white/35 text-sm max-w-xl">
              Personalized from your listening habits, favorites, downloads, and Vibe Check results.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {user && (
              <Link to="/vibe-check"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black tracking-wide transition-all hover:brightness-110"
                style={{ background: `rgba(${rtp},0.08)`, border: `1px solid rgba(${rtp},0.22)`, color: `rgb(${rtp})` }}>
                <Sparkles className="w-2.5 h-2.5" /> Vibe Check
              </Link>
            )}
            <Link to="/music"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black tracking-wide transition-all hover:brightness-110"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.5)" }}>
              All Music <ArrowRight className="w-2.5 h-2.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* ── Feed grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        <AnimatePresence>
          {feed.map((item, i) => (
            <motion.div
              key={item.type + "-" + item.data.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.035, ease: [0.22, 1, 0.36, 1] }}
            >
              {item.type === "track" && (
                <TrackCard
                  track={item.data}
                  badge={item.badge}
                  index={i}
                  currentTrack={currentTrack}
                  isPlaying={isPlaying}
                  handlePlayTrack={handlePlayTrack}
                  isFaved={isFaved}
                  onToggleFav={onToggleFav}
                  navigate={navigate}
                  isPremium={isPremium}
                  rtp={rtp}
                />
              )}
              {item.type === "visualizer" && (
                <VisualizerCard viz={item.data} badge={item.badge} rtp={rtp} />
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* ── CTAs ── */}
      <div className="flex flex-wrap gap-3 justify-center mt-6">
        <Link to="/my-feed"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-black text-sm tracking-wide transition-all hover:brightness-110 active:scale-[0.97]"
          style={{ background: `rgba(${rtp},0.09)`, border: `1px solid rgba(${rtp},0.3)`, color: `rgb(${rtp})`, boxShadow: `0 0 20px rgba(${rtp},0.09)` }}>
          <Sparkles className="w-4 h-4" /> See More Personalized Picks
        </Link>
        <Link to="/music"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-black text-sm tracking-wide transition-all hover:brightness-110 active:scale-[0.97]"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.5)" }}>
          <Waves className="w-4 h-4" /> Browse All Music
        </Link>
      </div>
    </section>
  );
}

// ── Sub-cards ─────────────────────────────────────────────────────────────────

function TrackCard({ track, badge, index, currentTrack, isPlaying, handlePlayTrack, isFaved, onToggleFav, navigate, isPremium, rtp }) {
  const isCurrent = currentTrack?.id === track.id;
  const isGold = badge?.color === "#D4A843" || badge?.color === "#F59E0B";

  return (
    <div
      className="flex items-center gap-3 p-3.5 rounded-2xl group cursor-pointer transition-all active:scale-[0.98] hover:border-white/15"
      style={{
        background: isCurrent ? `rgba(${rtp},0.07)` : isGold && index === 0 ? "rgba(212,168,67,0.04)" : "rgba(255,255,255,0.025)",
        border: isCurrent ? `1px solid rgba(${rtp},0.28)` : isGold && index === 0 ? "1px solid rgba(212,168,67,0.2)" : "1px solid rgba(255,255,255,0.06)",
        boxShadow: isCurrent ? `0 0 18px rgba(${rtp},0.1)` : "none",
      }}
      onClick={() => track.audio_url && handlePlayTrack(track)}
    >
      {/* Art */}
      <div className="relative flex-shrink-0">
        {track.cover_url ? (
          <img src={track.cover_url} alt={track.title} width={48} height={48} loading="lazy"
            className="w-12 h-12 rounded-xl object-cover" />
        ) : (
          <div className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: `rgba(${rtp},0.08)` }}>
            <Music4 className="w-5 h-5" style={{ color: `rgba(${rtp},0.25)` }} />
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
        <Link to={`/song/${track.id}`}
          onClick={e => e.stopPropagation()}
          className="text-sm font-bold text-white truncate block hover:underline">
          {track.title}
        </Link>
        <p className="text-[11px] text-white/35 truncate mt-0.5">{track.artist_display || "Upper Vibe Media"}</p>
        {badge && (
          <span className="inline-block mt-1 text-[9px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: badge.bg, border: `1px solid ${badge.border}`, color: badge.color }}>
            {badge.label}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={e => { e.stopPropagation(); onToggleFav && onToggleFav(track); }}
          className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:scale-110"
          style={isFaved && isFaved("track", track.id) ? {
            background: "rgba(155,126,255,0.22)", border: "1px solid rgba(155,126,255,0.55)", color: "#9B7EFF"
          } : {
            background: "rgba(155,126,255,0.05)", border: "1px solid rgba(155,126,255,0.22)", color: "rgba(155,126,255,0.5)"
          }}>
          <Heart className={`w-3.5 h-3.5 ${isFaved && isFaved("track", track.id) ? "fill-current" : ""}`} />
        </button>
        <button
          onClick={e => { e.stopPropagation(); navigate(`/song/${track.id}?downloadIntent=true`); }}
          className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:scale-110"
          style={{
            background: isPremium ? "rgba(212,168,67,0.1)" : "rgba(212,168,67,0.04)",
            border: `1px solid ${isPremium ? "rgba(212,168,67,0.25)" : "rgba(212,168,67,0.1)"}`,
            color: isPremium ? "#D4A843" : "rgba(212,168,67,0.3)",
          }}>
          {isPremium ? <Download className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
}

// Visualizer card — taller (uses 4:3-ish thumbnail ratio), deep-links to exact item
function VisualizerCard({ viz, rtp }) {
  const dest = `/visualizers?play=${viz.id}`;
  return (
    <Link to={dest}
      className="block rounded-2xl group transition-all active:scale-[0.98] overflow-hidden"
      style={{ background: "rgba(0,229,255,0.03)", border: "1px solid rgba(0,229,255,0.15)" }}>
      {/* Thumbnail — 4:3 ratio → ~25% taller than song card */}
      <div className="relative overflow-hidden" style={{ paddingBottom: "62%" }}>
        <div className="absolute inset-0">
          {viz.thumbnail_url ? (
            <img src={viz.thumbnail_url} alt={viz.title} loading="lazy"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ background: "rgba(0,229,255,0.06)" }}>
              <Tv2 className="w-8 h-8 text-cyan-400/20" />
            </div>
          )}
          {/* Hover play overlay */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: "rgba(0,0,0,0.45)" }}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: "rgba(0,160,220,0.9)", boxShadow: "0 0 20px rgba(0,160,220,0.5)" }}>
              <Play className="w-4 h-4 text-white ml-0.5" />
            </div>
          </div>
          {/* Badge */}
          <div className="absolute top-2 left-2">
            <span className="text-[8px] font-black px-2 py-1 rounded-full"
              style={{ background: "rgba(0,160,220,0.85)", color: "#fff" }}>🎬 Visualizer</span>
          </div>
        </div>
      </div>
      {/* Info row */}
      <div className="flex items-center justify-between gap-2 px-3 py-2.5">
        <div className="min-w-0">
          <p className="text-sm font-bold text-white truncate">{viz.title}</p>
          <p className="text-[11px] text-white/35 truncate mt-0.5">{viz.artist || "Upper Vibe Media"}</p>
        </div>
        <span className="flex-shrink-0 text-[10px] font-black px-3 py-1.5 rounded-full transition-all group-hover:brightness-125"
          style={{ background: "rgba(0,229,255,0.1)", border: "1px solid rgba(0,229,255,0.28)", color: "#00E5FF" }}>
          Watch
        </span>
      </div>
    </Link>
  );
}