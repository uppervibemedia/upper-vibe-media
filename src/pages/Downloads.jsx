import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Music4, Play, Pause, ExternalLink, ChevronLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { usePlayer } from "../context/PlayerContext";
import { useAuth } from "@/lib/AuthContext";
import Footer from "../components/shared/Footer";
import { format } from "date-fns";
import { useTheme } from "../context/ThemeContext";
import { RADIO_THEMES } from "../components/radio/RadioThemePicker";

export default function Downloads() {
  const [downloads, setDownloads] = useState([]);
  const [loading, setLoading] = useState(true);
  const { playTrack, currentTrack, isPlaying, togglePlay } = usePlayer();
  const { user, isAuthenticated, navigateToLogin } = useAuth();
  const { accentId } = useTheme();
  const theme = RADIO_THEMES[accentId] || RADIO_THEMES.cyan;
  const rgb = theme.vars["--rt-primary"];
  const navigate = useNavigate();

  useEffect(() => {
    if (!user?.id) return;
    base44.entities.UserDownload.filter({ user_id: user.id }, "-downloaded_at", 200)
      .then((res) => { setDownloads(res); setLoading(false); });
  }, [user?.id]);

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 pb-28">
        <div className="text-center max-w-sm">
          <Download className="w-12 h-12 text-white/10 mx-auto mb-4" />
          <h1 className="font-heading font-black text-2xl text-white mb-3">Sign In to View Downloads</h1>
          <p className="text-white/40 text-sm mb-8">Your downloaded tracks will appear here.</p>
          <button onClick={navigateToLogin}
            className="w-full py-3.5 rounded-2xl font-black text-sm tracking-wider transition-all hover:brightness-110"
            style={{ background: "linear-gradient(135deg,#00A8C0,#00D4EE)", color: "#000" }}>
            Sign In
          </button>
        </div>
      </div>
    );
  }

  const handlePlay = (dl) => {
    const track = {
      id: dl.song_id,
      title: dl.song_title,
      artist_display: dl.artist_name,
      cover_url: dl.artwork_url,
      audio_url: dl.file_url,
    };
    if (currentTrack?.id === dl.song_id) togglePlay();
    else playTrack(track);

    // analytics
    try {
      base44.entities.AnalyticsEvent.create({ event_type: "song_play", song_id: dl.song_id, song_title: dl.song_title, artist_name: dl.artist_name });
    } catch {}
  };

  const handleGoToSong = (dl) => {
    if (dl.song_id) navigate(`/song/${dl.song_id}?downloadIntent=true`);
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-20 pb-24">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <button onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 mb-5 text-xs font-bold tracking-wider transition-all hover:brightness-125"
            style={{ color: `rgb(${rgb})` }}>
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          <h1 className="font-heading font-black text-4xl md:text-5xl text-white mb-1">My Downloads</h1>
          <p className="font-heading font-bold mb-2 leading-snug flex items-center gap-2"
            style={{ fontSize: "clamp(0.85rem, 2.5vw, 1.1rem)", color: `rgb(${rgb})` }}>
            Offline Library <Download className="w-4 h-4 flex-shrink-0" />
          </p>
          <p className="text-white/40 text-sm">
            {downloads.length} track{downloads.length !== 1 ? "s" : ""} in your offline library
          </p>
        </motion.div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-6 h-6 border-2 border-yellow-400/20 border-t-yellow-400 rounded-full animate-spin" />
          </div>
        ) : downloads.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6"
              style={{ background: "rgba(212,168,67,0.07)", border: "1px solid rgba(212,168,67,0.15)" }}>
              <Download className="w-9 h-9 text-yellow-400/30" />
            </div>
            <h2 className="font-heading font-black text-2xl text-white mb-3">No downloads yet</h2>
            <p className="text-white/40 text-sm mb-8 max-w-xs leading-relaxed">
              Start building your high-vibe music library
            </p>
            <Link to="/music"
              className="px-8 py-3.5 rounded-2xl font-black text-sm tracking-wider transition-all hover:brightness-110"
              style={{ background: "linear-gradient(135deg,#C8892A,#EDB84A)", color: "#000" }}>
              Browse Music
            </Link>
          </motion.div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {downloads.map((dl, i) => {
                const isCurrentTrack = currentTrack?.id === dl.song_id;
                return (
                  <motion.div key={dl.id}
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-2xl transition-all"
                    style={{
                      background: isCurrentTrack ? "rgba(212,168,67,0.06)" : "rgba(255,255,255,0.025)",
                      border: `1px solid ${isCurrentTrack ? "rgba(212,168,67,0.2)" : "rgba(255,255,255,0.06)"}`,
                    }}>

                    {/* Artwork */}
                    <div className="relative flex-shrink-0 cursor-pointer" onClick={() => handlePlay(dl)}>
                      {dl.artwork_url ? (
                        <img src={dl.artwork_url} alt={dl.song_title}
                          className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl object-cover" />
                      ) : (
                        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center"
                          style={{ background: "rgba(212,168,67,0.08)" }}>
                          <Music4 className="w-5 h-5 text-yellow-400/30" />
                        </div>
                      )}
                      <div className="absolute inset-0 rounded-xl flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                        style={{ background: "rgba(0,0,0,0.6)" }}>
                        {isCurrentTrack && isPlaying
                          ? <Pause className="w-4 h-4 text-yellow-400" />
                          : <Play className="w-4 h-4 text-white ml-0.5" />}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">{dl.song_title || "Unknown Track"}</p>
                      <p className="text-xs text-white/40 truncate">{dl.artist_name || "Upper Vibe Media"}</p>
                      {dl.downloaded_at && (
                        <p className="text-[10px] text-white/20 mt-0.5">
                          {format(new Date(dl.downloaded_at), "MMM d, yyyy")}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Play */}
                      <button onClick={() => handlePlay(dl)}
                        className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                        style={{ background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.2)", color: "#00E5FF" }}>
                        {isCurrentTrack && isPlaying
                          ? <Pause className="w-3.5 h-3.5" />
                          : <Play className="w-3.5 h-3.5 ml-0.5" />}
                      </button>

                      {/* Go to song page to download */}
                      <button onClick={() => handleGoToSong(dl)}
                        className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl font-bold text-xs tracking-wider transition-all hover:brightness-110 active:scale-95"
                        style={{ background: "linear-gradient(135deg,rgba(212,168,67,0.2),rgba(212,168,67,0.1))", border: "1px solid rgba(212,168,67,0.3)", color: "#D4A843" }}>
                        <Download className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Download</span>
                      </button>
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