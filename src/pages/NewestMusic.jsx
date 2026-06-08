import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Play, Pause, Download, Waves, Music4, Heart, Zap, ArrowRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { recordUserDownload, triggerBrowserDownload } from "@/lib/downloadService";
import { usePlayer } from "../context/PlayerContext";
import { recordPlay } from "../components/home/DiscoverTab";
import { useAuth } from "@/lib/AuthContext";
import Footer from "../components/shared/Footer";
import PremiumDownloadModal from "../components/shared/PremiumDownloadModal";
import FavLoginModal from "../components/shared/FavLoginModal";
import DownloadToast from "../components/shared/DownloadToast";
import SupportModal from "../components/shared/SupportModal";
import { useFavorites } from "../hooks/useFavorite";
import { useTheme } from "../context/ThemeContext";

export default function NewestMusic() {
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [upgradeModal, setUpgradeModal] = useState(false);
  const [loginModal, setLoginModal] = useState(false);
  const [downloadToast, setDownloadToast] = useState(null);
  const [downloadIosMode, setDownloadIosMode] = useState(false);
  const [supportModal, setSupportModal] = useState(null);
  const { playTrack, currentTrack, isPlaying, togglePlay } = usePlayer();
  const { user, isPlus, isAdmin } = useAuth();
  const isPremium = isPlus || isAdmin;
  const { isFaved, toggle } = useFavorites(user?.email);
  const { accent } = useTheme();
  const rgb = accent.rgb;
  const navigate = useNavigate();

  const handleDownload = async (track, e) => {
    e.stopPropagation();
    if (!isPremium) {
      setUpgradeModal(true);
      return;
    }
    if (!track.audio_url) return;
    recordUserDownload(user, track).catch(() => {});
    const method = await triggerBrowserDownload(track.audio_url, track.title);
    setDownloadIosMode(method === "ios_new_tab");
    setDownloadToast(track);
  };

  useEffect(() => {
    base44.entities.Track.filter({ status: "published" }, "-created_date", 10)
      .then((t) => { setTracks(t); setLoading(false); });
  }, []);

  const handlePlay = (track) => {
    if (currentTrack?.id === track.id) togglePlay();
    else { playTrack(track); recordPlay(track); }
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-6 pt-20 pb-6">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4 text-[10px] font-black tracking-[0.3em] uppercase"
            style={{ background: `rgba(${rgb},0.08)`, border: `1px solid rgba(${rgb},0.22)`, color: `rgb(${rgb})` }}>
            <Zap className="w-3 h-3" /> New Releases
          </div>
          <h1 className="font-heading font-black text-4xl md:text-5xl text-white mb-2">Latest Music</h1>
          <p className="text-white/35 text-sm mb-1">The latest Upper Vibe Media songs and 432 Hz releases.</p>
          <p className="text-white/20 text-xs">Showing newest {tracks.length} uploads</p>
        </motion.div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pb-24">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-6 h-6 border-2 border-cyan-400/20 border-t-cyan-400 rounded-full animate-spin" />
          </div>
        ) : tracks.length === 0 ? (
          <div className="text-center py-20">
            <Music4 className="w-10 h-10 text-white/10 mx-auto mb-3" />
            <p className="text-white/25">No songs uploaded yet.</p>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
            {tracks.map((track, i) => {
              const isCurrentTrack = currentTrack?.id === track.id;
              return (
                <motion.div
                  key={track.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-center gap-4 p-4 rounded-2xl group transition-all"
                  style={{
                    background: isCurrentTrack ? "rgba(0,229,255,0.06)" : "rgba(255,255,255,0.025)",
                    border: `1px solid ${isCurrentTrack ? "rgba(0,229,255,0.2)" : "rgba(255,255,255,0.06)"}`,
                  }}>

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
                      <span className="flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{ background: "rgba(0,160,220,0.1)", color: "#00A0DC" }}>
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

                  {/* Actions: Play → Download → Heart */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {/* Play */}
                    <button onClick={() => handlePlay(track)}
                      className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-110"
                      style={{
                        background: isCurrentTrack ? "rgba(0,229,255,0.15)" : "rgba(0,229,255,0.08)",
                        border: "1px solid rgba(0,229,255,0.2)", color: "#00E5FF"
                      }}>
                      {isCurrentTrack && isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
                    </button>

                    {/* Download */}
                    <button
                      onClick={(e) => handleDownload(track, e)}
                      className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-110"
                      style={{ background: "rgba(212,168,67,0.1)", border: "1px solid rgba(212,168,67,0.25)", color: "#D4A843" }}
                      title={isPremium ? "Download MP3" : "Upgrade to Plus to download"}>
                      <Download className="w-3.5 h-3.5" />
                    </button>

                    {/* Heart — violet purple */}
                    <button
                      onClick={() => {
                        if (!user) { setLoginModal(true); return; }
                        toggle("track", track.id, { title: track.title, artist: track.artist_display, cover_url: track.cover_url });
                      }}
                      onTouchEnd={(e) => {
                        e.preventDefault(); e.stopPropagation();
                        if (!user) { setLoginModal(true); return; }
                        toggle("track", track.id, { title: track.title, artist: track.artist_display, cover_url: track.cover_url });
                      }}
                      title={isFaved("track", track.id) ? "Saved" : "Save to Favorites"}
                      className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-110"
                      style={isFaved("track", track.id) ? {
                        background: "rgba(155,126,255,0.22)", border: "1px solid rgba(155,126,255,0.55)", color: "#9B7EFF"
                      } : {
                        background: "rgba(155,126,255,0.06)", border: "1px solid rgba(155,126,255,0.35)", color: "rgba(155,126,255,0.6)"
                      }}>
                      <Heart className={`w-3.5 h-3.5 ${isFaved("track", track.id) ? "fill-current" : ""}`} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {/* Link to full library */}
        {!loading && tracks.length > 0 && (
          <div className="mt-8 text-center">
            <Link to="/music"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-black tracking-wider transition-all hover:brightness-110"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}>
              Browse All Music <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>

      <Footer />
      <PremiumDownloadModal open={upgradeModal} onClose={() => setUpgradeModal(false)} />
      <FavLoginModal open={loginModal} onClose={() => setLoginModal(false)} />
      <DownloadToast track={downloadToast} iosMode={downloadIosMode} onClose={() => setDownloadToast(null)} onSupport={(t) => setSupportModal(t)} />
      <SupportModal open={!!supportModal} onClose={() => setSupportModal(null)} track={supportModal} />
    </div>
  );
}