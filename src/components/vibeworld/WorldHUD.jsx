import React, { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Music4, Tv2, MessageCircle, Sun, X, UserCircle,
  Compass, Sparkles, Library, SkipForward,
  BookOpen, GraduationCap, Bell, Waves, Volume2, VolumeX, Users,
} from "lucide-react";

// ── Stage auto-hide controls hook ────────────────────────────────
function useStageAutoHide(active, tvMode) {
  const [visible, setVisible] = useState(true);
  const timerRef = useRef(null);
  const delay = tvMode ? 2000 : 3000;

  const show = useCallback(() => {
    setVisible(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setVisible(false), delay);
  }, [delay]);

  // Show on entry, then auto-hide
  useEffect(() => {
    if (!active) { setVisible(true); if (timerRef.current) clearTimeout(timerRef.current); return; }
    show();
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [active]);

  return { visible, show };
}
import { Link, useNavigate } from "react-router-dom";
import { usePlayer } from "@/context/PlayerContext";
import { detectZone, ZONES } from "./zoneDetection";
import MusicLibraryPanel from "./panels/MusicLibraryPanel";
import LoungePanel from "./panels/LoungePanel";
import VisualizerPanel from "./panels/VisualizerPanel";
import VibeCheckPanel from "./panels/VibeCheckPanel";
import PrivateChatPanel from "./panels/PrivateChatPanel";
import AcademyPanel from "./panels/AcademyPanel";
// ShopPanel temporarily disabled
// import ShopPanel from "./panels/ShopPanel";
import FerrisWheelPanel from "./panels/FerrisWheelPanel";
import ZenBeachPanel from "./panels/ZenBeachPanel";
import EmotePanel from "./panels/EmotePanel";
import JukeboxPanel from "./panels/JukeboxPanel";
import InWorldSongPage from "./panels/InWorldSongPage";
import SocialPanel from "./panels/SocialPanel";
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
  ferriswheel: Sparkles,
};

export default function WorldHUD({
  playerX, playerZ, playerRot, playerPos, forceOpenPanel,
  isMobile, mobileLayout, loading,
  stageVideoTitle,
  stageWatching,
  stageFullScreen = false,
  stageVideosCount,
  onStageWatchVideo,
  onStageExitWatchMode,
  onStageNextVideo,
  onStagePlaySong,
  onStageFullScreen,
  onStageExitFullScreen,
  onStageMuteToggle,
  stageMuted = true,
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
  activeEmote = null,
  onEditAvatar,
  nearJukebox = false,
  djTrack = null,
  onFerrisRideChange,
  // Follow system
  followSystem,
}) {
  const [chatWarningVisible, setChatWarningVisible] = useState(false);
  const [showZoneLabel, setShowZoneLabel] = useState(false);
  const zoneFadeTimerRef = useRef(null);
  const { currentTrack, isPlaying, togglePlay, playTrack } = usePlayer() || {};
  const zone = detectZone(playerX, playerZ);

  // Stage auto-hide controls (watching or fullscreen mode)
  const stageActive = zone?.id === "stage" && (stageWatching || stageFullScreen);
  const { visible: stageControlsVisible, show: showStageControls } = useStageAutoHide(stageActive, false);

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

  // Derive safe bottom values from mobileLayout (real iPhone viewport) or fallback
  // actionBottom: px from bottom of screen for zone action buttons
  // djCardBottom: px from bottom for DJ card
  const actionBottomPx = isMobile && mobileLayout
    ? mobileLayout.actionBottom
    : isMobile ? 248 : null; // null = use CSS calc fallback
  const djCardBottomPx = isMobile && mobileLayout
    ? mobileLayout.djCardBottom
    : isMobile ? 232 : null;

  // Helper: returns style object for bottom positioning
  const actionStyle = (desktopBottom = "6.5rem") => ({
    paddingBottom: isMobile && actionBottomPx !== null
      ? `${actionBottomPx}px`
      : isMobile
        ? "calc(env(safe-area-inset-bottom, 0px) + 248px)"
        : `calc(env(safe-area-inset-bottom, 0px) + ${desktopBottom})`,
    pointerEvents: "none",
  });

  // Panel states
  const [musicPanelOpen, setMusicPanelOpen] = useState(false);
  const [loungePanelOpen, setLoungePanelOpen] = useState(false);

  // Force open a panel when returning from SongPage
  useEffect(() => {
    if (!forceOpenPanel) return;
    if (forceOpenPanel === "music_library") {
      setMusicPanelOpen(true);
      onMobileModalChange?.(true);
    }
  }, [forceOpenPanel]);
  const [visualizerOpen, setVisualizerOpen] = useState(false);
  const [vibeCheckOpen, setVibeCheckOpen] = useState(false);
  const [academyOpen, setAcademyOpen] = useState(false);
  const [ferrisWheelOpen, setFerrisWheelOpen] = useState(false);
  const [isRiding, setIsRiding] = useState(false);
  const [zenBeachOpen, setZenBeachOpen] = useState(false);
  const [emotePanelOpen, setEmotePanelOpen] = useState(false);
  const [requestsOpen, setRequestsOpen] = useState(false);
  const [jukeboxOpen, setJukeboxOpen] = useState(false);
  const [djSongPageOpen, setDjSongPageOpen] = useState(false);
  const [socialPanelOpen, setSocialPanelOpen] = useState(false);

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
      {/* ── Zone indicator — hidden when watching stage to keep video clean ── */}
      {zone && !stageWatching && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: showZoneLabel ? 0.6 : 0, y: 0 }}
          transition={{ duration: 0.4 }}
          className="absolute top-0 left-1/2 z-[50] pointer-events-none"
          style={{
            transform: "translateX(-50%)",
            paddingTop: isMobile && mobileLayout
              ? `${mobileLayout.sa.top + 56}px`
              : isMobile ? "calc(env(safe-area-inset-top, 0px) + 3.5rem)" : "4rem",
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

      {/* ── Online count + Requests bell — hidden during stage watch ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: stageWatching ? 0 : 1, y: 0 }}
        style={{ pointerEvents: stageWatching ? "none" : "auto" }}
        className="absolute top-0 right-1.5 z-[56] flex items-center gap-1.5"
        style={{
          paddingTop: isMobile && mobileLayout
            ? `${mobileLayout.sa.top + 54}px`
            : isMobile ? "calc(env(safe-area-inset-top, 0px) + 3.4rem)" : "4.5rem",
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

        {/* Social (followers) button */}
        {followSystem && currentUserId && (
          <button
            onTouchStart={(e) => e.stopPropagation()}
            onClick={() => { hapticTap(); setSocialPanelOpen(true); }}
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
            title="Social / Friends"
          >
            <Users style={{ width: isMobile ? 11 : 13, height: isMobile ? 11 : 13 }}
              color="rgba(155,126,255,0.8)" />
          </button>
        )}

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

      {/* ── DJ Now Playing card — larger song card above DJ Booth when near jukebox ── */}
      <AnimatePresence>
        {nearJukebox && djTrack && !jukeboxOpen && !stageWatching && (
          <motion.div
            key="dj-song-card"
            initial={{ opacity: 0, y: 16, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.92 }}
            transition={{ type: "spring", damping: 26, stiffness: 300 }}
            className="absolute z-[57] pointer-events-auto"
            style={{
              bottom: isMobile && djCardBottomPx !== null
                ? djCardBottomPx
                : isMobile
                  ? "calc(env(safe-area-inset-bottom, 0px) + 14.5rem)"
                  : "calc(env(safe-area-inset-bottom, 0px) + 11rem)",
              left: "50%",
              transform: "translateX(-50%)",
              width: isMobile ? "min(calc(100vw - 120px), 144px)" : "168px",
            }}
          >
            <button
              onTouchStart={(e) => e.stopPropagation()}
              onClick={() => {
                hapticTap();
                try {
                  sessionStorage.setItem("vibeworld_avatar_x", String(playerX || 0));
                  sessionStorage.setItem("vibeworld_avatar_z", String(playerZ || 0));
                  sessionStorage.setItem("vibeworld_avatar_rot", String(playerRot || 0));
                } catch {}
                setDjSongPageOpen(true);
              }}
              className="w-full rounded-2xl transition-all hover:brightness-110 active:scale-[0.97] text-left"
              style={{
                background: "rgba(5,4,18,0.96)",
                border: "1px solid rgba(0,229,255,0.28)",
                backdropFilter: "blur(20px)",
                boxShadow: "0 0 32px rgba(196,59,255,0.22), 0 8px 32px rgba(0,0,0,0.6)",
                touchAction: "manipulation",
                overflow: "hidden",
              }}
            >
              {/* Cover art — 16:9 thumbnail */}
              <div className="relative w-full" style={{ aspectRatio: "16/9", maxHeight: isMobile ? "60px" : "95px", overflow: "hidden" }}>
                {djTrack.cover_url ? (
                  <img src={djTrack.cover_url} alt={djTrack.title}
                    className="w-full h-full object-cover block" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg,rgba(196,59,255,0.25),rgba(0,229,255,0.15))" }}>
                    <span style={{ fontSize: "36px" }}>🎧</span>
                  </div>
                )}
                {/* Gradient overlay for text legibility */}
                <div className="absolute inset-x-0 bottom-0 h-1/2"
                  style={{ background: "linear-gradient(to top, rgba(5,4,18,1) 0%, transparent 100%)" }} />
                {/* LIVE DJ badge */}
                <div className="absolute top-1 left-1 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full"
                  style={{ background: "rgba(255,75,195,0.2)", border: "1px solid rgba(255,75,195,0.4)", backdropFilter: "blur(8px)" }}>
                  <div className="w-1 h-1 rounded-full animate-pulse flex-shrink-0" style={{ background: "#FF4FC3" }} />
                  <span className="font-black text-[7px] tracking-widest" style={{ color: "#FF4FC3" }}>LIVE DJ</span>
                </div>
              </div>

              {/* Track info */}
              <div className="px-2 pt-1 pb-2">
                <p className="font-heading font-black text-white text-[10px] leading-tight truncate">{djTrack.title}</p>
                <div className="flex items-center justify-between mt-0.5">
                  <p className="text-[8px] truncate" style={{ color: "rgba(255,255,255,0.4)" }}>
                    {djTrack.artist_display || "Upper Vibe Media"}
                  </p>
                  <span className="text-[7px] font-black tracking-wider flex-shrink-0 ml-1"
                    style={{ color: "rgba(0,229,255,0.6)" }}>
                    tap
                  </span>
                </div>
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Zone-specific action buttons — hidden entirely when watching stage video ── */}
      <AnimatePresence>
        {zone?.id === "plaza" && !stageWatching && (
          <motion.div
            key="plaza-actions"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-0 right-0 z-[57] flex flex-col items-end gap-2 px-3"
            style={actionStyle("9rem")}
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
                🎧 Live DJ
              </button>
            )}
            {isDancing ? (
              <button
                onTouchStart={(e) => e.stopPropagation()}
                onClick={() => { hapticTap(); onStopDance?.(); }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full font-black text-[10px] tracking-wider transition-all hover:brightness-110 active:scale-95"
                style={{
                  background: activeEmote ? `${activeEmote.color}18` : "rgba(255,255,255,0.1)",
                  border: `1px solid ${activeEmote ? activeEmote.color + "44" : "rgba(255,255,255,0.15)"}`,
                  color: activeEmote ? activeEmote.color : "rgba(255,255,255,0.7)",
                  minHeight: isMobile ? 36 : 40,
                  touchAction: "manipulation",
                  pointerEvents: "auto",
                }}
              >
                <X className="w-3 h-3" />
                {activeEmote?.id !== "dance" ? `Stop ${activeEmote?.label || "Emote"}` : "Stop Dance"}
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

        {zone?.id === "stage" && !stageFullScreen && (
          <>
            {/* ── Tap-to-show ghost layer (when watching) — sits BEHIND joystick/camera zones ── */}
            {stageWatching && (
              <div
                className="fixed z-[195]"
                style={{
                  // Cover only the upper 60% of the screen — leaves joystick area free
                  top: 0, left: 0, right: 0,
                  height: "60%",
                  pointerEvents: "auto",
                  background: "transparent",
                }}
                onClick={() => showStageControls()}
                onTouchStart={() => showStageControls()}
              />
            )}

            {/* ── Auto-hide control bar (not shown in fullscreen — StageFullScreen owns that UI) ── */}
            <motion.div
              key="stage-actions"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: !stageWatching || stageControlsVisible ? 1 : 0, y: 0 }}
              transition={{ duration: 0.25 }}
              className="fixed left-0 right-0 z-[200] flex flex-col items-center gap-1.5 px-2"
              style={{
                bottom: isMobile && mobileLayout
                  ? mobileLayout.sa.bottom + 8
                  : isMobile
                    ? "calc(env(safe-area-inset-bottom, 0px) + 0.5rem)"
                    : "1.25rem",
                pointerEvents: !stageWatching || stageControlsVisible ? "auto" : "none",
              }}
            >
              {/* Title pill — only when not watching and not in fullscreen (fullscreen has its own title) */}
              {!stageWatching && !stageFullScreen && stageVideoTitle && (
                <div
                  className="px-3 py-1 rounded-full pointer-events-none"
                  style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <p className="text-[9px] text-white/50 font-medium tracking-wider truncate max-w-[60vw] text-center">
                    {isMobile
                      ? stageVideoTitle.substring(0, 30) + (stageVideoTitle.length > 30 ? "…" : "")
                      : `Now Showing: ${stageVideoTitle.substring(0, 44)}${stageVideoTitle.length > 44 ? "…" : ""}`}
                  </p>
                </div>
              )}

              {/* Control bar */}
              <div
                className="flex flex-wrap items-center gap-1.5 justify-center px-3 py-2 rounded-2xl"
                style={{
                  background: stageWatching ? "rgba(0,0,0,0.60)" : "rgba(0,0,0,0.80)",
                  backdropFilter: "blur(16px)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
                }}
                onTouchStart={() => showStageControls()}
                onClick={() => showStageControls()}
              >
                {/* Audio — only when watching */}
                {stageWatching && onStageMuteToggle && (
                  <button
                    onTouchStart={(e) => { e.stopPropagation(); hapticTap(); onStageMuteToggle(); showStageControls(); }}
                    onClick={(e) => { e.stopPropagation(); hapticTap(); onStageMuteToggle(); showStageControls(); }}
                    className="flex items-center justify-center rounded-full transition-all hover:brightness-110 active:scale-95"
                    style={{
                      background: stageMuted ? "rgba(255,255,255,0.1)" : "rgba(124,58,237,0.45)",
                      border: `1px solid ${stageMuted ? "rgba(255,255,255,0.2)" : "rgba(155,126,255,0.55)"}`,
                      color: stageMuted ? "rgba(255,255,255,0.65)" : "#fff",
                      width: 36, height: 36, minWidth: 36, minHeight: 36,
                      touchAction: "manipulation",
                    }}
                    title={stageMuted ? "Unmute Stage" : "Mute Stage"}
                  >
                    {stageMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                  </button>
                )}

                {/* Watch Stage / Exit Watch */}
                {stageWatching ? (
                  <button
                    onTouchStart={(e) => e.stopPropagation()}
                    onClick={() => { hapticTap(); onStageExitWatchMode(); showStageControls(); }}
                    className="flex items-center gap-1 px-3 py-2 rounded-full font-black text-[10px] tracking-wider transition-all hover:brightness-110 active:scale-95"
                    style={{ background: "linear-gradient(135deg,#7C3AED,#9B7EFF)", color: "#fff", minHeight: "36px", touchAction: "manipulation" }}
                  >
                    <Music4 className="w-3 h-3" /> Exit Watch
                  </button>
                ) : (
                  <button
                    onTouchStart={(e) => e.stopPropagation()}
                    onClick={() => { hapticTap(); onStageWatchVideo(); }}
                    className="flex items-center gap-1 px-3 py-2 rounded-full font-black text-[10px] tracking-wider transition-all hover:brightness-110 active:scale-95"
                    style={{ background: "linear-gradient(135deg,#7C3AED,#9B7EFF)", color: "#fff", boxShadow: "0 0 14px rgba(155,126,255,0.35)", minHeight: "36px", touchAction: "manipulation" }}
                  >
                    <Music4 className="w-3 h-3" /> Watch Stage
                  </button>
                )}

                {/* Full Screen */}
                {onStageFullScreen && (
                  <button
                    onTouchStart={(e) => e.stopPropagation()}
                    onClick={() => { hapticTap(); onStageFullScreen(); }}
                    className="flex items-center gap-1 px-3 py-2 rounded-full font-black text-[10px] tracking-wider transition-all hover:brightness-110 active:scale-95"
                    style={{ background: "linear-gradient(135deg,#0080B8,#00A0DC)", color: "#fff", boxShadow: "0 0 14px rgba(0,160,220,0.35)", minHeight: "36px", touchAction: "manipulation" }}
                  >
                    <Tv2 className="w-3 h-3" /> Full Screen
                  </button>
                )}

                {/* Next */}
                <button
                  onTouchStart={(e) => e.stopPropagation()}
                  onClick={() => { hapticTap(); onStageNextVideo(); showStageControls(); }}
                  className="flex items-center gap-1 px-3 py-2 rounded-full font-black text-[10px] tracking-wider transition-all hover:brightness-110 active:scale-95"
                  style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.7)", minHeight: "36px", touchAction: "manipulation" }}
                >
                  <SkipForward className="w-3 h-3" /> Next
                </button>

                {/* Play Song */}
                {onStagePlaySong && (
                  <button
                    onTouchStart={(e) => e.stopPropagation()}
                    onClick={() => { hapticTap(); onStagePlaySong(); showStageControls(); }}
                    className="flex items-center gap-1 px-3 py-2 rounded-full font-black text-[10px] tracking-wider transition-all hover:brightness-110 active:scale-95"
                    style={{ background: "linear-gradient(135deg,#0080B8,#00A0DC)", color: "#fff", minHeight: "36px", touchAction: "manipulation" }}
                  >
                    <Music4 className="w-3 h-3" /> Play Song
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}

        {zone?.id === "dome" && (
          <motion.div
            key="dome-actions"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-0 left-0 right-0 z-[57] flex flex-col items-center gap-2 px-4"
            style={actionStyle()}
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
            style={actionStyle()}
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
            style={actionStyle()}
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
            style={actionStyle()}
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
            style={actionStyle()}
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

        {zone?.id === "ferriswheel" && !isRiding && (
          <motion.div
            key="ferriswheel-actions"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-0 left-0 right-0 z-[57] flex flex-col items-center gap-2 px-4"
            style={actionStyle()}
          >
            <p className="text-[10px] text-white/40 tracking-wider">Your music keeps playing</p>
            <button
              onTouchStart={(e) => e.stopPropagation()}
              onClick={() => {
                hapticTap();
                setIsRiding(true);
                onFerrisRideChange?.(true);
              }}
              className="flex items-center gap-2 px-6 py-3 rounded-full font-black text-sm tracking-wider transition-all hover:brightness-110 active:scale-95"
              style={{
                background: "linear-gradient(135deg,#00B8D4,#00E5FF)",
                color: "#000",
                boxShadow: "0 0 24px rgba(0,184,212,0.45)",
                minHeight: "52px",
                touchAction: "manipulation",
                pointerEvents: "auto",
              }}
            >
              🎡 Ride Wheel
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
            style={actionStyle()}
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
            style={actionStyle()}
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
        playerPos={playerPos}
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

      {/* ── Ferris Wheel Panel ────────────────────────────────────── */}
      <FerrisWheelPanel
        open={ferrisWheelOpen}
        onClose={() => { setFerrisWheelOpen(false); onMobileModalChange?.(false); }}
        onRide={() => {
          setFerrisWheelOpen(false);
          setIsRiding(true);
          onFerrisRideChange?.(true);
          onMobileModalChange?.(false);
        }}
        isRiding={isRiding}
        onExitRide={() => {
          setIsRiding(false);
          onFerrisRideChange?.(false);
          try { navigator?.vibrate?.(15); } catch {}
        }}
        isMobile={isMobile}
        mobileLayout={mobileLayout}
      />


      {/* ── Zen Beach Panel (slide-up) ────────────────────────── */}
      <ZenBeachPanel
        open={zenBeachOpen}
        onClose={() => { setZenBeachOpen(false); onMobileModalChange?.(false); }}
        isMobile={isMobile}
      />

      {/* ── DJ Booth Panel ────────────────────────────────────────── */}
      <JukeboxPanel
        open={jukeboxOpen}
        onClose={() => { setJukeboxOpen(false); onMobileModalChange?.(false); }}
        isMobile={isMobile}
        djTrack={djTrack}
      />

      {/* ── DJ Song Info Page (opened from floating cover chip) ── */}
      <AnimatePresence>
        {djSongPageOpen && djTrack && (
          <InWorldSongPage
            track={djTrack}
            onClose={() => setDjSongPageOpen(false)}
            isMobile={isMobile}
            sourceComponent="dj_booth"
          />
        )}
      </AnimatePresence>

      {/* ── Emote Panel (popup) ────────────────────────────────── */}
      <EmotePanel
        open={emotePanelOpen}
        onClose={() => { setEmotePanelOpen(false); }}
        onEmote={(emote) => { onEmote?.(emote); }}
        onStopDance={onStopDance}
        isDancing={isDancing}
        activeEmote={activeEmote}
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
        currentUserId={currentUserId}
        isFollowing={followSystem?.isFollowing}
        onFollow={followSystem?.follow}
        onUnfollow={followSystem?.unfollow}
        followerCounts={followSystem?.followerCounts}
        followingCounts={followSystem?.followingCounts}
        onLoadCounts={followSystem?.loadCountsForUser}
      />

      {/* ── Social Panel (followers/following) ──────────────────── */}
      <AnimatePresence>
        {socialPanelOpen && (
          <SocialPanel
            open={socialPanelOpen}
            onClose={() => setSocialPanelOpen(false)}
            isMobile={isMobile}
            currentUserId={currentUserId}
            isFollowing={followSystem?.isFollowing}
            onFollow={followSystem?.follow}
            onUnfollow={followSystem?.unfollow}
            loadMyFollows={followSystem?.loadMyFollows}
            activeUsers={activeUsers}
          />
        )}
      </AnimatePresence>

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