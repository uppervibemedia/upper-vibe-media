import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play, Pause, SkipForward, SkipBack,
  Radio as RadioIcon, Waves, Download, Music4, Crown, Heart, Mic2, Sparkles,
} from "lucide-react";
import { usePlayer } from "../context/PlayerContext";
import { useRadio } from "../context/RadioContext";
import { useAuth } from "@/lib/AuthContext";
import { useFavorites } from "../hooks/useFavorite";
import PremiumDownloadModal from "../components/shared/PremiumDownloadModal";
import ShareVibeButton from "../components/shared/ShareVibeButton";
import FavLoginModal from "../components/shared/FavLoginModal";
import UpNextPanel from "../components/radio/UpNextPanel";
import RadioVisualizer from "../components/radio/RadioVisualizer";

export default function RadioPage() {
  const [premiumModal, setPremiumModal] = useState(false);
  const [loginModal, setLoginModal] = useState(false);

  const { currentTrack, isPlaying, togglePlay, sourceType } = usePlayer();
  const {
    tracksLoaded, currentRadioSong, isRadioMode, hasPrev, upNext,
    curatorActive, isHostDropPlaying, setRadioLikedIds, curatorRecordLike,
    initRadio, startRadio, resumeRadio, nextRadioSong, prevRadioSong, jumpToSong,
  } = useRadio();
  const { user } = useAuth();
  const { isFaved, toggle: toggleFav, trackFavs } = useFavorites(user?.email);

  useEffect(() => {
    const ids = trackFavs.map((f) => f.track_id).filter(Boolean);
    setRadioLikedIds(ids);
  }, [trackFavs, setRadioLikedIds]);

  const isPlus =
    user?.role === "admin" || user?.isPlus === true || user?.tier === "plus" ||
    user?.tier === "premium" || user?.isPremium === true || user?.role === "premium";

  useEffect(() => {
    if (tracksLoaded) initRadio();
  }, [tracksLoaded, initRadio]);

  const isCurrentlyPlayingRadio = sourceType === "radio" && currentTrack?.id === currentRadioSong?.id;
  const radioIsPaused = currentRadioSong && sourceType !== "radio" && !!currentTrack;
  const playingThisRadioSong = isCurrentlyPlayingRadio && isPlaying;

  const handlePlay = () => isCurrentlyPlayingRadio ? togglePlay() : startRadio();
  const handleResume = () => resumeRadio();
  const handleNext = () => nextRadioSong();
  const handlePrev = () => prevRadioSong();
  const handleJump = (song) => jumpToSong(song);

  const handleLike = async () => {
    if (!user) { setLoginModal(true); return; }
    if (!currentRadioSong) return;
    const wasLiked = isFaved("track", currentRadioSong.id);
    await toggleFav("track", currentRadioSong.id, {
      title: currentRadioSong.title,
      artist: currentRadioSong.artist_display || "Upper Vibe Media",
      cover_url: currentRadioSong.cover_url || "",
    });
    curatorRecordLike(currentRadioSong.id, !wasLiked);
  };

  const handleDownload = () => {
    if (!user) { setLoginModal(true); return; }
    if (!isPlus) { setPremiumModal(true); return; }
    if (currentRadioSong?.audio_url) window.open(currentRadioSong.audio_url, "_blank");
  };

  if (!tracksLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="w-6 h-6 border-2 border-cyan-400/20 border-t-cyan-400 rounded-full animate-spin" />
          <p className="text-[10px] tracking-[0.25em] uppercase text-white/20">Loading frequency...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ WebkitOverflowScrolling: "touch" }}>

      {/* ── Fixed ambient background ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{ opacity: playingThisRadioSong ? 0.06 : 0.03 }}
          transition={{ duration: 2, ease: "easeInOut" }}
          className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full blur-[180px]"
          style={{ background: "#00C9E0" }}
        />
        {playingThisRadioSong && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.025 }}
            transition={{ duration: 2 }}
            className="absolute bottom-1/3 right-1/4 w-[300px] h-[300px] rounded-full blur-[120px]"
            style={{ background: "#9B7EFF" }}
          />
        )}
      </div>

      <div
        className="max-w-5xl mx-auto px-5 relative z-10"
        style={{
          paddingTop: "max(5rem, calc(3.5rem + env(safe-area-inset-top, 0px)))",
          paddingBottom: "calc(9rem + env(safe-area-inset-bottom, 16px))",
        }}
      >

        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="text-center mb-5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-sm mb-3"
            style={{ background: "rgba(0,200,220,0.06)", border: "1px solid rgba(0,200,220,0.16)" }}>
            {/* Live dot */}
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ background: playingThisRadioSong ? "#ef4444" : "#00C9E0",
                animation: playingThisRadioSong ? "pulse 1.5s infinite" : "none" }} />
            <RadioIcon className="w-3 h-3" style={{ color: "#00C9E0" }} />
            <span className="text-[9px] font-black tracking-[0.4em] uppercase" style={{ color: "#00C9E0" }}>
              {playingThisRadioSong ? "Live Now" : "Live Radio"}
            </span>
          </div>
          <h1 className="font-heading font-black text-white mb-1.5" style={{ fontSize: "clamp(1.6rem,5vw,2.6rem)" }}>
            Upper Vibe Radio
          </h1>
          {curatorActive ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full"
              style={{ background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.2)" }}>
              <Sparkles className="w-3 h-3" style={{ color: "#A855F7" }} />
              <span className="text-[10px] font-black tracking-[0.2em] uppercase" style={{ color: "#A855F7" }}>
                Tuned to You
              </span>
            </div>
          ) : (
            <p className="text-white/30 text-xs">432 Hz high-vibe music, nonstop</p>
          )}
        </motion.div>

        {/* ── Visualizer ── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.12, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative mx-auto mb-5 rounded-3xl overflow-hidden"
          style={{
            maxWidth: 440,
            background: "rgba(0,0,0,0.4)",
            border: `1px solid ${playingThisRadioSong ? "rgba(0,200,220,0.18)" : "rgba(0,200,220,0.08)"}`,
            transition: "border-color 1s ease",
          }}>
          <RadioVisualizer isPlaying={playingThisRadioSong} />
          <div className="pointer-events-none absolute inset-0"
            style={{ background: "radial-gradient(ellipse at center, transparent 40%, rgba(4,4,14,0.65) 100%)" }} />
        </motion.div>

        {/* ── No songs state ── */}
        {!currentRadioSong ? (
          <div className="text-center py-16">
            <Music4 className="w-12 h-12 text-white/10 mx-auto mb-4" />
            <p className="text-white/30 text-sm">No songs available for radio yet.</p>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-5 items-start justify-center">

            {/* ── Main Player Card ── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.5 }}
              className="w-full lg:w-[360px] flex-shrink-0">
              <div className="rounded-3xl p-6"
                style={{
                  background: "rgba(255,255,255,0.028)",
                  border: `1px solid ${playingThisRadioSong ? "rgba(0,200,220,0.15)" : "rgba(255,255,255,0.07)"}`,
                  transition: "border-color 1s ease",
                }}>

                {/* Cover art */}
                <div className="flex justify-center mb-5">
                  {isHostDropPlaying ? (
                    <div className="w-36 h-36 rounded-2xl flex flex-col items-center justify-center gap-3"
                      style={{ background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.25)" }}>
                      <Mic2 className="w-10 h-10" style={{ color: "#A855F7" }} />
                      <div className="flex gap-1 items-end">
                        {[1,2,3,4].map((i) => (
                          <motion.div key={i}
                            animate={{ height: [`${8 + i * 3}px`, `${14 + i * 4}px`, `${8 + i * 3}px`] }}
                            transition={{ duration: 0.6 + i * 0.1, repeat: Infinity, ease: "easeInOut", delay: i * 0.1 }}
                            className="w-1 rounded-full" style={{ background: "#A855F7" }} />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="relative w-36 h-36">
                      {currentRadioSong.cover_url ? (
                        <img src={currentRadioSong.cover_url} alt={currentRadioSong.title}
                          className="w-full h-full rounded-2xl object-cover"
                          style={{ boxShadow: playingThisRadioSong
                            ? "0 8px 48px rgba(0,200,220,0.25), 0 4px 20px rgba(0,0,0,0.5)"
                            : "0 8px 32px rgba(0,0,0,0.5)"
                          }} />
                      ) : (
                        <div className="w-full h-full rounded-2xl flex items-center justify-center"
                          style={{ background: "rgba(0,200,220,0.08)", border: "1px solid rgba(0,200,220,0.15)" }}>
                          <Music4 className="w-12 h-12 text-cyan-400/20" />
                        </div>
                      )}
                      {playingThisRadioSong && (
                        <div className="absolute -bottom-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center"
                          style={{ background: "linear-gradient(135deg,#00A8C0,#00D4EE)" }}>
                          <Waves className="w-3.5 h-3.5 text-black animate-pulse" />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Track info */}
                <div className="text-center mb-5 px-2">
                  {isHostDropPlaying ? (
                    <>
                      <h2 className="font-heading font-black text-base mb-1 leading-snug" style={{ color: "#A855F7" }}>
                        Upper Vibe Radio Host
                      </h2>
                      <p className="text-white/40 text-sm mb-3">Upper Vibe Media</p>
                      <span className="inline-flex items-center gap-1 text-[9px] font-black px-2.5 py-1 rounded-full"
                        style={{ background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.25)", color: "#A855F7" }}>
                        <Mic2 className="w-2.5 h-2.5" /> Radio Check-In
                      </span>
                    </>
                  ) : (
                    <>
                      <h2 className="font-heading font-black text-white mb-1 leading-snug"
                        style={{ fontSize: "clamp(1rem, 4vw, 1.2rem)", wordBreak: "break-word" }}>
                        {currentRadioSong.title}
                      </h2>
                      <p className="text-white/40 text-sm mb-3 truncate max-w-[260px] mx-auto">
                        {currentRadioSong.artist_display || "Upper Vibe Media"}
                      </p>
                      <span className="inline-flex items-center gap-1 text-[9px] font-black px-2.5 py-1 rounded-full"
                        style={{ background: "rgba(0,200,220,0.1)", border: "1px solid rgba(0,200,220,0.2)", color: "#00C9E0" }}>
                        <Waves className="w-2.5 h-2.5" /> 432 Hz
                      </span>
                    </>
                  )}
                </div>

                {/* Paused banner */}
                <AnimatePresence>
                  {radioIsPaused && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                      className="mb-4 px-4 py-2.5 rounded-xl text-xs text-white/45 flex items-center justify-center gap-2"
                      style={{ background: "rgba(0,200,220,0.05)", border: "1px solid rgba(0,200,220,0.1)" }}>
                      <RadioIcon className="w-3 h-3 text-cyan-400/40" />
                      Radio paused — playing another song
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Playback controls */}
                <div className="flex items-center justify-center gap-5 mb-6">
                  <button onClick={handlePrev} disabled={!hasPrev}
                    className="w-11 h-11 rounded-full flex items-center justify-center transition-all active:scale-90 disabled:opacity-30"
                    style={{ border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)" }}>
                    <SkipBack className="w-4 h-4 text-white/60" />
                  </button>

                  {radioIsPaused ? (
                    <button onClick={handleResume}
                      className="px-6 h-14 rounded-full flex items-center gap-2 font-black text-xs tracking-wider transition-all hover:brightness-110 active:scale-95"
                      style={{ background: "linear-gradient(135deg,#00A8C0,#00D4EE)", color: "#000", boxShadow: "0 0 28px rgba(0,200,220,0.25)" }}>
                      <RadioIcon className="w-3.5 h-3.5" />
                      Resume Radio
                    </button>
                  ) : (
                    <motion.button
                      onClick={handlePlay}
                      whileTap={{ scale: 0.92 }}
                      className="w-16 h-16 rounded-full flex items-center justify-center transition-all hover:brightness-115"
                      style={{
                        background: "linear-gradient(135deg,#00A8C0,#00D4EE)",
                        boxShadow: playingThisRadioSong
                          ? "0 0 36px rgba(0,200,220,0.4), 0 0 80px rgba(0,200,220,0.15)"
                          : "0 0 20px rgba(0,200,220,0.2)",
                        transition: "box-shadow 0.8s ease",
                      }}>
                      {playingThisRadioSong
                        ? <Pause className="w-7 h-7 text-black fill-current" />
                        : <Play className="w-7 h-7 text-black fill-current ml-0.5" />}
                    </motion.button>
                  )}

                  <button onClick={handleNext}
                    className="w-11 h-11 rounded-full flex items-center justify-center transition-all active:scale-90"
                    style={{ border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)" }}>
                    <SkipForward className="w-4 h-4 text-white/60" />
                  </button>
                </div>

                {/* Like + Download + Share */}
                <div className="flex items-center justify-center gap-3 flex-wrap">
                  <motion.button
                    onClick={handleLike}
                    whileTap={{ scale: 0.88 }}
                    className="w-11 h-11 rounded-full flex items-center justify-center transition-all"
                    style={{
                      background: currentRadioSong && isFaved("track", currentRadioSong.id)
                        ? "rgba(236,72,153,0.18)" : "rgba(255,255,255,0.05)",
                      border: currentRadioSong && isFaved("track", currentRadioSong.id)
                        ? "1px solid rgba(236,72,153,0.4)" : "1px solid rgba(255,255,255,0.1)",
                    }}>
                    <Heart className="w-4 h-4 transition-colors"
                      style={{
                        color: currentRadioSong && isFaved("track", currentRadioSong.id) ? "#EC4899" : "rgba(255,255,255,0.35)",
                        fill: currentRadioSong && isFaved("track", currentRadioSong.id) ? "#EC4899" : "none",
                      }} />
                  </motion.button>

                  <button onClick={handleDownload}
                    className="inline-flex items-center gap-2 px-5 h-11 rounded-full text-xs font-black tracking-wider transition-all hover:brightness-115 active:scale-95"
                    style={{ background: "rgba(212,168,67,0.08)", border: "1px solid rgba(212,168,67,0.2)", color: "#C89432" }}>
                    <Download className="w-3.5 h-3.5" />
                    Download Song
                    {!isPlus && <Crown className="w-3 h-3 text-yellow-400/60" />}
                  </button>

                  <ShareVibeButton
                    type={isHostDropPlaying ? "radio" : "song"}
                    track={currentRadioSong}
                  />
                </div>
              </div>
            </motion.div>

            {/* ── Up Next Panel ── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18, duration: 0.5 }}
              className="w-full lg:flex-1">
              <UpNextPanel upNext={upNext} onJump={handleJump} />
            </motion.div>
          </div>
        )}

        <p className="text-center text-[10px] text-white/15 tracking-wide mt-8">
          Free to stream · Premium members unlock downloads
        </p>
      </div>

      <PremiumDownloadModal open={premiumModal} onClose={() => setPremiumModal(false)} />
      <FavLoginModal open={loginModal} onClose={() => setLoginModal(false)} />
    </div>
  );
}