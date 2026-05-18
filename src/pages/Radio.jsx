import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, SkipForward, SkipBack, Radio as RadioIcon, Waves, Download, Music4, Crown } from "lucide-react";
import { usePlayer } from "../context/PlayerContext";
import { useRadio } from "../context/RadioContext";
import { useAuth } from "@/lib/AuthContext";
import PremiumDownloadModal from "../components/shared/PremiumDownloadModal";
import FavLoginModal from "../components/shared/FavLoginModal";
import UpNextPanel from "../components/radio/UpNextPanel";
import AudioVisualizer from "../components/radio/AudioVisualizer";

function toEmbedUrl(url) {
  if (!url || typeof url !== "string") return null;
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}

export default function RadioPage() {
  const [premiumModal, setPremiumModal] = useState(false);
  const [loginModal, setLoginModal] = useState(false);

  const { playTrack, currentTrack, isPlaying, togglePlay, sourceType, audioRef } = usePlayer();
  const {
    tracksLoaded,
    currentRadioSong,
    hasPrev,
    upNext,
    initRadio,
    startRadio,
    resumeRadio,
    nextRadioSong,
    prevRadioSong,
    jumpToSong,
  } = useRadio();
  const { user } = useAuth();

  const isPlus =
    user?.role === "admin" || user?.isPlus === true || user?.tier === "plus" ||
    user?.tier === "premium" || user?.isPremium === true || user?.role === "premium";

  useEffect(() => {
    if (tracksLoaded) initRadio();
  }, [tracksLoaded, initRadio]);

  // Radio is active when the player sourceType is "radio"
  const isRadioActive = sourceType === "radio";
  // Currently showing the radio song in the player
  const isCurrentlyPlayingRadio = isRadioActive && currentTrack?.id === currentRadioSong?.id;
  const playingThisRadioSong = isCurrentlyPlayingRadio && isPlaying;
  // Radio song exists but user navigated to another song
  const radioIsPaused = currentRadioSong && !isRadioActive && currentTrack !== null;

  const handlePlay = () => {
    if (isCurrentlyPlayingRadio) {
      togglePlay();
    } else {
      startRadio((song) => playTrack(song, "radio"));
    }
  };

  const handleResume = () => resumeRadio((song) => playTrack(song, "radio"));
  const handleNext = () => nextRadioSong((song) => playTrack(song, "radio"));
  const handlePrev = () => prevRadioSong((song) => playTrack(song, "radio"));
  const handleJump = (song) => jumpToSong(song, (s) => playTrack(s, "radio"));

  const handleDownload = () => {
    if (!user) { setLoginModal(true); return; }
    if (!isPlus) { setPremiumModal(true); return; }
    if (currentRadioSong?.audio_url) window.open(currentRadioSong.audio_url, "_blank");
  };

  const customVizUrl = currentRadioSong?.visualizerUrl || null;
  const embedUrl = customVizUrl ? toEmbedUrl(customVizUrl) : null;
  const showCustomViz = !!embedUrl;

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
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full blur-[200px] opacity-[0.035]"
          style={{ background: "radial-gradient(circle,#00D4EE 0%,#7B2FFF 60%,transparent 100%)" }} />
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-14 lg:pt-10 relative z-10">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full mb-4"
            style={{ background: "rgba(0,200,220,0.06)", border: "1px solid rgba(0,200,220,0.16)" }}>
            <RadioIcon className="w-3 h-3" style={{ color: "#00C9E0" }} />
            <span className="text-[9px] font-black tracking-[0.4em] uppercase" style={{ color: "#00C9E0" }}>
              Live Radio
            </span>
          </div>
          <h1 className="font-heading font-black text-white mb-2" style={{ fontSize: "clamp(1.6rem,4vw,2.6rem)" }}>
            Upper Vibe Radio
          </h1>
          <p className="text-white/35 text-sm">Shuffle through all 432 Hz Upper Vibe Media songs</p>
        </motion.div>

        {!currentRadioSong ? (
          <div className="text-center py-20">
            <Music4 className="w-12 h-12 text-white/10 mx-auto mb-4" />
            <p className="text-white/30 text-sm">No songs available for radio yet.</p>
          </div>
        ) : (
          <>
            {/* Visualizer Stage */}
            <motion.div
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05, duration: 0.5 }}
              className="relative w-full rounded-3xl overflow-hidden mb-6"
              style={{
                height: "clamp(200px, 36vw, 340px)",
                background: "rgba(4,4,18,0.95)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}>

              <AnimatePresence mode="wait">
                {showCustomViz ? (
                  <motion.div key="custom-viz"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    transition={{ duration: 0.6 }} className="absolute inset-0">
                    <iframe
                      src={`${embedUrl}?autoplay=${playingThisRadioSong ? 1 : 0}&rel=0&controls=0&modestbranding=1`}
                      title="Visualizer" frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen className="w-full h-full" />
                  </motion.div>
                ) : (
                  <motion.div key={`canvas-viz-${currentRadioSong.id}`}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    transition={{ duration: 0.6 }} className="absolute inset-0">

                    {currentRadioSong.cover_url && (
                      <div className="absolute inset-0" style={{
                        backgroundImage: `url(${currentRadioSong.cover_url})`,
                        backgroundSize: "cover", backgroundPosition: "center",
                        filter: "blur(60px) brightness(0.15) saturate(1.5)", transform: "scale(1.1)",
                      }} />
                    )}

                    <div className="absolute inset-0">
                      <AudioVisualizer audioRef={audioRef} isPlaying={playingThisRadioSong} />
                    </div>

                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="relative">
                        {currentRadioSong.cover_url ? (
                          <motion.img
                            key={currentRadioSong.id}
                            src={currentRadioSong.cover_url}
                            alt={currentRadioSong.title}
                            initial={{ opacity: 0, scale: 0.85 }}
                            animate={{ opacity: 1, scale: playingThisRadioSong ? [1, 1.025, 1] : 1 }}
                            transition={playingThisRadioSong
                              ? { scale: { duration: 2.5, repeat: Infinity, ease: "easeInOut" }, opacity: { duration: 0.4 } }
                              : { opacity: { duration: 0.4 } }}
                            className="rounded-2xl object-cover"
                            style={{
                              width: "clamp(80px,14vw,130px)", height: "clamp(80px,14vw,130px)",
                              boxShadow: "0 0 50px rgba(0,212,238,0.25), 0 0 100px rgba(123,47,255,0.1)",
                            }} />
                        ) : (
                          <div className="rounded-2xl flex items-center justify-center"
                            style={{ width: "clamp(80px,14vw,130px)", height: "clamp(80px,14vw,130px)", background: "rgba(0,200,220,0.08)", border: "1px solid rgba(0,200,220,0.2)" }}>
                            <Music4 className="text-cyan-400/25" style={{ width: "40%", height: "40%" }} />
                          </div>
                        )}
                        {playingThisRadioSong && (
                          <motion.div
                            animate={{ scale: [1, 1.4, 1], opacity: [0.7, 1, 0.7] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                            className="absolute -bottom-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center"
                            style={{ background: "linear-gradient(135deg,#00A8C0,#00D4EE)" }}>
                            <Waves className="w-2.5 h-2.5 text-black" />
                          </motion.div>
                        )}
                      </div>
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 p-4"
                      style={{ background: "linear-gradient(0deg,rgba(4,4,18,0.9) 0%,transparent 100%)" }}>
                      <div className="flex items-end justify-between">
                        <div className="min-w-0">
                          <p className="font-heading font-black text-white text-sm truncate" style={{ maxWidth: "60vw" }}>
                            {currentRadioSong.title}
                          </p>
                          <p className="text-xs text-white/40 truncate">{currentRadioSong.artist_display || "Upper Vibe Media"}</p>
                        </div>
                        <span className="flex-shrink-0 flex items-center gap-1 text-[8px] font-black px-2 py-1 rounded-full ml-3"
                          style={{ background: "rgba(0,200,220,0.1)", border: "1px solid rgba(0,200,220,0.2)", color: "#00C9E0" }}>
                          <Waves className="w-2 h-2" /> 432 Hz
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Controls + Up Next */}
            <div className="flex flex-col lg:flex-row gap-5 items-start">

              <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.4 }}
                className="w-full lg:w-[320px] flex-shrink-0 rounded-3xl p-6"
                style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>

                {radioIsPaused && (
                  <div className="mb-4 px-4 py-2.5 rounded-xl text-xs text-white/45 flex items-center justify-center gap-2"
                    style={{ background: "rgba(0,200,220,0.05)", border: "1px solid rgba(0,200,220,0.1)" }}>
                    <RadioIcon className="w-3 h-3 text-cyan-400/40" />
                    Radio paused — playing another song
                  </div>
                )}

                <div className="flex items-center justify-center gap-4 mb-5">
                  <button onClick={handlePrev} disabled={!hasPrev}
                    className="w-11 h-11 rounded-full flex items-center justify-center transition-all hover:bg-white/8 disabled:opacity-25"
                    style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
                    <SkipBack className="w-5 h-5 text-white/60" />
                  </button>

                  {radioIsPaused ? (
                    <button onClick={handleResume}
                      className="px-6 h-12 rounded-full flex items-center gap-2 font-black text-xs tracking-wider transition-all hover:brightness-110 hover:scale-105 active:scale-95"
                      style={{ background: "linear-gradient(135deg,#00A8C0,#00D4EE)", color: "#000", boxShadow: "0 0 24px rgba(0,200,220,0.25)" }}>
                      <RadioIcon className="w-3.5 h-3.5" />
                      Resume Radio
                    </button>
                  ) : (
                    <button onClick={handlePlay}
                      className="w-14 h-14 rounded-full flex items-center justify-center transition-all hover:brightness-110 hover:scale-105 active:scale-95"
                      style={{ background: "linear-gradient(135deg,#00A8C0,#00D4EE)", boxShadow: "0 0 28px rgba(0,200,220,0.3)" }}>
                      {playingThisRadioSong
                        ? <Pause className="w-6 h-6 text-black fill-current" />
                        : <Play className="w-6 h-6 text-black fill-current ml-0.5" />}
                    </button>
                  )}

                  <button onClick={handleNext}
                    className="w-11 h-11 rounded-full flex items-center justify-center transition-all hover:bg-white/8"
                    style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
                    <SkipForward className="w-5 h-5 text-white/60" />
                  </button>
                </div>

                <div className="flex justify-center">
                  <button onClick={handleDownload}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black tracking-wider transition-all hover:brightness-110"
                    style={{ background: "rgba(212,168,67,0.08)", border: "1px solid rgba(212,168,67,0.2)", color: "#C89432" }}>
                    <Download className="w-3.5 h-3.5" />
                    Download Song
                    {!isPlus && <Crown className="w-3 h-3 text-yellow-400/60" />}
                  </button>
                </div>

                <p className="text-center text-[10px] text-white/15 mt-4">
                  Free to stream · Plus unlocks downloads
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22, duration: 0.4 }}
                className="w-full lg:flex-1">
                <UpNextPanel upNext={upNext} onJump={handleJump} />
              </motion.div>

            </div>
          </>
        )}
      </div>

      <PremiumDownloadModal open={premiumModal} onClose={() => setPremiumModal(false)} />
      <FavLoginModal open={loginModal} onClose={() => setLoginModal(false)} />
    </div>
  );
}