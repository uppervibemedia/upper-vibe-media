import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Play, Pause, Download, Waves, Music4, Lock, Heart } from "lucide-react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { usePlayer } from "../context/PlayerContext";
import { recordPlay } from "../components/home/DiscoverTab";
import { useAuth } from "@/lib/AuthContext";
import Footer from "../components/shared/Footer";
import PremiumDownloadModal from "../components/shared/PremiumDownloadModal";
import FavLoginModal from "../components/shared/FavLoginModal";
import { useFavorites } from "../hooks/useFavorite";
import PullToRefresh from "../components/shared/PullToRefresh";
import { useTheme } from "@/context/ThemeContext";
import { RADIO_THEMES } from "../components/radio/RadioThemePicker";

const GENRE_TYPES = ["genre", "mood", "editorial", "frequency"];

// Skeleton loader card
function SkeletonCard() {
  return (
    <div className="flex items-center gap-4 p-4 rounded-2xl"
      style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="w-12 h-12 rounded-xl flex-shrink-0 animate-pulse" style={{ background: "rgba(255,255,255,0.06)" }} />
      <div className="flex-1 min-w-0 space-y-2">
        <div className="h-3.5 rounded-full animate-pulse w-3/4" style={{ background: "rgba(255,255,255,0.07)" }} />
        <div className="h-2.5 rounded-full animate-pulse w-1/2" style={{ background: "rgba(255,255,255,0.04)" }} />
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {[0, 1, 2].map((i) => (
          <div key={i} className="w-9 h-9 rounded-xl animate-pulse" style={{ background: "rgba(255,255,255,0.05)" }} />
        ))}
      </div>
    </div>
  );
}

export default function Music() {
  const [tracks, setTracks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [upgradeModal, setUpgradeModal] = useState(false);
  const [loginModal, setLoginModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const { playTrack, currentTrack, isPlaying, togglePlay } = usePlayer();
  const { user } = useAuth();
  const isPremium = user?.role === "premium" || user?.role === "admin";
  const { isFaved, toggle } = useFavorites(user?.email);
  const { accentId } = useTheme();
  const radioTheme = RADIO_THEMES[accentId] || RADIO_THEMES.cyan;
  const themeColor = radioTheme.vars["--rt-primary"]; // e.g. "0,229,255"

  useEffect(() => {
    setLoading(true);
    Promise.all([
      base44.entities.Track.filter({ status: "published" }, "-created_date", 500),
      base44.entities.Category.list("display_order", 100),
    ]).then(([t, cats]) => {
      setTracks(t);
      setCategories(cats.filter((c) => c.is_active && GENRE_TYPES.includes(c.type)));
      setLoading(false);
    });
  }, [refreshKey]);

  const handleRefresh = async () => setRefreshKey((k) => k + 1);

  const filtered = useMemo(() => {
    let result = tracks;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((t) =>
        (t.title || "").toLowerCase().includes(q) ||
        (t.artist_display || "").toLowerCase().includes(q)
      );
    } else if (activeFilter === "new") {
      result = result.filter((t) => t.is_new_release);
    } else if (activeFilter !== "all") {
      result = result.filter((t) => (t.category_ids || []).includes(activeFilter));
    }
    return result;
  }, [tracks, search, activeFilter]);

  const handlePlay = (track) => {
    if (currentTrack?.id === track.id) togglePlay();
    else { playTrack(track); recordPlay(track); }
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      {/* Full-height container with safe-area awareness */}
      <div className="min-h-screen" style={{ WebkitOverflowScrolling: "touch" }}>

        {/* ── HERO HEADER ── */}
        <section className="relative overflow-hidden">
          {/* Ambient glow */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-[-60px] left-[-40px] w-[400px] h-[400px] rounded-full blur-[180px] opacity-[0.05]"
              style={{ background: "#00A0DC" }} />
            <div className="absolute bottom-0 left-0 right-0 h-20 pointer-events-none"
              style={{ background: "linear-gradient(transparent, hsl(240 50% 2%))" }} />
          </div>

          <div className="max-w-7xl mx-auto px-6 relative z-10"
            style={{ paddingTop: "max(4.5rem, calc(3rem + env(safe-area-inset-top, 0px)))", paddingBottom: "1rem" }}>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}>
              {/* Main title */}
              <h1 className="font-heading font-black mb-1 leading-tight"
                style={{ fontSize: "clamp(1.9rem, 6vw, 3.2rem)", color: "rgba(255,255,255,0.92)" }}>
                Music Library
              </h1>

              {/* Subtitle */}
              <p className="font-heading font-bold mb-2 leading-snug"
                style={{ fontSize: "clamp(0.85rem, 2.5vw, 1.1rem)", color: `rgb(${themeColor})`, letterSpacing: "0.02em" }}>
                Discover Your Frequency
              </p>
              <p className="text-white/30 text-xs leading-relaxed max-w-lg">
                Stream 432 Hz high-vibe music, new releases, and curated frequency tracks
                {!loading && <span className="text-white/20"> · {tracks.length} tracks</span>}
              </p>
            </motion.div>
          </div>
        </section>

        {/* ── SEARCH + FILTERS + LIST ── */}
        <div className="max-w-7xl mx-auto">

          {/* Search bar */}
          <div className="px-6 mb-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25 pointer-events-none" />
              <input
                type="text"
                placeholder="Search songs or artists..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setActiveFilter("all"); }}
                className="w-full pl-11 pr-10 py-3.5 rounded-2xl text-sm text-white placeholder:text-white/25 focus:outline-none transition-all"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                onFocus={(e) => e.target.style.borderColor = "rgba(0,160,220,0.3)"}
                onBlur={(e) => e.target.style.borderColor = "rgba(255,255,255,0.08)"}
              />
              {search && (
                <button onClick={() => setSearch("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Filter tabs — full-bleed horizontal scroll, chips never cut off */}
          <div className="overflow-x-auto pb-2 mb-3 hide-scrollbar">
            <div className="flex gap-2" style={{ width: "max-content", paddingLeft: "1.5rem", paddingRight: "1.5rem" }}>
              <FilterPill label="All" active={activeFilter === "all"} onClick={() => { setActiveFilter("all"); setSearch(""); }} themeColor={themeColor} />
              <FilterPill label="New Releases" active={activeFilter === "new"} onClick={() => { setActiveFilter("new"); setSearch(""); }} themeColor={themeColor} />
              {categories.map((cat) => (
                <FilterPill
                  key={cat.id}
                  label={cat.name}
                  active={activeFilter === cat.id}
                  onClick={() => { setActiveFilter(cat.id); setSearch(""); }}
                  themeColor={themeColor}
                />
              ))}
            </div>
          </div>

          {/* Result count when searching */}
          {search && (
            <div className="px-6 mb-3">
              <p className="text-sm text-white/30">
                {filtered.length} result{filtered.length !== 1 ? "s" : ""} for{" "}
                <span className="text-white/60">"{search}"</span>
              </p>
            </div>
          )}

          {/* Track list — extra bottom clearance for mini player + bottom nav + safe area */}
          <div className="px-4 sm:px-6" style={{ paddingBottom: "calc(11rem + env(safe-area-inset-bottom, 20px))" }}>
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20">
                <Music4 className="w-10 h-10 text-white/10 mx-auto mb-3" />
                <p className="text-white/25">No songs found.</p>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeFilter + search}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-2">
                  {filtered.map((track, i) => (
                    <TrackRow
                      key={track.id}
                      track={track}
                      index={i}
                      isCurrent={currentTrack?.id === track.id}
                      isPlaying={isPlaying}
                      isFaved={isFaved}
                      isPremium={isPremium}
                      user={user}
                      themeColor={themeColor}
                      onPlay={handlePlay}
                      onFav={(track) => {
                        if (!user) { setLoginModal(true); return; }
                        toggle("track", track.id, { title: track.title, artist: track.artist_display, cover_url: track.cover_url });
                      }}
                      onDownload={() => setUpgradeModal(true)}
                    />
                  ))}
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </div>

        <Footer />
      </div>

      <PremiumDownloadModal open={upgradeModal} onClose={() => setUpgradeModal(false)} />
      <FavLoginModal open={loginModal} onClose={() => setLoginModal(false)} />
    </PullToRefresh>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function FilterPill({ label, active, onClick, themeColor }) {
  return (
    <button
      onClick={onClick}
      className="whitespace-nowrap px-4 py-2.5 rounded-full text-xs font-bold tracking-wider transition-all border flex-shrink-0"
      style={active ? {
        background: `rgba(${themeColor},0.12)`,
        borderColor: `rgba(${themeColor},0.4)`,
        color: `rgb(${themeColor})`,
      } : {
        background: "rgba(255,255,255,0.03)",
        borderColor: "rgba(255,255,255,0.07)",
        color: "rgba(255,255,255,0.35)",
      }}
    >
      {label}
    </button>
  );
}

function TrackRow({ track, index, isCurrent, isPlaying, isFaved, isPremium, user, themeColor, onPlay, onFav, onDownload }) {
  const tc = themeColor || "0,160,220";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.02, 0.3) }}
      className="flex items-center gap-3 p-3.5 rounded-2xl transition-all active:scale-[0.99]"
      style={{
        background: isCurrent ? `rgba(${tc},0.06)` : "rgba(255,255,255,0.025)",
        border: `1px solid ${isCurrent ? `rgba(${tc},0.2)` : "rgba(255,255,255,0.06)"}`,
        boxShadow: isCurrent ? `0 0 20px rgba(${tc},0.06)` : "none",
      }}
    >
      {/* Cover art */}
      <Link to={`/song/${track.id}`} className="relative flex-shrink-0 block" onClick={(e) => e.stopPropagation()}>
        {track.cover_url ? (
          <img src={track.cover_url} alt={track.title} className="w-12 h-12 rounded-xl object-cover" />
        ) : (
          <div className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(0,160,220,0.08)" }}>
            <Music4 className="w-5 h-5 text-cyan-400/30" />
          </div>
        )}
        {/* Playing indicator overlay */}
        {isCurrent && isPlaying && (
          <div className="absolute inset-0 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.45)" }}>
            <Waves className="w-4 h-4 text-cyan-400 animate-pulse" />
          </div>
        )}
      </Link>

      {/* Track info */}
      <div className="flex-1 min-w-0">
        <Link to={`/song/${track.id}`} onClick={(e) => e.stopPropagation()} className="block">
          <p className="text-sm font-bold text-white truncate leading-snug"
            style={{ color: isCurrent ? `rgb(${tc})` : "#fff" }}>
            {track.title}
          </p>
          <p className="text-xs text-white/40 truncate mt-0.5">
            {track.artist_display || "Upper Vibe Media"}
          </p>
        </Link>
        <div className="flex items-center gap-1.5 mt-1.5">
          <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
            style={{ background: "rgba(0,160,220,0.1)", border: "1px solid rgba(0,160,220,0.18)", color: "#00A0DC" }}>
            <Waves className="w-2 h-2" /> 432 Hz
          </span>
          {track.is_new_release && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: "rgba(212,168,67,0.12)", color: "#D4A843" }}>NEW</span>
          )}
        </div>
      </div>

      {/* Action buttons — Play → Download → Heart */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {/* Play/Pause — electric blue */}
        <button
          onClick={() => onPlay(track)}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-95"
          style={{
            background: isCurrent ? "rgba(0,160,220,0.18)" : "rgba(0,160,220,0.08)",
            border: "1px solid rgba(0,160,220,0.35)",
            color: "#00A0DC"
          }}>
          {isCurrent && isPlaying
            ? <Pause className="w-3.5 h-3.5" />
            : <Play className="w-3.5 h-3.5 ml-0.5" />}
        </button>

        {/* Download — midnight amber */}
        {isPremium ? (
          <a
            href={track.audio_url}
            download={`${track.title}.mp3`}
            onClick={(e) => e.stopPropagation()}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-95"
            style={{ background: "rgba(212,168,67,0.1)", border: "1px solid rgba(212,168,67,0.25)", color: "#D4A843" }}
            title="Download">
            <Download className="w-3.5 h-3.5" />
          </a>
        ) : (
          <button
            onClick={() => onDownload(track)}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-95"
            style={{ background: "rgba(212,168,67,0.05)", border: "1px solid rgba(212,168,67,0.15)", color: "rgba(212,168,67,0.3)" }}
            title="Premium download">
            <Lock className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Favorite — violet purple */}
        <button
          onClick={() => onFav(track)}
          title={isFaved("track", track.id) ? "Saved" : "Save to Favorites"}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-95"
          style={isFaved("track", track.id) ? {
            background: "rgba(155,126,255,0.22)", border: "1px solid rgba(155,126,255,0.55)", color: "#9B7EFF"
          } : {
            background: "rgba(155,126,255,0.06)", border: "1px solid rgba(155,126,255,0.35)", color: "rgba(155,126,255,0.6)"
          }}>
          <Heart className={`w-3.5 h-3.5 ${isFaved("track", track.id) ? "fill-current" : ""}`} />
        </button>
      </div>
    </motion.div>
  );
}