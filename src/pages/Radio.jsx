import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Play, Pause, SkipForward, SkipBack, Radio as RadioIcon, Waves, Download, Music4, Crown } from "lucide-react";
import { usePlayer } from "../context/PlayerContext";
import { useRadio } from "../context/RadioContext";
import { useAuth } from "@/lib/AuthContext";
import PremiumDownloadModal from "../components/shared/PremiumDownloadModal";
import FavLoginModal from "../components/shared/FavLoginModal";

export default function RadioPage() {
  const [premiumModal, setPremiumModal] = useState(false);
  const [loginModal, setLoginModal] = useState(false);

  const { playTrack, currentTrack, isPlaying, togglePlay, sourceType } = usePlayer();
  const {
    tracksLoaded,
    currentRadioSong,
    isRadioMode,
    hasPrev,
    initRadio,
    startRadio,
    resumeRadio,
    nextRadioSong,
    prevRadioSong,
    pauseRadioMode,
  } = useRadio();
  const { user } = useAuth();

  const isPlus = user?.role === "admin" || user?.isPlus === true || user?.tier === "plus" || user?.tier === "premium" || user?.isPremium === true || user?.role === "premium";

  // When the page loads, ensure a song is pre-selected (no autoplay)
  useEffect(() => {
    if (tracksLoaded) {
      initRadio();
    }
  }, [tracksLoaded, initRadio]);

  // If user played a non-radio song, radio mode is paused
  const radioIsPaused = currentRadioSong && !isRadioMode && sourceType !== "radio";
  const radioIsActive = isRadioMode && sourceType === "radio";
  const isCurrentlyPlayingRadio = radioIsActive && currentTrack?.id === currentRadioSong?.id;

  const handlePlay = () => {
    if (radioIsActive && isCurrentlyPlayingRadio) {
      togglePlay();
    } else {
      startRadio((song) => playTrack(song, "radio"));
    }
  };

  const handleResume = () => {
    resumeRadio((song) => playTrack(song, "radio"));
  };

  const handleNext = () => {
    nextRadioSong((song) => {
      playTrack(song, "radio");
    });
  };

  const handlePrev = () => {
    prevRadioSong((song) => {
      playTrack(song, "radio");
    });
  };

  const handleDownload = () => {
    if (!user) { setLoginModal(true); return; }
    if (!isPlus) { setPremiumModal(true); return; }
    const track = currentRadioSong;
    if (track?.audio_url) window.open(track.audio_url, "_blank");
  };

  const displayTrack = currentRadioSong;
  const playingThisRadioSong = isCurrentlyPlayingRadio && isPlaying;

  if (!tracksLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-6 h-6 border-2 border-cyan-400/20 border-t-cyan-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32 lg:pb-8">
      {/* Background ambience */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full blur-[180px] opacity-[0.04]"
          style={{ background: "#00C9E0" }} />
      </div>

      <div className="max-w-2xl mx-auto px-6 pt-20 lg:pt-14 relative z-10">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
          className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full mb-6"
            style={{ background: "rgba(0,200,220,0.06)", border: "1px solid rgba(0,200,220,0.16)" }}>
            <RadioIcon className="w-3 h-3" style={{ color: "#00C9E0" }} />
            <span className="text-[9px] font-black tracking-[0.4em] uppercase" style={{ color: "#00C9E0" }}>
              Live Radio
            </span>
          </div>
          <h1 className="font-heading font-black text-white mb-3" style={{ fontSize: "clamp(2rem,5vw,3rem)" }}>
            Upper Vibe Radio
          </h1>
          <p className="text-white/40 text-sm">Shuffle through all 432 Hz Upper Vibe Media songs</p>
        </motion.div>

        {!displayTrack ? (
          <div className="text-center py-20">
            <Music4 className="w-12 h-12 text-white/10 mx-auto mb-4" />
            <p className="text-white/30 text-sm">No songs available for radio yet.</p>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.6 }}>

            {/* Current song card */}
            <div className="rounded-3xl p-8 mb-8 text-center"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>

              {/* Cover */}
              <div className="relative w-48 h-48 mx-auto mb-6">
                {displayTrack.cover_url ? (
                  <img src={displayTrack.cover_url} alt={displayTrack.title}
                    className="w-full h-full rounded-2xl object-cover"
                    style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.5)" }} />
                ) : (
                  <div className="w-full h-full rounded-2xl flex items-center justify-center"
                    style={{ background: "rgba(0,200,220,0.08)", border: "1px solid rgba(0,200,220,0.15)" }}>
                    <Music4 className="w-16 h-16 text-cyan-400/20" />
                  </div>
                )}
                {playingThisRadioSong && (
                  <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg,#00A8C0,#00D4EE)" }}>
                    <Waves className="w-4 h-4 text-black animate-pulse" />
                  </div>
                )}
              </div>

              {/* Track info */}
              <h2 className="font-heading font-black text-white text-xl mb-1 truncate px-4">{displayTrack.title}</h2>
              <p className="text-white/40 text-sm mb-2">{displayTrack.artist_display || "Upper Vibe Media"}</p>
              <span className="inline-flex items-center gap-1 text-[9px] font-black px-2.5 py-1 rounded-full mb-6"
                style={{ background: "rgba(0,200,220,0.1)", border: "1px solid rgba(0,200,220,0.2)", color: "#00C9E0" }}>
                <Waves className="w-2.5 h-2.5" /> 432 Hz
              </span>

              {/* Paused radio banner */}
              {radioIsPaused && (
                <div className="mb-5 px-4 py-3 rounded-2xl text-sm text-white/50 flex items-center justify-center gap-2"
                  style={{ background: "rgba(0,200,220,0.05)", border: "1px solid rgba(0,200,220,0.12)" }}>
                  <RadioIcon className="w-3.5 h-3.5 text-cyan-400/50" />
                  Radio paused — playing another song
                </div>
              )}

              {/* Controls */}
              <div className="flex items-center justify-center gap-5 mb-6">
                <button
                  onClick={handlePrev}
                  disabled={!hasPrev}
                  className="w-11 h-11 rounded-full flex items-center justify-center transition-all hover:bg-white/8 disabled:opacity-30"
                  style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
                  <SkipBack className="w-5 h-5 text-white/60" />
                </button>

                {/* Main button: Resume Radio if paused, else Play/Pause */}
                {radioIsPaused ? (
                  <button
                    onClick={handleResume}
                    className="px-6 h-14 rounded-full flex items-center gap-2 font-black text-sm tracking-wider transition-all hover:brightness-110 hover:scale-105 active:scale-95"
                    style={{ background: "linear-gradient(135deg,#00A8C0,#00D4EE)", color: "#000", boxShadow: "0 0 24px rgba(0,200,220,0.2)" }}>
                    <RadioIcon className="w-4 h-4" />
                    Resume Radio
                  </button>
                ) : (
                  <button
                    onClick={handlePlay}
                    className="w-16 h-16 rounded-full flex items-center justify-center transition-all hover:brightness-110 hover:scale-105 active:scale-95"
                    style={{ background: "linear-gradient(135deg,#00A8C0,#00D4EE)", boxShadow: "0 0 24px rgba(0,200,220,0.2)" }}>
                    {playingThisRadioSong ? (
                      <Pause className="w-7 h-7 text-black fill-current" />
                    ) : (
                      <Play className="w-7 h-7 text-black fill-current ml-0.5" />
                    )}
                  </button>
                )}

                <button
                  onClick={handleNext}
                  className="w-11 h-11 rounded-full flex items-center justify-center transition-all hover:bg-white/8"
                  style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
                  <SkipForward className="w-5 h-5 text-white/60" />
                </button>
              </div>

              {/* Download button */}
              <button
                onClick={handleDownload}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black tracking-wider transition-all hover:brightness-110"
                style={{ background: "rgba(212,168,67,0.08)", border: "1px solid rgba(212,168,67,0.2)", color: "#C89432" }}>
                <Download className="w-3.5 h-3.5" />
                Download Song
                {!isPlus && <Crown className="w-3 h-3 text-yellow-400/60" />}
              </button>
            </div>

            <p className="text-center text-[11px] text-white/20 tracking-wide mb-2">
              Free to stream. Premium members unlock downloads.
            </p>
          </motion.div>
        )}
      </div>

      <PremiumDownloadModal open={premiumModal} onClose={() => setPremiumModal(false)} />
      <FavLoginModal open={loginModal} onClose={() => setLoginModal(false)} />
    </div>
  );
}