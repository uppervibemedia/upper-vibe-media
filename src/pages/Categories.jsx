import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Play, Pause, Download, Music4, Waves } from "lucide-react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { usePlayer } from "../context/PlayerContext";
import Footer from "../components/shared/Footer";

const STATIC_CATEGORIES = [
  { id: "high-vibe", label: "High Vibe Music", icon: "✨", color: "#00E5FF", description: "Elevated frequency music to raise your energy." },
  { id: "432hz", label: "432 Hz Music", icon: "〰️", color: "#D4A843", description: "Tuned to 432 Hz for deeper resonance and calm." },
  { id: "hiphop", label: "Hip Hop / Rap", icon: "🎤", color: "#9B7EFF", description: "Conscious hip hop and high-vibe rap." },
  { id: "rnb", label: "R&B", icon: "🎵", color: "#D4A843", description: "Smooth R&B with elevated energy and soul." },
  { id: "electronic", label: "Electronic Music", icon: "⚡", color: "#00E5FF", description: "Futuristic electronic sounds and frequency music." },
  { id: "instrumentals", label: "Instrumentals", icon: "🎸", color: "#9B7EFF", description: "Pure instrumental tracks for focus and creativity." },
  { id: "meditation", label: "Meditation / Focus", icon: "🧘", color: "#00E5FF", description: "Deep focus and meditation sessions." },
  { id: "car", label: "Car Music", icon: "🚗", color: "#D4A843", description: "High-energy music built for the road." },
  { id: "new", label: "New Releases", icon: "🆕", color: "#00E5FF", description: "The latest drops from Upper Vibe Media." },
];

function matchesCategory(track, catId) {
  const hay = [track.title, track.artist_display, track.album, track.description].join(" ").toLowerCase();
  const matchers = {
    "high-vibe": () => true,
    "432hz": () => track.frequency_type === "432hz" || track.frequency_hz === 432 || hay.includes("432"),
    "hiphop": () => ["hip", "rap"].some((k) => hay.includes(k)),
    "rnb": () => ["r&b", "rnb", "soul"].some((k) => hay.includes(k)),
    "electronic": () => ["electronic", "edm", "techno", "house"].some((k) => hay.includes(k)),
    "instrumentals": () => hay.includes("instrumental"),
    "meditation": () => ["meditation", "focus", "calm", "healing"].some((k) => hay.includes(k)),
    "car": () => ["car", "driving", "road"].some((k) => hay.includes(k)),
    "new": () => track.is_new_release,
  };
  return matchers[catId]?.() ?? false;
}

export default function Categories() {
  const [tracks, setTracks] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const { playTrack, currentTrack, isPlaying, togglePlay } = usePlayer();

  useEffect(() => {
    base44.entities.Track.filter({ status: "published" }, "-created_date", 500).then(setTracks);
    // Check URL param
    const params = new URLSearchParams(window.location.search);
    const cat = params.get("cat");
    if (cat) {
      const found = STATIC_CATEGORIES.find((c) => c.label === cat);
      if (found) setActiveCategory(found);
    }
  }, []);

  const categoryTracks = useMemo(() => {
    if (!activeCategory) return [];
    return tracks.filter((t) => matchesCategory(t, activeCategory.id));
  }, [tracks, activeCategory]);

  const handlePlay = (track) => {
    if (currentTrack?.id === track.id) togglePlay();
    else playTrack(track);
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-6 pt-20 pb-16">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          {activeCategory ? (
            <div>
              <button
                onClick={() => setActiveCategory(null)}
                className="flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors mb-6">
                <ArrowLeft className="w-4 h-4" /> All Categories
              </button>
              <div className="flex items-center gap-4 mb-2">
                <span className="text-4xl">{activeCategory.icon}</span>
                <div>
                  <h1 className="font-heading font-black text-4xl text-white">{activeCategory.label}</h1>
                  <p className="text-white/35 text-sm mt-1">{activeCategory.description}</p>
                </div>
              </div>
              <p className="text-white/25 text-xs mt-3">{categoryTracks.length} songs</p>
            </div>
          ) : (
            <div>
              <p className="text-[10px] font-black tracking-[0.3em] uppercase mb-2" style={{ color: "#D4A843" }}>Explore</p>
              <h1 className="font-heading font-black text-4xl md:text-5xl text-white">Categories</h1>
              <p className="text-white/35 text-sm mt-2">Browse music by genre, frequency, and mood.</p>
            </div>
          )}
        </motion.div>

        {/* Category grid */}
        <AnimatePresence mode="wait">
          {!activeCategory ? (
            <motion.div
              key="grid"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4"
            >
              {STATIC_CATEGORIES.map((cat, i) => {
                const count = tracks.filter((t) => matchesCategory(t, cat.id)).length;
                return (
                  <motion.button
                    key={cat.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                    whileHover={{ y: -3 }}
                    onClick={() => setActiveCategory(cat)}
                    className="flex items-center gap-4 p-5 rounded-2xl text-left transition-all group"
                    style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    <span className="text-3xl">{cat.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-heading font-bold text-base text-white truncate">{cat.label}</p>
                      <p className="text-xs text-white/30 truncate mt-0.5">{cat.description}</p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="text-lg font-heading font-black" style={{ color: cat.color }}>{count}</p>
                      <p className="text-[9px] text-white/20">songs</p>
                    </div>
                  </motion.button>
                );
              })}
            </motion.div>
          ) : (
            <motion.div key="tracks" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {categoryTracks.length === 0 ? (
                <div className="text-center py-20">
                  <Music4 className="w-10 h-10 text-white/10 mx-auto mb-3" />
                  <p className="text-white/25">No songs in this category yet.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {categoryTracks.map((track, i) => {
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
                            {isCurrentTrack && isPlaying ? <Pause className="w-4 h-4 text-cyan-400" /> : <Play className="w-4 h-4 text-white ml-0.5" />}
                          </div>
                        </div>
                        <Link to={`/song/${track.id}`} className="flex-1 min-w-0 hover:opacity-80 transition-opacity" onClick={(e) => e.stopPropagation()}>
                          <p className="text-sm font-bold text-white truncate">{track.title}</p>
                          <p className="text-xs text-white/35 truncate">{track.artist_display || "Upper Vibe Media"}</p>
                          {track.frequency_type && track.frequency_type !== "standard" && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full mt-1"
                              style={{ background: "rgba(0,229,255,0.1)", color: "#00E5FF" }}>
                              <Waves className="w-2.5 h-2.5" /> {track.frequency_type.toUpperCase()}
                            </span>
                          )}
                        </Link>
                        {track.duration && <p className="text-xs text-white/25 hidden sm:block">{track.duration}</p>}
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handlePlay(track)}
                            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
                            style={{ background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.2)", color: "#00E5FF" }}>
                            {isCurrentTrack && isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
                          </button>
                          {track.is_downloadable && (
                            <a href={track.audio_url} download
                              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
                              style={{ background: "rgba(212,168,67,0.08)", border: "1px solid rgba(212,168,67,0.2)", color: "#D4A843" }}
                              onClick={(e) => e.stopPropagation()}>
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <Footer />
    </div>
  );
}