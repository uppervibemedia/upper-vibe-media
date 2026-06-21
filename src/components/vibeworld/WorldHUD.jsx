import React, { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Music4, Tv2, MessageCircle, Sun, X, UserCircle,
  Compass, Sparkles, Library, SkipForward,
  Volume2, VolumeX, BookOpen, GraduationCap, ShoppingBag, Bell, Waves,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { usePlayer } from "@/context/PlayerContext";
import { detectZone, ZONES } from "./zoneDetection";
import MusicLibraryPanel from "./panels/MusicLibraryPanel";
import LoungePanel from "./panels/LoungePanel";
import VisualizerPanel from "./panels/VisualizerPanel";
import VibeCheckPanel from "./panels/VibeCheckPanel";
import PrivateChatPanel from "./panels/PrivateChatPanel";
import AcademyPanel from "./panels/AcademyPanel";
import ShopPanel from "./panels/ShopPanel";
import ZenBeachPanel from "./panels/ZenBeachPanel";
import EmotePanel from "./panels/EmotePanel";
import JukeboxPanel from "./panels/JukeboxPanel";
import UserInteractionMenu from "./UserInteractionMenu";
import IncomingChatRequest from "./IncomingChatRequest";
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
  zenbeach: Waves,
  academy: GraduationCap,
  shop: ShoppingBag,
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
  // ── Private Chat props ──────────────────────────────────
  currentUserId,
  activeChatPeer,
  chatMessages,
  incomingRequest,
  safetyConfirmed,
  onSelectUser,
  onRequestChat,
  onRequestVoiceChat,
  onAcceptChat,
  onDeclineChat,
  onSendChatMessage,
  onEndChat,
  onBlockUser,
  onReportUser,
  onSafetyConfirm,
  blockedUsers,
  userInteractionTarget,
  onCloseUserMenu,
  onLoungeInputFocus,
  onVoiceActive,
  outgoingStatus,
  onClearOutgoingStatus,
  pendingRequestsCount = 0,
  pendingRequests = [],
  // ── Emote / Dance Floor props ──────────────────────────────
  onEmote,
  onStopDance,
  isDancing = false,
  onEditAvatar,
  nearJukebox = false,
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
  const [academyOpen, setAcademyOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [zenBeachOpen, setZenBeachOpen] = useState(false);
  const [emotePanelOpen, setEmotePanelOpen] = useState(false);
  const [requestsOpen, setRequestsOpen] = useState(false);
  const [jukeboxOpen, setJukeboxOpen] = useState(false);

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

      {/* ── Online count + Requests bell (second row, right-aligned) ───── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute top-0 right-1.5 z-[56] flex items-center gap-1.5"
        style={{
          paddingTop: isMobile ? "calc(env(safe-area-inset-top, 0px) + 3.4rem)" : "4.5rem",
        }}
      >
        {/* Chat requests bell */}
        <button
          onTouchStart={(e) => e.stopPropagation()}
          onClick={() => { setRequestsOpen((v) => !v); }}
          className="relative flex items-center justify-center rounded-full transition-all hover:brightness-110 active:scale-95"
          style={{
            background: pendingRequestsCount > 0 ? "rgba(0,212,240,0.15)" : "rgba(255,255,255,0.06)",
            border: `1px solid ${pendingRequestsCount > 0 ? "rgba(0,212,240,0.3)" : "rgba(255,255,255,0.08)"}`,
            backdropFilter: "blur(8px)",
            width: isMobile ? 28 : 32,
            height: isMobile ? 28 : 32,
            minWidth: isMobile ? 28 : 32,
            minHeight: isMobile ? 28 : 32,
            touchAction: "manipulation",
            pointerEvents: "auto",
          }}
        >
          <Bell style={{ width: isMobile ? 11 : 13, height: isMobile ? 11 : 13 }}
            color={pendingRequestsCount > 0 ? "#00D4F0" : "rgba(255,255,255,0.4)"} />
          {pendingRequestsCount > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 flex items-center justify-center rounded-full font-black"
              style={{
                background: "#00D4F0",
                color: "#000",
                fontSize: isMobile ? "6px" : "8px",
                width: isMobile ? 12 : 14,
                height: isMobile ? 12 : 14,
                minWidth: isMobile ? 12 : 14,
                minHeight: isMobile ? 12 : 14,
              }}
            >
              {pendingRequestsCount > 9 ? "9+" : pendingRequestsCount}
            </span>
          )}
        </button>

        <LiveUsersBadge
          activeUsers={activeUsers}
          userCount={userCount}
          isBroadcasting={isBroadcasting}
          isMobile={isMobile}
          currentUserId={currentUserId}
          onSelectUser={onSelectUser}
        />

        {/* Edit Avatar button (only in plaza) */}
        {zone?.id === "plaza" && onEditAvatar && (
          <button
            onTouchStart={(e) => e.stopPropagation()}
            onClick={() => onEditAvatar()}
            className="flex items-center justify-center rounded-full transition-all hover:brightness-110 active:scale-95"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.08)",
              backdropFilter: "blur(8px)",
              width: isMobile ? 28 : 32,
              height: isMobile ? 28 : 32,
              minWidth: isMobile ? 28 : 32,
              minHeight: isMobile ? 28 : 32,
              touchAction: "manipulation",
              pointerEvents: "auto",
            }}
            title="Edit Avatar"
          >
            <UserCircle style={{ width: isMobile ? 11 : 13, height: isMobile ? 11 : 13 }}
              color="rgba(255,255,255,0.4)" />
          </button>
        )}
      </motion.div>

      {/* ── Pending Requests dropdown ───────────────────────── */}
      <AnimatePresence>
        {requestsOpen && (
          <motion.div
            key="requests-dropdown"
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-1 z-[57] pointer-events-auto"
            style={{
              top: isMobile ? "calc(env(safe-area-inset-top, 0px) + 5.5rem)" : "7rem",
              width: isMobile ? "calc(100vw - 3rem)" : "280px",
              maxHeight: "220px",
              overflow: "auto",
              borderRadius: "16px",
              background: "rgba(20,16,40,0.95)",
              border: "1px solid rgba(124,58,237,0.2)",
              backdropFilter: "blur(16px)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
            }}
          >
            <div className="p-3 border-b border-white/5">
              <p className="text-[10px] font-black text-white/40 tracking-wider uppercase">
                Chat Requests
              </p>
            </div>
            {(!pendingRequests || pendingRequests.length === 0) ? (
              <div className="p-6 text-center">
                <p className="text-xs text-white/30">No pending chat requests</p>
                <p className="text-[9px] text-white/15 mt-1">Requests appear here in real-time</p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {pendingRequests.map((req) => (
                  <div key={req.id} className="flex items-center justify-between gap-2 p-2.5 rounded-xl"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-white/80 truncate">{req.fromUsername}</p>
                      <p className="text-[9px] text-white/30">wants to chat</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onTouchStart={(e) => e.stopPropagation()}
                        onClick={() => { onAcceptChat?.(req.id, req.fromUserId, req.fromUsername); setRequestsOpen(false); }}
                        className="px-2 py-1 rounded-full font-black text-[9px] transition-all hover:brightness-110"
                        style={{
                          background: "rgba(0,200,83,0.15)", border: "1px solid rgba(0,200,83,0.3)", color: "#00C853",
                          minHeight: "28px", touchAction: "manipulation",
                        }}
                      >
                        Accept
                      </button>
                      <button
                        onTouchStart={(e) => e.stopPropagation()}
                        onClick={() => { onDeclineChat?.(req.id, req.fromUserId); }}
                        className="px-2 py-1 rounded-full font-black text-[9px] transition-all hover:brightness-110"
                        style={{
                          background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)",
                          minHeight: "28px", touchAction: "manipulation",
                        }}
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Chat Warning Banner ──────────────────────────────── */}
      <ChatWarning
        show={chatWarningVisible}
        onDismiss={() => setChatWarningVisible(false)}
      />

      {/* ── Outgoing chat request status ─────────────────────── */}
      <AnimatePresence>
        {outgoingStatus && (
          <motion.div
            key={`out-${outgoingStatus.status}`}
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="fixed left-1/2 z-[86] pointer-events-auto"
            style={{
              transform: "translateX(-50%)",
              top: isMobile ? "calc(env(safe-area-inset-top, 0px) + 90px)" : "100px",
            }}
          >
            <div
              className="rounded-xl px-4 py-2 shadow-lg max-w-[85vw] relative"
              style={{
                background: outgoingStatus.status === "pending"
                  ? "rgba(0,200,83,0.12)"
                  : outgoingStatus.status === "accepted"
                  ? "rgba(0,200,83,0.15)"
                  : outgoingStatus.status === "expired"
                  ? "rgba(100,100,100,0.12)"
                  : "rgba(239,68,68,0.12)",
                border: `1px solid ${
                  outgoingStatus.status === "pending"
                    ? "rgba(0,200,83,0.3)"
                    : outgoingStatus.status === "accepted"
                    ? "rgba(0,200,83,0.4)"
                    : outgoingStatus.status === "expired"
                    ? "rgba(150,150,150,0.2)"
                    : "rgba(239,68,68,0.2)"
                }`,
                backdropFilter: "blur(12px)",
              }}
            >
              <button
                onTouchStart={(e) => e.stopPropagation()}
                onClick={() => onClearOutgoingStatus?.()}
                className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center transition-all hover:bg-white/10"
                style={{
                  color: "rgba(255,255,255,0.4)",
                  minWidth: 24,
                  minHeight: 24,
                  touchAction: "manipulation",
                }}
              >
                <X className="w-3 h-3" />
              </button>
              <p className="text-xs font-bold text-white pr-5">
                {outgoingStatus.status === "pending" && `Request sent to ${outgoingStatus.toUsername || "user"}...`}
                {outgoingStatus.status === "accepted" && `${outgoingStatus.toUsername || "User"} accepted! Opening chat.`}
                {outgoingStatus.status === "declined" && `${outgoingStatus.toUsername || "User"} declined.`}
                {outgoingStatus.status === "expired" && `Request to ${outgoingStatus.toUsername || "user"} expired.`}
                {outgoingStatus.status === "blocked" && `Cannot send request to ${outgoingStatus.toUsername || "user"}.`}
              </p>
              <p className="text-[9px] text-white/40 mt-0.5 pr-5">
                {outgoingStatus.status === "pending" && "Waiting for response..."}
                {outgoingStatus.status === "expired" && "No response received"}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Now Playing (bottom bar in UpperVibeCity handles this) ── */}

      {/* ── Zone-specific action buttons ────────────────────────── */}
      <AnimatePresence>
        {zone?.id === "plaza" && (
          <motion.div
            key="plaza-actions"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-0 right-0 z-[57] flex flex-col items-end gap-2 px-3"
            style={{
              paddingBottom: isMobile
                ? "calc(env(safe-area-inset-bottom, 0px) + 12rem)"
                : "calc(env(safe-area-inset-bottom, 0px) + 10rem)",
              pointerEvents: "none",
            }}
          >
            {nearJukebox && (
              <button
                onTouchStart={(e) => e.stopPropagation()}
                onClick={() => { hapticTap(); setJukeboxOpen(true); onMobileModalChange?.(true); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full font-black text-[10px] tracking-wider transition-all hover:brightness-110 active:scale-95"
                style={{
                  background: "linear-gradient(135deg,#00B8D488,#00D4F088)",
                  border: "1px solid rgba(0,212,240,0.4)",
                  color: "#fff",
                  minHeight: isMobile ? 36 : 40,
                  touchAction: "manipulation",
                  pointerEvents: "auto",
                  boxShadow: "0 0 14px rgba(0,212,240,0.25)",
                }}
              >
                🎵 Jukebox
              </button>
            )}
            {isDancing ? (
              <button
                onTouchStart={(e) => e.stopPropagation()}
                onClick={() => { hapticTap(); onStopDance?.(); }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full font-black text-[10px] tracking-wider transition-all hover:brightness-110 active:scale-95"
                style={{
                  background: "rgba(255,255,255,0.1)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: "rgba(255,255,255,0.7)",
                  minHeight: isMobile ? 36 : 40,
                  touchAction: "manipulation",
                  pointerEvents: "auto",
                }}
              >
                <X className="w-3 h-3" />
                Stop Dance
              </button>
            ) : (
              <button
                onTouchStart={(e) => e.stopPropagation()}
                onClick={() => { hapticTap(); setEmotePanelOpen(true); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full font-black text-[10px] tracking-wider transition-all hover:brightness-110 active:scale-95"
                style={{
                  background: "linear-gradient(135deg,#C43BFF88,#E040FB88)",
                  border: "1px solid rgba(196,59,255,0.3)",
                  color: "#fff",
                  minHeight: isMobile ? 36 : 40,
                  touchAction: "manipulation",
                  pointerEvents: "auto",
                }}
              >
                <Sparkles className="w-3 h-3" />
                Emotes
              </button>
            )}
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

        {zone?.id === "academy" && (
          <motion.div
            key="academy-actions"
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
              onClick={() => { hapticTap(); setAcademyOpen(true); onMobileModalChange?.(true); }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full font-black text-xs tracking-wider transition-all hover:brightness-110 active:scale-95"
              style={{
                background: "linear-gradient(135deg,#7C3AED,#00D4F0)",
                color: "#fff",
                boxShadow: "0 0 20px rgba(124,58,237,0.4)",
                minHeight: "44px",
                touchAction: "manipulation",
                pointerEvents: "auto",
              }}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              Enter Academy
            </button>
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
              pointerEvents: "none",
            }}
          >
            <button
              onTouchStart={(e) => e.stopPropagation()}
              onClick={() => { hapticTap(); setShopOpen(true); onMobileModalChange?.(true); }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full font-black text-xs tracking-wider transition-all hover:brightness-110 active:scale-95"
              style={{
                background: "linear-gradient(135deg,#7C3AED,#00D4F0)",
                color: "#fff",
                boxShadow: "0 0 20px rgba(124,58,237,0.4)",
                minHeight: "44px",
                touchAction: "manipulation",
                pointerEvents: "auto",
              }}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              Browse Shop
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

        {zone?.id === "zenbeach" && (
          <motion.div
            key="zenbeach-actions"
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
              onClick={() => { hapticTap(); setZenBeachOpen(true); onMobileModalChange?.(true); }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full font-black text-xs tracking-wider transition-all hover:brightness-110 active:scale-95"
              style={{
                background: "linear-gradient(135deg,#00D4F0,#7C3AED)",
                color: "#fff",
                boxShadow: "0 0 20px rgba(0,212,240,0.35)",
                minHeight: "44px",
                touchAction: "manipulation",
                pointerEvents: "auto",
              }}
            >
              <Waves className="w-3.5 h-3.5" />
              Enter Zen Beach
            </button>
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
        onInputFocus={onLoungeInputFocus}
        onVoiceActive={onVoiceActive}
        blockedUsers={blockedUsers}
      />

      {/* ── Vibe Check Panel (slide-up) ────────────────────────── */}
      <VibeCheckPanel
        open={vibeCheckOpen}
        onClose={() => { setVibeCheckOpen(false); onMobileModalChange?.(false); }}
        isMobile={isMobile}
      />

      {/* ── Academy Panel (slide-up) ────────────────────────────── */}
      <AcademyPanel
        open={academyOpen}
        onClose={() => { setAcademyOpen(false); onMobileModalChange?.(false); }}
        isMobile={isMobile}
      />

      {/* ── Shop Panel (slide-up) ──────────────────────────────── */}
      <ShopPanel
        open={shopOpen}
        onClose={() => { setShopOpen(false); onMobileModalChange?.(false); }}
        isMobile={isMobile}
      />

      {/* ── Zen Beach Panel (slide-up) ────────────────────────── */}
      <ZenBeachPanel
        open={zenBeachOpen}
        onClose={() => { setZenBeachOpen(false); onMobileModalChange?.(false); }}
        isMobile={isMobile}
      />

      {/* ── Jukebox Panel ────────────────────────────────────────── */}
      <JukeboxPanel
        open={jukeboxOpen}
        onClose={() => { setJukeboxOpen(false); onMobileModalChange?.(false); }}
        isMobile={isMobile}
      />

      {/* ── Emote Panel (popup) ────────────────────────────────── */}
      <EmotePanel
        open={emotePanelOpen}
        onClose={() => { setEmotePanelOpen(false); }}
        onEmote={(emote) => { onEmote?.(emote); }}
        onStopDance={onStopDance}
        isDancing={isDancing}
        isMobile={isMobile}
      />

      {/* ── User Interaction Menu ──────────────────────────────── */}
      <UserInteractionMenu
        open={!!userInteractionTarget}
        targetUser={userInteractionTarget}
        onClose={onCloseUserMenu}
        onRequestChat={() => {
          if (userInteractionTarget) {
            onRequestChat(userInteractionTarget.user_id || userInteractionTarget.id, userInteractionTarget.username);
          }
        }}
        onRequestVoiceChat={() => {
          if (userInteractionTarget) {
            onRequestVoiceChat(userInteractionTarget.user_id || userInteractionTarget.id, userInteractionTarget.username);
          }
        }}
        onBlock={() => {
          if (userInteractionTarget) {
            onBlockUser(userInteractionTarget.user_id || userInteractionTarget.id);
          }
        }}
        onReport={() => onReportUser(userInteractionTarget)}
        isBlocked={!!(userInteractionTarget && blockedUsers[userInteractionTarget.user_id || userInteractionTarget.id])}
        isMobile={isMobile}
      />

      {/* ── Incoming Chat Request ──────────────────────────────── */}
      <IncomingChatRequest
        request={incomingRequest}
        onAccept={() => {
          if (incomingRequest) {
            onAcceptChat(incomingRequest.id, incomingRequest.fromUserId, incomingRequest.fromUsername);
          }
        }}
        onDecline={() => {
          if (incomingRequest) {
            onDeclineChat(incomingRequest.id, incomingRequest.fromUserId);
          }
        }}
        isMobile={isMobile}
      />

      {/* ── Private Chat Panel ──────────────────────────────────── */}
      <PrivateChatPanel
        open={!!activeChatPeer}
        peer={activeChatPeer}
        messages={chatMessages}
        onSend={onSendChatMessage}
        onEnd={onEndChat}
        onBlock={() => {
          if (activeChatPeer) onBlockUser(activeChatPeer.userId);
        }}
        onReport={() => onReportUser(activeChatPeer)}
        currentUserId={currentUserId}
        safetyConfirmed={safetyConfirmed}
        onSafetyConfirm={onSafetyConfirm}
        isMobile={isMobile}
      />
    </>
  );
}