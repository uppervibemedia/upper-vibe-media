import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Search, X, Play, Music4, ExternalLink, Tv2, Calendar, Tag, Waves, Edit2, Download, Heart } from "lucide-react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { usePlayer } from "../context/PlayerContext";
import { useAuth } from "@/lib/AuthContext";
import Footer from "../components/shared/Footer";
import VisualizerEditModal from "../components/visualizers/VisualizerEditModal";
import VisualizerModal from "../components/shared/VisualizerModal";
import { useFavorites } from "../hooks/useFavorite";
import { useTheme } from "../context/ThemeContext";
import { RADIO_THEMES } from "../components/radio/RadioThemePicker";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "hiphop", label: "Hip Hop" },
  { id: "rnb", label: "R&B" },
  { id: "electronic", label: "Electronic" },
  { id: "meditation", label: "Meditation" },
  { id: "car", label: "Car Music" },
  { id: "artist:Aura Rae", label: "Aura Rae" },
  { id: "artist:iami", label: "iami" },
  { id: "artist:Jmack So Lavish", label: "Jmack So Lavish" },
  { id: "artist:Montae DeVine", label: "Montae DeVine" },
  { id: "artist:S.O.N.A. To Infinity", label: "S.O.N.A. To Infinity" },
];

const CATEGORY_LABELS = {
  hiphop: "Hip Hop / Rap",
  rnb: "R&B",
  electronic: "Electronic",
  meditation: "Meditation / 432 Hz",
  car: "Car Music",
};

function extractVideoId(url) {
  if (!url) return null;
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return match ? match[1] : null;
}

function toEmbedUrl(url) {
  const id = extractVideoId(url);
  return id ? `https://www.youtube.com/embed/${id}` : null;
}

function toWatchUrl(url) {
  const id = extractVideoId(url);
  return id ? `https://www.youtube.com/watch?v=${id}` : (url || null);
}

function VisualizerCard({ viz, linkedTrack, isAdmin, onEdit, onPlay, isFaved, onToggleFav, rgb, onWatch }) {
  const thumb = viz.thumbnail_url || linkedTrack?.cover_url;
  const categoryLabel = CATEGORY_LABELS[viz.category] || viz.category || "";

  return (
    <motion.div layout className="rounded-2xl overflow-hidden flex flex-col"
      style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>

      <div className="relative w-full cursor-pointer group" style={{ paddingTop: "56.25%" }} onClick={() => onWatch(viz)}>
        <div className="absolute inset-0">
          {thumb ? (
            <img src={thumb} alt={viz.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
          ) : (
            <div className="w-full h-full flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,rgba(0,229,255,0.07),rgba(212,168,67,0.04))" }}>
              <Tv2 className="w-10 h-10 text-white/10" />
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.35)" }}>
            <div className="w-14 h-14 rounded-full flex items-center justify-center transition-transform group-hover:scale-110"
              style={{ background: `linear-gradient(135deg,rgb(${rgb}),rgb(${rgb}))`, boxShadow: `0 0 32px rgba(${rgb},0.4)` }}>
              <Play className="w-6 h-6 text-black ml-0.5" />
            </div>
          </div>
          {viz.is_featured && (
            <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider uppercase"
              style={{ background: "rgba(212,168,67,0.9)", color: "#000" }}>Featured</div>
          )}
          {viz.duration && (
            <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md text-[10px] font-bold"
              style={{ background: "rgba(0,0,0,0.75)", color: "rgba(255,255,255,0.85)" }}>
              {viz.duration}
            </div>
          )}
        </div>
      </div>

      <div className="p-4 flex flex-col gap-3 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-heading font-bold text-white text-sm leading-tight">{viz.title}</p>
            <p className="text-xs text-white/40 mt-0.5">{viz.artist || "Upper Vibe Media"}</p>
          </div>
          {isAdmin && (
            <button onClick={() => onEdit(viz)} className="flex-shrink-0 p-1.5 rounded-lg transition-all hover:bg-white/10"
              title="Edit visualizer" style={{ color: "rgba(0,229,255,0.6)" }}>
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {categoryLabel && (
            <span className="flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: `rgba(${rgb},0.08)`, border: `1px solid rgba(${rgb},0.15)`, color: `rgb(${rgb})` }}>
              <Tag className="w-2.5 h-2.5" /> {categoryLabel}
            </span>
          )}
          <span className="flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: "rgba(212,168,67,0.1)", border: "1px solid rgba(212,168,67,0.2)", color: "#D4A843" }}>
            <Waves className="w-2.5 h-2.5" /> 432 Hz
          </span>
          {viz.release_date && (
            <span className="flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: "rgba(0,160,220,0.08)", border: "1px solid rgba(0,160,220,0.2)", color: "#00A0DC" }}>
              <Calendar className="w-2.5 h-2.5" /> {new Date(viz.release_date).getFullYear()}
            </span>
          )}
        </div>

        {(viz.linked_song_title || linkedTrack) && (
          <div className="flex items-center gap-1.5 text-[10px] text-white/30">
            <Music4 className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">Song: <span className="text-white/50">{viz.linked_song_title || linkedTrack?.title}</span></span>
          </div>
        )}

        <div className="flex items-center gap-2 flex-wrap mt-auto pt-1">
          {linkedTrack ? (
            <Link to={`/song/${linkedTrack.id}?downloadIntent=true`}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all hover:brightness-110"
              style={{ background: "linear-gradient(135deg,rgba(212,168,67,0.2),rgba(212,168,67,0.12))", border: "1px solid rgba(212,168,67,0.35)", color: "#D4A843" }}>
              <Download className="w-3 h-3" /> Download Song
            </Link>
          ) : viz.linked_song_id ? (
            <Link to={`/song/${viz.linked_song_id}?downloadIntent=true`}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all hover:brightness-110"
              style={{ background: "linear-gradient(135deg,rgba(212,168,67,0.12),rgba(212,168,67,0.06))", border: "1px solid rgba(212,168,67,0.25)", color: "rgba(212,168,67,0.6)" }}>
              <Download className="w-3 h-3" /> Download Song
            </Link>
          ) : (
            <span className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold opacity-30 cursor-not-allowed"
              style={{ border: "1px solid rgba(212,168,67,0.2)", color: "#D4A843" }}>
              <Download className="w-3 h-3" /> Coming Soon
            </span>
          )}

          {(linkedTrack || viz.linked_song_id) && (
            <Link
              to={`/song/${linkedTrack?.id || viz.linked_song_id}`}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all hover:brightness-110"
              style={{ background: `rgba(${rgb},0.1)`, border: `1px solid rgba(${rgb},0.25)`, color: `rgb(${rgb})` }}>
              <Music4 className="w-3 h-3" /> Listen
            </Link>
          )}

          {/* Heart / Favorite */}
          <button
            onClick={() => onToggleFav(viz)}
            title={isFaved ? "Saved to Favorites" : "Save to Favorites"}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:scale-110 ml-auto flex-shrink-0"
            style={isFaved ? {
              background: "rgba(155,126,255,0.22)", border: "1px solid rgba(155,126,255,0.55)", color: "#9B7EFF"
            } : {
              background: "rgba(155,126,255,0.06)", border: "1px solid rgba(155,126,255,0.35)", color: "rgba(155,126,255,0.6)"
            }}>
            <Heart className={`w-3.5 h-3.5 ${isFaved ? "fill-current" : ""}`} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export default function Visualizers() {
  const [visualizers, setVisualizers] = useState([]);
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [editingViz, setEditingViz] = useState(null);
  const [watchingViz, setWatchingViz] = useState(null);
  const [loginPrompt, setLoginPrompt] = useState(false);
  const { playTrack } = usePlayer();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { isFaved, toggle } = useFavorites(user?.email);
  const { accentId } = useTheme();
  const rgb = (RADIO_THEMES[accentId] || RADIO_THEMES.cyan).vars["--rt-primary"];

  const handleToggleFav = (viz) => {
    if (!user) { setLoginPrompt(true); return; }
    toggle("visualizer", viz.id, { title: viz.title, artist: viz.artist, cover_url: viz.thumbnail_url });
  };

  const load = () =>
    Promise.all([
      base44.entities.Visualizer.filter({ status: "published" }, "-release_date", 200),
      base44.entities.Track.filter({ status: "published" }, "-created_date", 500),
    ]).then(([v, t]) => { setVisualizers(v); setTracks(t); setLoading(false); });

  useEffect(() => { load(); }, []);

  const trackMap = useMemo(() => Object.fromEntries(tracks.map((t) => [t.id, t])), [tracks]);

  const filtered = useMemo(() => {
    let r = visualizers;
    if (search) {
      const q = search.toLowerCase();
      r = r.filter((v) =>
        (v.title || "").toLowerCase().includes(q) ||
        (v.artist || "").toLowerCase().includes(q) ||
        (v.category || "").toLowerCase().includes(q)
      );
    } else if (activeFilter !== "all") {
      if (activeFilter.startsWith("artist:")) {
        const artistName = activeFilter.replace("artist:", "").toLowerCase();
        r = r.filter((v) => (v.artist || "").toLowerCase().includes(artistName));
      } else {
        r = r.filter((v) => (v.category || "").toLowerCase() === activeFilter);
      }
    }
    const featured = r.filter((v) => v.is_featured);
    const regular = r.filter((v) => !v.is_featured);
    return [...featured, ...regular];
  }, [visualizers, search, activeFilter]);

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-6 pt-20 pb-6">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4 text-[10px] font-black tracking-[0.3em] uppercase"
            style={{ background: `rgba(${rgb},0.08)`, border: `1px solid rgba(${rgb},0.2)`, color: `rgb(${rgb})` }}>
            <Tv2 className="w-3 h-3" /> Music Visualizers
          </div>
          <h1 className="font-heading font-black text-4xl md:text-5xl text-white mb-2">Music Visualizers</h1>
          <p className="text-white/35 text-sm">{visualizers.length} visualizer{visualizers.length !== 1 ? "s" : ""} · Free to watch · Newest first</p>
        </motion.div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pb-24">
        <div className="relative mb-5">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25 pointer-events-none" />
          <input type="text" placeholder="Search visualizers, artists, categories..."
            value={search} onChange={(e) => { setSearch(e.target.value); setActiveFilter("all"); }}
            className="w-full pl-11 pr-10 py-3.5 rounded-2xl text-sm text-white placeholder:text-white/25 focus:outline-none"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-4 mb-8">
          {FILTERS.map((f) => (
            <button key={f.id}
              onClick={() => { setActiveFilter(f.id); setSearch(""); }}
              className="whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold tracking-wider border flex-shrink-0 transition-all"
              style={activeFilter === f.id
                ? { background: `rgba(${rgb},0.12)`, borderColor: `rgba(${rgb},0.35)`, color: `rgb(${rgb})` }
                : { background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.35)" }
              }>
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-6 h-6 border-2 border-cyan-400/20 border-t-cyan-400 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Tv2 className="w-10 h-10 text-white/10 mx-auto mb-3" />
            <p className="text-white/25">{visualizers.length === 0 ? "No visualizers uploaded yet." : "No visualizers found."}</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((viz, i) => (
              <motion.div key={viz.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <VisualizerCard
                  viz={viz}
                  linkedTrack={trackMap[viz.linked_song_id]}
                  isAdmin={isAdmin}
                  onEdit={(v) => setEditingViz(v)}
                  onPlay={playTrack}
                  isFaved={isFaved("visualizer", viz.id)}
                  onToggleFav={handleToggleFav}
                  rgb={rgb}
                  onWatch={(v) => setWatchingViz(v)}
                />
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Login prompt */}
      {loginPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setLoginPrompt(false)} />
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="relative w-full max-w-sm rounded-2xl p-7 text-center"
            style={{ background: "#0a0a1e", border: "1px solid rgba(236,72,153,0.25)" }}>
            <Heart className="w-8 h-8 text-pink-400 fill-current mx-auto mb-3" />
            <h3 className="font-heading font-black text-lg text-white mb-2">Save Your Favorites</h3>
            <p className="text-sm text-white/45 leading-relaxed mb-5">
              Create a free account to save your favorite Upper Vibe Media songs and visualizers.
            </p>
            <button onClick={() => base44.auth.redirectToLogin()}
              className="w-full py-3 rounded-xl font-black text-sm tracking-wider transition-all hover:brightness-110"
              style={{ background: "linear-gradient(135deg,#be185d,#ec4899)", color: "#fff" }}>
              Create Free Account
            </button>
            <button onClick={() => setLoginPrompt(false)}
              className="mt-3 w-full py-2 text-sm text-white/30 hover:text-white/60 transition-colors">
              Not now
            </button>
          </motion.div>
        </div>
      )}

      {editingViz && (
        <VisualizerEditModal
          viz={editingViz}
          tracks={tracks}
          onClose={() => setEditingViz(null)}
          onSaved={() => { setEditingViz(null); load(); }}
        />
      )}

      {watchingViz && (
        <VisualizerModal
          viz={watchingViz}
          onClose={() => setWatchingViz(null)}
          allVisualizers={visualizers}
          onSwitchViz={(v) => setWatchingViz(v)}
          isFaved={isFaved("visualizer", watchingViz.id)}
          onToggleFav={handleToggleFav}
          isPremium={user?.role === "premium" || user?.role === "admin" || user?.tier === "premium" || user?.role === "plus"}
        />
      )}

      <Footer />
    </div>
  );
}