import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Music4, Play, Pause, Waves, Lock, Crown, Heart, Search, X } from "lucide-react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { usePlayer } from "../context/PlayerContext";
import { useAuth } from "@/lib/AuthContext";
import Footer from "../components/shared/Footer";
import PremiumDownloadModal from "../components/shared/PremiumDownloadModal";
import FavLoginModal from "../components/shared/FavLoginModal";
import { useFavorites } from "../hooks/useFavorite";

// Force-download an MP3 without opening the browser audio player
async function forceDownloadMp3(audioUrl, title, artist) {
  const filename = `${title || "song"}${artist ? " - " + artist : ""}.mp3`
    .replace(/[/\\?%*:|"<>]/g, "")
    .trim();
  const response = await fetch(audioUrl);
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function Downloads() {
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [upgradeModal, setUpgradeModal] = useState(false);
  const [loginModal, setLoginModal] = useState(false);
  const [search, setSearch] = useState("");
  const [downloading, setDownloading] = useState({});
  const { playTrack, currentTrack, isPlaying, togglePlay } = usePlayer();
  const { user } = useAuth();
  const isPremium = user?.role === "premium" || user?.role === "admin";
  const { isFaved, toggle } = useFavorites(user?.email);

  useEffect(() => {
    base44.entities.Track.filter({ status: "published" }, "-created_date", 500)
      .then((t) => { setTracks(t); setLoading(false); });
  }, []);

  const handlePlay = (track) => {
    if (currentTrack?.id === track.id) togglePlay();
    else playTrack(track);
  };

  const handleDownload = async (track) => {
    if (!isPremium) { setUpgradeModal(true); return; }
    if (!track.audio_url) return;
    setDownloading((d) => ({ ...d, [track.id]: true }));
    await forceDownloadMp3(track.audio_url, track.title, track.artist_display);
    setDownloading((d) => ({ ...d, [track.id]: false }));
  };

  const filteredTracks = useMemo(() => {
    if (!search.trim()) return tracks;
    const q = search.toLowerCase();
    return tracks.filter((t) =>
      (t.title || "").toLowerCase().includes(q) ||
      (t.artist_display || "").toLowerCase().includes(q) ||
      (t.album || "").toLowerCase().includes(q) ||
      "432hz".includes(q) || "432 hz".includes(q)
    );
  }, [tracks, search]);

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-6 pt-20 pb-24">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4 text-[10px] font-black tracking-[0.3em] uppercase"
            style={{ background: "rgba(212,168,67,0.1)", border: "1px solid rgba(212,168,67,0.2)", color: "#D4A843" }}>
            <Download className="w-3 h-3" /> Downloads
          </div>
          <h1 className="font-heading font-black text-4xl md:text-5xl text-white mb-3">Downloads</h1>
          <p className="text-white/40 text-sm leading-relaxed max-w-lg mb-6">
            All Upper Vibe Media songs are free to stream. Premium members can download every 432 Hz song instantly.
          </p>

          {/* Search bar */}
          <div className="relative max-w-xl mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25 pointer-events-none" />
            <input
              type="text"
              placeholder="Search songs, artists, or genres…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-10 py-3.5 rounded-2xl text-sm text-white placeholder:text-white/25 focus:outline-none"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {!isPremium && (
            <div className="flex items-center gap-4 p-4 rounded-2xl"
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
        ) : filteredTracks.length === 0 ? (
          <div className="text-center py-24">
            <Download className="w-12 h-12 text-white/10 mx-auto mb-4" />
            <p className="text-white/25 font-medium">{tracks.length === 0 ? "No songs uploaded yet." : "No downloads found."}</p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-white/25 mb-4">{filteredTracks.length} song{filteredTracks.length !== 1 ? "s" : ""} available</p>
            <AnimatePresence>
              {filteredTracks.map((track, i) => {
                const isCurrentTrack = currentTrack?.id === track.id;
                const isDownloading = downloading[track.id];
                const hasFile = !!track.audio_url;
                return (
                  <motion.div key={track.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="flex items-center gap-4 p-4 rounded-2xl group transition-all"
                    style={{
                      background: isCurrentTrack ? "rgba(212,168,67,0.06)" : "rgba(255,255,255,0.025)",
                      border: `1px solid ${isCurrentTrack ? "rgba(212,168,67,0.2)" : "rgba(255,255,255,0.06)"}`,
                    }}>

                    {/* Cover */}
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

                    {/* Info */}
                    <Link to={`/song/${track.id}`} className="flex-1 min-w-0 hover:opacity-80 transition-opacity">
                      <p className="text-sm font-bold text-white truncate">{track.title}</p>
                      <p className="text-xs text-white/40 truncate">{track.artist_display || "Upper Vibe Media"}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                          style={{ background: "rgba(0,229,255,0.1)", color: "#00E5FF" }}>
                          <Waves className="w-2.5 h-2.5" /> 432 Hz
                        </span>
                      </div>
                    </Link>

                    {track.duration && <p className="text-xs text-white/25 hidden sm:block flex-shrink-0">{track.duration}</p>}

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Heart */}
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
                          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.25)"
                        }}>
                        <Heart className={`w-3.5 h-3.5 ${isFaved("track", track.id) ? "fill-current" : ""}`} />
                      </button>

                      {/* Play */}
                      <button onClick={() => handlePlay(track)}
                        className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-110"
                        style={{ background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.2)", color: "#00E5FF" }}>
                        {isCurrentTrack && isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
                      </button>

                      {/* Download */}
                      {!hasFile ? (
                        <span className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs tracking-wider opacity-30 cursor-not-allowed"
                          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.3)" }}>
                          <Download className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Coming Soon</span>
                        </span>
                      ) : isPremium ? (
                        <button
                          onClick={() => handleDownload(track)}
                          disabled={isDownloading}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs tracking-wider transition-all hover:brightness-110 disabled:opacity-60"
                          style={{ background: "linear-gradient(135deg,rgba(212,168,67,0.2),rgba(212,168,67,0.1))", border: "1px solid rgba(212,168,67,0.3)", color: "#D4A843" }}>
                          <Download className={`w-3.5 h-3.5 ${isDownloading ? "animate-bounce" : ""}`} />
                          <span className="hidden sm:inline">{isDownloading ? "Downloading…" : "Download"}</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => setUpgradeModal(true)}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs tracking-wider transition-all hover:brightness-110"
                          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.3)" }}>
                          <Lock className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Download</span>
                        </button>
                      )}
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
      <FavLoginModal open={loginModal} onClose={() => setLoginModal(false)} />
    </div>
  );
}