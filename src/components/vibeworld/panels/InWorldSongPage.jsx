/**
 * InWorldSongPage — in-world song detail popup for Vibe World.
 * Stays inside the world experience — does not navigate away.
 * All users can click Download; non-Plus sees upgrade options inline.
 */
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Play, Pause, Download, ExternalLink, Lock, Crown, Waves, Heart, ArrowLeft, DollarSign } from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";
import { useAuth } from "@/lib/AuthContext";
import SaveHeartButton from "@/components/shared/SaveHeartButton";

function UpgradeView({ track, onBack, onClose, isMobile }) {
  const [donateAmount, setDonateAmount] = useState(5);

  const handleUpgrade = (e) => {
    e.stopPropagation();
    window.open("/membership", "_blank");
  };

  const handleDonate = (e) => {
    e.stopPropagation();
    // Navigate to song page where donation/purchase is handled
    window.open(`/song/${track.id}?donate=1`, "_blank");
  };

  return (
    <motion.div
      key="upgrade-view"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col h-full"
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-4 pb-2 flex-shrink-0">
        <button
          onTouchStart={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onBack(); }}
          className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:bg-white/10"
          style={{ color: "rgba(255,255,255,0.5)", touchAction: "manipulation" }}
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <p className="font-heading font-black text-white/70 text-sm tracking-wide">Download Track</p>
      </div>

      {/* Track mini card */}
      <div className="mx-4 mb-3 flex items-center gap-3 rounded-xl p-3 flex-shrink-0"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
        {track.cover_url ? (
          <img src={track.cover_url} alt={track.title} className="w-11 h-11 rounded-lg object-cover flex-shrink-0" />
        ) : (
          <div className="w-11 h-11 rounded-lg flex-shrink-0 flex items-center justify-center"
            style={{ background: "rgba(0,180,212,0.15)" }}>
            <span className="text-2xl">🎵</span>
          </div>
        )}
        <div className="min-w-0">
          <p className="font-black text-white text-sm truncate leading-tight">{track.title}</p>
          <p className="text-[10px] truncate mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
            {track.artist_display || "Upper Vibe Media"}
          </p>
        </div>
      </div>

      {/* Options */}
      <div className="px-4 pb-5 flex flex-col gap-3 flex-shrink-0">
        {/* Plus membership */}
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(212,168,67,0.3)", background: "rgba(212,168,67,0.06)" }}>
          <div className="px-3 py-2.5 flex items-center gap-2 border-b border-yellow-500/10">
            <Crown className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#D4A843" }} />
            <p className="font-black text-sm tracking-wide" style={{ color: "#D4A843" }}>Upper Vibe Plus</p>
            <span className="ml-auto text-xs font-black" style={{ color: "rgba(212,168,67,0.6)" }}>$4.99/mo</span>
          </div>
          <div className="px-3 py-2">
            <p className="text-[10px] mb-2.5" style={{ color: "rgba(255,255,255,0.45)" }}>
              Unlimited downloads, exclusive 432 Hz remastered tracks, early access &amp; more.
            </p>
            <button
              onTouchStart={(e) => e.stopPropagation()}
              onClick={handleUpgrade}
              className="w-full py-2.5 rounded-lg font-black text-xs tracking-widest transition-all hover:brightness-110 active:scale-[0.97]"
              style={{
                background: "linear-gradient(135deg,#D4A843,#F0C040)",
                color: "#000",
                minHeight: "40px",
                touchAction: "manipulation",
              }}
            >
              Join Plus — $4.99/mo
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
          <span className="text-[9px] font-black tracking-widest" style={{ color: "rgba(255,255,255,0.25)" }}>OR</span>
          <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
        </div>

        {/* One-time donate / purchase */}
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(0,212,240,0.2)", background: "rgba(0,184,212,0.05)" }}>
          <div className="px-3 py-2.5 flex items-center gap-2 border-b border-cyan-500/10">
            <DollarSign className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#00D4F0" }} />
            <p className="font-black text-sm tracking-wide" style={{ color: "#00D4F0" }}>Support the Artist</p>
          </div>
          <div className="px-3 py-2">
            <p className="text-[10px] mb-2.5" style={{ color: "rgba(255,255,255,0.45)" }}>
              One-time donation to support this track and unlock the download.
            </p>
            <button
              onTouchStart={(e) => e.stopPropagation()}
              onClick={handleDonate}
              className="w-full py-2.5 rounded-lg font-black text-xs tracking-wide transition-all hover:brightness-110 active:scale-[0.97]"
              style={{
                background: "linear-gradient(135deg,rgba(0,184,212,0.3),rgba(0,229,255,0.2))",
                border: "1px solid rgba(0,212,240,0.3)",
                color: "#00E5FF",
                minHeight: "40px",
                touchAction: "manipulation",
              }}
            >
              Donate &amp; Download
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function InWorldSongPage({ track, onClose, isMobile, isDJPlaying }) {
  const { currentTrack, isPlaying, togglePlay, playTrack } = usePlayer() || {};
  const { user } = useAuth() || {};
  const [showUpgrade, setShowUpgrade] = useState(false);

  if (!track) return null;

  const isCurrent = currentTrack?.id === track.id;
  const isActive = isCurrent && isPlaying;
  const isPlus = user?.role === "admin" || user?.membership_tier === "premium" || user?.membership_tier === "vip";

  const handlePlay = () => {
    if (isCurrent) {
      togglePlay?.();
    } else {
      playTrack?.(track, "song");
    }
  };

  const handleDownloadClick = (e) => {
    e.stopPropagation();
    if (isPlus && track.audio_url) {
      // Real download for Plus users
      const a = document.createElement("a");
      a.href = track.audio_url;
      a.download = `${track.title}.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else if (isPlus) {
      window.open(`/song/${track.id}`, "_blank");
    } else {
      setShowUpgrade(true);
    }
  };

  return (
    <motion.div
      key="inworld-song-page"
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 20 }}
      transition={{ type: "spring", damping: 28, stiffness: 300 }}
      className="fixed inset-0 z-[90] flex items-center justify-center pointer-events-auto"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(12px)" }}
      onClick={onClose}
    >
      <div
        className="relative rounded-2xl overflow-hidden flex flex-col"
        style={{
          width: isMobile ? "min(calc(100vw - 24px), 360px)" : "340px",
          maxHeight: isMobile ? "calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 40px)" : "580px",
          background: "rgba(8,8,24,0.98)",
          border: "1px solid rgba(0,229,255,0.18)",
          boxShadow: "0 0 48px rgba(0,184,212,0.15), 0 8px 40px rgba(0,0,0,0.7)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onTouchStart={(e) => e.stopPropagation()}
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full flex items-center justify-center transition-all hover:bg-white/10 active:scale-90"
          style={{ color: "rgba(255,255,255,0.6)", touchAction: "manipulation", minWidth: 36, minHeight: 36, background: "rgba(0,0,0,0.4)" }}
        >
          <X className="w-4 h-4" />
        </button>

        <AnimatePresence mode="wait">
          {showUpgrade ? (
            <UpgradeView
              key="upgrade"
              track={track}
              onBack={() => setShowUpgrade(false)}
              onClose={onClose}
              isMobile={isMobile}
            />
          ) : (
            <motion.div
              key="song-detail"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col"
            >
              {/* Cover art — full square */}
              <div className="relative w-full flex-shrink-0" style={{ aspectRatio: "1/1" }}>
                {track.cover_url ? (
                  <img
                    src={track.cover_url}
                    alt={track.title}
                    className="w-full h-full object-cover block"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"
                    style={{ background: "rgba(0,100,150,0.2)" }}>
                    <span className="text-5xl">🎵</span>
                  </div>
                )}
                {/* Gradient overlay */}
                <div className="absolute inset-x-0 bottom-0 h-1/3"
                  style={{ background: "linear-gradient(to top, rgba(8,8,24,1) 0%, transparent 100%)" }} />
                {track.frequency_type === "432hz" && (
                  <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                    style={{ background: "rgba(0,160,220,0.3)", color: "#00E5FF", border: "1px solid rgba(0,160,220,0.4)" }}>
                    <Waves className="w-2.5 h-2.5" /> 432 Hz
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="px-4 pt-2 pb-1 flex-shrink-0">
                <p className="font-heading font-black text-white text-base leading-tight line-clamp-2">
                  {track.title}
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                  {track.artist_display || "Upper Vibe Media"}
                </p>
              </div>

              {/* Actions row */}
              <div className="px-4 pb-2 pt-1 flex items-center gap-2 flex-shrink-0">
                {/* Play */}
                <button
                  onTouchStart={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); handlePlay(); }}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-black text-sm flex-1 justify-center transition-all hover:brightness-110 active:scale-[0.97]"
                  style={{
                    background: "linear-gradient(135deg,#00B8D4,#00E5FF)",
                    color: "#000",
                    minHeight: "44px",
                    touchAction: "manipulation",
                  }}
                >
                  {isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                  {isActive ? "Pause" : "Play"}
                </button>

                {/* Favorite */}
                <div onClick={(e) => e.stopPropagation()} style={{ flexShrink: 0 }}>
                  <SaveHeartButton
                    item={track}
                    itemType="song"
                    meta={{ title: track.title, artist: track.artist_display, cover_url: track.cover_url }}
                    size="md"
                  />
                </div>

                {/* Full song page */}
                <a
                  href={`/song/${track.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onTouchStart={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                  className="w-11 h-11 rounded-xl flex items-center justify-center transition-all hover:bg-white/10 active:scale-90 flex-shrink-0"
                  style={{ border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)", touchAction: "manipulation", minWidth: 44, minHeight: 44 }}
                  title="Open full song page"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>

              {/* Download row — always shown, upgrade prompt for non-Plus */}
              <div className="px-4 pb-4 flex-shrink-0">
                <button
                  onTouchStart={(e) => e.stopPropagation()}
                  onClick={handleDownloadClick}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl font-black text-sm transition-all hover:brightness-110 active:scale-[0.97]"
                  style={{
                    background: isPlus
                      ? "linear-gradient(135deg,rgba(212,168,67,0.2),rgba(212,168,67,0.1))"
                      : "rgba(212,168,67,0.06)",
                    border: isPlus
                      ? "1px solid rgba(212,168,67,0.4)"
                      : "1px solid rgba(212,168,67,0.2)",
                    color: isPlus ? "#D4A843" : "rgba(212,168,67,0.6)",
                    minHeight: "44px",
                    touchAction: "manipulation",
                  }}
                >
                  {isPlus ? (
                    <>
                      <Download className="w-4 h-4" />
                      Download (Plus)
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span>Download</span>
                      <Crown className="w-3 h-3 ml-0.5" style={{ color: "#D4A843" }} />
                      <span className="text-[10px] font-normal opacity-60">— tap to unlock</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}