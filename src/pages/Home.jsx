import React, { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Play, Waves, Music4, ArrowRight, Tv2, Mail, CheckCircle2, Pause, Sparkles, Heart, Users, GraduationCap, Download, ExternalLink } from "lucide-react";
// Note: Music4, ExternalLink still used in recommended/viz sections
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import Footer from "../components/shared/Footer";
import { usePlayer } from "../context/PlayerContext";
import { useAuth } from "@/lib/AuthContext";
import { useFavorites } from "../hooks/useFavorite";
import { recordPlay, getHistory } from "../components/home/DiscoverTab";
import FavLoginModal from "../components/shared/FavLoginModal";
import PremiumDownloadModal from "../components/shared/PremiumDownloadModal";
import RecentlyListenedSection from "../components/home/RecentlyListenedSection";
import LatestMusicSection from "../components/home/LatestMusicSection";
import SectionHeader from "../components/shared/SectionHeader";

function buildHomeRecs(allTracks, allViz, favorites, history) {
  const favTrackIds = new Set(favorites.filter((f) => f.type === "track").map((f) => f.track_id));
  const favVizIds = new Set(favorites.filter((f) => f.type === "visualizer").map((f) => f.visualizer_id));
  const historyIds = new Set(history.map((h) => h.id));

  const signalTracks = [
    ...allTracks.filter((t) => favTrackIds.has(t.id)),
    ...allTracks.filter((t) => historyIds.has(t.id)).slice(0, 10),
  ];
  const moodFreq = {};
  const catFreq = {};
  signalTracks.flatMap((t) => t.mood_tags || []).forEach((m) => { moodFreq[m] = (moodFreq[m] || 0) + 1; });
  signalTracks.flatMap((t) => t.category_ids || []).forEach((c) => { catFreq[c] = (catFreq[c] || 0) + 1; });

  const scoredTracks = allTracks
    .filter((t) => !favTrackIds.has(t.id) && !historyIds.has(t.id))
    .map((t) => {
      let score = 0;
      (t.mood_tags || []).forEach((m) => { score += (moodFreq[m] || 0) * 2; });
      (t.category_ids || []).forEach((c) => { score += (catFreq[c] || 0) * 1.5; });
      if (t.is_featured) score += 3;
      if (t.is_new_release) score += 2;
      return { ...t, _score: score };
    })
    .sort((a, b) => b._score - a._score)
    .slice(0, 6);

  const recommendedTracks = scoredTracks.length > 0
    ? scoredTracks
    : allTracks.filter((t) => t.is_featured || t.is_new_release).slice(0, 6);

  const scoredViz = allViz
    .filter((v) => !favVizIds.has(v.id))
    .map((v) => {
      let score = 0;
      if (v.is_featured) score += 3;
      if (v.linked_song_id && (favTrackIds.has(v.linked_song_id) || historyIds.has(v.linked_song_id))) score += 5;
      return { ...v, _score: score };
    })
    .sort((a, b) => b._score - a._score)
    .slice(0, 6);

  const recommendedViz = scoredViz.length > 0 ? scoredViz : allViz.slice(0, 6);

  return { recommendedTracks, recommendedViz };
}

export default function Home() {
  const [latestTracks, setLatestTracks] = useState([]);
  const [allTracks, setAllTracks] = useState([]);
  const [allViz, setAllViz] = useState([]);
  const [artists, setArtists] = useState([]);
  const [trackCounts, setTrackCounts] = useState({});
  const [academyLessons, setAcademyLessons] = useState([]);
  const [loginModal, setLoginModal] = useState(false);
  const [premiumModal, setPremiumModal] = useState(false);
  const { playTrack, currentTrack, isPlaying, togglePlay } = usePlayer();
  const { user } = useAuth();
  const { favorites, isFaved, toggle } = useFavorites(user?.email);
  const history = useMemo(() => getHistory(), []);

  const handlePlayTrack = (track) => {
    if (currentTrack?.id === track.id) { togglePlay(); return; }
    playTrack(track);
    recordPlay(track);
  };

  useEffect(() => {
    Promise.all([
      base44.entities.Track.filter({ status: "published" }, "-release_date", 4),
      base44.entities.Track.filter({ status: "published" }, "-created_date", 200),
      base44.entities.Visualizer.filter({ status: "published" }, "-release_date", 200),
      base44.entities.Artist.filter({ is_active: true, is_featured: true }, "-created_date", 8),
      base44.entities.Track.filter({ status: "published" }, "-created_date", 500),
      base44.entities.AcademyLesson.filter({ status: "published" }, "-created_date", 3),
    ]).then(([latest, all, viz, featuredArtists, allTracksForCount, lessons]) => {
      setLatestTracks(latest.length > 0 ? latest : all.slice(0, 4));
      setAllTracks(all);
      setAllViz(viz);
      setArtists(featuredArtists);
      setAcademyLessons(lessons);
      const counts = {};
      allTracksForCount.forEach((t) => {
        if (t.primary_artist_id) counts[t.primary_artist_id] = (counts[t.primary_artist_id] || 0) + 1;
      });
      setTrackCounts(counts);
    });
  }, []);

  const { recommendedTracks, recommendedViz } = useMemo(
    () => buildHomeRecs(allTracks, allViz, favorites, history),
    [allTracks, allViz, favorites, history]
  );

  const heartButton = (type, id, meta) => (
    <button
      onClick={(e) => {
        e.stopPropagation();
        if (!user) { setLoginModal(true); return; }
        toggle(type, id, meta);
      }}
      className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:scale-110"
      style={isFaved(type, id) ? { color: "#ec4899" } : { color: "rgba(255,255,255,0.2)" }}>
      <Heart className={`w-3.5 h-3.5 ${isFaved(type, id) ? "fill-current" : ""}`} />
    </button>
  );

  const downloadButton = (track) => (
    <button
      onClick={(e) => {
        e.stopPropagation();
        if (!user) { setLoginModal(true); return; }
        const isPremium = user?.role === "premium" || user?.tier === "premium";
        if (!isPremium) { setPremiumModal(true); return; }
        if (track.audio_url) window.open(track.audio_url, "_blank");
      }}
      className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:scale-110"
      style={{ color: "rgba(255,255,255,0.2)" }}
      title="Download">
      <Download className="w-3.5 h-3.5" />
    </button>
  );

  return (
    <div className="min-h-screen pb-28 lg:pb-0">

      {/* ── HERO ── */}
      <section className="relative min-h-[68vh] flex items-center overflow-hidden">
        {/* Background layers */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Base gradient */}
          <div className="absolute inset-0"
            style={{ background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(0,180,210,0.05) 0%, transparent 70%)" }} />
          {/* Single soft teal orb — top left */}
          <div className="absolute -top-20 -left-20 w-[480px] h-[480px] rounded-full blur-[160px] opacity-[0.06]"
            style={{ background: "#00C9E0" }} />
          {/* Faint gold warmth — bottom right */}
          <div className="absolute bottom-0 right-0 w-[360px] h-[360px] rounded-full blur-[140px] opacity-[0.04]"
            style={{ background: "#D4A843" }} />
          {/* Ultra-fine dot texture */}
          <div className="absolute inset-0 opacity-[0.018]"
            style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
          {/* Horizontal separator line at bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-px"
            style={{ background: "linear-gradient(90deg, transparent, rgba(0,229,255,0.12), transparent)" }} />
        </div>

        <div className="max-w-7xl mx-auto px-6 w-full pt-28 pb-14 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-3xl">

            {/* Eyebrow label */}
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.5 }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full mb-8"
              style={{ background: "rgba(0,200,220,0.06)", border: "1px solid rgba(0,200,220,0.16)" }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#00C9E0", boxShadow: "0 0 6px rgba(0,200,220,0.6)" }} />
              <span className="text-[9px] font-black tracking-[0.4em] uppercase" style={{ color: "#00C9E0" }}>
                High-Vibration Music
              </span>
            </motion.div>

            {/* Main headline */}
            <motion.h1
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22, duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
              className="font-heading font-black mb-5 leading-[0.92] tracking-tight"
              style={{ fontSize: "clamp(2.8rem,6.5vw,5rem)" }}>
              <span className="text-white">Upper Vibe </span>
              <span style={{
                background: "linear-gradient(120deg, #C9943A 0%, #EDB84A 45%, #C9943A 100%)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text"
              }}>Media</span>
            </motion.h1>

            {/* Supporting text */}
            <motion.p
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.55 }}
              className="mb-10 leading-relaxed font-body"
              style={{ fontSize: "clamp(0.95rem,1.6vw,1.1rem)", color: "rgba(255,255,255,0.42)", maxWidth: "32rem", letterSpacing: "0.01em" }}>
              432 Hz music, visualizers, and high-vibe learning —<br className="hidden sm:block" /> all in one premium experience.
            </motion.p>

            {/* CTA buttons */}
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38, duration: 0.5 }}
              className="flex flex-wrap gap-3">
              {/* Primary */}
              <Link to="/music"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-black text-[13px] tracking-wide transition-all duration-200 hover:brightness-105 hover:-translate-y-px active:scale-[0.98]"
                style={{ background: "linear-gradient(135deg,#00A8C0,#00D4EE)", color: "#000", boxShadow: "0 1px 20px rgba(0,200,220,0.15), inset 0 1px 0 rgba(255,255,255,0.15)" }}>
                <Play className="w-3.5 h-3.5 fill-current" /> Explore Music
              </Link>
              {/* Gold glass */}
              <Link to="/visualizers"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-black text-[13px] tracking-wide transition-all duration-200 hover:-translate-y-px active:scale-[0.98]"
                style={{ background: "rgba(200,148,50,0.07)", border: "1px solid rgba(200,148,50,0.28)", color: "#C89432", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)" }}>
                <Tv2 className="w-3.5 h-3.5" /> Watch Visualizers
              </Link>
              {/* Subtle secondary */}
              <Link to="/academy"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-black text-[13px] tracking-wide transition-all duration-200 hover:-translate-y-px active:scale-[0.98]"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.5)" }}>
                <GraduationCap className="w-3.5 h-3.5" /> Upper Vibe Academy
              </Link>
            </motion.div>

          </motion.div>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none"
          style={{ background: "linear-gradient(transparent, hsl(240 50% 2%))" }} />
      </section>

      {/* ── LATEST MUSIC ── */}
      <LatestMusicSection
        tracks={latestTracks}
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        handlePlayTrack={handlePlayTrack}
        heartButton={heartButton}
        downloadButton={downloadButton}
        user={user}
      />

      {/* ── RECOMMENDED SONGS ── */}
      {recommendedTracks.length > 0 && (
        <section className="max-w-7xl mx-auto px-6 py-10">
          <SectionHeader label="Picked For You" title="Recommended Songs" link="/music" linkLabel="All Music" labelColor="#D4A843" labelIcon={<Sparkles className="w-3 h-3" />} />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {recommendedTracks.map((track, i) => {
              const isCurrent = currentTrack?.id === track.id;
              return (
                <motion.div key={track.id}
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-3 p-3.5 rounded-2xl group cursor-pointer transition-all hover:border-white/15 active:scale-[0.98]"
                  style={{
                    background: isCurrent ? "rgba(212,168,67,0.06)" : "rgba(255,255,255,0.025)",
                    border: `1px solid ${isCurrent ? "rgba(212,168,67,0.2)" : "rgba(255,255,255,0.06)"}`,
                  }}
                  onClick={() => track.audio_url && handlePlayTrack(track)}>
                  <div className="relative flex-shrink-0">
                    {track.cover_url ? (
                      <img src={track.cover_url} alt={track.title} className="w-11 h-11 rounded-xl object-cover" />
                    ) : (
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: "rgba(212,168,67,0.08)" }}>
                        <Music4 className="w-4 h-4 text-yellow-400/40" />
                      </div>
                    )}
                    <div className="absolute inset-0 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: "rgba(0,0,0,0.65)" }}>
                      {isCurrent && isPlaying ? <Pause className="w-3.5 h-3.5 text-yellow-400" /> : <Play className="w-3.5 h-3.5 text-white ml-0.5" />}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link to={`/song/${track.id}`} onClick={(e) => e.stopPropagation()}
                      className="text-sm font-bold text-white truncate block hover:text-yellow-300 transition-colors">
                      {track.title}
                    </Link>
                    <p className="text-xs text-white/35 truncate">{track.artist_display || "Upper Vibe Media"}</p>
                    <Link to={`/song/${track.id}`} onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-0.5 text-[9px] text-white/25 hover:text-white/60 transition-colors mt-0.5">
                      <ExternalLink className="w-2.5 h-2.5" /> View Song
                    </Link>
                  </div>
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    <span className="flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ background: "rgba(0,229,255,0.1)", color: "#00E5FF" }}>
                      <Waves className="w-2 h-2" /> 432
                    </span>
                    {heartButton("track", track.id, { title: track.title, artist: track.artist_display, cover_url: track.cover_url })}
                    {downloadButton(track)}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── VISUALIZERS YOU MIGHT LIKE ── */}
      {recommendedViz.length > 0 && (
        <section className="max-w-7xl mx-auto px-6 py-10">
          <SectionHeader label="Visual Frequency" title="Visualizers You Might Like" link="/visualizers" linkLabel="All Visualizers" labelColor="#9B7EFF" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {recommendedViz.map((viz, i) => (
              <motion.div key={viz.id}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                className="group rounded-2xl overflow-hidden"
                style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="aspect-video relative overflow-hidden">
                  {viz.thumbnail_url ? (
                    <img src={viz.thumbnail_url} alt={viz.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"
                      style={{ background: "linear-gradient(135deg,rgba(155,126,255,0.1),rgba(0,229,255,0.05))" }}>
                      <Tv2 className="w-8 h-8 text-white/10" />
                    </div>
                  )}
                  <Link to="/visualizers"
                    className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: "rgba(0,0,0,0.5)" }}>
                    <div className="w-12 h-12 rounded-full flex items-center justify-center"
                      style={{ background: "rgba(155,126,255,0.9)" }}>
                      <Play className="w-5 h-5 text-white ml-0.5" />
                    </div>
                  </Link>
                </div>
                <div className="p-4 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white truncate">{viz.title}</p>
                    <p className="text-xs text-white/35 truncate mt-0.5">{viz.artist || "Upper Vibe Media"}</p>
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full mt-2"
                      style={{ background: "rgba(0,229,255,0.1)", color: "#00E5FF" }}>
                      <Waves className="w-2 h-2" /> 432 Hz
                    </span>
                  </div>
                  {heartButton("visualizer", viz.id, { title: viz.title, artist: viz.artist, cover_url: viz.thumbnail_url })}
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* ── UPPER VIBE ACADEMY ── */}
      {academyLessons.length > 0 && (
        <section className="max-w-7xl mx-auto px-6 py-10">
          <SectionHeader label="Learn" title="Upper Vibe Academy" link="/academy" linkLabel="See More" labelColor="#9B7EFF" labelIcon={<GraduationCap className="w-3 h-3" />} />
          <p className="text-white/30 text-sm mb-6 -mt-2">Go deeper into 432 Hz, manifesting, creativity, and expanding consciousness.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {academyLessons.map((lesson, i) => (
              <motion.div key={lesson.id}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                className="group rounded-2xl overflow-hidden flex flex-col"
                style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
                {/* Thumbnail */}
                <div className="aspect-video relative overflow-hidden flex-shrink-0">
                  {lesson.thumbnail_url ? (
                    <img src={lesson.thumbnail_url} alt={lesson.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"
                      style={{ background: "linear-gradient(135deg,rgba(155,126,255,0.12),rgba(0,229,255,0.05))" }}>
                      <GraduationCap className="w-10 h-10 text-white/10" />
                    </div>
                  )}
                  {/* Badges */}
                  <div className="absolute top-2 left-2 flex gap-1.5">
                    {lesson.is_premium && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider"
                        style={{ background: "rgba(212,168,67,0.9)", color: "#000" }}>PREMIUM</span>
                    )}
                    {lesson.is_premium && lesson.free_preview_seconds > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold"
                        style={{ background: "rgba(0,0,0,0.7)", color: "rgba(255,255,255,0.7)" }}>
                        {lesson.free_preview_seconds}s preview
                      </span>
                    )}
                  </div>
                </div>
                {/* Info */}
                <div className="p-4 flex flex-col gap-2 flex-1">
                  <p className="text-sm font-bold text-white leading-snug line-clamp-2">{lesson.title}</p>
                  {lesson.description && (
                    <p className="text-xs text-white/35 leading-relaxed line-clamp-2">{lesson.description}</p>
                  )}
                  {lesson.labels?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {lesson.labels.slice(0, 3).map((lbl) => (
                        <span key={lbl} className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                          style={{ background: "rgba(155,126,255,0.1)", border: "1px solid rgba(155,126,255,0.2)", color: "#9B7EFF" }}>
                          {lbl}
                        </span>
                      ))}
                    </div>
                  )}
                  <Link to="/academy"
                    className="mt-auto inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black tracking-wider transition-all hover:brightness-110 self-start"
                    style={{ background: "rgba(155,126,255,0.1)", border: "1px solid rgba(155,126,255,0.25)", color: "#9B7EFF" }}>
                    <Play className="w-3 h-3" /> Watch
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* ── RECENTLY LISTENED ── */}
      <RecentlyListenedSection
        allTracks={allTracks}
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        handlePlayTrack={handlePlayTrack}
        heartButton={heartButton}
        downloadButton={downloadButton}
      />

      {/* ── FEATURED ARTISTS ── */}
      {artists.length > 0 && (
        <section className="max-w-7xl mx-auto px-6 py-10">
          <SectionHeader label="The Artists" title="Featured Artists" link="/artists" linkLabel="All Artists" labelColor="#D4A843" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {artists.map((artist, i) => (
              <motion.div key={artist.id}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                <Link to="/artists"
                  className="flex flex-col items-center gap-3 p-5 rounded-2xl text-center group transition-all hover:border-white/15 active:scale-[0.98]"
                  style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  {artist.image_url ? (
                    <img src={artist.image_url} alt={artist.name} className="w-16 h-16 rounded-full object-cover ring-2 ring-white/10 group-hover:ring-cyan-400/30 transition-all" />
                  ) : (
                    <div className="w-16 h-16 rounded-full flex items-center justify-center ring-2 ring-white/10"
                      style={{ background: "rgba(0,229,255,0.08)" }}>
                      <Users className="w-6 h-6 text-cyan-400/40" />
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-bold text-white truncate">{artist.name}</p>
                    {trackCounts[artist.id] && (
                      <p className="text-xs text-white/30 mt-0.5">{trackCounts[artist.id]} track{trackCounts[artist.id] !== 1 ? "s" : ""}</p>
                    )}
                  </div>
                  <span className="text-[10px] font-black tracking-wider px-3 py-1 rounded-full transition-all group-hover:brightness-125"
                    style={{ background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.15)", color: "#00E5FF" }}>
                    View Artist
                  </span>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* ── EMAIL SIGNUP ── */}
      <EmailSignupSection />

      <Footer />

      <FavLoginModal open={loginModal} onClose={() => setLoginModal(false)} />
      <PremiumDownloadModal open={premiumModal} onClose={() => setPremiumModal(false)} />
    </div>
  );
}


function EmailSignupSection() {
  const [form, setForm] = useState({ name: "", email: "" });
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email) return;
    setSaving(true);
    await base44.entities.ContactMessage.create({
      name: form.name || "Fan",
      email: form.email,
      type: "newsletter",
      message: "Email list signup from homepage",
    });
    setSaving(false);
    setSubmitted(true);
  };

  return (
    <section className="max-w-7xl mx-auto px-6 py-10 pb-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
        className="rounded-3xl p-8 md:p-12"
        style={{ background: "linear-gradient(135deg,rgba(0,229,255,0.04),rgba(212,168,67,0.03))", border: "1px solid rgba(0,229,255,0.09)" }}>
        {!submitted ? (
          <div className="flex flex-col lg:flex-row gap-10 items-start lg:items-center">
            <div className="lg:max-w-xs flex-shrink-0">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.18)" }}>
                <Mail className="w-5 h-5 text-cyan-400" />
              </div>
              <h3 className="font-heading font-black text-2xl text-white mb-2">Get Notified When New Music Drops</h3>
              <p className="text-white/35 text-sm leading-relaxed">
                Join the Upper Vibe Media list for new 432 Hz songs, visualizers, exclusive drops, and high-vibe updates.
              </p>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 flex flex-col sm:flex-row gap-3 w-full">
              <input type="text" placeholder="Your name (optional)"
                value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="flex-1 px-4 py-3 rounded-xl text-sm text-white placeholder:text-white/25 focus:outline-none"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)" }} />
              <input type="email" placeholder="Your email *" required
                value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="flex-1 px-4 py-3 rounded-xl text-sm text-white placeholder:text-white/25 focus:outline-none"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)" }} />
              <button type="submit" disabled={saving}
                className="px-6 py-3 rounded-xl font-black text-xs tracking-wider transition-all hover:brightness-110 flex-shrink-0 disabled:opacity-60 whitespace-nowrap"
                style={{ background: "linear-gradient(135deg,#00B8D4,#00E5FF)", color: "#000" }}>
                {saving ? "..." : "Notify Me"}
              </button>
            </form>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <CheckCircle2 className="w-8 h-8 text-cyan-400 flex-shrink-0" />
            <div>
              <p className="font-heading font-bold text-white text-lg">You're locked in.</p>
              <p className="text-white/40 text-sm">New Upper Vibe drops will hit your inbox first.</p>
            </div>
          </div>
        )}
      </motion.div>
    </section>
  );
}