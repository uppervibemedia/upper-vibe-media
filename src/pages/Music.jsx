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
import PullToRefresh from "../components/shared/PullToRefresh";

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

  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    base44.entities.Track.filter({ status: "published" }, "-created_date", 500)
      .then((t) => { setTracks(t); setLoading(false); });
  }, [refreshKey]);

  const handleRefresh = async () => {
    setRefreshKey((k) => k + 1);
  };

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

  const handleDownload = (e, track) => {
    if (!isPremium) {
      e.preventDefault();
      setUpgradeModal(true);
    }
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
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
        <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
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
          <p className="text-sm text-white/30 mb-4">
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
            <motion.div key={activeFilter + search} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
              {filtered.map((track, i) => {
                const isCurrentTrack = currentTrack?.id === track.id;
                return (
                  <motion.div
                    key={track.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="flex items-center gap-4 p-4 rounded-2xl group transition-all"
                    style={{
                      background: isCurrentTrack ? "rgba(0,229,255,0.06)" : "rgba(255,255,255,0.025)",
                      border: `1px solid ${isCurrentTrack ? "rgba(0,229,255,0.2)" : "rgba(255,255,255,0.06)"}`,
                    }}
                  >
                    {/* Cover */}
                    <div className="relative flex-shrink-0 cursor-pointer" onClick={() => handlePlay(track)}>
                      {track.cover_url ? (
                        <img src={track.cover_url} alt={track.title} className="w-12 h-12 rounded-xl object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                          style={{ background: "rgba(0,229,255,0.08)" }}>
                          <Music4 className="w-5 h-5 text-cyan-400/30" />
                        </div>
                      )}
                      <div className="absolute inset-0 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ background: "rgba(0,0,0,0.6)" }}>
                        {isCurrentTrack && isPlaying
                          ? <Pause className="w-4 h-4 text-cyan-400" />
                          : <Play className="w-4 h-4 text-white ml-0.5" />}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">{track.title}</p>
                      <p className="text-xs text-white/40 truncate">{track.artist_display || "Upper Vibe Media"}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {/* Always show 432 Hz badge */}
                        <span className="flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                          style={{ background: "rgba(0,229,255,0.1)", color: "#00E5FF" }}>
                          <Waves className="w-2.5 h-2.5" /> 432 Hz
                        </span>
                        {track.is_new_release && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                            style={{ background: "rgba(212,168,67,0.12)", color: "#D4A843" }}>NEW</span>
                        )}
                      </div>
                    </div>

                    {/* Duration */}
                    {track.duration && (
                      <p className="text-xs text-white/25 flex-shrink-0 hidden sm:block">{track.duration}</p>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {/* Heart / Favorite */}
                      <button
                        onClick={() => {
                          if (!user) { setLoginModal(true); return; }
                          toggle("track", track.id, { title: track.title, artist: track.artist_display, cover_url: track.cover_url });
                        }}
                        title={isFaved("track", track.id) ? "Saved to Favorites" : "Save to Favorites"}
                        className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-110"
                        style={isFaved("track", track.id) ? {
                          background: "rgba(236,72,153,0.15)", border: "1px solid rgba(236,72,153,0.35)", color: "#ec4899"
                        } : {
                          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.3)"
                        }}>
                        <Heart className={`w-3.5 h-3.5 ${isFaved("track", track.id) ? "fill-current" : ""}`} />
                      </button>
                      {/* Play — always available */}
                      <button
                        onClick={() => handlePlay(track)}
                        className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-110"
                        style={{
                          background: isCurrentTrack ? "rgba(0,229,255,0.15)" : "rgba(0,229,255,0.08)",
                          border: "1px solid rgba(0,229,255,0.2)",
                          color: "#00E5FF"
                        }}>
                        {isCurrentTrack && isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
                      </button>

                      {/* Download — locked for non-premium */}
                      {isPremium ? (
                        <a
                          href={track.audio_url}
                          download={`${track.title}.mp3`}
                          className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-110"
                          style={{ background: "rgba(212,168,67,0.1)", border: "1px solid rgba(212,168,67,0.25)", color: "#D4A843" }}
                          onClick={(e) => e.stopPropagation()}
                          title="Download">
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      ) : (
                        <button
                          onClick={(e) => handleDownload(e, track)}
                          className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-110"
                          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.25)" }}
                          title="Premium download">
                          <Lock className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      <Footer />

      <PremiumDownloadModal open={upgradeModal} onClose={() => setUpgradeModal(false)} />
      <FavLoginModal open={loginModal} onClose={() => setLoginModal(false)} />
    </div>
    </PullToRefresh>
  );
}