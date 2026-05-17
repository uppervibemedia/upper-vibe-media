import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Play, Pause, Download, Waves, Music4, Lock, Heart } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { usePlayer } from "../context/PlayerContext";
import { recordPlay } from "../components/home/DiscoverTab";
import { useAuth } from "@/lib/AuthContext";
import Footer from "../components/shared/Footer";
import PremiumDownloadModal from "../components/shared/PremiumDownloadModal";
import FavLoginModal from "../components/shared/FavLoginModal";
import { useFavorites } from "../hooks/useFavorite";
import { Link } from "react-router-dom";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "hiphop", label: "Hip Hop / Rap" },
  { id: "rnb", label: "R&B" },
  { id: "electronic", label: "Electronic Music" },
  { id: "instrumentals", label: "Instrumentals" },
  { id: "meditation", label: "Meditation / Focus" },
  { id: "car", label: "Car Music" },
  { id: "new", label: "New Releases" },
];

const FILTER_MATCHERS = {
  hiphop: (t) => matchCategory(t, ["hip", "rap", "hiphop"]),
  rnb: (t) => matchCategory(t, ["r&b", "rnb", "soul"]),
  electronic: (t) => matchCategory(t, ["electronic", "edm", "techno", "house"]),
  instrumentals: (t) => matchCategory(t, ["instrumental"]),
  meditation: (t) => matchCategory(t, ["meditation", "focus", "calm", "healing"]),
  car: (t) => matchCategory(t, ["car", "driving", "road"]),
  new: (t) => t.is_new_release,
};

function matchCategory(track, keywords) {
  const haystack = [track.title, track.artist_display, track.album, track.description]
    .join(" ").toLowerCase();
  return keywords.some((k) => haystack.includes(k));
}

function MusicCard({ track, index, onPlay, isCurrent, isPlaying, isFaved, onFav, isPremium, onUpgrade, onLoginRequired }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02 }}
      className="group flex flex-col rounded-2xl overflow-hidden"
      style={{
        background: isCurrent ? "rgba(0,229,255,0.06)" : "rgba(255,255,255,0.025)",
        border: `1px solid ${isCurrent ? "rgba(0,229,255,0.25)" : "rgba(255,255,255,0.07)"}`,
      }}
    >
      {/* Cover Art — square, full width */}
      <div
        className="relative w-full aspect-square cursor-pointer flex-shrink-0 overflow-hidden"
        onClick={() => onPlay(track)}
      >
        {track.cover_url ? (
          <img
            src={track.cover_url}
            alt={track.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,rgba(0,229,255,0.08),rgba(212,168,67,0.04))" }}
          >
            <Music4 className="w-12 h-12 text-white/10" />
          </div>
        )}

        {/* Play overlay */}
        <div
          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: "rgba(0,0,0,0.55)" }}
        >
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{ background: "rgba(0,229,255,0.9)" }}
          >
            {isCurrent && isPlaying
              ? <Pause className="w-6 h-6 text-black" />
              : <Play className="w-6 h-6 text-black ml-0.5" />}
          </div>
        </div>

        {/* Top badges */}
        <div className="absolute top-2 left-2 flex gap-1.5 pointer-events-none">
          <span
            className="flex items-center gap-0.5 text-[9px] font-black px-1.5 py-0.5 rounded-full"
            style={{ background: "rgba(0,0,0,0.7)", color: "#00E5FF" }}
          >
            <Waves className="w-2 h-2" /> 432 Hz
          </span>
          {track.is_new_release && (
            <span
              className="text-[9px] font-black px-1.5 py-0.5 rounded-full"
              style={{ background: "rgba(212,168,67,0.9)", color: "#000" }}
            >
              NEW
            </span>
          )}
        </div>
      </div>

      {/* Details */}
      <div className="p-3.5 flex flex-col gap-2.5 flex-1">
        <Link to={`/song/${track.id}`} className="min-w-0 hover:opacity-80 transition-opacity">
          <p className="text-sm font-bold text-white leading-tight line-clamp-2">{track.title}</p>
          <p className="text-xs text-white/40 mt-0.5 truncate">{track.artist_display || "Upper Vibe Media"}</p>
        </Link>

        {/* Action row */}
        <div className="flex items-center gap-1.5 mt-auto">
          {/* Heart */}
          <button
            onClick={() => {
              if (!onLoginRequired()) return;
              onFav("track", track.id, { title: track.title, artist: track.artist_display, cover_url: track.cover_url });
            }}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:scale-110 flex-shrink-0"
            style={isFaved("track", track.id) ? {
              background: "rgba(236,72,153,0.15)", border: "1px solid rgba(236,72,153,0.35)", color: "#ec4899"
            } : {
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.3)"
            }}>
            <Heart className={`w-3.5 h-3.5 ${isFaved("track", track.id) ? "fill-current" : ""}`} />
          </button>

          {/* Play */}
          <button
            onClick={() => onPlay(track)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-black tracking-wider transition-all hover:brightness-110"
            style={{
              background: isCurrent ? "rgba(0,229,255,0.18)" : "rgba(0,229,255,0.08)",
              border: "1px solid rgba(0,229,255,0.2)",
              color: "#00E5FF",
            }}>
            {isCurrent && isPlaying ? <><Pause className="w-3.5 h-3.5" /> Pause</> : <><Play className="w-3.5 h-3.5 ml-0.5" /> Play</>}
          </button>

          {/* Download */}
          {isPremium ? (
            <a
              href={track.audio_url}
              download={`${track.title}.mp3`}
              className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:scale-110 flex-shrink-0"
              style={{ background: "rgba(212,168,67,0.1)", border: "1px solid rgba(212,168,67,0.25)", color: "#D4A843" }}
              onClick={(e) => e.stopPropagation()}
              title="Download">
              <Download className="w-3.5 h-3.5" />
            </a>
          ) : (
            <button
              onClick={onUpgrade}
              className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:scale-110 flex-shrink-0"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.2)" }}
              title="Premium download">
              <Lock className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function Music() {
  const [tracks, setTracks] = useState([]);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [upgradeModal, setUpgradeModal] = useState(false);
  const [loginModal, setLoginModal] = useState(false);
  const { playTrack, currentTrack, isPlaying, togglePlay } = usePlayer();
  const { user } = useAuth();
  const isPremium = user?.role === "premium" || user?.role === "admin";
  const { isFaved, toggle } = useFavorites(user?.email);

  useEffect(() => {
    base44.entities.Track.filter({ status: "published" }, "-created_date", 500)
      .then((t) => { setTracks(t); setLoading(false); });
  }, []);

  const filtered = useMemo(() => {
    let result = tracks;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((t) =>
        (t.title || "").toLowerCase().includes(q) ||
        (t.artist_display || "").toLowerCase().includes(q)
      );
    } else if (activeFilter !== "all" && FILTER_MATCHERS[activeFilter]) {
      result = result.filter(FILTER_MATCHERS[activeFilter]);
    }
    return result;
  }, [tracks, search, activeFilter]);

  const handlePlay = (track) => {
    if (currentTrack?.id === track.id) togglePlay();
    else { playTrack(track); recordPlay(track); }
  };

  const requireLogin = () => {
    if (!user) { setLoginModal(true); return false; }
    return true;
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-6 pt-20 pb-6">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4 text-[10px] font-black tracking-[0.3em] uppercase"
            style={{ background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.18)", color: "#00E5FF" }}>
            <Music4 className="w-3 h-3" /> Music Library
          </div>
          <h1 className="font-heading font-black text-4xl md:text-5xl text-white mb-2">All Music</h1>
          <p className="text-white/35 text-sm">{tracks.length} songs · All tuned to 432 Hz · Free to stream</p>
        </motion.div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pb-16">
        {/* Search */}
        <div className="relative mb-5">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25 pointer-events-none" />
          <input
            type="text"
            placeholder="Search songs or artists..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setActiveFilter("all"); }}
            className="w-full pl-11 pr-10 py-3.5 rounded-2xl text-sm text-white placeholder:text-white/25 focus:outline-none transition-all"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
            onFocus={(e) => e.target.style.borderColor = "rgba(0,229,255,0.3)"}
            onBlur={(e) => e.target.style.borderColor = "rgba(255,255,255,0.08)"}
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-6" style={{ scrollbarWidth: "none" }}>
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => { setActiveFilter(f.id); setSearch(""); }}
              className="whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold tracking-wider transition-all border flex-shrink-0"
              style={activeFilter === f.id ? {
                background: "rgba(0,229,255,0.12)", borderColor: "rgba(0,229,255,0.35)", color: "#00E5FF"
              } : {
                background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.35)"
              }}>
              {f.label}
            </button>
          ))}
        </div>

        {search && (
          <p className="text-sm text-white/30 mb-5">
            {filtered.length} result{filtered.length !== 1 ? "s" : ""} for <span className="text-white/60">"{search}"</span>
          </p>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-6 h-6 border-2 border-cyan-400/20 border-t-cyan-400 rounded-full animate-spin" />
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
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5"
            >
              {filtered.map((track, i) => (
                <MusicCard
                  key={track.id}
                  track={track}
                  index={i}
                  onPlay={handlePlay}
                  isCurrent={currentTrack?.id === track.id}
                  isPlaying={isPlaying}
                  isFaved={isFaved}
                  onFav={toggle}
                  isPremium={isPremium}
                  onUpgrade={() => setUpgradeModal(true)}
                  onLoginRequired={requireLogin}
                />
              ))}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      <Footer />

      <PremiumDownloadModal open={upgradeModal} onClose={() => setUpgradeModal(false)} />
      <FavLoginModal open={loginModal} onClose={() => setLoginModal(false)} />
    </div>
  );
}