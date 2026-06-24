/**
 * InWorldSongPage — in-world song detail popup for Vibe World.
 * Stays inside the world experience — does not navigate away.
 * All users can click Download; non-Plus sees upgrade options inline.
 */
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Play, Pause, Download, Lock, Crown, Waves, ArrowLeft, DollarSign } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { usePlayer } from "@/context/PlayerContext";
import { useAuth } from "@/lib/AuthContext";
import SaveHeartButton from "@/components/shared/SaveHeartButton";
import SupportModal from "@/components/shared/SupportModal";

function UpgradeView({ track, onBack, onClose, isMobile, onNavigate, onOpenSupportModal }) {
  const [confirm, setConfirm] = useState(null); // null | "membership"

  const doNavigate = (path) => {
    try { sessionStorage.setItem("vibeworld_return_url", window.location.href); sessionStorage.setItem("vibeworld_return", "1"); } catch {}
    onClose();
    onNavigate(path);
  };

  const handleUpgrade = (e) => { e.stopPropagation(); setConfirm("membership"); };
  // Donate opens in-world modal — no navigation away
  const handleDonate = (e) => { e.stopPropagation(); onOpenSupportModal?.(); };

  if (confirm) {
    return (
      <div className="flex flex-col items-center justify-center p-6 h-full">
        <p className="font-heading font-black text-white text-base text-center mb-1">Leave Vibe City?</p>
        <p className="text-xs text-white/45 text-center mb-5 leading-relaxed">
          You'll be taken to the membership page.
        </p>
        <button
          onTouchStart={(e) => e.stopPropagation()}
          onClick={() => doNavigate("/membership")}
          className="w-full py-3 rounded-xl font-black text-sm mb-2 transition-all hover:brightness-110 active:scale-95"
          style={{ background: "linear-gradient(135deg,#D4A843,#F0C040)", color: "#000", touchAction: "manipulation" }}>
          Continue
        </button>
        <button
          onTouchStart={(e) => e.stopPropagation()}
          onClick={() => setConfirm(null)}
          className="w-full py-2.5 rounded-xl font-black text-sm transition-all active:scale-95"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)", touchAction: "manipulation" }}>
          Stay in Vibe City
        </button>
      </div>
    );
  }

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

export default function InWorldSongPage({ track, onClose, isMobile, isDJPlaying, sourceComponent = "unknown", tvMode = false }) {
  const { currentTrack, isPlaying, togglePlay, playTrack } = usePlayer() || {};
  const { user } = useAuth() || {};
  const navigate = useNavigate();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showDownloadConfirm, setShowDownloadConfirm] = useState(false);
  const [supportModalOpen, setSupportModalOpen] = useState(false);

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

  // Save the full current URL + world state so SongPage can navigate back exactly
  const saveReturnUrl = (src = "unknown") => {
    try {
      sessionStorage.setItem("vibeworld_return_url", window.location.href);
      sessionStorage.setItem("vibeworld_return", "1");
      sessionStorage.setItem("vibeworld_source", src);
      sessionStorage.setItem("vibeworld_open_panel", src);
    } catch {}
  };

  const handleDownloadClick = (e) => {
    e.stopPropagation();
    if (!isPlus) {
      setShowUpgrade(true);
      return;
    }
    // Show confirm before navigating away (prevents white screen in TV Mode)
    setShowDownloadConfirm(true);
  };

  const handleConfirmDownload = () => {
    saveReturnUrl(sourceComponent);
    onClose();
    navigate(`/song/${track.id}?downloadIntent=true`);
  };

  const handleOpenSongPage = (e) => {
    e.stopPropagation();
    saveReturnUrl(sourceComponent);
    onClose();
    navigate(`/song/${track.id}`);
  };

  // On mobile: bottom-sheet style, on desktop: centered modal
  const isLandscape = isMobile && typeof window !== "undefined" && window.innerWidth > window.innerHeight;

  return (
    <motion.div
      key="inworld-song-page"
      initial={{ opacity: 0, y: isMobile ? 40 : 0, scale: isMobile ? 1 : 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: isMobile ? 40 : 0, scale: isMobile ? 1 : 0.95 }}
      transition={{ type: "spring", damping: 28, stiffness: 300 }}
      className="fixed inset-0 z-[90] flex pointer-events-auto"
      style={{
        background: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(12px)",
        alignItems: isMobile ? "flex-end" : "center",
        justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        className="relative flex flex-col overflow-hidden"
        style={{
          // Mobile portrait: bottom sheet, limited height so cover + buttons visible
          // Mobile landscape: side-anchored compact card
          // Desktop: centered modal
          width: isMobile
            ? isLandscape ? "min(calc(100vw - 32px), 480px)" : "100%"
            : "340px",
          maxWidth: isMobile ? "100%" : "340px",
          maxHeight: isMobile
            ? isLandscape
              ? "min(calc(100dvh - 24px), 340px)"
              : "min(calc(100dvh - env(safe-area-inset-top,0px) - 16px), 520px)"
            : "580px",
          borderRadius: isMobile && !isLandscape ? "20px 20px 0 0" : "20px",
          background: "rgba(8,8,24,0.99)",
          border: "1px solid rgba(0,229,255,0.18)",
          boxShadow: "0 0 48px rgba(0,184,212,0.15), 0 8px 40px rgba(0,0,0,0.7)",
          paddingBottom: isMobile && !isLandscape ? "env(safe-area-inset-bottom, 0px)" : 0,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button — top right */}
        <button
          onTouchStart={(e) => e.stopPropagation()}
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full flex items-center justify-center transition-all hover:bg-white/10 active:scale-90"
          style={{ color: "rgba(255,255,255,0.6)", touchAction: "manipulation", minWidth: 36, minHeight: 36, background: "rgba(0,0,0,0.5)" }}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Download confirm overlay */}
        {showDownloadConfirm && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 rounded-[20px]"
            style={{ background: "rgba(8,8,24,0.97)", backdropFilter: "blur(8px)" }}>
            <p className="font-heading font-black text-white text-base text-center mb-1">Open Download Page?</p>
            <p className="text-xs text-white/45 text-center mb-5 leading-relaxed">
              This will leave Vibe City and open the song page.{tvMode ? " Your TV Mode session will pause." : ""}
            </p>
            <button
              onTouchStart={(e) => e.stopPropagation()}
              onClick={handleConfirmDownload}
              className="w-full py-3 rounded-xl font-black text-sm mb-2 transition-all hover:brightness-110 active:scale-95"
              style={{ background: "linear-gradient(135deg,#D4A843,#F0C040)", color: "#000", touchAction: "manipulation" }}>
              Yes, Open Download Page
            </button>
            <button
              onTouchStart={(e) => e.stopPropagation()}
              onClick={() => setShowDownloadConfirm(false)}
              className="w-full py-2.5 rounded-xl font-black text-sm transition-all active:scale-95"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)", touchAction: "manipulation" }}>
              Stay in Vibe City
            </button>
          </div>
        )}

        <AnimatePresence mode="wait">
          {showUpgrade ? (
            <UpgradeView
              key="upgrade"
              track={track}
              onBack={() => setShowUpgrade(false)}
              onClose={onClose}
              isMobile={isMobile}
              onNavigate={navigate}
              onOpenSupportModal={() => setSupportModalOpen(true)}
            />
          ) : (
            <motion.div
              key="song-detail"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex overflow-hidden"
              style={{ flexDirection: isLandscape ? "row" : "column" }}
            >
              {/* Cover art */}
              <div
                className="relative flex-shrink-0"
                style={isLandscape
                  ? { width: "140px", minHeight: "100%", aspectRatio: "unset" }
                  : { width: "100%", aspectRatio: "1/1", maxHeight: isMobile ? "180px" : "unset" }
                }
              >
                {track.cover_url ? (
                  <img
                    src={track.cover_url}
                    alt={track.title}
                    className="w-full h-full object-cover block"
                    style={{ height: isLandscape ? "100%" : undefined }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"
                    style={{ background: "rgba(0,100,150,0.2)", minHeight: isLandscape ? "100%" : "120px" }}>
                    <span className="text-5xl">🎵</span>
                  </div>
                )}
                {/* Gradient overlay */}
                {!isLandscape && (
                  <div className="absolute inset-x-0 bottom-0 h-1/3"
                    style={{ background: "linear-gradient(to top, rgba(8,8,24,1) 0%, transparent 100%)" }} />
                )}
                {track.frequency_type === "432hz" && (
                  <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                    style={{ background: "rgba(0,160,220,0.3)", color: "#00E5FF", border: "1px solid rgba(0,160,220,0.4)" }}>
                    <Waves className="w-2.5 h-2.5" /> 432 Hz
                  </div>
                )}
              </div>

              {/* Info + Actions */}
              <div className="flex flex-col flex-1 min-w-0 overflow-y-auto" style={{ WebkitOverflowScrolling: "touch" }}>
                {/* Info */}
                <div className="px-4 pt-3 pb-1 flex-shrink-0">
                  <p className="font-heading font-black text-white leading-tight line-clamp-2"
                    style={{ fontSize: isMobile ? "14px" : "16px" }}>
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
                  <button
                    onTouchStart={(e) => e.stopPropagation()}
                    onClick={handleOpenSongPage}
                    className="w-11 h-11 rounded-xl flex items-center justify-center transition-all hover:bg-white/10 active:scale-90 flex-shrink-0 text-xs font-black"
                    style={{ border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)", touchAction: "manipulation", minWidth: 44, minHeight: 44 }}
                    title="Open song page"
                  >
                    ↗
                  </button>
                </div>

                {/* Download row */}
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
                        <span className="text-[10px] font-normal opacity-60">Plus required</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* In-world support/donate modal — stays inside Vibe City */}
      <SupportModal
        open={supportModalOpen}
        onClose={() => setSupportModalOpen(false)}
        track={track}
      />
    </motion.div>
  );
}