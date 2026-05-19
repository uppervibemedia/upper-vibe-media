import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Play, Pause, SkipForward, SkipBack, Radio as RadioIcon, Waves, Download, Music4, Crown, Heart } from "lucide-react";
import { usePlayer } from "../context/PlayerContext";
import { useRadio } from "../context/RadioContext";
import { useAuth } from "@/lib/AuthContext";
import { useFavorites } from "../hooks/useFavorite";
import PremiumDownloadModal from "../components/shared/PremiumDownloadModal";
import FavLoginModal from "../components/shared/FavLoginModal";
import UpNextPanel from "../components/radio/UpNextPanel";
import RadioVisualizer from "../components/radio/RadioVisualizer";

export default function RadioPage() {
  const [premiumModal, setPremiumModal] = useState(false);
  const [loginModal, setLoginModal] = useState(false);

  const { currentTrack, isPlaying, togglePlay, sourceType, playTrack } = usePlayer();
  const { user } = useAuth();
  const { isFaved, toggle: toggleFav } = useFavorites(user?.email);
  const {
    tracksLoaded,
    currentRadioSong,
    isRadioMode,
    hasPrev,
    upNext,
    initRadio,
    startRadio,
    resumeRadio,
    nextRadioSong,
    prevRadioSong,
    jumpToSong,
  } = useRadio();

  const isPlus =
    user?.role === "admin" || user?.isPlus === true || user?.tier === "plus" ||
    user?.tier === "premium" || user?.isPremium === true || user?.role === "premium";

  useEffect(() => {
    if (tracksLoaded) initRadio();
  }, [tracksLoaded, initRadio]);

  const isCurrentlyPlayingRadio = sourceType === "radio" && currentTrack?.id === currentRadioSong?.id;
  const radioIsPaused = currentRadioSong && sourceType !== "radio" && !!currentTrack;
  const playingThisRadioSong = isCurrentlyPlayingRadio && isPlaying;

  const isLiked = currentRadioSong ? isFaved("track", currentRadioSong.id) : false;

  const handlePlay = () => {
    if (isCurrentlyPlayingRadio) togglePlay();
    else startRadio();
  };

  const handleLike = () => {
    if (!user) { setLoginModal(true); return; }
    if (!currentRadioSong) return;
    toggleFav("track", currentRadioSong.id, {
      title: currentRadioSong.title,
      artist: currentRadioSong.artist_display || "Upper Vibe Media",
      cover_url: currentRadioSong.cover_url,
    });
  };

  const handleDownload = () => {
    if (!user) { setLoginModal(true); return; }
    if (!isPlus) { setPremiumModal(true); return; }
    if (currentRadioSong?.audio_url) window.open(currentRadioSong.audio_url, "_blank");
  };

  if (!tracksLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-6 h-6 border-2 border-cyan-400/20 border-t-cyan-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32 lg:pb-8">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full blur-[180px] opacity-[0.04]"
          style={{ background: "#00C9E0" }} />
      </div>

      <div className="max-w-5xl mx-auto px-6 pt-20 lg:pt-14 relative z-10">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full mb-5"
            style={{ background: "rgba(0,200,220,0.06)", border: "1px solid rgba(0,200,220,0.16)" }}>
            <RadioIcon className="w-3 h-3" style={{ color: "#00C9E0" }} />
            <span className="text-[9px] font-black tracking-[0.4em] uppercase" style={{ color: "#00C9E0" }}>
              Live Radio
            </span>
          </div>
          <h1 className="font-heading font-black text-white mb-2" style={{ fontSize: "clamp(1.8rem,4vw,2.8rem)" }}>
            Upper Vibe Radio
          </h1>
          <p className="text-white/35 text-sm">Shuffle through all 432 Hz Upper Vibe Media songs</p>
        </motion.div>

        {/* Visualizer */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15, duration: 0.8 }}
          className="relative mx-auto mb-6 rounded-3xl"
          style={{ maxWidth: 480, width: "100%", background: "rgba(0,0,0,0.35)", border: "1px solid rgba(0,200,220,0.1)", overflow: "hidden", borderRadius: "1.5rem" }}>
          <RadioVisualizer isPlaying={playingThisRadioSong} />
          <div className="pointer-events-none" style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, transparent 40%, rgba(4,4,14,0.6) 100%)" }} />
        </motion.div>

        {!currentRadioSong ? (
          <div className="text-center py-20">
            <Music4 className="w-12 h-12 text-white/10 mx-auto mb-4" />
            <p className="text-white/30 text-sm">No songs available for radio yet.</p>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-6 items-start justify-center">

            {/* Main Radio Player */}
            <motion.div
              initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.5 }}
              className="w-full lg:w-[360px] flex-shrink-0">
              <div className="rounded-3xl p-8 text-center"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>

                {/* Cover */}
                <div className="relative w-44 h-44 mx-auto mb-6">
                  {currentRadioSong.cover_url ? (
                    <img src={currentRadioSong.cover_url} alt={currentRadioSong.title}
                      className="w-full h-full rounded-2xl object-cover"
                      style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.5)" }} />
                  ) : (
                    <div className="w-full h-full rounded-2xl flex items-center justify-center"
                      style={{ background: "rgba(0,200,220,0.08)", border: "1px solid rgba(0,200,220,0.15)" }}>
                      <Music4 className="w-14 h-14 text-cyan-400/20" />
                    </div>
                  )}
                  {playingThisRadioSong && (
                    <div className="absolute -bottom-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center"
                      style={{ background: "linear-gradient(135deg,#00A8C0,#00D4EE)" }}>
                      <Waves className="w-3.5 h-3.5 text-black animate-pulse" />
                    </div>
                  )}
                  {/* Heart button — top right of cover */}
                  <button
                    onClick={handleLike}
                    className="absolute -top-2 -right-2 w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                    style={{
                      background: isLiked ? "rgba(236,72,153,0.25)" : "rgba(0,0,0,0.6)",
                      border: `1px solid ${isLiked ? "rgba(236,72,153,0.6)" : "rgba(255,255,255,0.15)"}`,
                      color: isLiked ? "#ec4899" : "rgba(255,255,255,0.5)",
                    }}
                    title={isLiked ? "Remove from Favorites" : "Add to Favorites"}
                  >
                    <Heart className={`w-4 h-4 transition-all ${isLiked ? "fill-current" : ""}`} />
                  </button>
                </div>

                {/* Track info */}
                <h2 className="font-heading font-black text-white text-lg mb-1 truncate px-2">
                  {currentRadioSong.title}
                </h2>
                <p className="text-white/40 text-sm mb-3 truncate">
                  {currentRadioSong.artist_display || "Upper Vibe Media"}
                </p>
                <span className="inline-flex items-center gap-1 text-[9px] font-black px-2.5 py-1 rounded-full mb-6"
                  style={{ background: "rgba(0,200,220,0.1)", border: "1px solid rgba(0,200,220,0.2)", color: "#00C9E0" }}>
                  <Waves className="w-2.5 h-2.5" /> 432 Hz
                </span>

                {/* Paused banner */}
                {radioIsPaused && (
                  <div className="mb-5 px-4 py-2.5 rounded-xl text-xs text-white/45 flex items-center justify-center gap-2"
                    style={{ background: "rgba(0,200,220,0.05)", border: "1px solid rgba(0,200,220,0.1)" }}>
                    <RadioIcon className="w-3 h-3 text-cyan-400/40" />
                    Radio paused — playing another song
                  </div>
                )}

                {/* Controls */}
                <div className="flex items-center justify-center gap-4 mb-6">
                  <button onClick={() => prevRadioSong()} disabled={!hasPrev}
                    className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:bg-white/8 disabled:opacity-30"
                    style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
                    <SkipBack className="w-4 h-4 text-white/60" />
                  </button>

                  {radioIsPaused ? (
                    <button onClick={() => resumeRadio()}
                      className="px-5 h-12 rounded-full flex items-center gap-2 font-black text-xs tracking-wider transition-all hover:brightness-110 hover:scale-105 active:scale-95"
                      style={{ background: "linear-gradient(135deg,#00A8C0,#00D4EE)", color: "#000", boxShadow: "0 0 20px rgba(0,200,220,0.2)" }}>
                      <RadioIcon className="w-3.5 h-3.5" />
                      Resume Radio
                    </button>
                  ) : (
                    <button onClick={handlePlay}
                      className="w-14 h-14 rounded-full flex items-center justify-center transition-all hover:brightness-110 hover:scale-105 active:scale-95"
                      style={{ background: "linear-gradient(135deg,#00A8C0,#00D4EE)", boxShadow: "0 0 24px rgba(0,200,220,0.2)" }}>
                      {playingThisRadioSong
                        ? <Pause className="w-6 h-6 text-black fill-current" />
                        : <Play className="w-6 h-6 text-black fill-current ml-0.5" />}
                    </button>
                  )}

                  <button onClick={() => nextRadioSong()}
                    className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:bg-white/8"
                    style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
                    <SkipForward className="w-4 h-4 text-white/60" />
                  </button>
                </div>

                {/* Bottom actions: Like + Download */}
                <div className="flex items-center justify-center gap-3">
                  <button onClick={handleLike}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black tracking-wider transition-all hover:brightness-110"
                    style={{
                      background: isLiked ? "rgba(236,72,153,0.15)" : "rgba(255,255,255,0.05)",
                      border: `1px solid ${isLiked ? "rgba(236,72,153,0.4)" : "rgba(255,255,255,0.1)"}`,
                      color: isLiked ? "#ec4899" : "rgba(255,255,255,0.4)",
                    }}>
                    <Heart className={`w-3.5 h-3.5 ${isLiked ? "fill-current" : ""}`} />
                    {isLiked ? "Liked" : "Like"}
                  </button>

                  <button onClick={handleDownload}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black tracking-wider transition-all hover:brightness-110"
                    style={{ background: "rgba(212,168,67,0.08)", border: "1px solid rgba(212,168,67,0.2)", color: "#C89432" }}>
                    <Download className="w-3.5 h-3.5" />
                    Download
                    {!isPlus && <Crown className="w-3 h-3 text-yellow-400/60" />}
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Up Next Panel */}
            <motion.div
              initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }}
              className="w-full lg:flex-1">
              <UpNextPanel upNext={upNext} onJump={(song) => jumpToSong(song)} />
            </motion.div>

          </div>
        )}

        <p className="text-center text-[11px] text-white/15 tracking-wide mt-8">
          Free to stream. Premium members unlock downloads.
        </p>
      </div>

      <PremiumDownloadModal open={premiumModal} onClose={() => setPremiumModal(false)} />
      <FavLoginModal open={loginModal} onClose={() => setLoginModal(false)} />
    </div>
  );
}