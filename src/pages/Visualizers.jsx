import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Play, Music4, ExternalLink, Tv2, Calendar, Tag, Waves } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { usePlayer } from "../context/PlayerContext";
import Footer from "../components/shared/Footer";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "hiphop", label: "Hip Hop" },
  { id: "rnb", label: "R&B" },
  { id: "electronic", label: "Electronic" },
  { id: "meditation", label: "Meditation" },
  { id: "car", label: "Car Music" },
];

const CATEGORY_LABELS = {
  hiphop: "Hip Hop / Rap",
  rnb: "R&B",
  electronic: "Electronic Music",
  meditation: "Meditation / Focus",
  car: "Car Music",
  other: "Other",
};

function toEmbedUrl(url) {
  if (!url) return "";
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  if (match) return `https://www.youtube.com/embed/${match[1]}`;
  // already an embed url
  if (url.includes("youtube.com/embed/")) return url;
  return url;
}

function toWatchUrl(url) {
  if (!url) return "";
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  if (match) return `https://www.youtube.com/watch?v=${match[1]}`;
  return url;
}

function formatDate(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export default function Visualizers() {
  const [visualizers, setVisualizers] = useState([]);
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [expandedId, setExpandedId] = useState(null);
  const { playTrack } = usePlayer();

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
      result = result.filter((v) => (v.category || "").toLowerCase().includes(activeFilter));
    }
    return result;
  }, [visualizers, search, activeFilter]);

  const handleListenToSong = (viz) => {
    const track = trackMap[viz.linked_song_id];
    if (track) playTrack(track);
  };

  const handleCardClick = (viz) => {
    setExpandedId(expandedId === viz.id ? null : viz.id);
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-6 pt-20 pb-6">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4 text-[10px] font-black tracking-[0.3em] uppercase"
            style={{ background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.2)", color: "#00E5FF" }}>
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
            placeholder="Search visualizers, artists, or categories..."
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
        <div className="flex gap-2 overflow-x-auto pb-4 mb-8 scrollbar-hide">
          {FILTERS.map((f) => (
            <button key={f.id}
              onClick={() => { setActiveFilter(f.id); setSearch(""); }}
              className="whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold tracking-wider transition-all border flex-shrink-0"
              style={activeFilter === f.id
                ? { background: "rgba(0,229,255,0.12)", borderColor: "rgba(0,229,255,0.35)", color: "#00E5FF" }
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
            {filtered.map((viz, i) => {
              const linkedTrack = trackMap[viz.linked_song_id];
              const embedUrl = toEmbedUrl(viz.embed_url || viz.video_url);
              const watchUrl = toWatchUrl(viz.video_url || viz.embed_url);
              const isExpanded = expandedId === viz.id;
              const thumb = viz.thumbnail_url || linkedTrack?.cover_url;
              const categoryLabel = CATEGORY_LABELS[viz.category] || viz.category || "";

              return (
                <motion.div
                  key={viz.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="rounded-2xl overflow-hidden flex flex-col"
                  style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}
                >
                  {/* ── Video / Thumbnail area ── */}
                  <div className="relative w-full" style={{ aspectRatio: "16/9" }}>
                    {isExpanded && embedUrl ? (
                      <iframe
                        src={`${embedUrl}?autoplay=1&rel=0`}
                        title={viz.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="absolute inset-0 w-full h-full"
                        style={{ border: "none" }}
                      />
                    ) : (
                      <div className="absolute inset-0 cursor-pointer group" onClick={() => handleCardClick(viz)}>
                        {thumb ? (
                          <img src={thumb} alt={viz.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"
                            style={{ background: "linear-gradient(135deg,rgba(0,229,255,0.07),rgba(212,168,67,0.04))" }}>
                            <Tv2 className="w-10 h-10 text-white/10" />
                          </div>
                        )}
                        {/* Dark overlay + play button */}
                        <div className="absolute inset-0 flex items-center justify-center transition-opacity"
                          style={{ background: "rgba(0,0,0,0.35)" }}>
                          <div className="w-14 h-14 rounded-full flex items-center justify-center transition-transform group-hover:scale-110"
                            style={{ background: "linear-gradient(135deg,#00B8D4,#00E5FF)", boxShadow: "0 0 32px rgba(0,229,255,0.4)" }}>
                            <Play className="w-6 h-6 text-black ml-0.5" />
                          </div>
                        </div>

                        {/* Featured badge */}
                        {viz.is_featured && (
                          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider uppercase"
                            style={{ background: "rgba(212,168,67,0.9)", color: "#000" }}>
                            Featured
                          </div>
                        )}
                        {/* Duration */}
                        {viz.duration && (
                          <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md text-[10px] font-bold"
                            style={{ background: "rgba(0,0,0,0.75)", color: "rgba(255,255,255,0.85)" }}>
                            {viz.duration}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Collapse button when expanded */}
                    {isExpanded && (
                      <button
                        onClick={() => setExpandedId(null)}
                        className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full flex items-center justify-center transition-all hover:brightness-125"
                        style={{ background: "rgba(0,0,0,0.7)" }}>
                        <X className="w-3.5 h-3.5 text-white" />
                      </button>
                    )}
                  </div>

                  {/* ── Info ── */}
                  <div className="p-4 flex flex-col gap-3 flex-1">
                    {/* Title + artist */}
                    <div>
                      <p className="font-heading font-bold text-white text-sm leading-tight">{viz.title}</p>
                      <p className="text-xs text-white/40 mt-0.5">{viz.artist || "Upper Vibe Media"}</p>
                    </div>

                    {/* Meta row */}
                    <div className="flex flex-wrap gap-2">
                      {categoryLabel && (
                        <span className="flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full"
                          style={{ background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.15)", color: "#00E5FF" }}>
                          <Tag className="w-2.5 h-2.5" /> {categoryLabel}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: "rgba(0,229,255,0.06)", color: "#00E5FF" }}>
                        <Waves className="w-2.5 h-2.5" /> 432 Hz
                      </span>
                      {viz.release_date && (
                        <span className="flex items-center gap-1 text-[9px] text-white/30 px-2 py-0.5 rounded-full"
                          style={{ background: "rgba(255,255,255,0.03)" }}>
                          <Calendar className="w-2.5 h-2.5" /> {formatDate(viz.release_date)}
                        </span>
                      )}
                    </div>

                    {/* Linked song */}
                    {(viz.linked_song_title || linkedTrack) && (
                      <div className="flex items-center gap-1.5 text-[10px] text-white/30">
                        <Music4 className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">Related song: <span className="text-white/50">{viz.linked_song_title || linkedTrack?.title}</span></span>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 flex-wrap mt-auto pt-1">
                      {/* Watch / collapse toggle */}
                      {embedUrl ? (
                        <button
                          onClick={() => handleCardClick(viz)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all hover:brightness-110"
                          style={{
                            background: isExpanded ? "rgba(0,229,255,0.15)" : "linear-gradient(135deg,rgba(0,184,212,0.2),rgba(0,229,255,0.12))",
                            border: "1px solid rgba(0,229,255,0.3)",
                            color: "#00E5FF"
                          }}>
                          <Play className="w-3 h-3" /> {isExpanded ? "Close" : "Watch Now"}
                        </button>
                      ) : null}

                      {/* Open on YouTube */}
                      {watchUrl && (
                        <a href={watchUrl} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all hover:brightness-110"
                          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.55)" }}>
                          <ExternalLink className="w-3 h-3" /> YouTube
                        </a>
                      )}

                      {/* Listen to related song */}
                      {linkedTrack && (
                        <button onClick={() => handleListenToSong(viz)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all hover:brightness-110"
                          style={{ background: "rgba(212,168,67,0.1)", border: "1px solid rgba(212,168,67,0.25)", color: "#D4A843" }}>
                          <Music4 className="w-3 h-3" /> Listen to Song
                        </button>
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
    </div>
  );
}