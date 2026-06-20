import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Music4, Tv2, MessageCircle, Store, Sun,
  Compass, Sparkles, Library, SkipForward,
  Volume2, VolumeX,
} from "lucide-react";
import { Link } from "react-router-dom";
import { usePlayer } from "@/context/PlayerContext";
import { detectZone, ZONES } from "./zoneDetection";
import MusicLibraryPanel from "./panels/MusicLibraryPanel";
import LoungePanel from "./panels/LoungePanel";
import VisualizerPanel from "./panels/VisualizerPanel";
import ChatWarning from "@/components/vibeworld/ChatWarning";

const ZONE_ICONS = {
  plaza: Compass,
  stage: Music4,
  dome: Tv2,
  lounge: MessageCircle,
  shop: Store,
  beach: Sun,
};

export default function WorldHUD({
  playerX, playerZ, playerRot,
  isMobile, loading,
  stageVideoTitle,
  stageVideoMuted,
  stageWatching,
  stageVideosCount,
  onStageWatchVideo,
  onStageExitWatchMode,
  onStageNextVideo,
  onStageToggleMute,
  onStagePlaySong,
  onStageFullScreen,
  onStageExitFullScreen,
  chatAgeConfirmed = false,
}) {
  const [chatWarningVisible, setChatWarningVisible] = useState(false);
  const { currentTrack, isPlaying, togglePlay, playTrack } = usePlayer() || {};
  const zone = detectZone(playerX, playerZ);

  // Panel states
  const [musicPanelOpen, setMusicPanelOpen] = useState(false);
  const [loungePanelOpen, setLoungePanelOpen] = useState(false);
  const [visualizerOpen, setVisualizerOpen] = useState(false);

  const hapticTap = () => { try { navigator?.vibrate?.(10); } catch {} };

  const handleOpenMusicLibrary = useCallback(() => {
    hapticTap();
    setMusicPanelOpen(true);
  }, []);

  const handleOpenLounge = useCallback(() => {
    hapticTap();
    setLoungePanelOpen(true);
    if (chatAgeConfirmed) {
      setChatWarningVisible(true);
      setTimeout(() => setChatWarningVisible(false), 5000);
    }
  }, [chatAgeConfirmed]);

  if (loading) return null;

  const ZoneIcon = zone ? ZONE_ICONS[zone.id] : null;

  return (
    <>
      {/* ── Zone indicator (top-center) ───────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute top-0 left-1/2 z-[55] pointer-events-none"
        style={{
          transform: "translateX(-50%)",
          paddingTop: isMobile ? "calc(env(safe-area-inset-top, 0px) + 5rem)" : "4rem",
        }}
      >
        {zone && (
          <div
            className="flex items-center gap-2 px-4 py-2 rounded-full"
            style={{
              background: "rgba(0,0,0,0.5)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(255,255,255,0.15)",
            }}
          >
            {ZoneIcon && <ZoneIcon className="w-3.5 h-3.5 text-cyan-400" />}
            <span className="text-[11px] font-black tracking-wider text-white/80">
              {zone.name}
            </span>
          </div>
        )}
      </motion.div>

      {/* ── Chat Warning Banner ──────────────────────────────── */}
      <ChatWarning
        show={chatWarningVisible}
        onDismiss={() => setChatWarningVisible(false)}
      />

      {/* ── Now Playing (bottom bar in UpperVibeCity handles this) ── */}

      {/* ── Zone-specific action buttons ────────────────────────── */}
      <AnimatePresence>
        {zone?.id === "plaza" && (
          <motion.div
            key="plaza-actions"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-0 left-0 right-0 z-[57] flex flex-col items-center gap-2 px-4"
            style={{
              paddingBottom: isMobile
                ? "calc(env(safe-area-inset-bottom, 0px) + 9rem)"
                : "calc(env(safe-area-inset-bottom, 0px) + 7.5rem)",
              pointerEvents: "auto",
            }}
          >
            {/* Music Library button */}
            <button
              onTouchStart={(e) => e.stopPropagation()}
              onClick={handleOpenMusicLibrary}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full font-black text-xs tracking-wider transition-all hover:brightness-110 active:scale-95"
              style={{
                background: "linear-gradient(135deg,#0080B8,#00A0DC)",
                color: "#fff",
                boxShadow: "0 0 20px rgba(0,160,220,0.4)",
                minHeight: "44px",
                touchAction: "manipulation",
                pointerEvents: "auto",
              }}
            >
              <Library className="w-3.5 h-3.5" />
              Browse Music Library
            </button>
          </motion.div>
        )}

        {zone?.id === "stage" && (
          <motion.div
            key="stage-actions"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-0 left-0 right-0 z-[57] flex flex-col items-center gap-1 px-1"
            style={{
              paddingBottom: isMobile
                ? "calc(env(safe-area-inset-bottom, 0px) + 8rem)"
                : "calc(env(safe-area-inset-bottom, 0px) + 7.5rem)",
              pointerEvents: "auto",
            }}
          >
            {/* Now showing label — compact on mobile */}
            {stageVideoTitle && (
              <p className="text-[9px] text-white/40 font-medium tracking-wider truncate max-w-[80vw]">
                {isMobile ? stageVideoTitle.substring(0, 30) + (stageVideoTitle.length > 30 ? "..." : "") : `Now Showing: ${stageVideoTitle}`}
              </p>
            )}

            <div className="flex flex-wrap gap-1.5 justify-center">
              {/* Watch Stage / Exit */}
              {stageWatching ? (
              <button
                onTouchStart={(e) => e.stopPropagation()}
                onClick={() => { hapticTap(); onStageExitWatchMode(); }}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-full font-black text-[10px] tracking-wider transition-all hover:brightness-110 active:scale-95"
                  style={{
                    background: "linear-gradient(135deg,#7C3AED,#9B7EFF)",
                    color: "#fff",
                    boxShadow: "0 0 20px rgba(155,126,255,0.4)",
                    minHeight: "44px",
                    touchAction: "manipulation",
                    pointerEvents: "auto",
                  }}
                >
                  <Music4 className="w-3 h-3" />
                  Exit Watch
                </button>
              ) : (
                <button
                  onTouchStart={(e) => e.stopPropagation()}
                  onClick={() => { hapticTap(); onStageWatchVideo(); }}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-full font-black text-[10px] tracking-wider transition-all hover:brightness-110 active:scale-95"
                  style={{
                    background: "linear-gradient(135deg,#7C3AED,#9B7EFF)",
                    color: "#fff",
                    boxShadow: "0 0 20px rgba(155,126,255,0.4)",
                    minHeight: "44px",
                    touchAction: "manipulation",
                    pointerEvents: "auto",
                  }}
                >
                  <Music4 className="w-3 h-3" />
                  Watch Stage
                </button>
              )}

              {/* Full Screen */}
              {onStageFullScreen && (
                <button
                  onTouchStart={(e) => e.stopPropagation()}
                  onClick={() => { hapticTap(); onStageFullScreen(); }}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-full font-black text-[10px] tracking-wider transition-all hover:brightness-110 active:scale-95"
                  style={{
                    background: "linear-gradient(135deg,#0080B8,#00A0DC)",
                    color: "#fff",
                    boxShadow: "0 0 20px rgba(0,160,220,0.4)",
                    minHeight: "44px",
                    touchAction: "manipulation",
                    pointerEvents: "auto",
                  }}
                >
                  <Music4 className="w-3 h-3" />
                  Full Screen
                </button>
              )}

              {/* Next */}
              <button
                onTouchStart={(e) => e.stopPropagation()}
                onClick={() => { hapticTap(); onStageNextVideo(); }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-full font-black text-[10px] tracking-wider transition-all hover:brightness-110 active:scale-95"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: "rgba(255,255,255,0.6)",
                  minHeight: "44px",
                  touchAction: "manipulation",
                  pointerEvents: "auto",
                }}
              >
                <SkipForward className="w-3 h-3" />
                Next
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5 justify-center">
              {/* Play Song */}
              {onStagePlaySong && (
                <button
                  onTouchStart={(e) => e.stopPropagation()}
                  onClick={() => { hapticTap(); onStagePlaySong(); }}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-full font-black text-[10px] tracking-wider transition-all hover:brightness-110 active:scale-95"
                  style={{
                    background: "linear-gradient(135deg,#0080B8,#00A0DC)",
                    color: "#fff",
                    minHeight: "44px",
                    touchAction: "manipulation",
                    pointerEvents: "auto",
                  }}
                >
                  <Music4 className="w-3 h-3" />
                  Play Song
                </button>
              )}

              {/* Mute / Unmute */}
              {onStageToggleMute && (
                <button
                  onTouchStart={(e) => e.stopPropagation()}
                  onClick={() => { hapticTap(); onStageToggleMute(); }}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-full font-black text-[10px] tracking-wider transition-all hover:brightness-110 active:scale-95"
                  style={{
                    background: stageVideoMuted
                      ? "rgba(255,255,255,0.08)"
                      : "rgba(124,58,237,0.3)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    color: stageVideoMuted ? "rgba(255,255,255,0.6)" : "#fff",
                    minHeight: "44px",
                    touchAction: "manipulation",
                    pointerEvents: "auto",
                  }}
                >
                  {stageVideoMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                  {stageVideoMuted ? "Mute" : "Live"}
                </button>
              )}
            </div>
          </motion.div>
        )}

        {zone?.id === "dome" && (
          <motion.div
            key="dome-actions"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-0 left-0 right-0 z-[57] flex flex-col items-center gap-2 px-4"
            style={{
              paddingBottom: isMobile
                ? "calc(env(safe-area-inset-bottom, 0px) + 9rem)"
                : "calc(env(safe-area-inset-bottom, 0px) + 7.5rem)",
              pointerEvents: "auto",
            }}
          >
            <button
              onTouchStart={(e) => e.stopPropagation()}
              onClick={() => { hapticTap(); setVisualizerOpen(true); }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full font-black text-xs tracking-wider transition-all hover:brightness-110 active:scale-95"
              style={{
                background: "linear-gradient(135deg,#7C3AED,#A078FF)",
                color: "#fff",
                boxShadow: "0 0 20px rgba(160,120,255,0.4)",
                minHeight: "44px",
                touchAction: "manipulation",
                pointerEvents: "auto",
              }}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Enter Visualizer Dome
            </button>
          </motion.div>
        )}

        {zone?.id === "lounge" && (
          <motion.div
            key="lounge-actions"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-0 left-0 right-0 z-[57] flex flex-col items-center gap-2 px-4"
            style={{
              paddingBottom: isMobile
                ? "calc(env(safe-area-inset-bottom, 0px) + 9rem)"
                : "calc(env(safe-area-inset-bottom, 0px) + 7.5rem)",
              pointerEvents: "auto",
            }}
          >
            <button
              onTouchStart={(e) => e.stopPropagation()}
              onClick={handleOpenLounge}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full font-black text-xs tracking-wider transition-all hover:brightness-110 active:scale-95"
              style={{
                background: "linear-gradient(135deg,#A078FF,#C4A0FF)",
                color: "#fff",
                boxShadow: "0 0 20px rgba(160,120,255,0.4)",
                minHeight: "44px",
                touchAction: "manipulation",
                pointerEvents: "auto",
              }}
            >
              <MessageCircle className="w-3.5 h-3.5" />
              Hang Out
            </button>
          </motion.div>
        )}

        {zone?.id === "beach" && (
          <motion.div
            key="beach-actions"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-0 left-0 right-0 z-[57] flex flex-col items-center gap-2 px-4"
            style={{
              paddingBottom: isMobile
                ? "calc(env(safe-area-inset-bottom, 0px) + 9rem)"
                : "calc(env(safe-area-inset-bottom, 0px) + 7.5rem)",
              pointerEvents: "auto",
            }}
          >
            <span
              className="px-3 py-1.5 rounded-full text-[10px] font-black tracking-wider"
              style={{
                background: "rgba(255,255,255,0.1)",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "rgba(255,255,255,0.5)",
              }}
            >
              Waves sync to your music
            </span>
          </motion.div>
        )}

        {zone?.id === "shop" && (
          <motion.div
            key="shop-actions"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-0 left-0 right-0 z-[57] flex flex-col items-center gap-2 px-4"
            style={{
              paddingBottom: isMobile
                ? "calc(env(safe-area-inset-bottom, 0px) + 9rem)"
                : "calc(env(safe-area-inset-bottom, 0px) + 7.5rem)",
              pointerEvents: "auto",
            }}
          >
            <div className="flex flex-wrap gap-2 justify-center">
              <span
                className="px-3 py-1.5 rounded-full text-[10px] font-black tracking-wider"
                style={{
                  background: "rgba(255,255,255,0.12)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  color: "rgba(255,255,255,0.5)",
                }}
              >
                Merch Coming Soon
              </span>
              <span
                className="px-3 py-1.5 rounded-full text-[10px] font-black tracking-wider"
                style={{
                  background: "rgba(155,126,255,0.12)",
                  border: "1px solid rgba(155,126,255,0.25)",
                  color: "#c4aaff",
                }}
              >
                Artist Features Soon
              </span>
              <Link
                to="/membership"
                className="px-3 py-1.5 rounded-full text-[10px] font-black tracking-wider transition-all hover:brightness-110"
                style={{
                  background: "linear-gradient(135deg,#D4A843,#F0C860)",
                  color: "#000",
                }}
              >
                Join Plus
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Music Library Panel (slide-up) ────────────────────── */}
      <MusicLibraryPanel
        open={musicPanelOpen}
        onClose={() => setMusicPanelOpen(false)}
        isMobile={isMobile}
      />

      {/* ── Visualizer Panel (fullscreen) ─────────────────────── */}
      <VisualizerPanel
        open={visualizerOpen}
        onClose={() => setVisualizerOpen(false)}
      />

      {/* ── Lounge Panel (slide-up) ───────────────────────────── */}
      <LoungePanel
        open={loungePanelOpen}
        onClose={() => setLoungePanelOpen(false)}
        isMobile={isMobile}
        chatAgeConfirmed={chatAgeConfirmed}
      />
    </>
  );
}