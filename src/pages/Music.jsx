import React, { useState, useEffect, useMemo, useRef, memo } from "react";
import { motion } from "framer-motion";
import { getPublishedTracks, invalidateTrackCache } from "@/lib/trackCache";
import { Search, X, Play, Pause, Download, Waves, Music4, ChevronLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { usePlayer } from "../context/PlayerContext";
import { recordPlay } from "../components/home/DiscoverTab";
import { useAuth } from "@/lib/AuthContext";
import Footer from "../components/shared/Footer";
import PremiumDownloadModal from "../components/shared/PremiumDownloadModal";
import FavLoginModal from "../components/shared/FavLoginModal";
import SupportModal from "../components/shared/SupportModal";
import FavoriteButton from "@/components/shared/FavoriteButton";
import SaveHeartButton from "@/components/shared/SaveHeartButton";
import CoverImage from "@/components/shared/CoverImage";
import PullToRefresh from "../components/shared/PullToRefresh";
import { useImagePreloader } from "@/hooks/useImagePreloader";
import { useTheme } from "@/context/ThemeContext";
import { RADIO_THEMES } from "../components/radio/RadioThemePicker";
import IOSTip from "../components/shared/iOSTip";
import PageErrorBoundary from "@/components/shared/PageErrorBoundary";
import DownloadToast from "../components/shared/DownloadToast";
import { recordUserDownload, triggerBrowserDownload } from "@/lib/downloadService";

const GENRE_TYPES = ["genre", "mood", "editorial", "frequency"];
const PAGE_SIZE = 30;

// Debounce helper
function useDebounce(value, delay) {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// Skeleton loader card
function SkeletonCard() {
  return (
    <div className="flex items-center gap-2 p-1.5 rounded-xl"
      style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="w-7 h-7 rounded-lg flex-shrink-0 animate-pulse" style={{ background: "rgba(255,255,255,0.06)" }} />
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="h-2.5 rounded-full animate-pulse w-3/4" style={{ background: "rgba(255,255,255,0.07)" }} />
        <div className="h-2 rounded-full animate-pulse w-1/2" style={{ background: "rgba(255,255,255,0.04)" }} />
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {[0, 1, 2].map((i) => (
          <div key={i} className="w-7 h-7 rounded-lg animate-pulse" style={{ background: "rgba(255,255,255,0.05)" }} />
        ))}
      </div>
    </div>
  );
}

function MusicInner() {
  const [tracks, setTracks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const debouncedSearch = useDebounce(search, 200);
  const [loading, setLoading] = useState(true);
  const [upgradeModal, setUpgradeModal] = useState(false);
  const [loginModal, setLoginModal] = useState(false);
  const [downloadToast, setDownloadToast] = useState(null);
  const [downloadIosMode, setDownloadIosMode] = useState(false);
  const [supportModal, setSupportModal] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const { playTrack, currentTrack, isPlaying, togglePlay } = usePlayer();
  const { user, isPlus, isAdmin } = useAuth();
  const isPremium = isPlus || isAdmin;
  const { accentId } = useTheme();
  const radioTheme = RADIO_THEMES[accentId] || RADIO_THEMES.cyan;
  const themeColor = radioTheme.vars["--rt-primary"]; // e.g. "0,229,255"
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getPublishedTracks("-created_date", 500),
      base44.entities.Category.list("display_order", 100),
    ]).then(([t, cats]) => {
      setTracks(t);
      setCategories(cats.filter((c) => c.is_active && GENRE_TYPES.includes(c.type)));
      setLoading(false);
    });
  }, [refreshKey]);

  const handleRefresh = async () => { invalidateTrackCache(); setRefreshKey((k) => k + 1); };

  const filtered = useMemo(() => {
    let result = tracks;
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
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

  // Preload first 12 cover images for instant rendering
  const firstCoverUrls = useMemo(() => filtered.slice(0, 12).map((t) => t.cover_url).filter(Boolean), [filtered]);
  useImagePreloader(firstCoverUrls);

  // Reset visible count when search/filter changes
  const prevFilterRef = React.useRef({ search: "", activeFilter: "all" });
  useEffect(() => {
    const prev = prevFilterRef.current;
    if (prev.search !== debouncedSearch || prev.activeFilter !== activeFilter) {
      setVisibleCount(PAGE_SIZE);
      prevFilterRef.current = { search: debouncedSearch, activeFilter };
    }
  }, [debouncedSearch, activeFilter]);

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
              {/* Back button */}
              <button
                onClick={() => navigate(-1)}
                className="inline-flex items-center gap-1.5 text-xs mb-4 transition-colors"
                style={{ color: `rgba(${themeColor},0.6)` }}
                onMouseEnter={e => e.currentTarget.style.color = `rgb(${themeColor})`}
                onMouseLeave={e => e.currentTarget.style.color = `rgba(${themeColor},0.6)`}
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Back
              </button>
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
          {debouncedSearch && (
            <div className="px-6 mb-3">
              <p className="text-sm text-white/30">
                {filtered.length} result{filtered.length !== 1 ? "s" : ""} for{" "}
                <span className="text-white/60">"{debouncedSearch}"</span>
              </p>
            </div>
          )}
          {!debouncedSearch && !loading && (
            <div className="px-6 mb-2">
              <p className="text-xs text-white/20">
                Showing {Math.min(visibleCount, filtered.length)} of {filtered.length} tracks
              </p>
            </div>
          )}

          {/* Track list — extra bottom clearance for mini player + bottom nav + safe area */}
          <div className="px-4 sm:px-6" style={{ paddingBottom: "calc(11rem + env(safe-area-inset-bottom, 20px))" }}>
            {loading ? (
              <div className="space-y-1">
                            {Array.from({ length: 10 }).map((_, i) => <SkeletonCard key={i} />)}
                          </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20">
                <Music4 className="w-10 h-10 text-white/10 mx-auto mb-3" />
                <p className="text-white/25">No songs found.</p>
              </div>
            ) : (
              <div className="space-y-1">
                  {filtered.slice(0, visibleCount).map((track, i) => (
                    <TrackRow
                      key={track.id}
                      track={track}
                      index={i}
                      isCurrent={currentTrack?.id === track.id}
                      isPlaying={isPlaying}
                      isPremium={isPremium}
                      themeColor={themeColor}
                      onPlay={handlePlay}
                      onNeedLogin={() => setLoginModal(true)}
                      onDownload={async (track) => {
                        if (!isPremium) { setUpgradeModal(true); return; }
                        if (!track.audio_url) return;
                        recordUserDownload(user, track).catch(() => {});
                        const method = await triggerBrowserDownload(track.audio_url, track.title);
                        setDownloadIosMode(method === "ios_new_tab");
                        setDownloadToast(track);
                      }}
                    />
                  ))}
                  {visibleCount < filtered.length && (
                    <div className="pt-4 pb-2 flex justify-center">
                      <button
                        onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}
                        className="px-8 py-3 rounded-2xl text-sm font-black tracking-wide transition-all hover:brightness-110 active:scale-95"
                        style={{
                          background: `rgba(${themeColor},0.1)`,
                          border: `1px solid rgba(${themeColor},0.3)`,
                          color: `rgb(${themeColor})`,
                        }}>
                        Load More · {filtered.length - visibleCount} remaining
                      </button>
                    </div>
                  )}
              </div>
            )}
          </div>
        </div>

        <Footer />
      </div>

      <PremiumDownloadModal open={upgradeModal} onClose={() => setUpgradeModal(false)} />
      <FavLoginModal open={loginModal} onClose={() => setLoginModal(false)} />
      <DownloadToast track={downloadToast} iosMode={downloadIosMode} onClose={() => setDownloadToast(null)} onSupport={(t) => setSupportModal(t)} />
      <SupportModal open={!!supportModal} onClose={() => setSupportModal(null)} track={supportModal} />
      <IOSTip trigger="on-play" isPlaying={isPlaying} />
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

// B: React.memo — prevents rerenders when only isPlaying/currentTrack changes on other rows
export default function Music() {
  return (
    <PageErrorBoundary>
      <MusicInner />
    </PageErrorBoundary>
  );
}

const TrackRow = memo(function TrackRow({ track, index, isCurrent, isPlaying, isPremium, themeColor, onPlay, onNeedLogin, onDownload }) {
  const tc = themeColor || "0,160,220";
  return (
    <div
      className="flex items-center gap-1.5 p-1.5 rounded-xl transition-colors active:scale-[0.99]"
      style={{
        background: isCurrent ? `rgba(${tc},0.06)` : "rgba(255,255,255,0.025)",
        border: `1px solid ${isCurrent ? `rgba(${tc},0.2)` : "rgba(255,255,255,0.06)"}`,
        boxShadow: isCurrent ? `0 0 20px rgba(${tc},0.06)` : "none",
        willChange: "auto",
      }}
    >
      {/* Cover art */}
      <Link to={`/song/${track.id}`} className="relative flex-shrink-0 block" onClick={(e) => e.stopPropagation()}>
        <CoverImage
          src={track.cover_url}
          alt={track.title}
          width={28}
          height={28}
          className="w-7 h-7 rounded-lg overflow-hidden"
          eager={false}
          iconClassName="w-3 h-3"
          fallbackOpacityClass="text-cyan-400/30"
          fallbackBgClass="bg-cyan-400/[0.08]"
        />
        {/* Playing indicator overlay */}
        {isCurrent && isPlaying && (
          <div className="absolute inset-0 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.45)" }}>
            <Waves className="w-2.5 h-2.5 text-cyan-400 animate-pulse" />
          </div>
        )}
      </Link>

      {/* Track info */}
      <div className="flex-1 min-w-0">
        <Link to={`/song/${track.id}`} onClick={(e) => e.stopPropagation()} className="block">
          <p className="text-[11px] font-bold text-white truncate leading-tight"
            style={{ color: isCurrent ? `rgb(${tc})` : "#fff" }}>
            {track.title}
          </p>
          <p className="text-[9px] text-white/40 truncate">
            {track.artist_display || "Upper Vibe Media"}
          </p>
        </Link>
      </div>

      {/* Action buttons — Play → Download → Heart */}
      <div className="flex items-center gap-0.5 flex-shrink-0">
        {/* Play/Pause — electric blue */}
        <button
          onClick={() => onPlay(track)}
          className="w-7 h-7 rounded-lg flex items-center justify-center transition-all active:scale-95"
          style={{
            background: isCurrent ? "rgba(0,160,220,0.18)" : "rgba(0,160,220,0.08)",
            border: "1px solid rgba(0,160,220,0.35)",
            color: "#00A0DC"
          }}>
          {isCurrent && isPlaying
            ? <Pause className="w-2.5 h-2.5" />
            : <Play className="w-2.5 h-2.5 ml-px" />}
        </button>

        {/* Download — midnight amber */}
        <button
          onClick={() => onDownload(track)}
          className="w-7 h-7 rounded-lg flex items-center justify-center transition-all active:scale-95"
          style={{ background: "rgba(212,168,67,0.1)", border: "1px solid rgba(212,168,67,0.25)", color: "#D4A843" }}
          title={isPremium ? "Download" : "Upgrade to Plus to download"}>
          <Download className="w-2.5 h-2.5" />
        </button>

        {/* Heart — new SaveHeartButton */}
        <SaveHeartButton
          item={track.id}
          itemType="song"
          meta={{ title: track.title, artist: track.artist_display, cover_url: track.cover_url, audio_url: track.audio_url }}
          size="sm"
          onNeedLogin={onNeedLogin}
        />
      </div>
    </div>
  );
});