import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { motion, useAnimationFrame } from "framer-motion";
import usePageVisible from "@/hooks/usePageVisible";
import { getPublishedTracks, invalidateTrackCache } from "@/lib/trackCache";
import { Play, Pause, Waves, Tv2, Mail, CheckCircle2, Heart, Users, Radio, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import Footer from "../components/shared/Footer";
import { usePlayer } from "../context/PlayerContext";
import { useRadio } from "../context/RadioContext";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { useFavorites } from "../hooks/useFavorite";
import { recordPlay } from "../components/home/DiscoverTab";
import FavLoginModal from "../components/shared/FavLoginModal";
import PremiumDownloadModal from "../components/shared/PremiumDownloadModal";

import RecentlyListenedSection from "../components/home/RecentlyListenedSection";
import LatestMusicSection from "../components/home/LatestMusicSection";
import YourFrequencyFeed from "../components/home/YourFrequencyFeed";
import SectionHeader from "../components/shared/SectionHeader";
import PullToRefresh from "../components/shared/PullToRefresh";
import { useTheme } from "@/context/ThemeContext";
import { RADIO_THEMES } from "../components/radio/RadioThemePicker";
import IOSTip from "../components/shared/iOSTip";

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

// ── Homepage featured track rotation ──────────────────────────────────────
// Picks 4 truly random published+playable tracks on every mount.
// Avoids repeating the last shown song ID (stored in localStorage).
const LAST_HOME_TRACK_KEY = "uv_last_home_track";

function pickHomepageTracks(allTracks, count = 4) {
  const eligible = allTracks.filter(t => t.audio_url && t.cover_url && t.status === "published");
  console.log("Homepage rotation songs available:", eligible.length);
  if (eligible.length === 0) return [];

  let lastId = null;
  try { lastId = localStorage.getItem(LAST_HOME_TRACK_KEY); } catch {}
  console.log("Last homepage song:", lastId);

  // Shuffle truly randomly (not seeded) so every mount is fresh
  const shuffled = [...eligible].sort(() => Math.random() - 0.5);

  // Avoid leading with the same song as last time when possible
  const reordered = lastId && shuffled[0]?.id === lastId && shuffled.length > 1
    ? [shuffled[1], shuffled[0], ...shuffled.slice(2)]
    : shuffled;

  const picked = reordered.slice(0, count);
  console.log("Selected homepage song:", picked[0]?.id, picked[0]?.title);

  try { localStorage.setItem(LAST_HOME_TRACK_KEY, picked[0]?.id || ""); } catch {}
  return picked;
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
  const { startRadio, tracksLoaded, currentRadioSong } = useRadio();
  const { accentId } = useTheme();
  const radioTheme = RADIO_THEMES[accentId] || RADIO_THEMES.cyan;
  const rtPrimary = radioTheme.vars["--rt-primary"];
  const rtSecondary = radioTheme.vars["--rt-secondary"];
  const rtAmbient1 = radioTheme.vars["--rt-ambient1"];
  const navigate = useNavigate();
  const { user } = useAuth();
  const isPageVisible = usePageVisible();

  const handleStartRadio = () => {
    const audio = document.querySelector("audio");
    const audioActive = audio && audio.src && !audio.paused && audio.currentTime > 0;
    // If something is already playing, just navigate — do not restart or reload
    if (isPlaying || audioActive) {
      navigate("/radio");
      return;
    }
    startRadio();
    navigate("/radio");
  };
  const { isFaved, toggle } = useFavorites(user?.email);

  const handlePlayTrack = (track) => {
    if (currentTrack?.id === track.id) { togglePlay(); return; }
    playTrack(track);
    recordPlay(track);
  };

  const loadData = async () => {
    // Batch 1: most critical above-the-fold data
    const [allTracks, recentVizPool] = await Promise.all([
      getPublishedTracks("-created_date", 200),
      base44.entities.Visualizer.filter({ status: "published" }, "-created_date", 30),
    ]);

    // Pick 4 truly random featured tracks on every mount — rotates each visit/refresh
    const featured = pickHomepageTracks(allTracks);
    setLatestTracks(featured.length > 0 ? featured : allTracks.filter(t => t.audio_url && t.cover_url).slice(0, 4));
    setAllTracks(allTracks);

    const rotatedViz = seededShuffle(recentVizPool, sessionSeed + "v").slice(0, 6);
    setRecentViz(rotatedViz);

    // Count tracks per artist from already-fetched data
    const counts = {};
    allTracks.forEach((t) => {
      if (t.primary_artist_id) counts[t.primary_artist_id] = (counts[t.primary_artist_id] || 0) + 1;
    });
    setTrackCounts(counts);

    // Batch 2: secondary data (below the fold)
    const [featuredArtists, lessons] = await Promise.all([
      base44.entities.Artist.filter({ is_active: true, is_featured: true }, "-created_date", 8),
      base44.entities.AcademyLesson.filter({ status: "published" }, "-created_date", 3),
    ]);
    setArtists(featuredArtists);
    setAcademyLessons(lessons);
  };

  useEffect(() => { loadData(); }, [sessionSeed, refreshKey]);

  const handleRefresh = async () => {
    sessionStorage.removeItem("uv_home_seed");
    try { localStorage.removeItem(LAST_HOME_TRACK_KEY); } catch {}
    invalidateTrackCache();
    setRefreshKey((k) => k + 1);
  };

  // H: memoized heartButton — prevents consumer rerenders when playback changes
  const heartButton = useCallback((type, id, meta) => (
    <button
      onClick={(e) => {
        e.stopPropagation();
        if (!user) { setLoginModal(true); return; }
        toggle(type, id, meta);
      }}
      className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:scale-110"
      style={isFaved(type, id) ? { color: "#9B7EFF" } : { color: "rgba(255,255,255,0.2)" }}>
      <Heart className={`w-3.5 h-3.5 ${isFaved(type, id) ? "fill-current" : ""}`} />
    </button>
  ), [user, isFaved, toggle, setLoginModal]);



  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="min-h-screen" style={{ WebkitOverflowScrolling: "touch" }}>

      {/* ── HERO ── */}
      <section className="relative flex items-center overflow-hidden" style={{ minHeight: "clamp(44vh, 58vh, 62vh)" }}>
        {/* Animated ambient background */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Slow-drifting glow orbs */}
          <motion.div
            animate={{ x: [0, 30, -10, 0], y: [0, -20, 15, 0], opacity: [0.06, 0.1, 0.06] }}
            transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-[-80px] left-[-60px] w-[500px] h-[500px] rounded-full blur-[180px]"
            style={{ background: "#00C9E0" }} />
          <motion.div
            animate={{ x: [0, -20, 10, 0], y: [0, 15, -10, 0], opacity: [0.04, 0.07, 0.04] }}
            transition={{ duration: 22, repeat: Infinity, ease: "easeInOut", delay: 4 }}
            className="absolute bottom-0 right-[-40px] w-[280px] h-[280px] rounded-full blur-[130px]"
            style={{ background: "#F5A800" }} />
          {/* Subtle scan lines */}
          <div className="absolute inset-0 opacity-[0.014]"
            style={{ backgroundImage: "repeating-linear-gradient(90deg, rgba(255,255,255,0.6) 0px, rgba(255,255,255,0.6) 1px, transparent 1px, transparent 80px)" }} />
          {/* Animated waveform behind logo — pauses when tab hidden (D) */}
          <div className="absolute left-0 right-0 bottom-[35%] flex items-end justify-center gap-[2px] opacity-[0.06] pointer-events-none">
            {Array.from({ length: 60 }).map((_, i) => (
              <motion.div key={i}
                animate={{ height: [`${4 + Math.sin(i * 0.4) * 10}px`, `${8 + Math.sin(i * 0.4 + 1.2) * 16}px`, `${4 + Math.sin(i * 0.4) * 10}px`] }}
                transition={{ duration: 2.2 + (i % 7) * 0.18, repeat: isPageVisible ? Infinity : 0, ease: "easeInOut", delay: i * 0.03 }}
                className="w-[3px] rounded-full flex-shrink-0"
                style={{ background: i % 2 === 0 ? "#00C9E0" : "#F5A800" }} />
            ))}
          </div>
          {/* Bottom fade */}
          <div className="absolute bottom-0 left-0 right-0 h-28 pointer-events-none"
            style={{ background: "linear-gradient(transparent, hsl(240 50% 2%))" }} />
        </div>

        <div className="max-w-7xl mx-auto px-6 w-full pt-14 md:pt-24 pb-8 md:pb-16 relative z-10">
          <div className="max-w-xl">

            {/* ── Eyebrow label ── */}
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-center gap-3 mb-5 sm:mb-6">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-sm"
                style={{ background: `rgba(${rtPrimary},0.05)`, border: `1px solid rgba(${rtPrimary},0.16)` }}>
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 animate-pulse" style={{ background: `rgb(${rtPrimary})` }} />
                <span style={{ fontSize: "9px", letterSpacing: "0.38em", fontWeight: 900, textTransform: "uppercase", color: `rgb(${rtPrimary})`, fontFamily: "var(--font-heading)" }}>
                  High-Vibration Music
                </span>
              </div>
              <div className="hidden sm:block h-px flex-1 max-w-[60px]"
                style={{ background: `linear-gradient(90deg, rgba(${rtPrimary},0.35), transparent)` }} />
            </motion.div>

            {/* ── Main title lockup — 20-25% smaller on mobile ── */}
            <motion.div
              initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.16, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="mb-2">

              <div className="hero-logo-upper" style={{
                fontFamily: "var(--font-heading)",
                fontSize: "clamp(1.55rem, 5vw, 4rem)",
                fontWeight: 900,
                lineHeight: 0.95,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "#F5A800",
                display: "block",
                filter: "drop-shadow(0 2px 14px rgba(245,168,0,0.28))",
              }}>UPPER VIBE</div>

              <div className="flex items-center gap-2 my-1">
                <div className="h-px w-6" style={{ background: "rgba(43,159,232,0.5)" }} />
                <div className="flex items-end gap-[2px]" style={{ height: "7px" }}>
                  {[2, 5, 7, 4, 2].map((h, i) => (
                    <motion.div key={i}
                      animate={{ height: [`${h * 0.5}px`, `${h}px`, `${h * 0.6}px`] }}
                      transition={{ duration: 2.6 + i * 0.35, repeat: Infinity, ease: "easeInOut", delay: i * 0.28 }}
                      className="w-[2px] rounded-full"
                      style={{ background: `rgba(43,159,232,${0.35 + i * 0.07})` }} />
                  ))}
                </div>
                <div className="h-px flex-1 max-w-[80px]" style={{ background: "linear-gradient(90deg, rgba(43,159,232,0.3), transparent)" }} />
              </div>

              <div className="hero-logo-media" style={{
                fontFamily: "var(--font-heading)",
                fontSize: "clamp(0.88rem, 2.9vw, 2.3rem)",
                fontWeight: 800,
                lineHeight: 1.0,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "#2B9FE8",
                display: "block",
                filter: "drop-shadow(0 2px 10px rgba(43,159,232,0.3))",
              }}>MEDIA</div>
            </motion.div>

            {/* ── Hero media card — always visible on mobile/desktop ── */}
            {/* Priority: active currentTrack > radio song > rotating homepage song */}
            {(() => {
              const displayTrack = currentTrack || currentRadioSong || latestTracks[0];
              if (!displayTrack) return null;
              const isActive = !!(currentTrack || currentRadioSong);
              const label = isPlaying ? "Now Playing" : currentTrack ? "Paused" : currentRadioSong ? "Live on Radio" : "Featured Track";
              return (
                <motion.div
                  key={displayTrack.id}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  className="flex items-center gap-3 mt-3 mb-4 px-3 py-2.5 rounded-2xl"
                  style={{
                    background: `linear-gradient(135deg, rgba(${rtPrimary},0.09) 0%, rgba(${rtPrimary},0.04) 100%)`,
                    border: `1px solid rgba(${rtPrimary},0.22)`,
                    boxShadow: `0 0 24px rgba(${rtPrimary},0.08)`,
                    maxWidth: "min(420px, 90vw)",
                  }}>
                  {/* Cover art */}
                  <div className="relative flex-shrink-0">
                    <img src={displayTrack.cover_url} alt={displayTrack.title}
                      className="w-11 h-11 rounded-xl object-cover ring-1 ring-white/10" />
                    <motion.div
                      animate={{ scale: [1, 1.18, 1], opacity: [0.3, 0, 0.3] }}
                      transition={{ duration: isPlaying ? 1.6 : 3.5, repeat: Infinity, ease: "easeInOut" }}
                      className="absolute inset-0 rounded-xl pointer-events-none"
                      style={{ border: `2px solid rgb(${rtPrimary})` }} />
                  </div>
                  {/* Equalizer bars */}
                  <div className="flex items-end gap-[2px] flex-shrink-0" style={{ height: "14px" }}>
                    {[4, 8, 14, 10, 6, 12, 8].map((h, i) => (
                      <motion.div key={i}
                        animate={{ height: [`${h * 0.25}px`, `${h}px`, `${h * 0.55}px`, `${h * 0.8}px`, `${h * 0.25}px`] }}
                        transition={{ duration: (isPlaying ? 0.9 : 1.4) + i * 0.18, repeat: Infinity, ease: "easeInOut", delay: i * 0.14 }}
                        className="w-[2px] rounded-full"
                        style={{ background: `rgb(${rtPrimary})`, opacity: isPlaying ? 1 : 0.5 }} />
                    ))}
                  </div>
                  {/* Track info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[8px] font-black tracking-[0.18em] uppercase leading-none mb-0.5" style={{ color: `rgba(${rtPrimary},0.7)` }}>
                      {label}
                    </p>
                    <p className="text-xs font-bold text-white/90 truncate">{displayTrack.title}</p>
                    <p className="text-[10px] text-white/45 truncate">
                      {displayTrack.artist_display || displayTrack.artist || "Upper Vibe Media"}
                    </p>
                  </div>
                  {/* Action button */}
                  {currentTrack ? (
                    <button onClick={togglePlay}
                      className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all hover:scale-105 active:scale-95"
                      style={{ background: `linear-gradient(135deg,rgb(${rtPrimary}),rgba(${rtPrimary},0.75))`, boxShadow: `0 0 16px rgba(${rtPrimary},0.3)` }}>
                      {isPlaying
                        ? <Pause className="w-3.5 h-3.5 text-black fill-current" />
                        : <Play className="w-3.5 h-3.5 text-black fill-current ml-0.5" />}
                    </button>
                  ) : currentRadioSong ? (
                    <button onClick={handleStartRadio}
                      className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all hover:scale-105 active:scale-95"
                      style={{ background: `linear-gradient(135deg,rgb(${rtPrimary}),rgba(${rtPrimary},0.75))`, boxShadow: `0 0 16px rgba(${rtPrimary},0.3)` }}>
                      <Radio className="w-3.5 h-3.5 text-black" />
                    </button>
                  ) : (
                    <button onClick={() => handlePlayTrack(displayTrack)}
                      className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all hover:scale-105 active:scale-95"
                      style={{ background: `linear-gradient(135deg,rgb(${rtPrimary}),rgba(${rtPrimary},0.75))`, boxShadow: `0 0 16px rgba(${rtPrimary},0.3)` }}>
                      <Play className="w-3.5 h-3.5 text-black fill-current ml-0.5" />
                    </button>
                  )}
                </motion.div>
              );
            })()}

            {/* ── Subtitle ── */}
            <motion.p
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="hidden sm:block mt-4 mb-6 font-body leading-[1.7]"
              style={{ fontSize: "clamp(0.85rem, 1.3vw, 0.95rem)", color: "rgba(255,255,255,0.5)", maxWidth: "27rem" }}>
              432 Hz music, visualizers, and high-vibe learning —
              all in one premium experience.
            </motion.p>

            {/* ── CTA buttons ── */}
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.38, duration: 0.45 }}
              className="flex flex-col gap-2.5 mt-3 sm:mt-0">

              {/* PRIMARY */}
              <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-3">
                <button
                  onClick={handleStartRadio}
                  className="inline-flex items-center gap-2.5 px-6 py-3 sm:px-7 sm:py-3.5 rounded-sm font-black text-sm tracking-wider w-fit"
                  style={{
                    background: `linear-gradient(135deg,rgb(${rtPrimary}),rgb(${rtPrimary}))`,
                    color: "#000",
                    boxShadow: `0 0 32px rgba(${rtPrimary},0.35), 0 4px 16px rgba(0,0,0,0.3)`,
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 0 48px rgba(${rtPrimary},0.55), 0 6px 20px rgba(0,0,0,0.35)`; e.currentTarget.style.transform = "translateY(-2px)"; }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = `0 0 32px rgba(${rtPrimary},0.35), 0 4px 16px rgba(0,0,0,0.3)`; e.currentTarget.style.transform = "translateY(0)"; }}
                  onMouseDown={e => { e.currentTarget.style.transform = "scale(0.97)"; }}
                  onMouseUp={e => { e.currentTarget.style.transform = "translateY(-1px)"; }}>
                  <Radio className="w-4 h-4" /> Start Listening Live
                </button>
                <span className="text-[10px] sm:text-[11px] font-medium flex items-center gap-1.5" style={{ color: "rgba(255,255,255,0.38)" }}>
                  <Waves className="w-3 h-3 animate-pulse" style={{ color: `rgba(${rtPrimary},0.5)` }} />
                  Music keeps playing while you browse
                </span>
              </div>

              {/* SECONDARY */}
              <div className="flex flex-wrap gap-2">
                <Link to="/music"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-sm font-black text-[11px] tracking-[0.1em] uppercase"
                  style={{ background: `rgba(${rtPrimary},0.07)`, border: `1px solid rgba(${rtPrimary},0.3)`, color: `rgb(${rtPrimary})`, transition: "all 0.2s ease" }}
                  onMouseEnter={e => { e.currentTarget.style.background = `rgba(${rtPrimary},0.14)`; e.currentTarget.style.boxShadow = `0 0 18px rgba(${rtPrimary},0.22)`; e.currentTarget.style.transform = "translateY(-1px)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = `rgba(${rtPrimary},0.07)`; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "none"; }}>
                  <Play className="w-3 h-3 fill-current" /> Browse Music
                </Link>
                <Link to="/visualizers"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-sm font-black text-[11px] tracking-[0.1em] uppercase"
                  style={{ background: "rgba(245,168,0,0.06)", border: "1px solid rgba(245,168,0,0.25)", color: "#F5A800", transition: "all 0.2s ease" }}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(245,168,0,0.12)"; e.currentTarget.style.boxShadow = "0 0 16px rgba(245,168,0,0.18)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "rgba(245,168,0,0.06)"; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "none"; }}>
                  <Tv2 className="w-3 h-3" /> Watch Visualizers
                </Link>
              </div>


            </motion.div>

          </div>
        </div>
      </section>

      {/* ── RADIO CTA — immersive live section ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-2 pb-6 md:py-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="relative rounded-2xl md:rounded-3xl overflow-hidden"
          style={{
            background: `linear-gradient(135deg,rgba(${rtPrimary},0.1) 0%,rgba(${rtPrimary},0.04) 50%,rgba(212,168,67,0.06) 100%)`,
            border: `1px solid rgba(${rtPrimary},0.18)`,
            boxShadow: `0 0 60px rgba(${rtPrimary},0.07), inset 0 1px 0 rgba(255,255,255,0.05)`,
          }}>

          {/* Animated glow orbs */}
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.18, 0.28, 0.18] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-16 -left-16 w-64 h-64 rounded-full blur-[80px] pointer-events-none"
            style={{ background: rtAmbient1 }} />
          <motion.div
            animate={{ scale: [1, 1.15, 1], opacity: [0.08, 0.15, 0.08] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 3 }}
            className="absolute -bottom-8 right-8 w-48 h-48 rounded-full blur-[70px] pointer-events-none"
            style={{ background: "#F5A800" }} />

          {/* Full-width waveform strip at bottom — pauses when tab hidden (D) */}
          <div className="absolute bottom-0 left-0 right-0 flex items-end justify-center gap-[1.5px] h-16 opacity-30 pointer-events-none overflow-hidden">
            {Array.from({ length: 80 }).map((_, i) => {
              const colorCycle = i % 4;
              const barColor = colorCycle === 0
                ? `rgb(${rtPrimary})`
                : colorCycle === 1
                  ? `rgb(${rtSecondary})`
                  : colorCycle === 2
                    ? rtAmbient1
                    : "#F5A800";
              return (
                <motion.div key={i}
                  animate={{ height: [`${8 + Math.sin(i * 0.35) * 16}px`, `${16 + Math.sin(i * 0.35 + 1.5) * 28}px`, `${8 + Math.sin(i * 0.35) * 16}px`] }}
                  transition={{ duration: 1.8 + (i % 5) * 0.2, repeat: isPageVisible ? Infinity : 0, ease: "easeInOut", delay: i * 0.015 }}
                  className="w-[2px] rounded-full flex-shrink-0"
                  style={{ background: barColor }} />
              );
            })}
          </div>

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-5 md:gap-8 p-5 md:p-10 pb-10 md:pb-12">
            {/* Left */}
            <div className="flex-1">
              {/* LIVE NOW badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4"
                style={{ background: "rgba(239,68,68,0.14)", border: "1px solid rgba(239,68,68,0.3)" }}>
                <motion.span
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                  className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                <span className="text-[10px] font-black tracking-[0.3em] uppercase text-red-400">Live Now</span>
              </div>

              <h2 className="font-heading font-black text-2xl md:text-3xl lg:text-4xl text-white mb-3 leading-tight">
                Upper Vibe Radio Is Live
              </h2>

              <p className="text-white/50 text-sm md:text-base leading-relaxed max-w-lg mb-5 md:mb-6">
                432 Hz high-vibe music, positive radio drops, visual energy, and nonstop frequency for your day.
              </p>

              <Link
                to="/radio"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-black text-xs tracking-wider transition-all hover:brightness-110 hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: `rgba(${rtPrimary},0.12)`,
                  border: `1px solid rgba(${rtPrimary},0.35)`,
                  color: `rgb(${rtPrimary})`,
                  boxShadow: `0 0 20px rgba(${rtPrimary},0.15)`,
                }}>
                <Radio className="w-3.5 h-3.5" /> Open Radio Station
              </Link>
            </div>

            {/* Right: tall animated waveform — desktop — pauses when tab hidden (D) */}
            <div className="flex-shrink-0 hidden md:flex items-end gap-1 h-28">
              {[5,8,14,22,30,38,28,18,32,40,24,16,34,20,10,26,36,22,12,28].map((h, i) => {
                const cycle = i % 4;
                const barColor = cycle === 0
                  ? `rgba(${rtPrimary},0.9)`
                  : cycle === 1
                    ? `rgba(${rtSecondary},0.75)`
                    : cycle === 2
                      ? `${rtAmbient1}CC`
                      : "rgba(245,158,11,0.7)";
                return (
                  <motion.div key={i}
                    animate={{ height: [`${h * 0.45}px`, `${h}px`, `${h * 0.6}px`, `${h}px`] }}
                    transition={{ duration: 1.0 + i * 0.06, repeat: isPageVisible ? Infinity : 0, ease: "easeInOut", delay: i * 0.04 }}
                    className="w-1.5 rounded-full flex-shrink-0"
                    style={{ background: barColor }} />
                );
              })}
            </div>
          </div>
        </motion.div>
      </section>



      {/* ── LATEST MUSIC ── */}
      <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.55, ease: [0.22,1,0.36,1] }}>
      <LatestMusicSection
        tracks={latestTracks}
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        handlePlayTrack={handlePlayTrack}
        heartButton={heartButton}
        user={user}
        themeColor={rtPrimary}
      />
      </motion.div>

      {/* ── YOUR FREQUENCY FEED ── */}
      <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.55, ease: [0.22,1,0.36,1] }}>
        <YourFrequencyFeed
          allTracks={allTracks}
          allViz={recentViz}
          academyLessons={academyLessons}
          currentTrack={currentTrack}
          isPlaying={isPlaying}
          handlePlayTrack={handlePlayTrack}
          user={user}
          isFaved={isFaved}
          themeColor={rtPrimary}
          onToggleFav={(track) => {
            if (!user) { setLoginModal(true); return; }
            toggle("track", track.id, { title: track.title, artist: track.artist_display, cover_url: track.cover_url });
          }}
        />
      </motion.div>

      {/* ── FREQUENCY CTA ── */}
      <section className="max-w-7xl mx-auto px-6 py-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="relative rounded-2xl p-8 text-center overflow-hidden"
          style={{ background: `rgba(${rtPrimary},0.04)`, border: `1px solid rgba(${rtPrimary},0.12)` }}>
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-32 rounded-full blur-[80px] opacity-10" style={{ background: rtAmbient1 }} />
          </div>
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 rounded-full" style={{ background: `rgba(${rtPrimary},0.08)`, border: `1px solid rgba(${rtPrimary},0.18)` }}>
              <Zap className="w-3 h-3" style={{ color: `rgb(${rtPrimary})` }} />
              <span className="text-[10px] font-black tracking-[0.2em] uppercase" style={{ color: `rgb(${rtPrimary})` }}>Curated Frequency</span>
            </div>
            <h3 className="font-heading font-black text-xl md:text-2xl text-white mb-2">
              Not sure what to play? Let the frequency choose for you
            </h3>
            <p className="text-white/45 text-sm mb-6 max-w-md mx-auto">
              Our radio engine picks the perfect high-vibe track based on energy, mood, and what's resonating right now.
            </p>
            <Link
              to="/radio"
              className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-full font-black text-sm tracking-wider transition-all hover:brightness-110 hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: `linear-gradient(135deg,rgba(${rtPrimary},0.8),rgba(${rtPrimary},0.95))`, color: "#000", boxShadow: `0 0 24px rgba(${rtPrimary},0.25)` }}>
              <Zap className="w-4 h-4" /> Enter The Frequency
            </Link>
          </div>
        </motion.div>
      </section>



      {/* ── FEATURED ARTISTS ── */}
      {artists.length > 0 && (
        <section className="max-w-7xl mx-auto px-6 py-10">
          <SectionHeader label="The Artists" title="Featured Artists" link="/artists" linkLabel="All Artists" labelColor={`rgb(${rtPrimary})`} themeColor={rtPrimary} />
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
      <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.55, ease: [0.22,1,0.36,1] }}>
      <RecentlyListenedSection
        allTracks={allTracks}
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        handlePlayTrack={handlePlayTrack}
        heartButton={heartButton}
        themeColor={rtPrimary}
        radioThemeColor={rtPrimary}
      />
      </motion.div>

      {/* ── EMAIL SIGNUP ── */}
      <EmailSignupSection />

      <Footer />

      <FavLoginModal open={loginModal} onClose={() => setLoginModal(false)} />
      <PremiumDownloadModal open={premiumModal} onClose={() => setPremiumModal(false)} />
      <IOSTip trigger="on-play" isPlaying={isPlaying} />
    </div>
    </PullToRefresh>
  );
}


function EmailSignupSection() {
  const [form, setForm] = useState({ name: "", email: "" });
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const { accentId } = useTheme();
  const radioTheme = RADIO_THEMES[accentId] || RADIO_THEMES.cyan;
  const rtPrimary = radioTheme.vars["--rt-primary"];
  const rtAmbient1 = radioTheme.vars["--rt-ambient1"];

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
        style={{ background: `linear-gradient(135deg,rgba(${rtPrimary},0.05),rgba(${rtPrimary},0.02))`, border: `1px solid rgba(${rtPrimary},0.1)` }}>

        {!submitted ? (
          <div className="flex flex-col lg:flex-row gap-10 items-start lg:items-center">
            <div className="lg:max-w-xs flex-shrink-0">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: `rgba(${rtPrimary},0.08)`, border: `1px solid rgba(${rtPrimary},0.2)` }}>
                <Mail className="w-5 h-5" style={{ color: `rgb(${rtPrimary})` }} />
              </div>
              <h3 className="font-heading font-black text-2xl text-white mb-2">Get Notified When New Music Drops</h3>
              <p className="text-white/45 text-sm leading-relaxed">
                Join the Upper Vibe Media list for new 432 Hz songs, visualizers, exclusive drops, and high-vibe updates.
              </p>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 flex flex-col sm:flex-row gap-3 w-full">
              <input type="text" placeholder="Your name (optional)"
                value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="flex-1 px-4 py-3 rounded-xl text-sm text-white placeholder:text-white/25 focus:outline-none"
                style={{ background: "rgba(255,255,255,0.05)", border: `1px solid rgba(${rtPrimary},0.12)` }} />
              <input type="email" placeholder="Your email *" required
                value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="flex-1 px-4 py-3 rounded-xl text-sm text-white placeholder:text-white/25 focus:outline-none"
                style={{ background: "rgba(255,255,255,0.05)", border: `1px solid rgba(${rtPrimary},0.12)` }} />
              <button type="submit" disabled={saving}
                className="px-6 py-3 rounded-xl font-black text-xs tracking-wider transition-all hover:brightness-110 flex-shrink-0 disabled:opacity-60 whitespace-nowrap"
                style={{ background: `linear-gradient(135deg,rgba(${rtPrimary},0.8),rgb(${rtPrimary}))`, color: "#000" }}>
                {saving ? "..." : "Notify Me"}
              </button>
            </form>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <CheckCircle2 className="w-8 h-8 flex-shrink-0" style={{ color: `rgb(${rtPrimary})` }} />
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