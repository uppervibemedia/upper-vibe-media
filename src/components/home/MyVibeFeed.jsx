import React, { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Sparkles, Play, Pause, Music4, Tv2, GraduationCap,
  Heart, Zap, ArrowRight, Waves
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useTheme } from "@/context/ThemeContext";
import { RADIO_THEMES } from "@/components/radio/RadioThemePicker";

// Map VibeCheck moods to track mood_tags / category slugs we should surface
const MOOD_AFFINITIES = {
  high_vibe:    ["high_vibe", "hiphop", "energy", "motivation", "celebration"],
  intentional:  ["focus", "meditation_focus", "528hz", "432hz", "intention"],
  neutral:      ["432hz", "meditation_focus", "balance"],
  low_energy:   ["meditation_focus", "432hz", "healing", "calm", "528hz"],
  scattered:    ["432hz", "focus", "grounding", "meditation_focus", "balance"],
};

const MOOD_LABELS = {
  high_vibe:    { emoji: "⚡", label: "High Vibe", color: "#4ADE80" },
  intentional:  { emoji: "🎯", label: "Intentional", color: "#38BDF8" },
  neutral:      { emoji: "😌", label: "Balanced", color: "#9B7EFF" },
  low_energy:   { emoji: "🌊", label: "Low Energy", color: "#60A5FA" },
  scattered:    { emoji: "🌀", label: "Scattered", color: "#FB923C" },
};

// Score a track for relevance given a set of target tags
function scoreTrackRelevance(track, targetTags, favSet) {
  let score = 0;
  const moodTags = track.mood_tags || [];
  const catIds = track.category_ids || [];
  const haystack = [...moodTags.map(t => t.toLowerCase()), ...catIds.map(t => t.toLowerCase())];
  targetTags.forEach(tag => { if (haystack.some(h => h.includes(tag) || tag.includes(h))) score += 2; });
  if (favSet.has(track.id)) score += 5; // boost already-loved tracks' similar items are surfaced more
  if (track.is_featured) score += 1;
  if (track.is_new_release) score += 1;
  return score;
}

export default function MyVibeFeed({ allTracks, allViz, academyLessons, currentTrack, isPlaying, handlePlayTrack, user, isFaved, onToggleFav, themeColor }) {
  const [checkIns, setCheckIns] = useState([]);
  const [favTrackIds, setFavTrackIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const { accentId } = useTheme();
  const radioTheme = RADIO_THEMES[accentId] || RADIO_THEMES.cyan;
  const rtp = themeColor || radioTheme.vars["--rt-primary"];
  const navigate = useNavigate();

  useEffect(() => {
    if (!user?.email) { setLoading(false); return; }
    Promise.all([
      base44.entities.VibeCheckIn.filter({ user_id: user.id }, "-check_in_date", 7),
      base44.entities.Favorite.filter({ user_email: user.email, type: "track" }, "-created_date", 200),
    ]).then(([ci, favs]) => {
      setCheckIns(ci);
      setFavTrackIds(new Set(favs.map(f => f.track_id).filter(Boolean)));
      setLoading(false);
    });
  }, [user?.email]);

  // Derive dominant mood from recent check-ins
  const dominantMood = useMemo(() => {
    if (!checkIns.length) return null;
    const recent = checkIns.slice(0, 5);
    const tally = {};
    recent.forEach(c => { tally[c.mood] = (tally[c.mood] || 0) + 1; });
    return Object.entries(tally).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  }, [checkIns]);

  // Derive target tags from dominant mood
  const targetTags = useMemo(() =>
    dominantMood ? MOOD_AFFINITIES[dominantMood] || [] : ["432hz", "high_vibe"],
    [dominantMood]
  );

  // Score & rank tracks — exclude already fav'd ones to surface new discoveries
  const suggestedTracks = useMemo(() => {
    if (!allTracks?.length) return [];
    const published = allTracks.filter(t => t.status === "published" && t.audio_url);
    return published
      .map(t => ({ ...t, _relevance: scoreTrackRelevance(t, targetTags, favTrackIds) }))
      .sort((a, b) => b._relevance - a._relevance)
      .slice(0, 4);
  }, [allTracks, targetTags, favTrackIds]);

  // Suggested visualizers — just pick the first few for now (can be mood-matched later)
  const suggestedViz = useMemo(() => (allViz || []).filter(v => v.status === "published").slice(0, 2), [allViz]);

  // Suggested lessons — pick featured or most recent
  const suggestedLessons = useMemo(() => (academyLessons || []).slice(0, 2), [academyLessons]);

  // Don't render for logged-out users or while loading
  if (!user || loading) return null;
  // Don't render if there's truly no data
  if (!suggestedTracks.length && !suggestedViz.length && !suggestedLessons.length) return null;

  const moodInfo = dominantMood ? MOOD_LABELS[dominantMood] : null;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      {/* Header */}
      <div className="flex items-end justify-between gap-3 mb-5 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-px h-4 rounded-full" style={{ background: `rgb(${rtp})` }} />
            <span className="text-[10px] font-black tracking-[0.35em] uppercase" style={{ color: `rgb(${rtp})` }}>
              Personalized for You
            </span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="font-heading font-black text-3xl md:text-4xl text-white leading-tight">
              My Vibe Feed
            </h2>
            {moodInfo && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
                style={{ background: `${moodInfo.color}18`, border: `1px solid ${moodInfo.color}40`, color: moodInfo.color }}>
                <span>{moodInfo.emoji}</span>
                <span>Your vibe: {moodInfo.label}</span>
              </div>
            )}
          </div>
          <p className="text-white/35 text-sm mt-1">
            {checkIns.length > 0
              ? "Curated from your Vibe Check history, mood patterns, and saved music."
              : "Based on your saves and what's resonating on Upper Vibe Media."}
          </p>
        </div>
        <Link to="/vibe-check"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-black tracking-wide transition-all hover:brightness-110 flex-shrink-0"
          style={{ background: `rgba(${rtp},0.08)`, border: `1px solid rgba(${rtp},0.25)`, color: `rgb(${rtp})` }}>
          <Sparkles className="w-3 h-3" /> Vibe Check
        </Link>
      </div>

      {/* Suggested Tracks */}
      {suggestedTracks.length > 0 && (
        <div className="mb-8">
          <p className="text-[10px] font-black tracking-[0.25em] uppercase text-white/30 mb-3 flex items-center gap-2">
            <Music4 className="w-3 h-3" /> Suggested Tracks
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {suggestedTracks.map((track, i) => {
              const isCurrent = currentTrack?.id === track.id;
              return (
                <motion.div
                  key={track.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-3 p-3 rounded-2xl group cursor-pointer transition-all active:scale-[0.98]"
                  style={{
                    background: isCurrent ? `rgba(${rtp},0.07)` : "rgba(255,255,255,0.025)",
                    border: `1px solid ${isCurrent ? `rgba(${rtp},0.25)` : "rgba(255,255,255,0.06)"}`,
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
                        <Music4 className="w-5 h-5" style={{ color: `rgba(${rtp},0.3)` }} />
                      </div>
                    )}
                    <div className="absolute inset-0 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: "rgba(0,0,0,0.6)" }}>
                      {isCurrent && isPlaying
                        ? <Pause className="w-3.5 h-3.5" style={{ color: `rgb(${rtp})` }} />
                        : <Play className="w-3.5 h-3.5 text-white ml-0.5" />}
                    </div>
                  </div>
                  {/* Info */}
                  <Link to={`/song/${track.id}`} className="flex-1 min-w-0 hover:opacity-80 transition-opacity"
                    onClick={e => e.stopPropagation()}>
                    <p className="text-sm font-bold text-white truncate">{track.title}</p>
                    <p className="text-[11px] text-white/35 truncate">{track.artist_display || "Upper Vibe Media"}</p>
                    <span className="inline-flex items-center gap-0.5 mt-0.5 text-[9px] font-black px-1.5 py-0.5 rounded-full"
                      style={{ background: "rgba(0,160,220,0.1)", border: "1px solid rgba(0,160,220,0.2)", color: "#00A0DC" }}>
                      <Waves className="w-2 h-2" /> 432 Hz
                    </span>
                  </Link>
                  {/* Heart */}
                  <button
                    onClick={(e) => { e.stopPropagation(); onToggleFav && onToggleFav(track); }}
                    className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:scale-110"
                    style={isFaved && isFaved("track", track.id) ? {
                      background: "rgba(155,126,255,0.22)", border: "1px solid rgba(155,126,255,0.5)", color: "#9B7EFF"
                    } : {
                      background: "rgba(155,126,255,0.06)", border: "1px solid rgba(155,126,255,0.28)", color: "rgba(155,126,255,0.55)"
                    }}>
                    <Heart className={`w-3.5 h-3.5 ${isFaved && isFaved("track", track.id) ? "fill-current" : ""}`} />
                  </button>
                </motion.div>
              );
            })}
          </div>
          <Link to="/music" className="inline-flex items-center gap-1 mt-3 text-xs font-bold transition-all hover:brightness-110"
            style={{ color: `rgba(${rtp},0.6)` }}>
            Browse all music <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      )}

      {/* Suggested Visualizers + Academy — side by side on desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

        {/* Visualizers */}
        {suggestedViz.length > 0 && (
          <div>
            <p className="text-[10px] font-black tracking-[0.25em] uppercase text-white/30 mb-3 flex items-center gap-2">
              <Tv2 className="w-3 h-3" /> Suggested Visualizers
            </p>
            <div className="space-y-2.5">
              {suggestedViz.map((viz, i) => (
                <motion.div key={viz.id}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.06 }}
                  className="flex items-center gap-3 p-3 rounded-2xl transition-all"
                  style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <Link to="/visualizers" className="flex-shrink-0">
                    {viz.thumbnail_url
                      ? <img src={viz.thumbnail_url} alt={viz.title} width={48} height={48} loading="lazy"
                          className="w-12 h-12 rounded-xl object-cover" />
                      : <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                          style={{ background: "rgba(155,126,255,0.08)" }}>
                          <Tv2 className="w-5 h-5 text-purple-400/40" />
                        </div>}
                  </Link>
                  <Link to="/visualizers" className="flex-1 min-w-0 hover:opacity-80 transition-opacity">
                    <p className="text-sm font-bold text-white truncate">{viz.title}</p>
                    <p className="text-[11px] text-white/35 truncate">{viz.artist || "Upper Vibe Media"}</p>
                    <span className="inline-flex items-center gap-0.5 mt-0.5 text-[9px] font-black px-1.5 py-0.5 rounded-full"
                      style={{ background: "rgba(155,126,255,0.1)", border: "1px solid rgba(155,126,255,0.2)", color: "#9B7EFF" }}>
                      <Zap className="w-2 h-2" /> Visual
                    </span>
                  </Link>
                  <Link to="/visualizers"
                    className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:brightness-110"
                    style={{ background: "rgba(155,126,255,0.1)", border: "1px solid rgba(155,126,255,0.25)", color: "#9B7EFF" }}>
                    <Play className="w-3.5 h-3.5 ml-0.5" />
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Academy Lessons */}
        {suggestedLessons.length > 0 && (
          <div>
            <p className="text-[10px] font-black tracking-[0.25em] uppercase text-white/30 mb-3 flex items-center gap-2">
              <GraduationCap className="w-3 h-3" /> Suggested Learning
            </p>
            <div className="space-y-2.5">
              {suggestedLessons.map((lesson, i) => (
                <motion.div key={lesson.id}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.06 }}
                  className="flex items-center gap-3 p-3 rounded-2xl transition-all"
                  style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <Link to={`/academy/lesson/${lesson.id}`} className="flex-shrink-0">
                    {lesson.thumbnail_url
                      ? <img src={lesson.thumbnail_url} alt={lesson.title} width={48} height={48} loading="lazy"
                          className="w-12 h-12 rounded-xl object-cover" />
                      : <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                          style={{ background: `rgba(${rtp},0.08)` }}>
                          <GraduationCap className="w-5 h-5" style={{ color: `rgba(${rtp},0.3)` }} />
                        </div>}
                  </Link>
                  <Link to={`/academy/lesson/${lesson.id}`} className="flex-1 min-w-0 hover:opacity-80 transition-opacity">
                    <p className="text-sm font-bold text-white truncate leading-snug">{lesson.title}</p>
                    <span className="inline-flex items-center gap-0.5 mt-0.5 text-[9px] font-black px-1.5 py-0.5 rounded-full"
                      style={{ background: `rgba(${rtp},0.1)`, border: `1px solid rgba(${rtp},0.2)`, color: `rgb(${rtp})` }}>
                      <GraduationCap className="w-2 h-2" /> Academy
                    </span>
                  </Link>
                  <Link to={`/academy/lesson/${lesson.id}`}
                    className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:brightness-110"
                    style={{ background: `rgba(${rtp},0.1)`, border: `1px solid rgba(${rtp},0.25)`, color: `rgb(${rtp})` }}>
                    <Play className="w-3.5 h-3.5 ml-0.5" />
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* No Vibe Check nudge */}
      {checkIns.length === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
          className="mt-6 flex items-center gap-4 p-4 rounded-2xl"
          style={{ background: `rgba(${rtp},0.05)`, border: `1px solid rgba(${rtp},0.15)` }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: `rgba(${rtp},0.1)`, border: `1px solid rgba(${rtp},0.25)` }}>
            <Sparkles className="w-5 h-5" style={{ color: `rgb(${rtp})` }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white">Complete a Vibe Check to personalize this feed</p>
            <p className="text-xs text-white/35 mt-0.5">Your mood history shapes which tracks, visuals, and lessons we surface for you.</p>
          </div>
          <Link to="/vibe-check"
            className="flex-shrink-0 px-4 py-2 rounded-xl font-black text-xs tracking-wide transition-all hover:brightness-110"
            style={{ background: `rgba(${rtp},0.15)`, border: `1px solid rgba(${rtp},0.3)`, color: `rgb(${rtp})` }}>
            Start
          </Link>
        </motion.div>
      )}
    </section>
  );
}