import React, { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Sparkles, Play, Pause, Music4, Tv2, GraduationCap,
  Heart, ArrowRight, Download, Clapperboard, BookOpen
} from "lucide-react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useTheme } from "@/context/ThemeContext";
import { RADIO_THEMES } from "@/components/radio/RadioThemePicker";

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

const STATUS_LABELS = [
  "Recommended For You",
  "Trending Now",
  "Most Saved",
  "Community Favorite",
  "Rising Track",
];

function scoreTrackRelevance(track, targetTags, favSet) {
  let score = 0;
  const moodTags = track.mood_tags || [];
  const catIds = track.category_ids || [];
  const haystack = [...moodTags.map(t => t.toLowerCase()), ...catIds.map(t => t.toLowerCase())];
  targetTags.forEach(tag => { if (haystack.some(h => h.includes(tag) || tag.includes(h))) score += 2; });
  if (favSet.has(track.id)) score += 5;
  if (track.is_featured) score += 1;
  if (track.is_new_release) score += 1;
  return score;
}

// ── Song Card ─────────────────────────────────────────────────────────────────
function SongCard({ track, index, currentTrack, isPlaying, handlePlayTrack, isFaved, onToggleFav, rtp }) {
  const isCurrent = currentTrack?.id === track.id;
  const statusLabel = STATUS_LABELS[index % STATUS_LABELS.length];
  const accentColor = isCurrent ? `rgb(${rtp})` : "#9B7EFF";
  const accentRgb = isCurrent ? rtp : "155,126,255";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="rounded-2xl overflow-hidden group transition-all active:scale-[0.98]"
      style={{
        background: isCurrent ? `rgba(${rtp},0.06)` : "rgba(255,255,255,0.025)",
        border: `1px solid ${isCurrent ? `rgba(${rtp},0.3)` : "rgba(255,255,255,0.07)"}`,
        boxShadow: isCurrent ? `0 0 20px rgba(${rtp},0.1)` : "none",
      }}
    >
      <div className="flex items-stretch gap-0">
        {/* Album art — clickable to play */}
        <button
          className="relative flex-shrink-0 w-[72px] overflow-hidden"
          onClick={() => track.audio_url && handlePlayTrack(track)}
        >
          {track.cover_url ? (
            <img src={track.cover_url} alt={track.title}
              className="w-full h-full object-cover min-h-[72px]" loading="lazy" />
          ) : (
            <div className="w-full min-h-[72px] flex items-center justify-center"
              style={{ background: `rgba(${accentRgb},0.1)` }}>
              <Music4 className="w-6 h-6" style={{ color: `rgba(${accentRgb},0.35)` }} />
            </div>
          )}
          {/* Play overlay */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: "rgba(0,0,0,0.55)" }}>
            {isCurrent && isPlaying
              ? <Pause className="w-5 h-5" style={{ color: `rgb(${rtp})` }} />
              : <Play className="w-5 h-5 text-white ml-0.5" />}
          </div>
          {isCurrent && isPlaying && (
            <div className="absolute bottom-1.5 left-0 right-0 flex justify-center gap-0.5">
              {[0, 1, 2].map(i => (
                <div key={i} className="w-0.5 rounded-full animate-pulse"
                  style={{ height: 8 + i * 3, background: `rgb(${rtp})`, animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          )}
        </button>

        {/* Info */}
        <Link to={`/song/${track.id}`} className="flex-1 min-w-0 px-3 py-3 hover:opacity-80 transition-opacity">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[8px] font-black px-2 py-0.5 rounded-full tracking-wider"
              style={{ background: `rgba(${accentRgb},0.12)`, border: `1px solid rgba(${accentRgb},0.3)`, color: accentColor }}>
              🎵 SONG
            </span>
            <span className="text-[8px] font-bold text-white/30 truncate">{statusLabel}</span>
          </div>
          <p className="text-sm font-bold text-white truncate leading-tight">{track.title}</p>
          <p className="text-[11px] text-white/40 truncate mt-0.5">{track.artist_display || "Upper Vibe Media"}</p>
        </Link>

        {/* Actions */}
        <div className="flex flex-col items-center justify-center gap-2 px-2.5 py-2 flex-shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); onToggleFav && onToggleFav(track); }}
            title="Save"
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:scale-110"
            style={isFaved && isFaved("track", track.id) ? {
              background: "rgba(155,126,255,0.22)", border: "1px solid rgba(155,126,255,0.5)", color: "#9B7EFF"
            } : {
              background: "rgba(155,126,255,0.07)", border: "1px solid rgba(155,126,255,0.2)", color: "rgba(155,126,255,0.5)"
            }}>
            <Heart className={`w-3 h-3 ${isFaved && isFaved("track", track.id) ? "fill-current" : ""}`} />
          </button>
          <Link to={`/song/${track.id}`} title="Download"
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:scale-110"
            style={{ background: `rgba(${rtp},0.07)`, border: `1px solid rgba(${rtp},0.2)`, color: `rgba(${rtp},0.7)` }}>
            <Download className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

// ── Visualizer Card ───────────────────────────────────────────────────────────
function VisualizerCard({ viz, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.07 }}
      className="rounded-2xl overflow-hidden group transition-all"
      style={{
        background: "rgba(0,160,220,0.04)",
        border: "1px solid rgba(0,160,220,0.18)",
        boxShadow: "0 0 24px rgba(0,160,220,0.06)",
      }}
    >
      {/* 16:9 Cinematic thumbnail */}
      <Link to="/visualizers" className="block relative overflow-hidden"
        style={{ paddingBottom: "56.25%" }}>
        <div className="absolute inset-0">
          {viz.thumbnail_url ? (
            <img src={viz.thumbnail_url} alt={viz.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
          ) : (
            <div className="w-full h-full flex items-center justify-center"
              style={{ background: "rgba(0,160,220,0.08)" }}>
              <Clapperboard className="w-10 h-10 text-cyan-400/20" />
            </div>
          )}
          {/* Cinematic overlay */}
          <div className="absolute inset-0 flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.35)" }}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center transition-all group-hover:scale-110"
              style={{ background: "rgba(0,160,220,0.85)", boxShadow: "0 0 20px rgba(0,160,220,0.5)" }}>
              <Play className="w-5 h-5 text-white ml-0.5" />
            </div>
          </div>
          {/* VISUALIZER badge overlay */}
          <div className="absolute top-2 left-2">
            <span className="text-[8px] font-black px-2 py-1 rounded-full tracking-wider"
              style={{ background: "rgba(0,160,220,0.85)", color: "#fff" }}>
              🎬 VISUALIZER
            </span>
          </div>
          {/* Glowing frame */}
          <div className="absolute inset-0 rounded-none pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ boxShadow: "inset 0 0 0 2px rgba(0,160,220,0.5)" }} />
        </div>
      </Link>

      {/* Bottom info */}
      <div className="flex items-center justify-between px-3 py-2.5 gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-white truncate leading-tight">{viz.title}</p>
          <p className="text-[11px] text-white/35 truncate mt-0.5">{viz.artist || "Upper Vibe Media"}</p>
        </div>
        <Link to="/visualizers"
          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black text-[10px] tracking-wider transition-all hover:brightness-125 whitespace-nowrap"
          style={{ background: "rgba(0,160,220,0.15)", border: "1px solid rgba(0,160,220,0.35)", color: "#00C8F0" }}>
          <Tv2 className="w-3 h-3" /> Watch
        </Link>
      </div>
    </motion.div>
  );
}

// ── Academy Card ──────────────────────────────────────────────────────────────
function AcademyCard({ lesson, index, rtp }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 + index * 0.07 }}
      className="rounded-2xl overflow-hidden group transition-all"
      style={{
        background: "rgba(155,126,255,0.04)",
        border: "1px solid rgba(155,126,255,0.18)",
        boxShadow: "0 0 24px rgba(155,126,255,0.05)",
      }}
    >
      {/* 16:9 Thumbnail */}
      <Link to={`/academy/lesson/${lesson.id}`} className="block relative overflow-hidden"
        style={{ paddingBottom: "56.25%" }}>
        <div className="absolute inset-0">
          {lesson.thumbnail_url ? (
            <img src={lesson.thumbnail_url} alt={lesson.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
          ) : (
            <div className="w-full h-full flex items-center justify-center"
              style={{ background: "rgba(155,126,255,0.08)" }}>
              <GraduationCap className="w-10 h-10 text-purple-400/20" />
            </div>
          )}
          {/* Dark overlay */}
          <div className="absolute inset-0 flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.45)" }}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center transition-all group-hover:scale-110"
              style={{ background: "rgba(155,126,255,0.85)", boxShadow: "0 0 20px rgba(155,126,255,0.5)" }}>
              <BookOpen className="w-5 h-5 text-white" />
            </div>
          </div>
          {/* ACADEMY badge */}
          <div className="absolute top-2 left-2">
            <span className="text-[8px] font-black px-2 py-1 rounded-full tracking-wider"
              style={{ background: "rgba(155,126,255,0.9)", color: "#fff" }}>
              🎓 ACADEMY
            </span>
          </div>
          {/* Glow frame on hover */}
          <div className="absolute inset-0 rounded-none pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ boxShadow: "inset 0 0 0 2px rgba(155,126,255,0.5)" }} />
        </div>
      </Link>

      {/* Bottom info */}
      <div className="flex items-center justify-between px-3 py-2.5 gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-white truncate leading-tight">{lesson.title}</p>
          <p className="text-[11px] text-purple-300/50 mt-0.5">Watch Lesson</p>
        </div>
        <Link to={`/academy/lesson/${lesson.id}`}
          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black text-[10px] tracking-wider transition-all hover:brightness-125 whitespace-nowrap"
          style={{ background: "rgba(155,126,255,0.15)", border: "1px solid rgba(155,126,255,0.35)", color: "#c4aaff" }}>
          <GraduationCap className="w-3 h-3" /> Learn
        </Link>
      </div>
    </motion.div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function MyVibeFeed({ allTracks, allViz, academyLessons, currentTrack, isPlaying, handlePlayTrack, user, isFaved, onToggleFav, themeColor }) {
  const [checkIns, setCheckIns] = useState([]);
  const [favTrackIds, setFavTrackIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const { accentId } = useTheme();
  const radioTheme = RADIO_THEMES[accentId] || RADIO_THEMES.cyan;
  const rtp = themeColor || radioTheme.vars["--rt-primary"];

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

  const dominantMood = useMemo(() => {
    if (!checkIns.length) return null;
    const recent = checkIns.slice(0, 5);
    const tally = {};
    recent.forEach(c => { tally[c.mood] = (tally[c.mood] || 0) + 1; });
    return Object.entries(tally).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  }, [checkIns]);

  const targetTags = useMemo(() =>
    dominantMood ? MOOD_AFFINITIES[dominantMood] || [] : ["432hz", "high_vibe"],
    [dominantMood]
  );

  const suggestedTracks = useMemo(() => {
    if (!allTracks?.length) return [];
    const published = allTracks.filter(t => t.status === "published" && t.audio_url);
    return published
      .map(t => ({ ...t, _relevance: scoreTrackRelevance(t, targetTags, favTrackIds) }))
      .sort((a, b) => b._relevance - a._relevance)
      .slice(0, 4);
  }, [allTracks, targetTags, favTrackIds]);

  const suggestedViz = useMemo(() => (allViz || []).filter(v => v.status === "published").slice(0, 2), [allViz]);
  const suggestedLessons = useMemo(() => (academyLessons || []).slice(0, 2), [academyLessons]);

  if (!user || loading) return null;
  if (!suggestedTracks.length && !suggestedViz.length && !suggestedLessons.length) return null;

  const moodInfo = dominantMood ? MOOD_LABELS[dominantMood] : null;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      {/* Header */}
      <div className="flex items-end justify-between gap-3 mb-6 flex-wrap">
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

      {/* Songs */}
      {suggestedTracks.length > 0 && (
        <div className="mb-8">
          <p className="text-[10px] font-black tracking-[0.25em] uppercase text-white/30 mb-3 flex items-center gap-2">
            <Music4 className="w-3 h-3" /> Suggested Songs
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {suggestedTracks.map((track, i) => (
              <SongCard
                key={track.id}
                track={track}
                index={i}
                currentTrack={currentTrack}
                isPlaying={isPlaying}
                handlePlayTrack={handlePlayTrack}
                isFaved={isFaved}
                onToggleFav={onToggleFav}
                rtp={rtp}
              />
            ))}
          </div>
          <Link to="/music" className="inline-flex items-center gap-1 mt-3 text-xs font-bold transition-all hover:brightness-110"
            style={{ color: `rgba(${rtp},0.6)` }}>
            Browse all music <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      )}

      {/* Visualizers + Academy — 2-col grid on desktop */}
      {(suggestedViz.length > 0 || suggestedLessons.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

          {suggestedViz.length > 0 && (
            <div>
              <p className="text-[10px] font-black tracking-[0.25em] uppercase text-white/30 mb-3 flex items-center gap-2">
                <Clapperboard className="w-3 h-3" /> Suggested Visualizers
              </p>
              <div className="space-y-3">
                {suggestedViz.map((viz, i) => (
                  <VisualizerCard key={viz.id} viz={viz} index={i} />
                ))}
              </div>
            </div>
          )}

          {suggestedLessons.length > 0 && (
            <div>
              <p className="text-[10px] font-black tracking-[0.25em] uppercase text-white/30 mb-3 flex items-center gap-2">
                <GraduationCap className="w-3 h-3" /> Suggested Learning
              </p>
              <div className="space-y-3">
                {suggestedLessons.map((lesson, i) => (
                  <AcademyCard key={lesson.id} lesson={lesson} index={i} rtp={rtp} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

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