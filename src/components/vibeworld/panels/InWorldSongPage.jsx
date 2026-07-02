/**
 * InWorldSongPage — quick song popup for Vibe World.
 * Shows inside the world as an overlay — never navigates away automatically.
 * Landscape-safe, safe-area friendly, all buttons 44px minimum.
 */
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Play, Pause, Download, Lock, Crown, Waves,
  ArrowLeft, DollarSign, Share2, ExternalLink,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { usePlayer } from "@/context/PlayerContext";
import { useAuth } from "@/lib/AuthContext";
import SaveHeartButton from "@/components/shared/SaveHeartButton";
import SupportModal from "@/components/shared/SupportModal";

// ── Upgrade / non-Plus download view ─────────────────────────────────
function UpgradeView({ track, onBack, onClose, onNavigate, onOpenSupportModal }) {
  const [confirm, setConfirm] = useState(false);

  if (confirm) {
    return (
      <div className="flex flex-col items-center justify-center p-6 flex-1">
        <p className="font-heading font-black text-white text-base text-center mb-1">Leave Vibe City?</p>
        <p className="text-xs text-white/45 text-center mb-5 leading-relaxed">
          You'll be taken to the membership page.
        </p>
        <button
          onTouchStart={(e) => e.stopPropagation()}
          onClick={() => { try { sessionStorage.setItem("vibeworld_return_url", window.location.href); sessionStorage.setItem("vibeworld_return", "1"); } catch {} onClose(); onNavigate("/membership"); }}
          className="w-full py-3 rounded-xl font-black text-sm mb-2 transition-all hover:brightness-110 active:scale-95"
          style={{ background: "linear-gradient(135deg,#D4A843,#F0C040)", color: "#000", touchAction: "manipulation", minHeight: 44 }}>
          Continue to Membership
        </button>
        <button
          onTouchStart={(e) => e.stopPropagation()}
          onClick={() => setConfirm(false)}
          className="w-full py-2.5 rounded-xl font-black text-sm transition-all active:scale-95"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)", touchAction: "manipulation", minHeight: 44 }}>
          Stay in Vibe City
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: "touch" }}>
      {/* Back header */}
      <div className="flex items-center gap-2 px-4 pt-4 pb-2 flex-shrink-0">
        <button
          onTouchStart={(e) => e.stopPropagation()}
          onClick={onBack}
          className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:bg-white/10"
          style={{ color: "rgba(255,255,255,0.5)", touchAction: "manipulation", minWidth: 36, minHeight: 36 }}
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <p className="font-heading font-black text-white/70 text-sm tracking-wide">Download Track</p>
      </div>

      {/* Track mini card */}
      <div className="mx-4 mb-3 flex items-center gap-3 rounded-xl p-3 flex-shrink-0"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
        {track.cover_url
          ? <img src={track.cover_url} alt={track.title} className="w-11 h-11 rounded-lg object-cover flex-shrink-0" />
          : <div className="w-11 h-11 rounded-lg flex-shrink-0 flex items-center justify-center" style={{ background: "rgba(0,180,212,0.15)" }}><span className="text-2xl">🎵</span></div>
        }
        <div className="min-w-0">
          <p className="font-black text-white text-sm truncate leading-tight">{track.title}</p>
          <p className="text-[10px] truncate mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>{track.artist_display || "Upper Vibe Media"}</p>
        </div>
      </div>

      {/* Options */}
      <div className="px-4 pb-5 flex flex-col gap-3 flex-shrink-0">
        {/* Plus */}
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
              onClick={() => setConfirm(true)}
              className="w-full py-2.5 rounded-lg font-black text-xs tracking-widest transition-all hover:brightness-110 active:scale-[0.97]"
              style={{ background: "linear-gradient(135deg,#D4A843,#F0C040)", color: "#000", minHeight: 44, touchAction: "manipulation" }}>
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

        {/* Support / donate */}
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
              onClick={() => { onOpenSupportModal?.(); }}
              className="w-full py-2.5 rounded-lg font-black text-xs tracking-wide transition-all hover:brightness-110 active:scale-[0.97]"
              style={{ background: "linear-gradient(135deg,rgba(0,184,212,0.3),rgba(0,229,255,0.2))", border: "1px solid rgba(0,212,240,0.3)", color: "#00E5FF", minHeight: 44, touchAction: "manipulation" }}>
              Donate &amp; Download
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main popup ────────────────────────────────────────────────────────
export default function InWorldSongPage({ track, onClose, isMobile, sourceComponent = "unknown", tvMode = false }) {
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

  // Detect landscape — used for layout switching
  const isLandscape = typeof window !== "undefined" && window.innerWidth > window.innerHeight;

  const handlePlay = (e) => {
    e?.stopPropagation();
    if (isCurrent) togglePlay?.();
    else playTrack?.(track, "song");
  };

  const handleShare = (e) => {
    e?.stopPropagation();
    const url = `${window.location.origin}/song/${track.id}`;
    if (navigator.share) {
      navigator.share({ title: track.title, url }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(url).catch(() => {});
    }
  };

  const saveReturn = () => {
    try {
      sessionStorage.setItem("vibeworld_return_url", window.location.href);
      sessionStorage.setItem("vibeworld_return", "1");
      sessionStorage.setItem("vibeworld_source", sourceComponent);
      sessionStorage.setItem("vibeworld_open_panel", sourceComponent);
    } catch {}
  };

  const handleDownloadClick = (e) => {
    e.stopPropagation();
    if (!isPlus) { setShowUpgrade(true); return; }
    setShowDownloadConfirm(true);
  };

  const handleConfirmDownload = () => {
    saveReturn();
    onClose();
    navigate(`/song/${track.id}?downloadIntent=true`);
  };

  const handleOpenSongPage = (e) => {
    e.stopPropagation();
    saveReturn();
    onClose();
    navigate(`/song/${track.id}`);
  };

  // ── Layout dimensions ─────────────────────────────────────────────
  // Portrait mobile: tall bottom-sheet (no cover crop)
  // Landscape mobile: side-by-side, scrollable right column
  // Desktop: centered modal
  const modalStyle = isMobile
    ? isLandscape
      ? {
          // Landscape: full-width centered card, left=cover, right=actions
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "calc(100vw - env(safe-area-inset-left,0px) - env(safe-area-inset-right,0px))",
          height: "100dvh",
          borderRadius: "20px",
          display: "flex",
          flexDirection: "row",
          overflow: "hidden",
        }
      : {
          // Portrait: bottom sheet
          position: "fixed",
          bottom: 0,
          left: "env(safe-area-inset-left, 0px)",
          right: "env(safe-area-inset-right, 0px)",
          maxHeight: "100dvh",
          borderRadius: "20px 20px 0 0",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }
    : {
        // Desktop: centered
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: "min(720px, calc(100vw - 48px))",
        maxHeight: "82dvh",
        borderRadius: "20px",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      };

  return (
    <motion.div
      key="inworld-song-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-[95] pointer-events-auto"
      style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(10px)" }}
      onClick={onClose}
    >
      {/* Modal card */}
      <div
        style={{
          ...modalStyle,
          background: "rgba(8,8,24,0.99)",
          border: "1px solid rgba(0,229,255,0.18)",
          boxShadow: "0 0 48px rgba(0,184,212,0.15), 0 8px 40px rgba(0,0,0,0.7)",
          pointerEvents: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Close button — always top-right, never cut off ── */}
        <button
          onTouchStart={(e) => e.stopPropagation()}
          onClick={onClose}
          className="absolute z-20 flex items-center justify-center rounded-full transition-all hover:bg-white/10 active:scale-90"
          style={{
            top: isLandscape
              ? "calc(env(safe-area-inset-top, 0px) + 8px)"
              : "12px",
            right: "12px",
            width: 36, height: 36, minWidth: 36, minHeight: 36,
            background: "rgba(0,0,0,0.55)",
            color: "rgba(255,255,255,0.7)",
            touchAction: "manipulation",
          }}
        >
          <X className="w-4 h-4" />
        </button>

        {/* ── Download confirm overlay ── */}
        <AnimatePresence>
          {showDownloadConfirm && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 rounded-[20px]"
              style={{ background: "rgba(8,8,24,0.97)" }}>
              <p className="font-heading font-black text-white text-base text-center mb-1">Open Download Page?</p>
              <p className="text-xs text-white/45 text-center mb-5 leading-relaxed">
                This will leave Vibe City.{tvMode ? " TV Mode will pause." : " Your session will be saved."}
              </p>
              <button onTouchStart={(e) => e.stopPropagation()} onClick={handleConfirmDownload}
                className="w-full py-3 rounded-xl font-black text-sm mb-2 transition-all hover:brightness-110 active:scale-95"
                style={{ background: "linear-gradient(135deg,#D4A843,#F0C040)", color: "#000", touchAction: "manipulation", minHeight: 44 }}>
                Yes, Open Download Page
              </button>
              <button onTouchStart={(e) => e.stopPropagation()} onClick={() => setShowDownloadConfirm(false)}
                className="w-full py-2.5 rounded-xl font-black text-sm transition-all active:scale-95"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)", touchAction: "manipulation", minHeight: 44 }}>
                Stay in Vibe City
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Main content ── */}
        <AnimatePresence mode="wait">
          {showUpgrade ? (
            <motion.div key="upgrade" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}
              className="flex flex-col flex-1 overflow-hidden" style={{ minHeight: 0 }}>
              <UpgradeView
                track={track}
                onBack={() => setShowUpgrade(false)}
                onClose={onClose}
                onNavigate={navigate}
                onOpenSupportModal={() => { setShowUpgrade(false); setSupportModalOpen(true); }}
              />
            </motion.div>
          ) : (
            <motion.div key="main" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-1 overflow-hidden"
              style={{ flexDirection: isLandscape ? "row" : "column", minHeight: 0 }}
            >
              {/* Cover art */}
              <div className="relative flex-shrink-0"
                style={isLandscape
                  ? { width: "clamp(140px, 30%, 200px)", alignSelf: "stretch" }
                  : { width: "100%", maxHeight: isMobile ? "160px" : "220px", aspectRatio: "16/9", flexShrink: 0 }
                }
              >
                {track.cover_url
                  ? <img src={track.cover_url} alt={track.title} className="w-full h-full object-cover block" style={{ minHeight: "100%" }} />
                  : <div className="w-full h-full flex items-center justify-center" style={{ background: "rgba(0,100,150,0.2)", minHeight: 120 }}><span className="text-5xl">🎵</span></div>
                }
                {/* Bottom gradient for portrait */}
                {!isLandscape && (
                  <div className="absolute inset-x-0 bottom-0 h-1/3" style={{ background: "linear-gradient(to top, rgba(8,8,24,1) 0%, transparent 100%)" }} />
                )}
                {/* 432 Hz badge */}
                {track.frequency_type === "432hz" && (
                  <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold"
                    style={{ background: "rgba(0,160,220,0.3)", color: "#00E5FF", border: "1px solid rgba(0,160,220,0.4)" }}>
                    <Waves className="w-2.5 h-2.5" /> 432 Hz
                  </div>
                )}
              </div>

              {/* Info + Actions — scrollable in landscape */}
              <div className="flex flex-col flex-1 min-w-0 overflow-y-auto" style={{ WebkitOverflowScrolling: "touch", minHeight: 0 }}>
                {/* Title + artist */}
                <div className="px-4 pt-3 pb-1 flex-shrink-0 pr-12">
                  <p className="font-heading font-black text-white leading-tight line-clamp-2"
                    style={{ fontSize: isLandscape ? "13px" : isMobile ? "14px" : "16px" }}>
                    {track.title}
                  </p>
                  <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                    {track.artist_display || "Upper Vibe Media"}
                  </p>
                </div>

                {/* Primary action row: Play + Save + Share */}
                <div className="px-4 pt-1 pb-2 flex items-center gap-2 flex-shrink-0">
                  {/* Play */}
                  <button
                    onTouchStart={(e) => e.stopPropagation()}
                    onClick={handlePlay}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-black text-sm flex-1 justify-center transition-all hover:brightness-110 active:scale-[0.97]"
                    style={{ background: "linear-gradient(135deg,#00B8D4,#00E5FF)", color: "#000", minHeight: 44, touchAction: "manipulation" }}
                  >
                    {isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                    {isActive ? "Pause" : "Play"}
                  </button>

                  {/* Save/heart */}
                  <div onClick={(e) => e.stopPropagation()} style={{ flexShrink: 0 }}>
                    <SaveHeartButton
                      item={track}
                      itemType="song"
                      meta={{ title: track.title, artist: track.artist_display, cover_url: track.cover_url }}
                      size="md"
                    />
                  </div>

                  {/* Share */}
                  <button
                    onTouchStart={(e) => e.stopPropagation()}
                    onClick={handleShare}
                    className="w-11 h-11 rounded-xl flex items-center justify-center transition-all hover:bg-white/10 active:scale-90 flex-shrink-0"
                    style={{ border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)", touchAction: "manipulation", minWidth: 44, minHeight: 44 }}
                    title="Share song"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Secondary row: Download + Support + Open Full Page */}
                <div className="px-4 pb-3 flex flex-col gap-2 flex-shrink-0">
                  {/* Download */}
                  <button
                    onTouchStart={(e) => e.stopPropagation()}
                    onClick={handleDownloadClick}
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl font-black text-sm transition-all hover:brightness-110 active:scale-[0.97]"
                    style={{
                      background: isPlus ? "linear-gradient(135deg,rgba(212,168,67,0.2),rgba(212,168,67,0.1))" : "rgba(212,168,67,0.06)",
                      border: isPlus ? "1px solid rgba(212,168,67,0.4)" : "1px solid rgba(212,168,67,0.2)",
                      color: isPlus ? "#D4A843" : "rgba(212,168,67,0.6)",
                      minHeight: 44, touchAction: "manipulation",
                    }}>
                    {isPlus ? (
                      <><Download className="w-4 h-4" /> Download (Plus)</>
                    ) : (
                      <><Lock className="w-3.5 h-3.5" /> Download <Crown className="w-3 h-3 ml-0.5" style={{ color: "#D4A843" }} /> <span className="text-[10px] font-normal opacity-60">Plus required</span></>
                    )}
                  </button>

                  {/* Support + Open Full Page row */}
                  <div className="flex gap-2">
                    {/* Support */}
                    <button
                      onTouchStart={(e) => e.stopPropagation()}
                      onClick={(e) => { e.stopPropagation(); setSupportModalOpen(true); }}
                      className="flex items-center justify-center gap-1.5 flex-1 py-2.5 rounded-xl font-black text-xs tracking-wide transition-all hover:brightness-110 active:scale-[0.97]"
                      style={{ background: "rgba(0,184,212,0.08)", border: "1px solid rgba(0,212,240,0.2)", color: "#00D4F0", minHeight: 44, touchAction: "manipulation" }}>
                      <DollarSign className="w-3.5 h-3.5" /> Support
                    </button>

                    {/* Open full song page */}
                    <button
                      onTouchStart={(e) => e.stopPropagation()}
                      onClick={handleOpenSongPage}
                      className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl font-black text-xs tracking-wide transition-all hover:bg-white/10 active:scale-90 flex-shrink-0"
                      style={{ border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.45)", minHeight: 44, touchAction: "manipulation" }}
                      title="Open full song page">
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Full Page</span>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* In-world support/donate modal */}
      <SupportModal
        open={supportModalOpen}
        onClose={() => setSupportModalOpen(false)}
        track={track}
      />
    </motion.div>
  );
}