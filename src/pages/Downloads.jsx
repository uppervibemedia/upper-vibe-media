import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Music4, Play, Pause, Waves, Lock, Crown } from "lucide-react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { usePlayer } from "../context/PlayerContext";
import { useAuth } from "@/lib/AuthContext";
import Footer from "../components/shared/Footer";
import PremiumDownloadModal from "../components/shared/PremiumDownloadModal";
import HeartButton from "../components/shared/HeartButton";
import VibeUpgradeModal from "../components/shared/VibeUpgradeModal";
import { useVibe } from "../hooks/useVibe";

export default function Downloads() {
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [upgradeModal, setUpgradeModal] = useState(false);
  const [vibeUpgradeModal, setVibeUpgradeModal] = useState(false);
  const { playTrack, currentTrack, isPlaying, togglePlay } = usePlayer();
  const { user } = useAuth();
  const isPremium = user?.role === "premium" || user?.role === "admin";
  const { isSaved, toggleSave } = useVibe(isPremium ? user?.email : null);

  useEffect(() => {
    base44.entities.Track.filter({ status: "published" }, "-created_date", 500)
      .then((t) => { setTracks(t); setLoading(false); });
  }, []);

  const handlePlay = (track) => {
    if (currentTrack?.id === track.id) togglePlay();
    else playTrack(track);
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-6 pt-20 pb-24">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4 text-[10px] font-black tracking-[0.3em] uppercase"
            style={{ background: "rgba(212,168,67,0.1)", border: "1px solid rgba(212,168,67,0.2)", color: "#D4A843" }}>
            <Download className="w-3 h-3" /> Downloads
          </div>
          <h1 className="font-heading font-black text-4xl md:text-5xl text-white mb-3">Downloads</h1>
          <p className="text-white/40 text-sm leading-relaxed max-w-lg">
            All Upper Vibe Media songs are free to stream. Click any song to visit its page — Premium members can download there.
          </p>

          {!isPremium && (
            <div className="mt-6 flex items-center gap-4 p-4 rounded-2xl"
              style={{ background: "rgba(212,168,67,0.07)", border: "1px solid rgba(212,168,67,0.2)" }}>
              <Crown className="w-5 h-5 text-yellow-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white">Unlock Premium Downloads — $4.99/month</p>
                <p className="text-xs text-white/40 mt-0.5">Download every 432 Hz song and save them offline.</p>
              </div>
              <button onClick={() => setUpgradeModal(true)}
                className="px-4 py-2 rounded-xl text-xs font-black tracking-wider flex-shrink-0 transition-all hover:brightness-110"
                style={{ background: "linear-gradient(135deg,#D4A843,#F0C060)", color: "#000" }}>
                Upgrade
              </button>
            </div>
          )}
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-6 h-6 border-2 border-yellow-400/20 border-t-yellow-400 rounded-full animate-spin" />
          </div>
        ) : tracks.length === 0 ? (
          <div className="text-center py-24">
            <Download className="w-12 h-12 text-white/10 mx-auto mb-4" />
            <p className="text-white/25 font-medium">No songs uploaded yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-white/25 mb-4">{tracks.length} song{tracks.length !== 1 ? "s" : ""} available</p>
            <AnimatePresence>
              {tracks.map((track, i) => {
                const isCurrentTrack = currentTrack?.id === track.id;
                return (
                  <motion.div key={track.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="flex items-center gap-4 p-4 rounded-2xl group transition-all"
                    style={{
                      background: isCurrentTrack ? "rgba(212,168,67,0.06)" : "rgba(255,255,255,0.025)",
                      border: `1px solid ${isCurrentTrack ? "rgba(212,168,67,0.2)" : "rgba(255,255,255,0.06)"}`,
                    }}>
                    <div className="relative flex-shrink-0 cursor-pointer" onClick={() => handlePlay(track)}>
                      {track.cover_url ? (
                        <img src={track.cover_url} alt={track.title} className="w-12 h-12 rounded-xl object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                          style={{ background: "rgba(212,168,67,0.08)" }}>
                          <Music4 className="w-5 h-5 text-yellow-400/30" />
                        </div>
                      )}
                      <div className="absolute inset-0 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ background: "rgba(0,0,0,0.6)" }}>
                        {isCurrentTrack && isPlaying ? <Pause className="w-4 h-4 text-yellow-400" /> : <Play className="w-4 h-4 text-white ml-0.5" />}
                      </div>
                    </div>

                    <Link to={`/song/${track.id}`} className="flex-1 min-w-0 hover:opacity-80 transition-opacity">
                      <p className="text-sm font-bold text-white truncate">{track.title}</p>
                      <p className="text-xs text-white/40 truncate">{track.artist_display || "Upper Vibe Media"}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                          style={{ background: "rgba(0,229,255,0.1)", color: "#00E5FF" }}>
                          <Waves className="w-2.5 h-2.5" /> 432 Hz
                        </span>
                        {!isPremium && (
                          <span className="flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                            style={{ background: "rgba(212,168,67,0.1)", color: "#D4A843" }}>
                            <Crown className="w-2 h-2" /> Premium
                          </span>
                        )}
                      </div>
                    </Link>

                    {track.duration && <p className="text-xs text-white/25 hidden sm:block flex-shrink-0">{track.duration}</p>}

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <HeartButton
                        isSaved={isSaved(track.id)}
                        isPremium={isPremium}
                        onToggle={() => toggleSave(track)}
                        onUpgrade={() => setVibeUpgradeModal(true)}
                      />
                      <button onClick={() => handlePlay(track)}
                        className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-110"
                        style={{ background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.2)", color: "#00E5FF" }}>
                        {isCurrentTrack && isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
                      </button>

                      <Link to={`/song/${track.id}`}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs tracking-wider transition-all hover:brightness-110"
                        style={isPremium
                          ? { background: "linear-gradient(135deg,rgba(212,168,67,0.2),rgba(212,168,67,0.1))", border: "1px solid rgba(212,168,67,0.3)", color: "#D4A843" }
                          : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.3)" }
                        }>
                        {isPremium ? <Download className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                        <span className="hidden sm:inline">Download</span>
                      </Link>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
      <Footer />
      <PremiumDownloadModal open={upgradeModal} onClose={() => setUpgradeModal(false)} />
      <VibeUpgradeModal open={vibeUpgradeModal} onClose={() => setVibeUpgradeModal(false)} />
    </div>
  );
}