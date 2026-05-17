import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Music4, Tv2, Play, Pause, Waves, Trash2, ArrowRight, Download, Lock, Crown, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { usePlayer } from "../context/PlayerContext";
import { useAuth } from "@/lib/AuthContext";
import { useFavorites } from "../hooks/useFavorite";
import Footer from "../components/shared/Footer";

export default function Favorites() {
  const { user } = useAuth();
  const { favorites, isFaved, toggle, trackFavs, vizFavs } = useFavorites(user?.email);
  const [tracks, setTracks] = useState([]);
  const [visualizers, setVisualizers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("songs");
  const { playTrack, currentTrack, isPlaying, togglePlay } = usePlayer();
  const isPremium = user?.role === "premium" || user?.role === "admin";

  useEffect(() => {
    if (!user?.email) { setLoading(false); return; }
    Promise.all([
      base44.entities.Track.filter({ status: "published" }, "-created_date", 500),
      base44.entities.Visualizer.filter({ status: "published" }, "-release_date", 500),
    ]).then(([t, v]) => { setTracks(t); setVisualizers(v); setLoading(false); });
  }, [user]);

  const savedTracks = tracks.filter((t) => isFaved("track", t.id));
  const savedVizualizers = visualizers.filter((v) => isFaved("visualizer", v.id));

  const handlePlay = (track) => {
    if (currentTrack?.id === track.id) togglePlay();
    else playTrack(track);
  };

  // Not logged in
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center py-24">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
            style={{ background: "rgba(236,72,153,0.12)", border: "1px solid rgba(236,72,153,0.25)" }}>
            <Heart className="w-8 h-8 text-pink-400 fill-current" />
          </div>
          <h1 className="font-heading font-black text-3xl md:text-4xl text-white mb-4">My Favorites</h1>
          <p className="text-white/40 text-sm max-w-md leading-relaxed mb-8">
            Create a free account to save your favorite Upper Vibe Media songs and visualizers — and build your collection.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={() => base44.auth.redirectToLogin()}
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full font-black text-sm tracking-wider transition-all hover:brightness-110"
              style={{ background: "linear-gradient(135deg,#be185d,#ec4899)", color: "#fff", boxShadow: "0 0 24px rgba(236,72,153,0.3)" }}>
              Create Free Account
            </button>
            <button onClick={() => base44.auth.redirectToLogin()}
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full font-black text-sm tracking-wider transition-all hover:bg-white/10"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.8)" }}>
              Log In
            </button>
          </div>
          <a href="/music" className="mt-5 flex items-center gap-1 text-sm text-white/30 hover:text-white/60 transition-colors">
            Browse music <ArrowRight className="w-4 h-4" />
          </a>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="relative overflow-hidden pt-20 pb-8 px-6"
        style={{ background: "linear-gradient(180deg,rgba(236,72,153,0.06) 0%,transparent 100%)" }}>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full opacity-[0.05] blur-[90px] pointer-events-none"
          style={{ background: "radial-gradient(circle,#ec4899,transparent)" }} />
        <div className="max-w-5xl mx-auto relative z-10">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4 text-[10px] font-black tracking-[0.25em] uppercase"
              style={{ background: "rgba(236,72,153,0.1)", border: "1px solid rgba(236,72,153,0.2)", color: "#ec4899" }}>
              <Heart className="w-3 h-3 fill-current" /> My Favorites
            </div>
            <h1 className="font-heading font-black text-4xl md:text-5xl text-white mb-2">My Favorites</h1>
            <p className="text-white/35 text-sm">
              {savedTracks.length} song{savedTracks.length !== 1 ? "s" : ""} · {savedVizualizers.length} visualizer{savedVizualizers.length !== 1 ? "s" : ""}
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 pb-24">
        {/* Tabs */}
        <div className="flex gap-1 border-b mb-8" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
          {[
            { id: "songs", label: "Favorite Songs", icon: Music4, count: savedTracks.length },
            { id: "visualizers", label: "Liked Visualizers", icon: Tv2, count: savedVizualizers.length },
          ].map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 -mb-px transition-all ${
                tab === t.id ? "border-pink-500 text-pink-400" : "border-transparent text-white/30 hover:text-white/60"
              }`}>
              <t.icon className="w-4 h-4" />
              {t.label}
              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black"
                style={{ background: tab === t.id ? "rgba(236,72,153,0.2)" : "rgba(255,255,255,0.07)", color: tab === t.id ? "#ec4899" : "rgba(255,255,255,0.3)" }}>
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-6 h-6 border-2 border-pink-400/20 border-t-pink-400 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Songs Tab */}
            {tab === "songs" && (
              <AnimatePresence mode="wait">
                {savedTracks.length === 0 ? (
                  <EmptyState icon={Music4} message="No favorite songs yet." link="/music" linkLabel="Browse Music" />
                ) : (
                  <motion.div key="songs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
                    {savedTracks.map((track, i) => {
                      const isCurrentTrack = currentTrack?.id === track.id;
                      return (
                        <motion.div key={track.id}
                          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -20 }} transition={{ delay: i * 0.02 }}
                          className="flex items-center gap-4 p-4 rounded-2xl group transition-all"
                          style={{
                            background: isCurrentTrack ? "rgba(236,72,153,0.06)" : "rgba(255,255,255,0.025)",
                            border: `1px solid ${isCurrentTrack ? "rgba(236,72,153,0.2)" : "rgba(255,255,255,0.06)"}`,
                          }}>
                          <div className="relative flex-shrink-0 cursor-pointer" onClick={() => handlePlay(track)}>
                            {track.cover_url ? (
                              <img src={track.cover_url} alt={track.title} className="w-12 h-12 rounded-xl object-cover" />
                            ) : (
                              <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                                style={{ background: "rgba(236,72,153,0.08)" }}>
                                <Music4 className="w-5 h-5 text-pink-400/30" />
                              </div>
                            )}
                            <div className="absolute inset-0 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              style={{ background: "rgba(0,0,0,0.6)" }}>
                              {isCurrentTrack && isPlaying ? <Pause className="w-4 h-4 text-pink-400" /> : <Play className="w-4 h-4 text-white ml-0.5" />}
                            </div>
                          </div>
                          <Link to={`/song/${track.id}`} className="flex-1 min-w-0 hover:opacity-80 transition-opacity">
                            <p className="text-sm font-bold text-white truncate">{track.title}</p>
                            <p className="text-xs text-white/40 truncate">{track.artist_display || "Upper Vibe Media"}</p>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                                style={{ background: "rgba(0,229,255,0.1)", color: "#00E5FF" }}>
                                <Waves className="w-2.5 h-2.5" /> 432 Hz
                              </span>
                            </div>
                          </Link>
                          {track.duration && <p className="text-xs text-white/25 hidden sm:block flex-shrink-0">{track.duration}</p>}
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <button onClick={() => handlePlay(track)}
                              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-110"
                              style={{ background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.2)", color: "#00E5FF" }}>
                              {isCurrentTrack && isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
                            </button>
                            {isPremium ? (
                              <a
                                href={track.audio_url}
                                download={`${track.title}.mp3`}
                                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-110"
                                style={{ background: "rgba(212,168,67,0.1)", border: "1px solid rgba(212,168,67,0.25)", color: "#D4A843" }}
                                title="Download MP3"
                                onClick={(e) => e.stopPropagation()}>
                                <Download className="w-3.5 h-3.5" />
                              </a>
                            ) : (
                              <Link to={`/song/${track.id}`}
                                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-110"
                                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.25)" }}
                                title="Premium download">
                                <Lock className="w-3.5 h-3.5" />
                              </Link>
                            )}
                            <button onClick={() => toggle("track", track.id)}
                              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-110"
                              style={{ background: "rgba(236,72,153,0.12)", border: "1px solid rgba(236,72,153,0.3)", color: "#ec4899" }}
                              title="Remove from Favorites">
                              <Heart className="w-3.5 h-3.5 fill-current" />
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            )}

            {/* Visualizers Tab */}
            {tab === "visualizers" && (
              <AnimatePresence mode="wait">
                {savedVizualizers.length === 0 ? (
                  <EmptyState icon={Tv2} message="No favorite visualizers yet." link="/visualizers" linkLabel="Browse Visualizers" />
                ) : (
                  <motion.div key="vizs" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {savedVizualizers.map((viz, i) => (
                      <motion.div key={viz.id}
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }} transition={{ delay: i * 0.04 }}
                        className="rounded-2xl overflow-hidden"
                        style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
                        <div className="aspect-video relative bg-black">
                          {viz.thumbnail_url ? (
                            <img src={viz.thumbnail_url} alt={viz.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center"
                              style={{ background: "rgba(0,229,255,0.05)" }}>
                              <Tv2 className="w-8 h-8 text-white/10" />
                            </div>
                          )}
                        </div>
                        <div className="p-3 flex flex-col gap-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-white truncate">{viz.title}</p>
                              <p className="text-xs text-white/40">{viz.artist || "Upper Vibe Media"}</p>
                              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full mt-1"
                                style={{ background: "rgba(0,229,255,0.1)", color: "#00E5FF" }}>
                                <Waves className="w-2 h-2" /> 432 Hz
                              </span>
                            </div>
                            <button onClick={() => toggle("visualizer", viz.id)}
                              className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all hover:scale-110"
                              style={{ background: "rgba(236,72,153,0.12)", border: "1px solid rgba(236,72,153,0.3)", color: "#ec4899" }}
                              title="Remove from Liked Visualizers">
                              <Heart className="w-3.5 h-3.5 fill-current" />
                            </button>
                          </div>
                          <div className="flex gap-2">
                            <Link to="/visualizers"
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:brightness-110"
                              style={{ background: "rgba(155,126,255,0.12)", border: "1px solid rgba(155,126,255,0.25)", color: "#9B7EFF" }}>
                              <Play className="w-3 h-3" /> Watch
                            </Link>
                            {viz.linked_song_id && (
                              <Link to={`/song/${viz.linked_song_id}`}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:brightness-110"
                                style={{ background: "rgba(212,168,67,0.1)", border: "1px solid rgba(212,168,67,0.2)", color: "#D4A843" }}>
                                <Download className="w-3 h-3" /> Download Song
                              </Link>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </>
        )}
      </div>

      <Footer />
    </div>
  );
}

function EmptyState({ icon: Icon, message, link, linkLabel }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-20 text-center">
      <Icon className="w-12 h-12 text-white/10 mx-auto mb-4" />
      <p className="text-white/25 font-medium mb-2">{message}</p>
      <p className="text-white/15 text-sm mb-6">Hit the heart icon on any item to save it here.</p>
      <Link to={link}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all hover:brightness-110"
        style={{ background: "rgba(236,72,153,0.1)", border: "1px solid rgba(236,72,153,0.2)", color: "#ec4899" }}>
        {linkLabel} <ArrowRight className="w-4 h-4" />
      </Link>
    </motion.div>
  );
}