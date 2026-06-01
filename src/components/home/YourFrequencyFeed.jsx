import React, { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, Music4, Heart, Download, Lock, Tv2, ArrowRight, Waves, Sparkles } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useTheme } from "@/context/ThemeContext";
import { RADIO_THEMES } from "@/components/radio/RadioThemePicker";
import {
  buildUserProfile, buildCommunityIndex, buildPersonalizedFeed, MOOD_META,
} from "@/lib/feedEngine";

export default function YourFrequencyFeed({
  allTracks, allViz,
  currentTrack, isPlaying, handlePlayTrack,
  user, isFaved, onToggleFav, themeColor, onOpenViz,
}) {
  const [userStreams, setUserStreams]       = useState([]);
  const [userFavs, setUserFavs]           = useState([]);
  const [userDownloads, setUserDownloads] = useState([]);
  const [checkIns, setCheckIns]           = useState([]);
  const [communityIdx, setCommunityIdx]   = useState({});
  const [loading, setLoading]             = useState(true);

  const { accentId } = useTheme();
  const radioTheme = RADIO_THEMES[accentId] || RADIO_THEMES.cyan;
  const rtp = themeColor || radioTheme.vars["--rt-primary"];
  const navigate = useNavigate();

  const isPremium = user?.role === "premium" || user?.tier === "premium"
    || user?.role === "admin" || user?.role === "plus" || user?.tier === "plus";

  useEffect(() => {
    if (!allTracks?.length) return;
    const communityQueries = [
      base44.entities.SongStream.list("-created_date", 500),
      base44.entities.Favorite.filter({ type: "track" }, "-created_date", 1000),
      base44.entities.Download.filter({ content_type: "track" }, "-created_date", 1000),
    ];
    const userQueries = user?.id ? [
      base44.entities.SongStream.filter({ user_id: user.id }, "-created_date", 300),
      base44.entities.Favorite.filter({ user_email: user.email, type: "track" }, "-created_date", 200),
      base44.entities.UserDownload.filter({ user_id: user.id }, "-created_date", 200),
      base44.entities.VibeCheckIn.filter({ user_id: user.id }, "-check_in_date", 7),
    ] : [
      Promise.resolve([]), Promise.resolve([]), Promise.resolve([]), Promise.resolve([]),
    ];
    Promise.all([...communityQueries, ...userQueries]).then(([
      allStreams, allFavs, allDls, myStreams, myFavs, myDls, myCheckIns,
    ]) => {
      setCommunityIdx(buildCommunityIndex(allStreams, allFavs, allDls));
      setUserStreams(myStreams);
      setUserFavs(myFavs);
      setUserDownloads(myDls);
      setCheckIns(myCheckIns);
      setLoading(false);
    });
  }, [allTracks?.length, user?.id]);

  const profile = useMemo(() => buildUserProfile({
    userStreams, userFavs, userDownloads, checkIns, allTracks: allTracks || [],
  }), [userStreams, userFavs, userDownloads, checkIns, allTracks]);

  const feed = useMemo(() => buildPersonalizedFeed({
    allTracks, allViz, profile, communityIdx,
    trackCount: 6, vizCount: 2,
  }), [allTracks, allViz, profile, communityIdx]);

  if (loading || !feed.length) return null;

  const moodMeta = profile.dominantMood ? MOOD_META[profile.dominantMood] : null;

  // Split feed: tracks and visualizers
  const tracks = feed.filter(i => i.type === "track");
  const vizItems = feed.filter(i => i.type === "visualizer");

  // Desktop layout: left = first 4 tracks, right = first viz + remaining tracks
  const leftTracks = tracks.slice(0, 4);
  const rightViz = vizItems[0] || null;
  const rightTracks = tracks.slice(4, 6);

  const trackCardProps = { currentTrack, isPlaying, handlePlayTrack, isFaved, onToggleFav, navigate, isPremium, rtp };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10">

      {/* ── Header ── */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-px h-4 rounded-full" style={{ background: `rgb(${rtp})` }} />
          <span className="text-[10px] font-black tracking-[0.35em] uppercase" style={{ color: `rgb(${rtp})` }}>
            {profile.isNewUser ? "Trending Now" : "Personalized For You"}
          </span>
        </div>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap mb-1">
              <h2 className="font-heading font-black text-3xl md:text-4xl text-white leading-tight">My Vibe Feed</h2>
              {moodMeta && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black flex-shrink-0"
                  style={{ background: `rgba(${rtp},0.1)`, border: `1px solid rgba(${rtp},0.3)`, color: `rgb(${rtp})` }}>
                  {moodMeta.emoji} Current Vibe: {moodMeta.label}
                </span>
              )}
              {profile.topArtist && !moodMeta && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black flex-shrink-0"
                  style={{ background: "rgba(155,126,255,0.1)", border: "1px solid rgba(155,126,255,0.3)", color: "#c4aaff" }}>
                  🎤 Your Artist: {profile.topArtist}
                </span>
              )}
            </div>
            <p className="text-white/35 text-sm max-w-xl">
              {profile.isNewUser
                ? "Discover the most loved tracks and visuals in the Upper Vibe community."
                : "Built from your listening history, favorites, downloads, and Vibe Check."}
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

      {/* ── Desktop 2-col masonry / Mobile single col ── */}
      {/* Mobile: flat list. Desktop: left=tracks, right=viz anchor + more tracks */}
      <div className="block lg:hidden space-y-2.5">
        {feed.map((item, i) => (
          <motion.div key={item.type + "-" + item.data.id}
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.035, ease: [0.22, 1, 0.36, 1] }}>
            {item.type === "track" && <TrackCard track={item.data} badge={item.badge} {...trackCardProps} />}
            {item.type === "visualizer" && <VisualizerCard viz={item.data} badge={item.badge} onOpen={onOpenViz} />}
          </motion.div>
        ))}
      </div>

      {/* Desktop 2-column layout */}
      <div className="hidden lg:grid lg:grid-cols-2 lg:gap-4">
        {/* LEFT: 4 track cards stacked */}
        <div className="flex flex-col gap-2.5">
          {leftTracks.map((item, i) => (
            <motion.div key={"l-" + item.data.id}
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}>
              <TrackCard track={item.data} badge={item.badge} {...trackCardProps} />
            </motion.div>
          ))}
        </div>

        {/* RIGHT: featured visualizer anchors the column, then more tracks below */}
        <div className="flex flex-col gap-2.5">
          {rightViz && (
            <motion.div key={"rv-" + rightViz.data.id}
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05, ease: [0.22, 1, 0.36, 1] }}>
              <VisualizerCard viz={rightViz.data} badge={rightViz.badge} onOpen={onOpenViz} />
            </motion.div>
          )}
          {rightTracks.map((item, i) => (
            <motion.div key={"r-" + item.data.id}
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: (i + 1) * 0.04, ease: [0.22, 1, 0.36, 1] }}>
              <TrackCard track={item.data} badge={item.badge} {...trackCardProps} />
            </motion.div>
          ))}
          {/* If no viz, fill with extra tracks */}
          {!rightViz && vizItems.slice(0, 1).map((item, i) => (
            <motion.div key={"rv2-" + item.data.id}
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, ease: [0.22, 1, 0.36, 1] }}>
              <VisualizerCard viz={item.data} badge={item.badge} onOpen={onOpenViz} />
            </motion.div>
          ))}
        </div>
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

// ── TrackCard ─────────────────────────────────────────────────────────────────
function TrackCard({ track, badge, currentTrack, isPlaying, handlePlayTrack, isFaved, onToggleFav, navigate, isPremium, rtp }) {
  const isCurrent = currentTrack?.id === track.id;
  return (
    <div
      className="flex items-center gap-3 p-3.5 rounded-2xl group cursor-pointer transition-all active:scale-[0.98] hover:border-white/15"
      style={{
        background: isCurrent ? `rgba(${rtp},0.07)` : "rgba(255,255,255,0.025)",
        border: isCurrent ? `1px solid rgba(${rtp},0.28)` : "1px solid rgba(255,255,255,0.06)",
        boxShadow: isCurrent ? `0 0 18px rgba(${rtp},0.1)` : "none",
      }}
      onClick={() => track.audio_url && handlePlayTrack(track)}
    >
      <div className="relative flex-shrink-0">
        {track.cover_url
          ? <img src={track.cover_url} alt={track.title} width={48} height={48} loading="lazy" className="w-12 h-12 rounded-xl object-cover" />
          : <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `rgba(${rtp},0.08)` }}><Music4 className="w-5 h-5" style={{ color: `rgba(${rtp},0.25)` }} /></div>}
        <div className="absolute inset-0 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "rgba(0,0,0,0.65)" }}>
          {isCurrent && isPlaying ? <Pause className="w-3.5 h-3.5" style={{ color: `rgb(${rtp})` }} /> : <Play className="w-3.5 h-3.5 text-white ml-0.5" />}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <Link to={`/song/${track.id}`} onClick={e => e.stopPropagation()}
          className="text-sm font-bold text-white truncate block hover:underline">{track.title}</Link>
        <p className="text-[11px] text-white/35 truncate mt-0.5">{track.artist_display || "Upper Vibe Media"}</p>
        {badge && (
          <span className="inline-block mt-1 text-[9px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: badge.bg, border: `1px solid ${badge.border}`, color: badge.color }}>
            {badge.label}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <button onClick={e => { e.stopPropagation(); onToggleFav && onToggleFav(track); }}
          className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:scale-110"
          style={isFaved && isFaved("track", track.id)
            ? { background: "rgba(155,126,255,0.22)", border: "1px solid rgba(155,126,255,0.55)", color: "#9B7EFF" }
            : { background: "rgba(155,126,255,0.05)", border: "1px solid rgba(155,126,255,0.22)", color: "rgba(155,126,255,0.5)" }}>
          <Heart className={`w-3.5 h-3.5 ${isFaved && isFaved("track", track.id) ? "fill-current" : ""}`} />
        </button>
        <button onClick={e => { e.stopPropagation(); navigate(`/song/${track.id}?downloadIntent=true`); }}
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

// ── VisualizerCard ────────────────────────────────────────────────────────────
function VisualizerCard({ viz, badge, onOpen }) {
  return (
    <div
      className="rounded-2xl group transition-all active:scale-[0.98] overflow-hidden cursor-pointer"
      style={{ background: "rgba(0,229,255,0.03)", border: "1px solid rgba(0,229,255,0.15)" }}
      onClick={() => onOpen && onOpen(viz)}
    >
      <div className="relative overflow-hidden" style={{ paddingBottom: "56.25%" }}>
        <div className="absolute inset-0">
          {viz.thumbnail_url
            ? <img src={viz.thumbnail_url} alt={viz.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            : <div className="w-full h-full flex items-center justify-center" style={{ background: "rgba(0,229,255,0.06)" }}><Tv2 className="w-8 h-8 text-cyan-400/20" /></div>}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "rgba(0,0,0,0.45)" }}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "rgba(0,160,220,0.9)", boxShadow: "0 0 20px rgba(0,160,220,0.5)" }}>
              <Play className="w-4 h-4 text-white ml-0.5" />
            </div>
          </div>
          {badge && (
            <div className="absolute top-2 left-2">
              <span className="text-[8px] font-black px-2 py-1 rounded-full"
                style={{ background: badge.bg, border: `1px solid ${badge.border}`, color: badge.color }}>
                {badge.label}
              </span>
            </div>
          )}
          <div className="absolute top-2 right-2">
            <span className="text-[8px] font-black px-2 py-1 rounded-full" style={{ background: "rgba(0,160,220,0.85)", color: "#fff" }}>
              🎬 Visualizer
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 px-3 py-2.5">
        <div className="min-w-0">
          <p className="text-sm font-bold text-white truncate">{viz.title}</p>
          <p className="text-[11px] text-white/35 truncate mt-0.5">{viz.artist || "Upper Vibe Media"}</p>
        </div>
        <span className="flex-shrink-0 text-[10px] font-black px-3 py-1.5 rounded-full transition-all group-hover:brightness-125"
          style={{ background: "rgba(0,229,255,0.1)", border: "1px solid rgba(0,229,255,0.28)", color: "#00E5FF" }}>
          ▶ Watch
        </span>
      </div>
    </div>
  );
}