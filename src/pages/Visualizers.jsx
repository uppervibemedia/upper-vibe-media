import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Play, Download, Music4, Lock, ExternalLink, Tv2 } from "lucide-react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { usePlayer } from "../context/PlayerContext";
import Footer from "../components/shared/Footer";
import PremiumDownloadModal from "../components/shared/PremiumDownloadModal";
import VisualizerWatchModal from "../components/visualizers/VisualizerWatchModal";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "hiphop", label: "Hip Hop / Rap" },
  { id: "rnb", label: "R&B" },
  { id: "electronic", label: "Electronic Music" },
  { id: "meditation", label: "Meditation / Focus" },
  { id: "car", label: "Car Music" },
  { id: "new", label: "New Visualizers" },
];

export default function Visualizers() {
  const [visualizers, setVisualizers] = useState([]);
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [watching, setWatching] = useState(null);
  const [upgradeModal, setUpgradeModal] = useState(false);
  const { user } = useAuth();
  const { playTrack } = usePlayer();
  const isPremium = user?.role === "premium" || user?.role === "admin";

  useEffect(() => {
    Promise.all([
      base44.entities.Visualizer.filter({ status: "published" }, "display_order", 200),
      base44.entities.Track.filter({ status: "published" }, "-created_date", 500),
    ]).then(([v, t]) => {
      setVisualizers(v);
      setTracks(t);
      setLoading(false);
    });
  }, []);

  const trackMap = useMemo(() => Object.fromEntries(tracks.map((t) => [t.id, t])), [tracks]);

  const filtered = useMemo(() => {
    let result = visualizers;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((v) =>
        (v.title || "").toLowerCase().includes(q) ||
        (v.artist || "").toLowerCase().includes(q) ||
        (v.linked_song_title || "").toLowerCase().includes(q) ||
        (v.category || "").toLowerCase().includes(q)
      );
    } else if (activeFilter !== "all") {
      if (activeFilter === "new") {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 30);
        result = result.filter((v) => v.release_date && new Date(v.release_date) >= cutoff);
      } else {
        result = result.filter((v) => (v.category || "").toLowerCase().includes(activeFilter));
      }
    }
    return result;
  }, [visualizers, search, activeFilter]);

  const handleListenToSong = (viz) => {
    const track = trackMap[viz.linked_song_id];
    if (track) playTrack(track);
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-6 pt-20 pb-6">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4 text-[10px] font-black tracking-[0.3em] uppercase"
            style={{ background: "rgba(155,126,255,0.1)", border: "1px solid rgba(155,126,255,0.25)", color: "#9B7EFF" }}>
            <Tv2 className="w-3 h-3" /> Music Visualizers
          </div>
          <h1 className="font-heading font-black text-4xl md:text-5xl text-white mb-2">Music Visualizers</h1>
          <p className="text-white/35 text-sm">{visualizers.length} visualizer{visualizers.length !== 1 ? "s" : ""} · Free to watch</p>
        </motion.div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pb-16">
        {/* Search */}
        <div className="relative mb-5">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25 pointer-events-none" />
          <input
            type="text"
            placeholder="Search visualizers, songs, artists, or categories"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setActiveFilter("all"); }}
            className="w-full pl-11 pr-10 py-3.5 rounded-2xl text-sm text-white placeholder:text-white/25 focus:outline-none transition-all"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
            onFocus={(e) => e.target.style.borderColor = "rgba(155,126,255,0.4)"}
            onBlur={(e) => e.target.style.borderColor = "rgba(255,255,255,0.08)"}
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
          {FILTERS.map((f) => (
            <button key={f.id}
              onClick={() => { setActiveFilter(f.id); setSearch(""); }}
              className="whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold tracking-wider transition-all border flex-shrink-0"
              style={activeFilter === f.id
                ? { background: "rgba(155,126,255,0.12)", borderColor: "rgba(155,126,255,0.4)", color: "#9B7EFF" }
                : { background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.35)" }
              }>
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-6 h-6 border-2 border-purple-400/20 border-t-purple-400 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Tv2 className="w-10 h-10 text-white/10 mx-auto mb-3" />
            <p className="text-white/25">{visualizers.length === 0 ? "No visualizers uploaded yet." : "No visualizers found."}</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((viz, i) => {
              const linkedTrack = trackMap[viz.linked_song_id];
              const thumb = viz.thumbnail_url || linkedTrack?.cover_url;
              return (
                <motion.div key={viz.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="group rounded-2xl overflow-hidden"
                  style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>

                  {/* Thumbnail */}
                  <div className="relative aspect-video overflow-hidden cursor-pointer" onClick={() => setWatching(viz)}>
                    {thumb ? (
                      <img src={thumb} alt={viz.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"
                        style={{ background: "linear-gradient(135deg,rgba(155,126,255,0.1),rgba(0,229,255,0.05))" }}>
                        <Tv2 className="w-10 h-10 text-white/10" />
                      </div>
                    )}
                    {/* Play overlay */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: "rgba(0,0,0,0.55)" }}>
                      <div className="w-14 h-14 rounded-full flex items-center justify-center"
                        style={{ background: "rgba(155,126,255,0.85)", backdropFilter: "blur(8px)" }}>
                        <Play className="w-6 h-6 text-white ml-0.5" />
                      </div>
                    </div>
                    {/* Duration badge */}
                    {viz.duration && (
                      <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md text-[10px] font-bold"
                        style={{ background: "rgba(0,0,0,0.7)", color: "rgba(255,255,255,0.8)" }}>
                        {viz.duration}
                      </div>
                    )}
                    {viz.is_featured && (
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider uppercase"
                        style={{ background: "rgba(212,168,67,0.85)", color: "#000" }}>
                        Featured
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <p className="font-bold text-white text-sm truncate mb-0.5">{viz.title}</p>
                    <p className="text-xs text-white/40 truncate mb-1">{viz.artist || "Upper Vibe Media"}</p>
                    {viz.linked_song_title && (
                      <p className="text-[10px] text-purple-300/60 truncate mb-3">
                        🎵 {viz.linked_song_title}
                      </p>
                    )}

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Watch button */}
                      <button onClick={() => setWatching(viz)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all hover:brightness-110"
                        style={{ background: "rgba(155,126,255,0.15)", border: "1px solid rgba(155,126,255,0.3)", color: "#9B7EFF" }}>
                        <Play className="w-3 h-3" /> Watch
                      </button>

                      {/* Listen to song */}
                      {linkedTrack && (
                        <button onClick={() => handleListenToSong(viz)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all hover:brightness-110"
                          style={{ background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.2)", color: "#00E5FF" }}>
                          <Music4 className="w-3 h-3" /> Listen
                        </button>
                      )}

                      {/* Download */}
                      {linkedTrack && (
                        isPremium ? (
                          <a href={linkedTrack.audio_url} download={`${linkedTrack.title}.mp3`}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all hover:brightness-110"
                            style={{ background: "rgba(212,168,67,0.08)", border: "1px solid rgba(212,168,67,0.2)", color: "#D4A843" }}
                            onClick={(e) => e.stopPropagation()}>
                            <Download className="w-3 h-3" /> DL
                          </a>
                        ) : (
                          <button onClick={() => setUpgradeModal(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.25)" }}>
                            <Lock className="w-3 h-3" /> DL
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <Footer />

      {watching && (
        <VisualizerWatchModal
          visualizer={watching}
          linkedTrack={trackMap[watching.linked_song_id]}
          allVisualizers={visualizers}
          isPremium={isPremium}
          onWatch={setWatching}
          onListenToSong={(viz) => { handleListenToSong(viz); }}
          onUpgrade={() => setUpgradeModal(true)}
          onClose={() => setWatching(null)}
        />
      )}
      <PremiumDownloadModal open={upgradeModal} onClose={() => setUpgradeModal(false)} />
    </div>
  );
}