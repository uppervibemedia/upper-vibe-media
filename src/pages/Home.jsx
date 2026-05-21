import React, { useEffect, useState, useMemo } from "react"; // useMemo kept for sessionSeed
import { motion } from "framer-motion";
import { Play, Waves, ArrowRight, Tv2, Mail, CheckCircle2, Pause, Heart, Users, GraduationCap, Download } from "lucide-react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import Footer from "../components/shared/Footer";
import { usePlayer } from "../context/PlayerContext";
import { useAuth } from "@/lib/AuthContext";
import { useFavorites } from "../hooks/useFavorite";
import { recordPlay } from "../components/home/DiscoverTab";
import FavLoginModal from "../components/shared/FavLoginModal";
import PremiumDownloadModal from "../components/shared/PremiumDownloadModal";
import RecentlyListenedSection from "../components/home/RecentlyListenedSection";
import LatestMusicSection from "../components/home/LatestMusicSection";
import TrendingTracksSection from "../components/home/TrendingTracksSection";
import SectionHeader from "../components/shared/SectionHeader";
import PullToRefresh from "../components/shared/PullToRefresh";

// ── Session-stable shuffle ──────────────────────────────────────────────────
// Same order within a session, different on every new tab/refresh
function getSessionSeed() {
  let seed = sessionStorage.getItem("uv_home_seed");
  if (!seed) {
    seed = Math.random().toString(36).slice(2);
    sessionStorage.setItem("uv_home_seed", seed);
  }
  return seed;
}

function seededShuffle(arr, seed) {
  const a = [...arr];
  let s = seed.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    const j = Math.abs(s) % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function Home() {
  const [latestTracks, setLatestTracks] = useState([]);
  const [allTracks, setAllTracks] = useState([]);
  const [allViz, setAllViz] = useState([]);
  const [recentViz, setRecentViz] = useState([]);
  const [artists, setArtists] = useState([]);
  const [trackCounts, setTrackCounts] = useState({});
  const [academyLessons, setAcademyLessons] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const sessionSeed = useMemo(() => getSessionSeed(), []);
  const [loginModal, setLoginModal] = useState(false);
  const [premiumModal, setPremiumModal] = useState(false);
  const { playTrack, currentTrack, isPlaying, togglePlay } = usePlayer();
  const { user } = useAuth();
  const { isFaved, toggle } = useFavorites(user?.email);

  const handlePlayTrack = (track) => {
    if (currentTrack?.id === track.id) { togglePlay(); return; }
    playTrack(track);
    recordPlay(track);
  };

  const loadData = () => Promise.all([
      base44.entities.Track.filter({ status: "published" }, "-release_date", 30),
      base44.entities.Track.filter({ status: "published" }, "-created_date", 200),
      base44.entities.Visualizer.filter({ status: "published" }, "-created_date", 30),
      base44.entities.Visualizer.filter({ status: "published" }, "-release_date", 200),
      base44.entities.Artist.filter({ is_active: true, is_featured: true }, "-created_date", 8),
      base44.entities.Track.filter({ status: "published" }, "-created_date", 500),
      base44.entities.AcademyLesson.filter({ status: "published" }, "-created_date", 3),
  ]).then(([recentPool, all, recentVizPool, allVizFull, featuredArtists, allTracksForCount, lessons]) => {
    setLatestTracks(recentPool.slice(0, 4));
    setAllTracks(all);
    const rotatedViz = seededShuffle(recentVizPool, sessionSeed + "v").slice(0, 6);
    setRecentViz(rotatedViz);
    setAllViz(allVizFull);
    setArtists(featuredArtists);
    setAcademyLessons(lessons);
    const counts = {};
    allTracksForCount.forEach((t) => {
      if (t.primary_artist_id) counts[t.primary_artist_id] = (counts[t.primary_artist_id] || 0) + 1;
    });
    setTrackCounts(counts);
  });

  useEffect(() => { loadData(); }, [sessionSeed, refreshKey]);

  const handleRefresh = async () => {
    sessionStorage.removeItem("uv_home_seed");
    setRefreshKey((k) => k + 1);
  };

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
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="min-h-screen pb-28 lg:pb-0">

      {/* ── HERO ── */}
      <section className="relative flex items-center overflow-hidden" style={{ minHeight: "68vh" }}>
        {/* Background layers */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Ambient glow — very restrained */}
          <div className="absolute top-[-80px] left-[-60px] w-[560px] h-[560px] rounded-full blur-[200px] opacity-[0.055]"
            style={{ background: "#00C9E0" }} />
          <div className="absolute bottom-0 right-[-40px] w-[320px] h-[320px] rounded-full blur-[150px] opacity-[0.03]"
            style={{ background: "#C9902A" }} />
          {/* Fine vertical scan-line grid — very subtle, editorial feel */}
          <div className="absolute inset-0 opacity-[0.018]"
            style={{ backgroundImage: "repeating-linear-gradient(90deg, rgba(255,255,255,0.6) 0px, rgba(255,255,255,0.6) 1px, transparent 1px, transparent 80px)" }} />
          {/* Bottom fade */}
          <div className="absolute bottom-0 left-0 right-0 h-28 pointer-events-none"
            style={{ background: "linear-gradient(transparent, hsl(240 50% 2%))" }} />
        </div>

        <div className="max-w-7xl mx-auto px-6 w-full pt-28 pb-20 relative z-10">
          <div className="max-w-xl">

            {/* ── Eyebrow label ── */}
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-center gap-3 mb-8">
              {/* Frequency dot + label */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-sm"
                style={{ background: "rgba(0,200,220,0.05)", border: "1px solid rgba(0,200,220,0.16)" }}>
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 animate-pulse" style={{ background: "#00C9E0" }} />
                <span style={{
                  fontSize: "9px", letterSpacing: "0.38em", fontWeight: 900,
                  textTransform: "uppercase", color: "#00C9E0", fontFamily: "var(--font-heading)"
                }}>High-Vibration Music</span>
              </div>
              {/* Thin accent line extending from label */}
              <div className="hidden sm:block h-px flex-1 max-w-[60px]"
                style={{ background: "linear-gradient(90deg, rgba(0,200,220,0.35), transparent)" }} />
            </motion.div>

            {/* ── Main title lockup ── */}
            <motion.div
              initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.16, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="mb-3">

              {/* UPPER VIBE — platinum/white, wide tracked, geometric weight */}
              <div style={{
                fontFamily: "var(--font-heading)",
                fontSize: "clamp(2.6rem, 6.2vw, 4.8rem)",
                fontWeight: 900,
                lineHeight: 0.95,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                background: "linear-gradient(165deg, #FFFFFF 0%, #D8E8EC 45%, #A8C8D4 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                display: "block",
                // Very faint text-shadow glow — subtle platinum sheen
                filter: "drop-shadow(0 0 18px rgba(0,210,240,0.07))",
              }}>UPPER VIBE</div>

              {/* Thin divider accent line between the two words */}
              <div className="flex items-center gap-2 my-1.5">
                <div className="h-px w-8" style={{ background: "rgba(212,168,67,0.5)" }} />
                {/* Minimal waveform accent — 5 bars */}
                <div className="flex items-end gap-[2.5px]" style={{ height: "8px" }}>
                  {[3, 6, 8, 5, 3].map((h, i) => (
                    <div key={i} className="w-[2px] rounded-full"
                      style={{ height: `${h}px`, background: `rgba(212,168,67,${0.25 + i * 0.06})` }} />
                  ))}
                </div>
                <div className="h-px flex-1 max-w-[100px]" style={{ background: "linear-gradient(90deg, rgba(212,168,67,0.25), transparent)" }} />
              </div>

              {/* MEDIA — refined gold gradient, slightly smaller, breathes under UPPER VIBE */}
              <div style={{
                fontFamily: "var(--font-heading)",
                fontSize: "clamp(1.5rem, 3.6vw, 2.8rem)",
                fontWeight: 800,
                lineHeight: 1.0,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                background: "linear-gradient(105deg, #8A5E1A 0%, #C8892A 30%, #E8AC40 55%, #C08020 80%, #A06818 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                display: "block",
                filter: "drop-shadow(0 0 12px rgba(200,140,40,0.12))",
              }}>MEDIA</div>
            </motion.div>

            {/* ── Subtitle ── */}
            <motion.p
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.28, duration: 0.5 }}
              className="mt-7 mb-9 font-body leading-[1.7]"
              style={{ fontSize: "clamp(0.85rem, 1.4vw, 1rem)", color: "rgba(255,255,255,0.35)", maxWidth: "27rem" }}>
              432 Hz music, visualizers, and high-vibe learning —
              all in one premium experience.
            </motion.p>

            {/* ── CTA buttons ── */}
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.38, duration: 0.45 }}
              className="flex flex-wrap gap-2.5">
              <Link to="/music"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-sm font-black text-[11px] tracking-[0.1em] uppercase transition-all duration-200 hover:brightness-105 hover:-translate-y-0.5 active:scale-[0.98]"
                style={{ background: "linear-gradient(135deg,#009CB8,#00C8E0)", color: "#000" }}>
                <Play className="w-3.5 h-3.5 fill-current" /> Explore Music
              </Link>
              <Link to="/visualizers"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-sm font-black text-[11px] tracking-[0.1em] uppercase transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98]"
                style={{ background: "transparent", border: "1px solid rgba(185,135,45,0.35)", color: "#C08830" }}>
                <Tv2 className="w-3.5 h-3.5" /> Watch Visualizers
              </Link>
              <Link to="/academy"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-sm font-black text-[11px] tracking-[0.1em] uppercase transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98]"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.38)" }}>
                <GraduationCap className="w-3.5 h-3.5" /> Upper Vibe Academy
              </Link>
            </motion.div>

          </div>
        </div>
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

      {/* ── TRENDING TRACKS ── */}
      <TrendingTracksSection
        allTracks={allTracks}
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        handlePlayTrack={handlePlayTrack}
        heartButton={heartButton}
        downloadButton={downloadButton}
        user={user}
      />

      {/* ── VISUALIZERS ── */}
      {recentViz.length > 0 && (
        <section className="max-w-7xl mx-auto px-6 py-10">
          <SectionHeader label="Visual Frequency" title="Latest Visualizers" link="/visualizers" linkLabel="See More" labelColor="#9B7EFF" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {recentViz.map((viz, i) => (
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

      {/* ── RECENTLY PLAYED ── */}
      <RecentlyListenedSection
        allTracks={allTracks}
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        handlePlayTrack={handlePlayTrack}
        heartButton={heartButton}
        downloadButton={downloadButton}
      />

      {/* ── EMAIL SIGNUP ── */}
      <EmailSignupSection />

      <Footer />

      <FavLoginModal open={loginModal} onClose={() => setLoginModal(false)} />
      <PremiumDownloadModal open={premiumModal} onClose={() => setPremiumModal(false)} />
    </div>
    </PullToRefresh>
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