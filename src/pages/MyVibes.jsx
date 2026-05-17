import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Play, Pause, Shuffle, Music4, Waves, Crown, ArrowRight } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { usePlayer } from "../context/PlayerContext";
import { useAuth } from "@/lib/AuthContext";
import { useVibe } from "../hooks/useVibe";
import HeartButton from "../components/shared/HeartButton";
import Footer from "../components/shared/Footer";

export default function MyVibes() {
  const { user } = useAuth();
  const isPremium = user?.role === "premium" || user?.role === "admin";
  const { savedIds, toggleSave, isSaved } = useVibe(isPremium ? user?.email : null);
  const [savedTracks, setSavedTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const { playTrack, currentTrack, isPlaying, togglePlay, setQueue } = usePlayer();

  useEffect(() => {
    if (!isPremium || !user?.email) { setLoading(false); return; }
    base44.entities.Favorite.filter({ user_email: user.email }, "-created_date", 500)
      .then(async (favs) => {
        if (favs.length === 0) { setSavedTracks([]); setLoading(false); return; }
        const trackIds = favs.map((f) => f.track_id);
        const all = await base44.entities.Track.filter({ status: "published" }, "-created_date", 500);
        const ordered = trackIds
          .map((id) => all.find((t) => t.id === id))
          .filter(Boolean);
        setSavedTracks(ordered);
        setLoading(false);
      });
  }, [user, savedIds, isPremium]);

  const handlePlay = (track) => {
    if (currentTrack?.id === track.id) togglePlay();
    else {
      setQueue(savedTracks);
      playTrack(track);
    }
  };

  const handlePlayAll = () => {
    if (savedTracks.length === 0) return;
    setQueue(savedTracks);
    playTrack(savedTracks[0]);
  };

  const handleShuffle = () => {
    if (savedTracks.length === 0) return;
    const shuffled = [...savedTracks].sort(() => Math.random() - 0.5);
    setQueue(shuffled);
    playTrack(shuffled[0]);
  };

  // Non-premium gate
  if (!isPremium) {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center py-24">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
            style={{ background: "rgba(236,72,153,0.12)", border: "1px solid rgba(236,72,153,0.25)" }}>
            <Heart className="w-8 h-8 text-pink-400 fill-current" />
          </div>
          <h1 className="font-heading font-black text-3xl md:text-4xl text-white mb-4">My Vibe Library</h1>
          <p className="text-white/40 text-sm max-w-md leading-relaxed mb-8">
            Save your favorite 432 Hz songs and build a personal playlist. This is a{" "}
            <span className="text-pink-400 font-bold">Premium feature</span> — upgrade to start curating your collection.
          </p>
          <a href="/pricing"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full font-black text-sm tracking-wider transition-all hover:brightness-110 hover:scale-[1.02]"
            style={{ background: "linear-gradient(135deg,#be185d,#ec4899)", color: "#fff", boxShadow: "0 0 24px rgba(236,72,153,0.3)" }}>
            <Crown className="w-4 h-4" /> Upgrade To Premium
          </a>
          <a href="/music" className="mt-5 flex items-center gap-1 text-sm text-white/30 hover:text-white/60 transition-colors">
            Browse music free <ArrowRight className="w-4 h-4" />
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
        style={{ background: "linear-gradient(180deg,rgba(236,72,153,0.07) 0%,transparent 100%)" }}>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full opacity-[0.06] blur-[90px] pointer-events-none"
          style={{ background: "radial-gradient(circle,#ec4899,transparent)" }} />
        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4 text-[10px] font-black tracking-[0.25em] uppercase"
              style={{ background: "rgba(236,72,153,0.1)", border: "1px solid rgba(236,72,153,0.2)", color: "#ec4899" }}>
              <Heart className="w-3 h-3 fill-current" /> My Vibe Library
            </div>
            <h1 className="font-heading font-black text-4xl md:text-5xl text-white mb-2">My Vibe Library</h1>
            <p className="text-white/35 text-sm">
              {savedTracks.length} saved song{savedTracks.length !== 1 ? "s" : ""} · Your personal 432 Hz collection
            </p>

            {savedTracks.length > 0 && (
              <div className="flex gap-3 mt-5">
                <button onClick={handlePlayAll}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all hover:brightness-110"
                  style={{ background: "linear-gradient(135deg,#be185d,#ec4899)", color: "#fff" }}>
                  <Play className="w-4 h-4 fill-current" /> Play All
                </button>
                <button onClick={handleShuffle}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all hover:bg-white/10"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.6)" }}>
                  <Shuffle className="w-4 h-4" /> Shuffle
                </button>
              </div>
            )}
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pb-24">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-6 h-6 border-2 border-pink-400/20 border-t-pink-400 rounded-full animate-spin" />
          </div>
        ) : savedTracks.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-24 text-center">
            <Heart className="w-12 h-12 text-white/10 mx-auto mb-4" />
            <p className="text-white/25 font-medium mb-2">No songs saved yet.</p>
            <p className="text-white/15 text-sm max-w-xs">
              Hit the heart icon on any song to add it to your Vibe Library.
            </p>
            <a href="/music"
              className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all hover:brightness-110"
              style={{ background: "rgba(236,72,153,0.1)", border: "1px solid rgba(236,72,153,0.2)", color: "#ec4899" }}>
              Browse Music <ArrowRight className="w-4 h-4" />
            </a>
          </motion.div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
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
                    {/* Cover */}
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
                        {isCurrentTrack && isPlaying
                          ? <Pause className="w-4 h-4 text-pink-400" />
                          : <Play className="w-4 h-4 text-white ml-0.5" />}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">{track.title}</p>
                      <p className="text-xs text-white/40 truncate">{track.artist_display || "Upper Vibe Media"}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                          style={{ background: "rgba(0,229,255,0.1)", color: "#00E5FF" }}>
                          <Waves className="w-2.5 h-2.5" /> 432 Hz
                        </span>
                      </div>
                    </div>

                    {track.duration && (
                      <p className="text-xs text-white/25 flex-shrink-0 hidden sm:block">{track.duration}</p>
                    )}

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button onClick={() => handlePlay(track)}
                        className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-110"
                        style={{ background: isCurrentTrack ? "rgba(236,72,153,0.15)" : "rgba(236,72,153,0.08)", border: "1px solid rgba(236,72,153,0.2)", color: "#ec4899" }}>
                        {isCurrentTrack && isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
                      </button>
                      <HeartButton isSaved={true} isPremium={true}
                        onToggle={() => toggleSave(track)} size="sm" />
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}