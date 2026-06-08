import React, { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Play, Pause, Music4, Heart, Download, Lock, Tv2, GraduationCap, ArrowRight, Sparkles, Waves } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useTheme } from "@/context/ThemeContext";
import { RADIO_THEMES } from "@/components/radio/RadioThemePicker";
import { usePlayer } from "@/context/PlayerContext";
import { useAuth } from "@/lib/AuthContext";
import { useFavorites } from "@/hooks/useFavorite";
import { recordPlay } from "@/components/home/DiscoverTab";
import { getPublishedTracks } from "@/lib/trackCache";
import Footer from "@/components/shared/Footer";
import FavLoginModal from "@/components/shared/FavLoginModal";
import {
  buildUserProfile, buildCommunityIndex, scoreTrackForUser,
  generateTrackLabel, scoreVizForUser, generateVizLabel,
  MOOD_META,
} from "@/lib/feedEngine";

export default function PersonalizedFeed() {
  const { user } = useAuth();
  const { playTrack, currentTrack, isPlaying, togglePlay } = usePlayer();
  const { isFaved, toggle } = useFavorites(user?.email);
  const navigate = useNavigate();
  const { accentId } = useTheme();
  const radioTheme = RADIO_THEMES[accentId] || RADIO_THEMES.cyan;
  const rtp = radioTheme.vars["--rt-primary"];

  const [allTracks, setAllTracks]         = useState([]);
  const [allViz, setAllViz]               = useState([]);
  const [allLessons, setAllLessons]       = useState([]);
  const [userStreams, setUserStreams]      = useState([]);
  const [userFavs, setUserFavs]           = useState([]);
  const [userDownloads, setUserDownloads] = useState([]);
  const [checkIns, setCheckIns]           = useState([]);
  const [communityIdx, setCommunityIdx]   = useState({});
  const [loading, setLoading]             = useState(true);
  const [loginModal, setLoginModal]       = useState(false);

  const isPremium = user?.role === "premium" || user?.tier === "premium"
    || user?.role === "admin" || user?.role === "plus" || user?.tier === "plus";

  useEffect(() => {
    const communityFetch = Promise.all([
      getPublishedTracks("-created_date", 200),
      base44.entities.Visualizer.filter({ status: "published" }, "-created_date", 50),
      base44.entities.AcademyLesson.filter({ status: "published" }, "-created_date", 30),
      base44.entities.SongStream.list("-created_date", 500),
      base44.entities.Favorite.filter({ type: "track" }, "-created_date", 1000),
      base44.entities.Download.filter({ content_type: "track" }, "-created_date", 1000),
    ]);

    const userFetch = user?.id ? Promise.all([
      base44.entities.SongStream.filter({ user_id: user.id }, "-created_date", 300),
      base44.entities.Favorite.filter({ user_email: user.email, type: "track" }, "-created_date", 200),
      base44.entities.UserDownload.filter({ user_id: user.id }, "-created_date", 200),
      base44.entities.VibeCheckIn.filter({ user_id: user.id }, "-check_in_date", 7),
    ]) : Promise.resolve([[], [], [], []]);

    Promise.all([communityFetch, userFetch]).then(([
      [tracks, viz, lessons, allStreams, allFavs, allDls],
      [myStreams, myFavs, myDls, myCheckIns],
    ]) => {
      setAllTracks(tracks);
      setAllViz(viz);
      setAllLessons(lessons);
      setCommunityIdx(buildCommunityIndex(allStreams, allFavs, allDls));
      setUserStreams(myStreams);
      setUserFavs(myFavs);
      setUserDownloads(myDls);
      setCheckIns(myCheckIns);
      setLoading(false);
    });
  }, [user?.id]);

  const profile = useMemo(() => buildUserProfile({
    userStreams, userFavs, userDownloads, checkIns, allTracks,
  }), [userStreams, userFavs, userDownloads, checkIns, allTracks]);

  // Full scored track list for the page
  const scoredTracks = useMemo(() => {
    const published = allTracks.filter(t => t.status === "published" && t.audio_url);
    const scored = published.map(t => {
      const breakdown = scoreTrackForUser(t, profile, communityIdx);
      const badge = generateTrackLabel(t, profile, breakdown);
      return { ...t, _score: breakdown.total, _badge: badge };
    });
    if (profile.isNewUser) {
      return scored.sort((a, b) => {
        const ca = communityIdx[a.id] || { plays: 0, favs: 0, dls: 0 };
        const cb = communityIdx[b.id] || { plays: 0, favs: 0, dls: 0 };
        return (cb.plays * 0.05 + cb.favs * 20 + cb.dls * 5) - (ca.plays * 0.05 + ca.favs * 20 + ca.dls * 5);
      });
    }
    return scored.sort((a, b) => b._score - a._score);
  }, [allTracks, profile, communityIdx]);

  const scoredViz = useMemo(() =>
    allViz.map(v => ({ ...v, _score: scoreVizForUser(v, profile), _badge: generateVizLabel(v, profile) }))
      .sort((a, b) => b._score - a._score),
    [allViz, profile]
  );

  const handlePlayTrack = (track) => {
    if (currentTrack?.id === track.id) { togglePlay(); return; }
    playTrack(track);
    recordPlay(track);
  };

  const moodMeta = profile.dominantMood ? MOOD_META[profile.dominantMood] : null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 rounded-full animate-spin"
          style={{ border: `2px solid rgba(${rtp},0.2)`, borderTopColor: `rgb(${rtp})` }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">

      {/* ── Header ── */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-10 pb-6">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-px h-4 rounded-full" style={{ background: `rgb(${rtp})` }} />
          <span className="text-[10px] font-black tracking-[0.35em] uppercase" style={{ color: `rgb(${rtp})` }}>
            {profile.isNewUser ? "Top Picks" : "Personalized For You"}
          </span>
        </div>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 flex-wrap mb-1">
              <h1 className="font-heading font-black text-3xl md:text-4xl text-white leading-tight">
                Your Personalized Feed
              </h1>
              {moodMeta && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black"
                  style={{ background: `rgba(${rtp},0.1)`, border: `1px solid rgba(${rtp},0.3)`, color: `rgb(${rtp})` }}>
                  {moodMeta.emoji} {moodMeta.label}
                </span>
              )}
              {profile.topArtist && !moodMeta && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black"
                  style={{ background: "rgba(155,126,255,0.1)", border: "1px solid rgba(155,126,255,0.3)", color: "#c4aaff" }}>
                  🎤 Your Artist: {profile.topArtist}
                </span>
              )}
            </div>
            <p className="text-white/40 text-sm">
              {profile.isNewUser
                ? "Discover the most loved tracks, visuals, and lessons in the Upper Vibe community."
                : "Built from your listening history, favorites, downloads, Vibe Check, and most played artists."}
            </p>
          </div>
          <Link to="/music"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-black tracking-wide transition-all hover:brightness-110 flex-shrink-0"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.5)" }}>
            <Waves className="w-3 h-3" /> Browse All Music
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-10">

        {/* ── Recommended Songs ── */}
        {scoredTracks.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4" style={{ color: `rgb(${rtp})` }} />
              <h2 className="font-heading font-black text-lg text-white">
                {profile.topArtist && !profile.isNewUser ? `More Like ${profile.topArtist} & Your Favorites` : "Recommended Songs"}
              </h2>
            </div>
            <div className="space-y-2">
              {scoredTracks.slice(0, 20).map((track, i) => {
                const isCurrent = currentTrack?.id === track.id;
                return (
                  <motion.div key={track.id}
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.025 }}
                    className="flex items-center gap-3 p-3.5 rounded-2xl group cursor-pointer transition-all active:scale-[0.98]"
                    style={{
                      background: isCurrent ? `rgba(${rtp},0.08)` : "rgba(255,255,255,0.025)",
                      border: isCurrent ? `1px solid rgba(${rtp},0.3)` : "1px solid rgba(255,255,255,0.06)",
                    }}
                    onClick={() => handlePlayTrack(track)}>
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
                      {track._badge && (
                        <span className="inline-block mt-1 text-[9px] font-bold px-2 py-0.5 rounded-full"
                          style={{ background: track._badge.bg, border: `1px solid ${track._badge.border}`, color: track._badge.color }}>
                          {track._badge.label}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={e => { e.stopPropagation(); if (!user) { setLoginModal(true); return; } toggle("track", track.id, { title: track.title, artist: track.artist_display, cover_url: track.cover_url }); }}
                        onTouchEnd={e => { e.preventDefault(); e.stopPropagation(); if (!user) { setLoginModal(true); return; } toggle("track", track.id, { title: track.title, artist: track.artist_display, cover_url: track.cover_url }); }}
                        className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:scale-110"
                        style={isFaved("track", track.id) ? { background: "rgba(155,126,255,0.22)", border: "1px solid rgba(155,126,255,0.55)", color: "#9B7EFF" } : { background: "rgba(155,126,255,0.05)", border: "1px solid rgba(155,126,255,0.22)", color: "rgba(155,126,255,0.5)" }}>
                        <Heart className={`w-3.5 h-3.5 ${isFaved("track", track.id) ? "fill-current" : ""}`} />
                      </button>
                      <button onClick={e => { e.stopPropagation(); navigate(`/song/${track.id}?downloadIntent=true`); }}
                        className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:scale-110"
                        style={{ background: isPremium ? "rgba(212,168,67,0.1)" : "rgba(212,168,67,0.04)", border: `1px solid ${isPremium ? "rgba(212,168,67,0.25)" : "rgba(212,168,67,0.1)"}`, color: isPremium ? "#D4A843" : "rgba(212,168,67,0.3)" }}>
                        {isPremium ? <Download className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
            <div className="mt-4 text-center">
              <Link to="/music" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-black tracking-wide transition-all hover:brightness-110"
                style={{ background: `rgba(${rtp},0.08)`, border: `1px solid rgba(${rtp},0.25)`, color: `rgb(${rtp})` }}>
                Browse All Music <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        )}

        {/* ── Recommended Visualizers ── */}
        {scoredViz.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Tv2 className="w-4 h-4 text-cyan-400" />
              <h2 className="font-heading font-black text-lg text-white">
                {profile.topArtist ? `${profile.topArtist} Visuals & More` : "Recommended Visualizers"}
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {scoredViz.slice(0, 10).map((viz, i) => (
                <motion.div key={viz.id}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  className="group rounded-2xl overflow-hidden transition-all"
                  style={{ background: "rgba(0,160,220,0.04)", border: "1px solid rgba(0,160,220,0.15)" }}>
                  {/* Deep-link directly to the exact visualizer */}
                  <Link to={`/visualizers?play=${viz.id}`} className="block relative overflow-hidden" style={{ paddingBottom: "60%" }}>
                    <div className="absolute inset-0">
                      {viz.thumbnail_url
                        ? <img src={viz.thumbnail_url} alt={viz.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                        : <div className="w-full h-full flex items-center justify-center" style={{ background: "rgba(0,160,220,0.08)" }}><Tv2 className="w-8 h-8 text-cyan-400/20" /></div>}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "rgba(0,0,0,0.4)" }}>
                        <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: "rgba(0,160,220,0.9)", boxShadow: "0 0 16px rgba(0,160,220,0.6)" }}>
                          <Play className="w-4 h-4 text-white ml-0.5" />
                        </div>
                      </div>
                      {viz._badge && (
                        <div className="absolute top-2 left-2">
                          <span className="text-[8px] font-black px-2 py-1 rounded-full"
                            style={{ background: viz._badge.bg, border: `1px solid ${viz._badge.border}`, color: viz._badge.color }}>
                            {viz._badge.label}
                          </span>
                        </div>
                      )}
                    </div>
                  </Link>
                  <div className="px-3 py-2.5 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate">{viz.title}</p>
                      <p className="text-[11px] text-white/35 truncate mt-0.5">{viz.artist || "Upper Vibe Media"}</p>
                    </div>
                    <Link to={`/visualizers?play=${viz.id}`}
                      className="flex-shrink-0 text-[10px] font-black px-3 py-1.5 rounded-full transition-all hover:brightness-125"
                      style={{ background: "rgba(0,160,220,0.12)", border: "1px solid rgba(0,160,220,0.3)", color: "#00E5FF" }}>
                      Watch
                    </Link>
                  </div>
                </motion.div>
              ))}
            </div>
            <div className="mt-4 text-center">
              <Link to="/visualizers" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-black tracking-wide transition-all hover:brightness-110"
                style={{ background: "rgba(0,229,255,0.07)", border: "1px solid rgba(0,229,255,0.22)", color: "#00E5FF" }}>
                All Visualizers <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        )}

        {/* ── Academy Lessons ── */}
        {allLessons.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <GraduationCap className="w-4 h-4 text-purple-400" />
              <h2 className="font-heading font-black text-lg text-white">Recommended Lessons</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {allLessons.slice(0, 8).map((lesson, i) => (
                <motion.div key={lesson.id}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  className="group rounded-2xl overflow-hidden transition-all"
                  style={{ background: "rgba(168,85,247,0.03)", border: "1px solid rgba(168,85,247,0.12)" }}>
                  {/* Deep-link to exact lesson */}
                  <Link to={`/academy/lesson/${lesson.id}`} className="block relative overflow-hidden" style={{ paddingBottom: "56.25%" }}>
                    <div className="absolute inset-0">
                      {lesson.thumbnail_url
                        ? <img src={lesson.thumbnail_url} alt={lesson.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                        : <div className="w-full h-full flex items-center justify-center" style={{ background: "rgba(168,85,247,0.08)" }}><GraduationCap className="w-8 h-8 text-purple-400/20" /></div>}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "rgba(0,0,0,0.4)" }}>
                        <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: "rgba(168,85,247,0.9)", boxShadow: "0 0 16px rgba(168,85,247,0.5)" }}>
                          <Play className="w-4 h-4 text-white ml-0.5" />
                        </div>
                      </div>
                      <div className="absolute top-2 left-2">
                        <span className="text-[8px] font-black px-2 py-1 rounded-full" style={{ background: "rgba(168,85,247,0.85)", color: "#fff" }}>🎓 Academy</span>
                      </div>
                    </div>
                  </Link>
                  <div className="px-3 py-2.5 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate">{lesson.title}</p>
                      {lesson.description && <p className="text-[11px] text-white/35 truncate mt-0.5">{lesson.description}</p>}
                    </div>
                    <Link to={`/academy/lesson/${lesson.id}`}
                      className="flex-shrink-0 text-[10px] font-black px-3 py-1.5 rounded-full transition-all hover:brightness-125"
                      style={{ background: "rgba(168,85,247,0.12)", border: "1px solid rgba(168,85,247,0.3)", color: "#A855F7" }}>
                      Watch
                    </Link>
                  </div>
                </motion.div>
              ))}
            </div>
            <div className="mt-4 text-center">
              <Link to="/academy" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-black tracking-wide transition-all hover:brightness-110"
                style={{ background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.25)", color: "#A855F7" }}>
                All Academy Lessons <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        )}

      </div>

      <Footer />
      <FavLoginModal open={loginModal} onClose={() => setLoginModal(false)} />
    </div>
  );
}