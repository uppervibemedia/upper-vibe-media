import React, { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Play, Pause, Music4, ChevronLeft, Download } from "lucide-react";
import { useFavoritesContext } from "@/context/FavoritesContext";
import { usePlayer } from "@/context/PlayerContext";
import { useAuth } from "@/lib/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { RADIO_THEMES } from "@/components/radio/RadioThemePicker";
import HeartButton from "@/components/shared/HeartButton";
import Footer from "@/components/shared/Footer";

export default function MyVibes() {
  const { trackFavs, loaded, isLoadingAuth } = useFavoritesContext();
  const { playTrack, currentTrack, isPlaying, togglePlay } = usePlayer();
  const { user, isAuthenticated, navigateToLogin } = useAuth();
  const { accentId } = useTheme();
  const theme = RADIO_THEMES[accentId] || RADIO_THEMES.cyan;
  const rgb = theme.vars["--rt-primary"];
  const navigate = useNavigate();

  const handlePlay = (fav) => {
    const track = {
      id: fav.track_id,
      title: fav.cached_title,
      artist_display: fav.cached_artist,
      cover_url: fav.cached_cover_url,
    };
    if (currentTrack?.id === fav.track_id) togglePlay();
    else playTrack(track);
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 pb-28">
        <div className="text-center max-w-sm">
          <Heart className="w-12 h-12 text-white/10 mx-auto mb-4" />
          <h1 className="font-heading font-black text-2xl text-white mb-3">Sign In to View Your Vibes</h1>
          <p className="text-white/40 text-sm mb-8">Your saved songs will appear here.</p>
          <button onClick={navigateToLogin}
            className="w-full py-3.5 rounded-2xl font-black text-sm tracking-wider transition-all hover:brightness-110"
            style={{ background: "linear-gradient(135deg,#00A8C0,#00D4EE)", color: "#000" }}>
            Sign In
          </button>
        </div>
      </div>
    );
  }

  const isLoading = isLoadingAuth || !loaded;

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
          <h1 className="font-heading font-black text-4xl md:text-5xl text-white mb-1">My Vibe Library</h1>
          <p className="font-heading font-bold mb-2 leading-snug flex items-center gap-2"
            style={{ fontSize: "clamp(0.85rem, 2.5vw, 1.1rem)", color: "rgb(155,126,255)" }}>
            Saved Songs <Heart className="w-4 h-4 flex-shrink-0 fill-current" />
          </p>
          {!isLoading && (
            <p className="text-white/40 text-sm">
              {trackFavs.length} saved song{trackFavs.length !== 1 ? "s" : ""}
            </p>
          )}
        </motion.div>

        {/* Content */}
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3.5 rounded-2xl animate-pulse"
                style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="w-12 h-12 rounded-xl flex-shrink-0" style={{ background: "rgba(255,255,255,0.05)" }} />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-3/4 rounded-full" style={{ background: "rgba(255,255,255,0.07)" }} />
                  <div className="h-2.5 w-1/2 rounded-full" style={{ background: "rgba(255,255,255,0.04)" }} />
                </div>
              </div>
            ))}
          </div>
        ) : trackFavs.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6"
              style={{ background: "rgba(155,126,255,0.07)", border: "1px solid rgba(155,126,255,0.15)" }}>
              <Heart className="w-9 h-9" style={{ color: "rgba(155,126,255,0.3)" }} />
            </div>
            <h2 className="font-heading font-black text-2xl text-white mb-3">No saved songs yet</h2>
            <p className="text-white/40 text-sm mb-8 max-w-xs leading-relaxed">
              Tap the heart on any song to save it here
            </p>
            <Link to="/music"
              className="px-8 py-3.5 rounded-2xl font-black text-sm tracking-wider transition-all hover:brightness-110"
              style={{ background: "linear-gradient(135deg,rgba(155,126,255,0.7),rgb(155,126,255))", color: "#fff" }}>
              Browse Music
            </Link>
          </motion.div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {trackFavs.map((fav, i) => {
                const isCurrentTrack = currentTrack?.id === fav.track_id;
                const trackObj = { id: fav.track_id, title: fav.cached_title, artist_display: fav.cached_artist, cover_url: fav.cached_cover_url };
                return (
                  <motion.div key={fav.id}
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: i * 0.02 }}
                    className="flex items-center gap-3 p-3.5 rounded-2xl transition-all"
                    style={{
                      background: isCurrentTrack ? "rgba(155,126,255,0.06)" : "rgba(255,255,255,0.025)",
                      border: `1px solid ${isCurrentTrack ? "rgba(155,126,255,0.2)" : "rgba(255,255,255,0.06)"}`,
                    }}>

                    {/* Artwork */}
                    <div className="relative flex-shrink-0 cursor-pointer" onClick={() => handlePlay(fav)}>
                      {fav.cached_cover_url ? (
                        <img src={fav.cached_cover_url} alt={fav.cached_title}
                          className="w-12 h-12 rounded-xl object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                          style={{ background: "rgba(155,126,255,0.08)" }}>
                          <Music4 className="w-5 h-5" style={{ color: "rgba(155,126,255,0.3)" }} />
                        </div>
                      )}
                      <div className="absolute inset-0 rounded-xl flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                        style={{ background: "rgba(0,0,0,0.6)" }}>
                        {isCurrentTrack && isPlaying
                          ? <Pause className="w-4 h-4 text-white" />
                          : <Play className="w-4 h-4 text-white ml-0.5" />}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <Link to={`/song/${fav.track_id}`} onClick={(e) => e.stopPropagation()}>
                        <p className="text-sm font-bold truncate"
                          style={{ color: isCurrentTrack ? "rgb(155,126,255)" : "#fff" }}>
                          {fav.cached_title || "Unknown Track"}
                        </p>
                      </Link>
                      <p className="text-xs text-white/40 truncate">{fav.cached_artist || "Upper Vibe Media"}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => handlePlay(fav)}
                        className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                        style={{ background: "rgba(0,160,220,0.08)", border: "1px solid rgba(0,160,220,0.2)", color: "#00A0DC" }}>
                        {isCurrentTrack && isPlaying
                          ? <Pause className="w-3.5 h-3.5" />
                          : <Play className="w-3.5 h-3.5 ml-0.5" />}
                      </button>
                      <Link to={`/song/${fav.track_id}?downloadIntent=true`}
                        className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                        style={{ background: "rgba(212,168,67,0.1)", border: "1px solid rgba(212,168,67,0.3)", color: "#D4A843" }}>
                        <Download className="w-3.5 h-3.5" />
                      </Link>
                      <HeartButton track={trackObj} size="sm" />
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