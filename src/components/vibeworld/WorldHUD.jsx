import React, { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Music4, Tv2, MessageCircle, Sun,
  Compass, Sparkles, Library, SkipForward,
  Volume2, VolumeX, BookOpen, Mic, MicOff,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { usePlayer } from "@/context/PlayerContext";
import { detectZone, ZONES } from "./zoneDetection";
import MusicLibraryPanel from "./panels/MusicLibraryPanel";
import LoungePanel from "./panels/LoungePanel";
import VisualizerPanel from "./panels/VisualizerPanel";
import VibeCheckPanel from "./panels/VibeCheckPanel";
import ChatWarning from "@/components/vibeworld/ChatWarning";
import LiveUsersBadge from "@/components/vibeworld/LiveUsersBadge";

const ZONE_ICONS = {
  plaza: Compass,
  stage: Music4,
  dome: Tv2,
  lounge: MessageCircle,
  library: Library,
  vibecheck: Sparkles,
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
  onMobileModalChange,
  activeUsers = [],
  userCount = 0,
  isBroadcasting = false,
  isMicEnabled = false,
  isSpeaking = false,
  onToggleMic,
  voicePeers = [],
  voiceConnected = false,
}) {
  const [chatWarningVisible, setChatWarningVisible] = useState(false);
  const [showZoneLabel, setShowZoneLabel] = useState(false);
  const zoneFadeTimerRef = useRef(null);
  const { currentTrack, isPlaying, togglePlay, playTrack } = usePlayer() || {};
  const zone = detectZone(playerX, playerZ);

  // Zone label: show briefly on zone change, then auto-fade
  useEffect(() => {
    if (!zone) return;
    setShowZoneLabel(true);
    if (zoneFadeTimerRef.current) clearTimeout(zoneFadeTimerRef.current);
    zoneFadeTimerRef.current = setTimeout(() => {
      setShowZoneLabel(false);
    }, 4000);
    return () => { if (zoneFadeTimerRef.current) clearTimeout(zoneFadeTimerRef.current); };
  }, [zone?.id]);

  const navigate = useNavigate();

  // Panel states
  const [musicPanelOpen, setMusicPanelOpen] = useState(false);
  const [loungePanelOpen, setLoungePanelOpen] = useState(false);
  const [visualizerOpen, setVisualizerOpen] = useState(false);
  const [vibeCheckOpen, setVibeCheckOpen] = useState(false);

  const hapticTap = () => { try { navigator?.vibrate?.(10); } catch {} };

  const handleOpenMusicLibrary = useCallback(() => {
    hapticTap();
    setMusicPanelOpen(true);
    onMobileModalChange?.(true);
  }, [onMobileModalChange]);

  const handleCloseMusicLibrary = useCallback(() => {
    setMusicPanelOpen(false);
    // Only report no modals if lounge is also closed
    onMobileModalChange?.(loungePanelOpen);
  }, [onMobileModalChange, loungePanelOpen]);

  const handleOpenLounge = useCallback(() => {
    hapticTap();
    setLoungePanelOpen(true);
    onMobileModalChange?.(true);
    if (chatAgeConfirmed) {
      setChatWarningVisible(true);
      setTimeout(() => setChatWarningVisible(false), 5000);
    }
  }, [chatAgeConfirmed, onMobileModalChange]);

  const handleCloseLounge = useCallback(() => {
    setLoungePanelOpen(false);
    // Only report no modals if music library is also closed
    onMobileModalChange?.(musicPanelOpen);
  }, [onMobileModalChange, musicPanelOpen]);

  if (loading) return null;

  const ZoneIcon = zone ? ZONE_ICONS[zone.id] : null;

  return (
    <>
      {/* ── Zone indicator — second row below top bar, auto-fades ── */}
      {zone && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: showZoneLabel ? 0.6 : 0, y: 0 }}
          transition={{ duration: 0.4 }}
          className="absolute top-0 left-1/2 z-[50] pointer-events-none"
          style={{
            transform: "translateX(-50%)",
            paddingTop: isMobile ? "calc(env(safe-area-inset-top, 0px) + 3.5rem)" : "4rem",
          }}
        >
          <div
            className="flex items-center gap-1 rounded-full"
            style={{
              background: "rgba(0,0,0,0.35)",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(255,255,255,0.06)",
              padding: isMobile ? "2px 8px" : "5px 14px",
            }}
          >
            {ZoneIcon && <ZoneIcon style={{ width: isMobile ? "9px" : "14px", height: isMobile ? "9px" : "14px" }} className="text-cyan-400/60 flex-shrink-0" />}
            <span className="font-black tracking-wider text-white/50"
              style={{ fontSize: isMobile ? "8px" : "11px" }}
            >
              {zone.name}
            </span>
          </div>
        </motion.div>
      )}

      {/* ── Mic + Online count (second row, right-aligned) ───── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute top-0 right-1.5 z-[56] flex items-center gap-1"
        style={{
          paddingTop: isMobile ? "calc(env(safe-area-inset-top, 0px) + 3.4rem)" : "4.5rem",
        }}
      >
        {onToggleMic && (
          <button
            onTouchStart={(e) => e.stopPropagation()}
            onClick={() => { try { navigator?.vibrate?.(10); } catch {} onToggleMic(); }}
            className={`flex items-center justify-center rounded-full transition-all active:scale-95 ${isSpeaking ? "animate-mic-pulse" : ""}`}
            style={{
              background: isSpeaking
                ? "linear-gradient(135deg,#00E676,#69F0AE)"
                : isMicEnabled
                  ? "linear-gradient(135deg,#00C853,#00E676)"
                  : "rgba(255,255,255,0.08)",
              border: isMicEnabled
                ? "1px solid rgba(0,200,83,0.4)"
                : "1px solid rgba(255,255,255,0.12)",
              width: isMobile ? "26px" : "36px",
              height: isMobile ? "26px" : "36px",
              minWidth: isMobile ? "26px" : "44px",
              minHeight: isMobile ? "26px" : "44px",
              touchAction: "manipulation",
              pointerEvents: "auto",
            }}
            title={isMicEnabled ? "Mute Mic" : "Unmute Mic"}
          >
            {isMicEnabled ? (
              <Mic style={{ width: isMobile ? "10px" : "14px", height: isMobile ? "10px" : "14px" }} className="text-white" />
            ) : (
              <MicOff style={{ width: isMobile ? "10px" : "14px", height: isMobile ? "10px" : "14px" }} className="text-white/40" />
            )}
          </button>
        )}
        {voiceConnected && (
          <span
            className="rounded-full animate-pulse flex-shrink-0"
            style={{
              width: "5px",
              height: "5px",
              background: "#00E676",
              boxShadow: "0 0 4px rgba(0,230,118,0.5)",
            }}
          />
        )}
        <LiveUsersBadge
          activeUsers={activeUsers}
          userCount={userCount}
          isBroadcasting={isBroadcasting}
          isMobile={isMobile}
        />
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
              pointerEvents: "none",
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
              pointerEvents: "none",
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
              pointerEvents: "none",
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

        {zone?.id === "library" && (
          <motion.div
            key="library-actions"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-0 left-0 right-0 z-[57] flex flex-col items-center gap-2 px-4"
            style={{
              paddingBottom: isMobile
                ? "calc(env(safe-area-inset-bottom, 0px) + 9rem)"
                : "calc(env(safe-area-inset-bottom, 0px) + 7.5rem)",
              pointerEvents: "none",
            }}
          >
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

        {zone?.id === "vibecheck" && (
          <motion.div
            key="vibecheck-actions"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-0 left-0 right-0 z-[57] flex flex-col items-center gap-2 px-4"
            style={{
              paddingBottom: isMobile
                ? "calc(env(safe-area-inset-bottom, 0px) + 9rem)"
                : "calc(env(safe-area-inset-bottom, 0px) + 7.5rem)",
              pointerEvents: "none",
            }}
          >
            <button
              onTouchStart={(e) => e.stopPropagation()}
              onClick={() => { hapticTap(); setVibeCheckOpen(true); onMobileModalChange?.(true); }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full font-black text-xs tracking-wider transition-all hover:brightness-110 active:scale-95"
              style={{
                background: "linear-gradient(135deg,#00D4F0,#00E5FF)",
                color: "#000",
                boxShadow: "0 0 20px rgba(0,229,255,0.4)",
                minHeight: "44px",
                touchAction: "manipulation",
                pointerEvents: "auto",
              }}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Check Your Vibe
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
              pointerEvents: "none",
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
              pointerEvents: "none",
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
      </AnimatePresence>

      {/* ── Music Library Panel (slide-up) ────────────────────── */}
      <MusicLibraryPanel
        open={musicPanelOpen}
        onClose={handleCloseMusicLibrary}
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
        onClose={handleCloseLounge}
        isMobile={isMobile}
        chatAgeConfirmed={chatAgeConfirmed}
      />

      {/* ── Vibe Check Panel (slide-up) ────────────────────────── */}
      <VibeCheckPanel
        open={vibeCheckOpen}
        onClose={() => { setVibeCheckOpen(false); onMobileModalChange?.(false); }}
        isMobile={isMobile}
      />
    </>
  );
}