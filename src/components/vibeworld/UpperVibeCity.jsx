import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Tv2 } from "lucide-react";
import MobileJoystick from "@/components/vibeworld/MobileJoystick";
import CameraLookZone from "@/components/vibeworld/CameraLookZone";
import DraggableMediaPlayer from "@/components/vibeworld/DraggableMediaPlayer";
import CityCanvas from "@/components/vibeworld/CityCanvas";
import { retintAvatar } from "@/components/vibeworld/AvatarModel";
import StageCoverVisualizer from "@/components/vibeworld/StageCoverVisualizer";
import StageFullScreen from "@/components/vibeworld/StageFullScreen";
import StageVideoEmbed from "@/components/vibeworld/StageVideoEmbed";
import { usePlayer } from "@/context/PlayerContext";
import { useRadio } from "@/context/RadioContext";
import { useAuth } from "@/lib/AuthContext";
import usePersonalizedFeed from "@/hooks/usePersonalizedFeed";
import useVibeWorldPresence from "@/hooks/useVibeWorldPresence";
import usePrivateChat from "@/hooks/usePrivateChat";
import { detectZone } from "@/components/vibeworld/zoneDetection";
import { base44 } from "@/api/base44Client";
import WorldHUD from "@/components/vibeworld/WorldHUD";
import RPMAvatarCreator from "@/components/vibeworld/RPMAvatarCreator";
import AvatarCustomizerPanel from "@/components/vibeworld/AvatarCustomizerPanel";
import OrbRewardSystem from "@/components/vibeworld/OrbRewardSystem";
import OrbLeaderboard from "@/components/vibeworld/OrbLeaderboard";
import useWorldDJStream from "@/hooks/useWorldDJStream";
import HoverboardPanel from "@/components/vibeworld/panels/HoverboardPanel";
import { HOVERBOARD_START, HOVERBOARD_INTERACT_RADIUS } from "@/components/vibeworld/HoverboardRingRun";
import { CRYSTAL_ZONE_X, CRYSTAL_ZONE_Z, CRYSTAL_INTERACT_RADIUS } from "@/components/vibeworld/CrystalZone";
import { getOrbBank, addToOrbBank, updateZoneBest, getZoneBests } from "@/lib/orbBank";
import EmojiEmote from "@/components/vibeworld/EmojiEmote";
import useFollowSystem from "@/hooks/useFollowSystem";
import useMobileLayout from "@/hooks/useMobileLayout";
import MobileDebugOverlay from "@/components/vibeworld/MobileDebugOverlay";
import PerfAuditOverlay from "@/components/vibeworld/PerfAuditOverlay";
import TvModeOverlay from "@/components/vibeworld/TvModeOverlay";

// Read saved return position from sessionStorage (set before navigating to SongPage)
function readReturnState() {
  try {
    const x = parseFloat(sessionStorage.getItem("vibeworld_avatar_x") || "NaN");
    const z = parseFloat(sessionStorage.getItem("vibeworld_avatar_z") || "NaN");
    const rot = parseFloat(sessionStorage.getItem("vibeworld_avatar_rot") || "0");
    const panel = sessionStorage.getItem("vibeworld_open_panel") || null;
    if (!isNaN(x) && !isNaN(z)) return { x, z, rot, panel };
  } catch {}
  return null;
}

function clearReturnState() {
  try {
    ["vibeworld_avatar_x","vibeworld_avatar_z","vibeworld_avatar_rot","vibeworld_open_panel",
     "vibeworld_source","vibeworld_scroll","vibeworld_selected_song"].forEach(k => sessionStorage.removeItem(k));
  } catch {}
}

export default function UpperVibeCity({ onExit, chatAgeConfirmed = false }) {
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const mobileLayout = useMobileLayout(isMobile);
  const [playerPos, setPlayerPos] = useState({ x: 0, z: 5, rot: 0, animState: "idle" });
  // Restore saved return state (position + panel) when returning from SongPage
  const returnState = useRef(readReturnState());
  const returnStateApplied = useRef(false);
  const prevPosRef = useRef({ x: 0, z: 5 });
  const [stageCanvas, setStageCanvas] = useState(null);
  const audioIntensityRef = useRef(0);
  const audioBassRef = useRef(0);
  const audioBeatRef = useRef(0);
  const mobileInputRef = useRef({ x: 0, y: 0, camDx: 0 });
  const [mobileModalOpen, setMobileModalOpen] = useState(false);
  const [editAvatarOpen, setEditAvatarOpen] = useState(false);
  const [customizerOpen, setCustomizerOpen] = useState(false);
  const [avatarVersion, setAvatarVersion] = useState(0); // bump to re-read user data
  const [nearJukebox, setNearJukebox] = useState(false);
  const jukeboxProxVolRef = useRef(1.0);
  const onDanceFloorRef = useRef(false);
  // Launch zone state
  const launchRef = useRef(null);
  const [nearLaunchPad, setNearLaunchPad] = useState(false);
  const [isAirborne, setIsAirborne] = useState(false);
  const [orbCount, setOrbCount] = useState(0);         // launch session orbs
  const [launchSessionOrbs, setLaunchSessionOrbs] = useState(0); // tracked per launch
  const launchSessionRef = useRef(0);
  // ── Hoverboard Ring Run state ─────────────────────────────────
  const [nearHoverboard, setNearHoverboard] = useState(false);
  const [hbRiding, setHbRiding] = useState(false);
  // Crystal Zone
  const [nearCrystal, setNearCrystal] = useState(false);
  const [crystalAura, setCrystalAura] = useState(false);
  const [crystalMsg, setCrystalMsg] = useState(false);
  const crystalAuraTimerRef = useRef(null);
  const crystalSceneRef = useRef(null);
  const rendererRef = useRef(null);
  const [orbBank, setOrbBank] = useState(() => getOrbBank());

  const jukeboxFadeRef = useRef(null);        // kept for cleanup compat

  // ── Dance Floor / Emote state ─────────────────────────────────────────────
  const [isDancing, setIsDancing] = useState(false);
  const isDancingRef = useRef(false);
  isDancingRef.current = isDancing;
  const [activeEmote, setActiveEmote] = useState(null); // { id, label, color, effect, startedAt }
  const emoteTimerRef = useRef(null);
  const wasMovingRef = useRef(false);

  const handleEmote = useCallback((emote) => {
    // Clear any existing emote timer
    if (emoteTimerRef.current) clearTimeout(emoteTimerRef.current);

    // All emotes drive isDancing=true so procedural pose runs in updateAvatarAnimation
    setIsDancing(true);
    setActiveEmote({ ...emote, startedAt: Date.now() });

    if (emote.id !== "dance" && emote.id !== "vibe") {
      // Short emotes (clap, wave, celebrate) auto-expire after 3s
      emoteTimerRef.current = setTimeout(() => {
        setIsDancing(false);
        setActiveEmote(null);
      }, 3000);
    }
    // "dance" and "vibe" loop until stopped manually or by movement
    // "dance" persists until handleStopDance() or movement cancels it
  }, []);

  const handleStopDance = useCallback(() => {
    setIsDancing(false);
    setActiveEmote(null);
    if (emoteTimerRef.current) clearTimeout(emoteTimerRef.current);
  }, []);

  // ── Auto-cancel dance on movement ──────────────────────────────────────────
  const danceMovingRef = useRef(false);
  danceMovingRef.current = false; // Reset each render

  useEffect(() => {
    if (!isDancing) return;
    const prev = prevPosRef.current;
    const dx = playerPos.x - prev.x;
    const dz = playerPos.z - prev.z;
    const speed = Math.sqrt(dx * dx + dz * dz);
    if (speed > 0.015) {
      setIsDancing(false);
      setActiveEmote(null);
      if (emoteTimerRef.current) clearTimeout(emoteTimerRef.current);
    }
  }, [playerPos.x, playerPos.z, isDancing]);

  // Cleanup emote timer on unmount
  useEffect(() => {
    return () => {
      if (emoteTimerRef.current) clearTimeout(emoteTimerRef.current);
    };
  }, []);

  // ── TV Mode — hides joystick/camera visuals for clean mirrored view ──────────
  const [tvMode, setTvMode] = useState(false);
  const [tvQuality, setTvQuality] = useState("smooth"); // "smooth" | "normal"
  const [tvOverlayOpen, setTvOverlayOpen] = useState(false);
  // In TV mode: auto-hide media player after 4s; tap to reveal temporarily
  const [tvPlayerVisible, setTvPlayerVisible] = useState(true);
  const tvPlayerTimerRef = useRef(null);

  const enableTvMode = useCallback((quality = "smooth") => {
    setTvQuality(quality);
    setTvMode(true);
    setTvPlayerVisible(true);
    if (tvPlayerTimerRef.current) clearTimeout(tvPlayerTimerRef.current);
    tvPlayerTimerRef.current = setTimeout(() => setTvPlayerVisible(false), 4000);
  }, []);

  const disableTvMode = useCallback(() => {
    setTvMode(false);
    setTvPlayerVisible(true);
    if (tvPlayerTimerRef.current) clearTimeout(tvPlayerTimerRef.current);
  }, []);

  const handleTvPlayerTap = useCallback(() => {
    if (!tvMode) return;
    setTvPlayerVisible(true);
    if (tvPlayerTimerRef.current) clearTimeout(tvPlayerTimerRef.current);
    tvPlayerTimerRef.current = setTimeout(() => setTvPlayerVisible(false), 5000);
  }, [tvMode]);

  useEffect(() => {
    return () => { if (tvPlayerTimerRef.current) clearTimeout(tvPlayerTimerRef.current); };
  }, []);

  const [openPanelOnLoad, setOpenPanelOnLoad] = useState(null);
  // Clear forceOpenPanel after WorldHUD processes it so it doesn't re-trigger
  useEffect(() => {
    if (!openPanelOnLoad) return;
    const t = setTimeout(() => setOpenPanelOnLoad(null), 1500);
    return () => clearTimeout(t);
  }, [openPanelOnLoad]);

  // ── Stage video state ──────────────────────────────────────────────────
  const [stageVideos, setStageVideos] = useState([]);
  const [stageVideoIdx, setStageVideoIdx] = useState(0);
  const [stageWatching, setStageWatching] = useState(false);
  const [stageFullScreen, setStageFullScreen] = useState(false);
  const [stageMuted, setStageMuted] = useState(true);
  const stagePausedPlayerRef = useRef(false);
  const stageEmbedRef = useRef(null);
  const stageScreenPosRef = useRef({ x: -9999, y: -9999, w: 0, h: 0 });
  const preFullscreenWasWatchingRef = useRef(false);
  const fullscreenPausedPlayerRef = useRef(false);
  const stageIsPlayingRef = useRef(false);
  const stageTogglePlayRef = useRef(null);

  useEffect(() => {
    setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
  }, []);

  // iOS Safari: prevent pull-to-refresh and rubber-banding inside the 3D world
  useEffect(() => {
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (!isIOS) return;
    const el = document.documentElement;
    const prevOverflow = el.style.overflow;
    el.style.overflow = "hidden";
    el.style.position = "fixed";
    el.style.width = "100%";
    el.style.overscrollBehavior = "none";
    return () => {
      el.style.overflow = prevOverflow;
      el.style.position = "";
      el.style.width = "";
      el.style.overscrollBehavior = "";
    };
  }, []);

  // ── Fetch YouTube playlist videos + randomize starting video ──────────
  useEffect(() => {
    base44.functions.invoke("getPlaylistVideos", {})
      .then((res) => {
        const videos = res?.data?.videos;
        if (videos?.length > 0) {
          setStageVideos(videos);
          // Randomize starting video so stage feels fresh each visit
          if (videos.length > 1) {
            setStageVideoIdx(Math.floor(Math.random() * videos.length));
          }
        }
      })
      .catch(() => {});
  }, []);

  // ── Stage video controls ───────────────────────────────────────────────
  const playerCtx = usePlayer();
  const radioCtx = useRadio();
  const { currentTrack, isPlaying, togglePlay, playTrack, skipTrack, registerNextHandler, clearPosition, audioRef } = playerCtx || {};
  const { allTracks, tracksLoaded } = radioCtx || {};
  const { user } = useAuth();
  const { sortedTracks, loading: feedLoading, profile: feedProfile } = usePersonalizedFeed(user?.id);

  // ── Avatar config derived from user data ──────────────────────────────
  // avatarTypeKey: read from sessionStorage (set by AvatarSetup or WorldGate on entry)
  // Falls back to user.avatar_type from profile, then "test-mixamo-female" as new default
  const [testAvatarTypeKey, setTestAvatarTypeKey] = useState(() => {
    try {
      const stored = sessionStorage.getItem("uvc_test_avatar");
      if (stored) return stored;
    } catch {}
    return "test-mixamo-female"; // new default: female avatar
  });

  const avatarConfig = {
    avatarType: user?.avatar_type || "neutral",
    skinTone: user?.skin_tone || "medium",
    rpmAvatarUrl: user?.rpm_avatar_url || null,
    outfitColorKey: user?.avatar_outfit_color || "electric-blue",
    avatarTypeKey: testAvatarTypeKey,
  };

  // Sync avatar type from user profile when user data arrives (returning users)
  const syncedAvatarRef = useRef(false);
  useEffect(() => {
    if (!user?.avatar_type || syncedAvatarRef.current) return;
    syncedAvatarRef.current = true;
    // Only override if sessionStorage doesn't already have a value (meaning WorldGate already set it)
    try {
      const stored = sessionStorage.getItem("uvc_test_avatar");
      if (!stored) {
        sessionStorage.setItem("uvc_test_avatar", user.avatar_type);
        setTestAvatarTypeKey(user.avatar_type);
      }
    } catch {}
  }, [user?.avatar_type]);

  // ── Ref to live in-world avatar retint function exposed by CityCanvas ──
  const retintInWorldRef = useRef(null);

  // Apply saved outfit color once the world finishes loading (covers late user-data case)
  const appliedInitialColorRef = useRef(false);
  useEffect(() => {
    if (loading || !user?.avatar_outfit_color || appliedInitialColorRef.current) return;
    // Retry a few times until retintRef is populated (GLB load may still be in progress)
    const COLOR_MAP = {
      "cosmic-blue":    "#00AADD",
      "neon-purple":    "#7B2FFF",
      "shadow-black":   "#080A0F",
      "rose-glow":      "#CC2288",
      "gold-aura":      "#CC9900",
      // legacy keys
      "electric-blue":  "#00AADD",
      "cosmic-black":   "#080A0F",
      "white-silver":   "#C8D4E0",
      "pink-rose":      "#CC2288",
      "gold-yellow":    "#CC9900",
    };
    const hex = COLOR_MAP[user.avatar_outfit_color];
    if (!hex) return;
    let attempts = 0;
    const tryApply = () => {
      if (retintInWorldRef.current) {
        appliedInitialColorRef.current = true;
        retintInWorldRef.current(hex);
      } else if (attempts < 20) {
        attempts++;
        setTimeout(tryApply, 300);
      }
    };
    tryApply();
  }, [loading, user?.avatar_outfit_color]);

  // ── Personalized feed continuous playback ──────────────────────────────
  const feedActiveRef = useRef(false);
  const feedStartedRef = useRef(false); // prevent auto-start from re-triggering on pause
  const feedIndexRef = useRef(0);
  const sortedTracksRef = useRef([]);
  sortedTracksRef.current = sortedTracks;
  const allTracksRef = useRef([]);
  allTracksRef.current = allTracks;

  // Register feed next handler: when a feed track ends, play the next one
  useEffect(() => {
  if (!registerNextHandler) return;
  const handleFeedNext = (fromSkip) => {
    if (!feedActiveRef.current) return; // Not in feed mode
    const sorted = sortedTracksRef.current;
    const all = allTracksRef.current;
    // Use personalized feed if loaded, otherwise fall back to allTracks
    const tracks = sorted?.length > 0 ? sorted : (all?.length > 0 ? all : []);
    if (!tracks?.length) return;
    const nextIdx = sorted?.length > 0
      ? (feedIndexRef.current + 1) % tracks.length
      : Math.floor(Math.random() * tracks.length);
    feedIndexRef.current = nextIdx;
    const next = tracks[nextIdx];
    if (next && playTrack) {
      playTrack(next, "song");
    }
  };
  registerNextHandler(handleFeedNext);
  }, [registerNextHandler, playTrack]);

  // ═══════════════════════════════════════════════════════════════
  // AUDIO COORDINATION — only one source plays at a time
  // ═══════════════════════════════════════════════════════════════

  /** Mute stage embed + exit watch state. Safe to call anytime. */
  const muteStage = useCallback(() => {
    setStageWatching(false);
    setStageMuted(true);
    if (stageEmbedRef.current) {
      stageEmbedRef.current.mute();
      stageEmbedRef.current.pause();
    }
  }, []);

  /** Toggle mute on the stage embed without affecting watch mode or movement. */
  const handleStageMuteToggle = useCallback(() => {
    setStageMuted((prev) => {
      const next = !prev;
      if (next) {
        stageEmbedRef.current?.mute();
      } else {
        stageEmbedRef.current?.unmute();
      }
      return next;
    });
  }, []);

  /** Pause global player if currently playing. Returns true if it was playing. */
  const pauseGlobal = useCallback(() => {
    if (isPlaying && togglePlay) {
      togglePlay();
      return true;
    }
    return false;
  }, [isPlaying, togglePlay]);

  /** Resume global player if it was paused by us and isn't already playing. */
  const resumeGlobalIfNeeded = useCallback((wasPlayingRef) => {
    if (wasPlayingRef.current && !isPlaying && togglePlay) {
      togglePlay();
    }
    wasPlayingRef.current = false;
  }, [isPlaying, togglePlay]);

  const handleWatchOnStage = useCallback(() => {
    // 1) Close fullscreen if it's open (mute its audio via unmount)
    if (stageFullScreen) setStageFullScreen(false);

    // 2) Mute all other sources
    pauseGlobal();
    stagePausedPlayerRef.current = true;

    // 3) Start stage audio — start muted (iOS), user can unmute via button
    setStageWatching(true);
    setStageMuted(true); // starts muted per iOS autoplay rules; button unmutes
    setTimeout(() => {
      stageEmbedRef.current?.play();
    }, 300);
  }, [stageFullScreen, pauseGlobal]);

  const handleExitWatchMode = useCallback(() => {
    muteStage();
    // Resume global player ONLY if fullscreen is not open
    if (!stageFullScreen) {
      resumeGlobalIfNeeded(stagePausedPlayerRef);
    }
    // Always clear the stage-paused flag so subsequent dance floor enter/exit
    // does not try to double-resume from a stale "was watching stage" state
    stagePausedPlayerRef.current = false;
  }, [muteStage, stageFullScreen, resumeGlobalIfNeeded]);

  const handleStageFullScreen = useCallback(() => {
    // Remember whether stage was watching before opening fullscreen
    preFullscreenWasWatchingRef.current = stageWatching;

    // 1) Mute stage audio
    muteStage();

    // 2) Pause global player
    if (pauseGlobal()) {
      fullscreenPausedPlayerRef.current = true;
    }

    // 3) Open fullscreen (iframe starts muted; user unmutes via button)
    setStageFullScreen(true);
  }, [stageWatching, muteStage, pauseGlobal]);

  const handleExitFullScreen = useCallback(() => {
    setStageFullScreen(false);

    // Restore previous audio state
    if (preFullscreenWasWatchingRef.current) {
      // Resume stage watching (muted — user taps to unmute)
      setStageWatching(true);
      setStageMuted(true);
      setTimeout(() => {
        stageEmbedRef.current?.play();
      }, 300);
    } else {
      // Resume global player if fullscreen had paused it
      resumeGlobalIfNeeded(fullscreenPausedPlayerRef);
    }
  }, [resumeGlobalIfNeeded]);

  // ── Input focus lock (typing in lounge chat) + voice ducking ──
  const [loungeInputFocused, setLoungeInputFocused] = useState(false);
  const [voiceActive, setVoiceActive] = useState(false);
  const preVoiceVolumeRef = useRef(null);

  // ── Movement locked when watching stage, full-screen, or typing ─
  const [ferrisRiding, setFerrisRiding] = useState(false);
  // Note: ferrisRiding is passed directly to CityCanvas — do NOT include it in movementLocked
  // because that would trigger the stage-lock camera branch inside CityCanvas.
  const movementLocked = stageWatching || stageFullScreen || loungeInputFocused;

  // ── Dance floor boundary — matches visual plaza edge (r=10.5) ─────────────
  // Audio fades in at the edge so music is audible as soon as the user reaches the floor.
  const DANCE_FLOOR_CX = 0, DANCE_FLOOR_CZ = -13, DANCE_FLOOR_R = 10.5;
  const dfDx = playerPos.x - DANCE_FLOOR_CX;
  const dfDz = playerPos.z - DANCE_FLOOR_CZ;
  const onDanceFloor = Math.sqrt(dfDx * dfDx + dfDz * dfDz) <= DANCE_FLOOR_R;
  const wasOnDanceFloorRef = useRef(false);
  const savedPersonalTimeRef = useRef(0);
  const danceFloorPausedRef = useRef(false);

  // ── World DJ Stream — strictly gated: volume only raises inside dance floor ──
  const { djAudioRef, djTrack } = useWorldDJStream({ enabled: true, danceFloorMode: onDanceFloor });

  // ── Hoverboard zone proximity detection ──────────────────────
  useEffect(() => {
    const hbdx = playerPos.x - HOVERBOARD_START.x;
    const hbdz = playerPos.z - HOVERBOARD_START.z;
    const dist = Math.sqrt(hbdx * hbdx + hbdz * hbdz);
    setNearHoverboard(dist < HOVERBOARD_INTERACT_RADIUS);
    // Crystal Zone proximity
    const cdx = playerPos.x - CRYSTAL_ZONE_X;
    const cdz = playerPos.z - CRYSTAL_ZONE_Z;
    setNearCrystal(Math.sqrt(cdx * cdx + cdz * cdz) < CRYSTAL_INTERACT_RADIUS);
  }, [playerPos.x, playerPos.z]);

  const handleActivateCrystal = useCallback(() => {
    if (crystalAura) return;
    // Trigger visual boost on the 3D crystal
    import("@/components/vibeworld/CrystalZone").then(({ activateCrystalZone }) => {
      // Access scene via CityCanvas internals is not possible directly —
      // we use a custom event instead
      window.dispatchEvent(new CustomEvent("crystalActivate"));
    });
    setCrystalAura(true);
    setCrystalMsg(true);
    try { navigator?.vibrate?.([30, 40, 60]); } catch {}
    if (crystalAuraTimerRef.current) clearTimeout(crystalAuraTimerRef.current);
    crystalAuraTimerRef.current = setTimeout(() => {
      setCrystalAura(false);
      setCrystalMsg(false);
    }, 4000);
  }, [crystalAura]);

  // Stable callbacks — never recreated, so endGame/startGame closures stay valid
  const handleHbStart = useCallback(() => {
    console.log("[HB] Ride started — mounting board");
    setHbRiding(true);
  }, []);
  const handleHbEnd = useCallback(() => {
    console.log("[HB] Ride ended — dismounting board");
    setHbRiding(false);
  }, []);

  // ── Audio ducking: reduce personal player + DJ stream to ~25% when voice is active ──
  useEffect(() => {
    const audio = audioRef?.current;
    const dj = djAudioRef?.current;
    if (voiceActive) {
      if (preVoiceVolumeRef.current === null && audio) {
        preVoiceVolumeRef.current = audio.volume;
      }
      if (audio) audio.volume = 0.25;
      if (dj) dj.volume = 0.12;
    } else {
      if (preVoiceVolumeRef.current !== null && audio) {
        audio.volume = preVoiceVolumeRef.current;
        preVoiceVolumeRef.current = null;
      }
    }
    return () => {
      if (preVoiceVolumeRef.current !== null && audio) {
        audio.volume = preVoiceVolumeRef.current;
        preVoiceVolumeRef.current = null;
      }
    };
  }, [voiceActive, audioRef, djAudioRef]);

  const handleStageNextVideo = () => {
    if (stageVideos.length <= 1) return;
    setStageVideoIdx((prev) => (prev + 1) % stageVideos.length);
  };

  const handleStagePlaySong = () => {
    const video = stageVideos[stageVideoIdx];
    if (!video?.title || !allTracks?.length || !playTrack) return;
    const titleLower = video.title.toLowerCase();
    const match = allTracks.find(
      (t) => t.title && t.title.toLowerCase() === titleLower
    ) || allTracks.find(
      (t) => t.title && titleLower.includes(t.title.toLowerCase())
    ) || allTracks.find(
      (t) => t.title && t.title.toLowerCase().includes(titleLower.split(" - ")[0]?.split(" | ")[0] || "")
    );
    if (match) {
      // Mute all other audio sources
      muteStage();
      if (stageFullScreen) setStageFullScreen(false);
      // Clear "was paused" flags — we're explicitly switching to global
      stagePausedPlayerRef.current = false;
      fullscreenPausedPlayerRef.current = false;
      playTrack(match, "song");
    }
  };

  // ── Presence — Phase 2: track zone + position + heartbeat ─────────────
  const currentZoneName = detectZone(playerPos.x, playerPos.z)?.name || "Plaza";
  const { activeUsers, userCount, isBroadcasting } = useVibeWorldPresence(user, currentZoneName, playerPos);

  // ── Follow System ─────────────────────────────────────────────────────
  const followSystem = useFollowSystem(user?.id, user?.full_name || user?.username);

  // ── Private Chat ─────────────────────────────────────────────────────
  const {
    activeChatPeer, chatMessages, incomingRequest, outgoingStatus,
    safetyConfirmed, setSafetyConfirmed,
    sendChatRequest, acceptRequest, declineRequest,
    sendMessage, endChat, blockUser, blockedUsers, clearOutgoingStatus,
    pendingRequestsCount, pendingRequests,
  } = usePrivateChat(user);
  const [userInteractionTarget, setUserInteractionTarget] = useState(null);

  const handleSelectUser = useCallback((userData) => {
    setUserInteractionTarget({
      user_id: userData.user_id || userData.id,
      username: userData.username,
      id: userData.user_id || userData.id,
    });
  }, []);

  const handleRemoteAvatarClick = useCallback((userId, username) => {
    setUserInteractionTarget({ user_id: userId, username, id: userId });
  }, []);

  const handleCloseUserMenu = useCallback(() => {
    setUserInteractionTarget(null);
  }, []);

  const handleRequestChat = useCallback(async (targetUserId, targetUsername) => {
    if (!targetUserId) {
      console.warn("[handleRequestChat] No target user ID");
      return;
    }
    console.log("[handleRequestChat] Sending chat request to:", targetUserId, targetUsername);
    const result = await sendChatRequest(targetUserId, targetUsername);
    console.log("[handleRequestChat] Result:", JSON.stringify(result));
  }, [sendChatRequest]);

  const handleRequestVoiceChat = useCallback(async (targetUserId, targetUsername) => {
    // Voice chat request: send a chat request, then auto-send a voice-prompt message
    const result = await sendChatRequest(targetUserId, targetUsername);
    if (result?.success) {
      // After the request is accepted, the system will handle voice through the Lounge/VoiceLoungePanel
    }
  }, [sendChatRequest]);

  const handleReportUser = useCallback((target) => {
    // Placeholder — could open a report form or trigger a backend function
    try { navigator?.vibrate?.(20); } catch {}
  }, []);


  // Keep player refs in sync without adding them as effect deps
  stageIsPlayingRef.current = isPlaying;
  stageTogglePlayRef.current = togglePlay;

  const handleGlobalSkip = useCallback(() => { skipTrack?.(); }, [skipTrack]);

  // ── Bottom player toggle: simple, instant, no stage side-effects ──
  const handleGlobalPlayToggle = useCallback(() => {
    // If paused but no track yet, start feed
    if (!isPlaying && !currentTrack && playTrack) {
      const pool = sortedTracks?.length > 0
        ? sortedTracks.slice(0, Math.min(5, sortedTracks.length))
        : allTracks?.length > 0 ? allTracks : [];
      if (pool.length > 0) {
        const pick = pool[Math.floor(Math.random() * pool.length)];
        feedActiveRef.current = true;
        feedIndexRef.current = (sortedTracks?.length > 0 ? sortedTracks : allTracks).indexOf(pick);
        playTrack(pick, "song");
        return;
      }
    }
    togglePlay?.();
  }, [isPlaying, currentTrack, togglePlay, sortedTracks, allTracks, playTrack]);

  // ── Stage proximity: resume global player when walking away from stage ──
  useEffect(() => {
    const STAGE_X = 0, STAGE_Z = -32;
    const dx = playerPos.x - STAGE_X;
    const dz = playerPos.z - STAGE_Z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    const OUTER = 18;

    // Only auto-exit stage audio when stageWatchMode is the active source
    if (dist > OUTER && stageWatching && !stageFullScreen) {
      muteStage();
      resumeGlobalIfNeeded(stagePausedPlayerRef);
    }
  }, [playerPos.x, playerPos.z, stageWatching, stageFullScreen, muteStage, resumeGlobalIfNeeded]);

  // ── Read analyser frequency data for wave sync ────────────────────────
  useEffect(() => {
    if (!playerCtx?.analyserNode) return;
    let raf;
    const analyser = playerCtx.analyserNode;
    const binCount = analyser.frequencyBinCount;
    const freqData = new Uint8Array(binCount);
    // Bass bins: roughly first 10% of bins (0-200Hz range)
    const bassBinCount = Math.max(4, Math.floor(binCount * 0.1));
    let prevIntensity = 0;
    const loop = () => {
      analyser.getByteFrequencyData(freqData);
      // Overall intensity
      let sum = 0;
      let bassSum = 0;
      for (let i = 0; i < binCount; i++) {
        sum += freqData[i];
        if (i < bassBinCount) bassSum += freqData[i];
      }
      const intensity = sum / (binCount * 255);
      const bass = bassSum / (bassBinCount * 255);
      audioIntensityRef.current = intensity;
      audioBassRef.current = bass;
      // Beat detection: sharp rise in intensity triggers a pulse
      const rise = intensity - prevIntensity;
      if (rise > 0.08 && intensity > 0.18) {
        audioBeatRef.current = Math.min(1, rise * 6);
      } else {
        audioBeatRef.current *= 0.88; // decay
      }
      prevIntensity = intensity;
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }, [playerCtx?.analyserNode]);

  // Auto-start personalized feed when entering world (only if silent and NOT on dance floor).
  // Uses feedStartedRef to prevent re-triggering when user pauses playback.
  useEffect(() => {
    if (feedLoading || loading || !playTrack) return;
    if (feedStartedRef.current) return; // already initialized — don't restart on state changes
    // Don't auto-start personal music if player is already on the dance floor
    // (DJ stream is the audio source there)
    if (onDanceFloor) return;
    // If something is already playing, adopt it into feed mode
    if (currentTrack && isPlaying) {
      feedActiveRef.current = true;
      feedStartedRef.current = true;
      feedIndexRef.current = sortedTracks?.findIndex(t => t.id === currentTrack.id) ?? 0;
      return;
    }
    // Start feed
    if (sortedTracks?.length > 0) {
      const pool = sortedTracks.slice(0, Math.min(5, sortedTracks.length));
      const pick = pool[Math.floor(Math.random() * pool.length)];
      if (pick) {
        feedActiveRef.current = true;
        feedStartedRef.current = true;
        feedIndexRef.current = sortedTracks.indexOf(pick);
        playTrack(pick, "song");
      }
    } else if (!feedLoading && allTracks?.length > 0) {
      const featured = allTracks.filter((t) => t.is_featured);
      const pool = featured.length > 0 ? featured : allTracks;
      const pick = pool[Math.floor(Math.random() * pool.length)];
      if (pick) {
        feedActiveRef.current = true;
        feedStartedRef.current = true;
        feedIndexRef.current = allTracks.indexOf(pick);
        playTrack(pick, "song");
      }
    }
  }, [feedLoading, loading, currentTrack, isPlaying, sortedTracks, allTracks, playTrack]);

  const personalBaseVolRef = useRef(1.0);

  // DJ audio is gated strictly to dance floor — no proximity bleed outside

  // Keep stable refs for isPlaying/togglePlay so dance floor effect never uses stale closures
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  const togglePlayRef = useRef(togglePlay);
  togglePlayRef.current = togglePlay;

  // ── Dance floor enter / exit — pause personal player, restore on exit ──────────
  useEffect(() => {
    const personal = audioRef?.current;
    if (onDanceFloor && !wasOnDanceFloorRef.current) {
      // Entered dance floor
      wasOnDanceFloorRef.current = true;
      if (personal) {
        savedPersonalTimeRef.current = personal.currentTime;
        // Only pause if currently playing (use ref to avoid stale closure)
        if (isPlayingRef.current) {
          danceFloorPausedRef.current = true;
          togglePlayRef.current?.();
        }
        // Silence personal player volume — DJ stream takes over
        personal.volume = 0;
      }
    } else if (!onDanceFloor && wasOnDanceFloorRef.current) {
      // Left dance floor
      wasOnDanceFloorRef.current = false;
      if (personal) {
        // Restore saved playback position
        if (savedPersonalTimeRef.current > 0) {
          personal.currentTime = savedPersonalTimeRef.current;
        }
        // Restore full volume
        personal.volume = personalBaseVolRef.current;
        // Resume playback only if we were the ones who paused it
        if (danceFloorPausedRef.current) {
          danceFloorPausedRef.current = false;
          // Resume only if not currently playing (avoid double-toggle)
          if (!isPlayingRef.current) {
            togglePlayRef.current?.();
          }
        }
      }
    }
  // onDanceFloor is the only real trigger; refs handle the rest without stale values
  }, [onDanceFloor, audioRef]);

  // Cleanup on unmount — restore personal player volume
  useEffect(() => {
    return () => {
      clearInterval(jukeboxFadeRef.current);
      const personal = audioRef?.current;
      if (personal) personal.volume = personalBaseVolRef.current;
    };
  }, [audioRef]);

  // ── Auto-rotate stage video every 60s when user isn't interacting ──
  useEffect(() => {
    if (stageVideos.length <= 1) return;
    const timer = setInterval(() => {
      if (stageWatching || stageFullScreen) return; // User is actively using stage
      // Don't rotate if user is near the stage (looking at it)
      const STAGE_X = 0, STAGE_Z = -32;
      const dx = playerPos.x - STAGE_X;
      const dz = playerPos.z - STAGE_Z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < 12) return;
      setStageVideoIdx((prev) => (prev + 1) % stageVideos.length);
    }, 60000);
    return () => clearInterval(timer);
  }, [stageVideos.length, stageWatching, stageFullScreen, playerPos.x, playerPos.z]);

  return (
    <div className="fixed inset-0 z-[60] overflow-hidden" style={{ background: "#050510" }}>
      {/* 3D Park — key on testAvatarTypeKey forces full remount when avatar type changes */}
      <div className="absolute inset-0" key={`city-${testAvatarTypeKey}`}>
        <CityCanvas
          spawnOverride={returnState.current ? { x: returnState.current.x, z: returnState.current.z, rot: returnState.current.rot } : null}
          onLoaded={() => {
            setLoading(false);
            // After world loads, auto-open the panel user came from, then clear state
            if (returnState.current && !returnStateApplied.current) {
              returnStateApplied.current = true;
              const panel = returnState.current.panel;
              clearReturnState();
              returnState.current = null;
              // Re-open the panel they came from
              if (panel === "music_library") {
                setTimeout(() => setOpenPanelOnLoad("music_library"), 600);
              } else if (panel === "dj_booth") {
                setTimeout(() => setOpenPanelOnLoad("dj_booth"), 600);
              }
            }
          }}
          onRemoteAvatarClick={handleRemoteAvatarClick}
          retintRef={retintInWorldRef}
          onPositionChange={(x, z, rot) => {
            const prev = prevPosRef.current;
            const dx = x - prev.x;
            const dz = z - prev.z;
            const speed = Math.sqrt(dx * dx + dz * dz);
            const animState = isDancingRef.current ? "dancing" : speed > 0.015 ? "walking" : "idle";
            prevPosRef.current = { x, z };
            setPlayerPos({ x, z, rot, animState });
          }}
          onJukeboxProximity={(near, vol) => {
            setNearJukebox(near);
            jukeboxProxVolRef.current = vol;
          }}
          isDancing={isDancing}
          activeEmote={activeEmote}
          stageCanvas={stageWatching ? null : stageCanvas}
          audioIntensityRef={audioIntensityRef}
          audioBassRef={audioBassRef}
          audioBeatRef={audioBeatRef}
          locked={movementLocked}
          stageScreenPosRef={stageScreenPosRef}
          mobileInputRef={mobileInputRef}
          remoteUsers={activeUsers}
          avatarConfig={avatarConfig}
          djTrack={djTrack}
          launchRef={launchRef}
          hbRiding={hbRiding}
          ferrisRiding={ferrisRiding}
          rendererRef={rendererRef}
          tvMode={tvMode}
          tvQuality={tvQuality}
          onNearPad={(padIdx, airborne, orbs) => {
            setNearLaunchPad(padIdx >= 0 && !airborne);
            setIsAirborne(airborne);

            // Detect when a launch session ends (landed) — add to bank
            const prevAirborne = launchSessionRef.current > 0 && !airborne;
            if (prevAirborne && orbs > launchSessionRef.current) {
              const earned = orbs - launchSessionRef.current;
              const newBank = addToOrbBank(earned);
              updateZoneBest("launch", orbs);
              setOrbBank(newBank);
            }
            // Track per-session starts
            if (airborne && !isAirborne) launchSessionRef.current = orbs;
            if (!airborne) launchSessionRef.current = 0;

            setOrbCount(orbs);
            setLaunchSessionOrbs(orbs);
          }}
        />
      </div>

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 z-30 flex items-center justify-center" style={{ background: "rgba(5,5,16,0.85)" }}>
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-400 rounded-full animate-spin" />
            <p className="text-xs text-purple-200/70 font-medium tracking-wider">Entering the cosmos...</p>
          </div>
        </div>
      )}

      {/* ── Top HUD row: Exit (left) | TV Mode + UVC (right) ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: loading ? 0 : 1 }}
        transition={{ delay: 0.4 }}
        className="absolute top-0 left-0 right-0 flex items-center justify-between"
        style={{
          zIndex: 200,
          pointerEvents: "none",
          paddingTop: isMobile && mobileLayout
            ? `${mobileLayout.sa.top + 4}px`
            : "calc(env(safe-area-inset-top, 0px) + 4px)",
          paddingLeft: "calc(env(safe-area-inset-left, 0px) + 6px)",
          paddingRight: "calc(env(safe-area-inset-right, 0px) + 6px)",
        }}
      >
        {/* Left: Exit button */}
        <button
          onClick={onExit}
          onTouchStart={(e) => { e.stopPropagation(); }}
          className="flex items-center justify-center rounded-full transition-all hover:brightness-110 active:scale-95 flex-shrink-0"
          style={{
            background: "rgba(255,255,255,0.1)",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255,255,255,0.12)",
            color: "rgba(255,255,255,0.65)",
            width: "44px",
            height: "44px",
            minWidth: "44px",
            minHeight: "44px",
            touchAction: "manipulation",
            pointerEvents: "auto",
            cursor: "pointer",
          }}
          aria-label="Exit Vibe City"
        >
          <ChevronLeft style={{ width: "16px", height: "16px" }} />
        </button>

        {/* Right: TV Mode toggle + UVC badge */}
        <div className="flex items-center gap-2 flex-shrink-0" style={{ pointerEvents: "auto" }}>
          {/* TV Mode toggle — 44×44 minimum iOS tap target */}
          <button
            onClick={() => tvMode ? disableTvMode() : setTvOverlayOpen(true)}
            onTouchStart={(e) => { e.stopPropagation(); }}
            className="flex items-center justify-center gap-1.5 rounded-full transition-all hover:brightness-110 active:scale-95 flex-shrink-0"
            style={{
              background: tvMode ? "rgba(0,229,255,0.18)" : "rgba(255,255,255,0.08)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              border: tvMode ? "1.5px solid rgba(0,229,255,0.45)" : "1px solid rgba(255,255,255,0.12)",
              color: tvMode ? "#00E5FF" : "rgba(255,255,255,0.55)",
              minWidth: "44px",
              minHeight: "44px",
              height: "44px",
              paddingLeft: "14px",
              paddingRight: "14px",
              touchAction: "manipulation",
              cursor: "pointer",
              WebkitTapHighlightColor: "rgba(0,229,255,0.2)",
            }}
            title={tvMode ? "Exit TV Mode" : "Mirror to TV"}
            aria-label={tvMode ? "Exit TV Mode" : "Enter TV Mode"}
          >
            <Tv2 style={{ width: 14, height: 14, flexShrink: 0 }} />
            <span className="font-semibold"
              style={{ fontSize: isMobile ? "10px" : "11px", letterSpacing: "0.04em" }}>
              {tvMode ? "Exit TV" : "TV Mode"}
            </span>
          </button>


        </div>
      </motion.div>

      {/* World HUD */}
      <WorldHUD
        playerX={playerPos.x}
        playerZ={playerPos.z}
        playerRot={playerPos.rot}
        isMobile={isMobile}
        mobileLayout={mobileLayout}
        loading={loading}
        playerPos={playerPos}
        forceOpenPanel={openPanelOnLoad}
        stageVideoTitle={stageVideos[stageVideoIdx]?.title || null}
        stageWatching={stageWatching}
        stageVideosCount={stageVideos.length}
        onStageWatchVideo={handleWatchOnStage}
        onStageExitWatchMode={handleExitWatchMode}
        onStageNextVideo={handleStageNextVideo}
        onStagePlaySong={handleStagePlaySong}
        onStageFullScreen={handleStageFullScreen}
        onStageExitFullScreen={handleExitFullScreen}
        onStageMuteToggle={handleStageMuteToggle}
        stageMuted={stageMuted}
        chatAgeConfirmed={chatAgeConfirmed}
        onMobileModalChange={setMobileModalOpen}
        activeUsers={activeUsers}
        userCount={userCount}
        isBroadcasting={isBroadcasting}
        currentUserId={user?.id}
        activeChatPeer={activeChatPeer}
        chatMessages={chatMessages}
        incomingRequest={incomingRequest}
        safetyConfirmed={safetyConfirmed}
        onSelectUser={handleSelectUser}
        onRequestChat={handleRequestChat}
        onRequestVoiceChat={handleRequestVoiceChat}
        onAcceptChat={acceptRequest}
        onDeclineChat={declineRequest}
        onSendChatMessage={sendMessage}
        onEndChat={endChat}
        onBlockUser={blockUser}
        onReportUser={handleReportUser}
        onSafetyConfirm={() => setSafetyConfirmed(true)}
        blockedUsers={blockedUsers}
        userInteractionTarget={userInteractionTarget}
        onCloseUserMenu={handleCloseUserMenu}
        onLoungeInputFocus={setLoungeInputFocused}
        onVoiceActive={setVoiceActive}
        outgoingStatus={outgoingStatus}
        onClearOutgoingStatus={clearOutgoingStatus}
        pendingRequestsCount={pendingRequestsCount}
        pendingRequests={pendingRequests}
        onAcceptChat={acceptRequest}
        onDeclineChat={declineRequest}
        onEmote={handleEmote}
        onStopDance={handleStopDance}
        isDancing={isDancing}
        activeEmote={activeEmote}
        onEditAvatar={() => setCustomizerOpen(true)}
        nearJukebox={nearJukebox}
        djTrack={djTrack}
        onFerrisRideChange={setFerrisRiding}
        followSystem={followSystem}
      />

      {/* Stage cover visualizer (only when not watching — iframe replaces it) */}
      {!stageWatching && (
        <StageCoverVisualizer
          onReady={(c) => setStageCanvas(c)}
          video={stageVideos[stageVideoIdx] || null}
          audioIntensityRef={audioIntensityRef}
        />
      )}

      {/* YouTube video + audio embed on stage screen (Watch on Stage mode) */}
      <StageVideoEmbed
        ref={stageEmbedRef}
        open={stageWatching}
        video={stageVideos[stageVideoIdx] || null}
        screenPosRef={stageScreenPosRef}
      />

      {/* Full-screen stage overlay */}
      <StageFullScreen
        open={stageFullScreen}
        video={stageVideos[stageVideoIdx] || null}
        onClose={handleExitFullScreen}
      />

      {/* MOBILE: Game HUD — joystick + camera look.
          In TV Mode: components stay mounted (touch still works) but visuals are hidden. */}
      {!loading && isMobile && (
        <>
          {/* Camera look zone — always mounted and active (no visible UI to hide) */}
          <CameraLookZone mobileInputRef={mobileInputRef} />

          {/* Joystick — always mounted; hidden in TV mode */}
          <div style={{ opacity: tvMode ? 0 : 1, transition: "opacity 0.4s", pointerEvents: "auto" }}>
            <MobileJoystick
              onMove={(x, y) => {
                mobileInputRef.current.x = x;
                mobileInputRef.current.y = y;
              }}
            />
          </div>
        </>
      )}

      {/* ── Vibe Launch Zone HUD ── */}
      {!loading && (nearLaunchPad || isAirborne) && (
        <div
          className="fixed z-[60] flex flex-col items-center gap-2 pointer-events-none"
          style={{
            bottom: isMobile && mobileLayout
              ? mobileLayout.launchHudBottom
              : isMobile ? 248 : 96,
            left: "50%",
            transform: "translateX(-50%)",
          }}
        >
          {/* Session + bank row */}
          <div className="flex items-center gap-2">
            {orbCount > 0 && (
              <div
                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black pointer-events-none"
                style={{ background: "rgba(0,229,255,0.12)", border: "1px solid rgba(0,229,255,0.3)", color: "#00E5FF", backdropFilter: "blur(8px)" }}
              >
                ✦ {orbCount} this run
              </div>
            )}
            <div
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black pointer-events-none"
              style={{ background: "rgba(255,215,0,0.1)", border: "1px solid rgba(255,215,0,0.3)", color: "#FFD700", backdropFilter: "blur(8px)" }}
            >
              🪙 {orbBank} Bank
            </div>
          </div>

          {/* Launch button */}
          {nearLaunchPad && !isAirborne && (
            <button
              onClick={() => { try { navigator?.vibrate?.(30); } catch {} launchRef.current?.(); }}
              className="pointer-events-auto px-7 py-3 rounded-full font-black text-sm tracking-widest transition-all hover:brightness-110 active:scale-95"
              style={{
                background: "linear-gradient(135deg,#00B8D4,#9B4FFF)",
                color: "#fff",
                boxShadow: "0 0 24px rgba(0,184,212,0.45), 0 2px 12px rgba(0,0,0,0.4)",
                letterSpacing: "0.18em",
                fontSize: "13px",
              }}
            >
              🚀 LAUNCH
            </button>
          )}

          {isAirborne && (
            <div
              className="px-5 py-1.5 rounded-full font-black text-[11px] tracking-widest pointer-events-none"
              style={{ background: "rgba(155,126,255,0.18)", border: "1px solid rgba(155,126,255,0.35)", color: "#c4aaff", backdropFilter: "blur(8px)" }}
            >
              ⚡ AIRBORNE
            </div>
          )}
        </div>
      )}

      {/* ── Crystal Zone Interaction ── */}
      {!loading && (nearCrystal || crystalAura) && (
        <div
          className="fixed z-[60] flex flex-col items-center gap-2 pointer-events-none"
          style={{ bottom: isMobile ? 220 : 88, left: "50%", transform: "translateX(-50%)" }}
        >
          {crystalMsg && (
            <div
              className="px-4 py-1.5 rounded-full text-xs font-black tracking-widest pointer-events-none"
              style={{ background: "rgba(100,200,255,0.18)", border: "1px solid rgba(100,200,255,0.4)", color: "#88EEFF", backdropFilter: "blur(10px)" }}
            >
              ✦ Vibe Charged
            </div>
          )}
          {nearCrystal && !crystalAura && (
            <button
              onClick={handleActivateCrystal}
              onTouchStart={(e) => { e.stopPropagation(); handleActivateCrystal(); }}
              className="pointer-events-auto px-6 py-2.5 rounded-full font-black text-sm tracking-widest transition-all hover:brightness-110 active:scale-95"
              style={{
                background: "linear-gradient(135deg,#4433AA,#8844FF)",
                color: "#E8CCFF",
                border: "1px solid rgba(170,100,255,0.5)",
                boxShadow: "0 0 20px rgba(136,68,255,0.4)",
                letterSpacing: "0.15em",
                fontSize: "12px",
              }}
            >
              ◇ Charge Your Vibe
            </button>
          )}
          {crystalAura && (
            <div
              className="px-4 py-1.5 rounded-full text-xs font-black tracking-widest pointer-events-none"
              style={{ background: "rgba(136,68,255,0.15)", border: "1px solid rgba(136,68,255,0.35)", color: "#c4aaff", backdropFilter: "blur(10px)" }}
            >
              ⚡ Crystal Aura Active
            </div>
          )}
        </div>
      )}

      {/* ── Hoverboard Ring Run HUD ── */}
      <HoverboardPanel
        visible={nearHoverboard || hbRiding}
        isMobile={isMobile}
        mobileLayout={mobileLayout}
        user={user}
        onStartRide={handleHbStart}
        onEndRide={handleHbEnd}
      />


      {/* ── Vibe Orb Reward System ── */}
      <OrbRewardSystem orbCount={orbCount} isMobile={isMobile} user={user} />

      {/* ── Orb Leaderboard — shown near Vibe Launch Zone ── */}
      <OrbLeaderboard
        visible={!loading && (nearLaunchPad || isAirborne || (Math.abs(playerPos.x) < 12 && playerPos.z > 5 && playerPos.z < 20))}
        isMobile={isMobile}
        currentUserId={user?.id}
        currentUserOrbs={orbBank}
        currentUsername={user?.full_name || "You"}
      />

      {/* ── Avatar Customizer Panel (color + style) ────────────────────── */}
      <AvatarCustomizerPanel
        open={customizerOpen}
        onClose={() => setCustomizerOpen(false)}
        currentStyle={user?.avatar_style || "streetwear"}
        currentSuitColor={user?.avatar_suit_color || "#4a5c3a"}
        isMobile={isMobile}
        user={user}
        onApply={({ outfitColorKey, suitColor, avatarTypeKey: newTypeKey }) => {
          // If avatar type changed, update state so avatarConfig re-renders with new type
          if (newTypeKey && newTypeKey !== testAvatarTypeKey) {
            setTestAvatarTypeKey(newTypeKey);
            setLoading(true); // show loading screen while world remounts
            setAvatarVersion((v) => v + 1);
          } else {
            // Just a color change — retint in place
            if (retintInWorldRef.current && suitColor) {
              retintInWorldRef.current(suitColor);
            }
            setAvatarVersion((v) => v + 1);
          }
        }}
      />

      {/* DESKTOP: Draggable media player — hidden during stage watch */}
      {!loading && !isMobile && currentTrack && !stageWatching && !stageFullScreen && (
        <div
          style={{ opacity: tvMode && !tvPlayerVisible ? 0 : 1, transition: "opacity 0.5s", pointerEvents: tvMode && !tvPlayerVisible ? "none" : "auto" }}
          onClick={tvMode ? handleTvPlayerTap : undefined}
        >
          <DraggableMediaPlayer
            currentTrack={currentTrack}
            isPlaying={isPlaying}
            onTogglePlay={handleGlobalPlayToggle}
            onSkip={handleGlobalSkip}
          />
        </div>
      )}

      {/* MOBILE: mini player — hidden when modal/panel open, stage, fullscreen, or TV mode auto-hides */}
      {!loading && isMobile && currentTrack && !mobileModalOpen && !stageWatching && !stageFullScreen && (
        <div
          style={{ opacity: tvMode && !tvPlayerVisible ? 0 : 1, transition: "opacity 0.5s", pointerEvents: tvMode && !tvPlayerVisible ? "none" : "auto" }}
          onClick={tvMode ? handleTvPlayerTap : undefined}
        >
          <DraggableMediaPlayer
            currentTrack={currentTrack}
            isPlaying={isPlaying}
            onTogglePlay={handleGlobalPlayToggle}
            onSkip={handleGlobalSkip}
          />
        </div>
      )}

      {/* Floating emoji emotes — non-dance emotes show emoji above avatar */}
      <EmojiEmote activeEmote={activeEmote} isDancing={isDancing} isMobile={isMobile} />

      {/* Performance audit overlay — only visible with ?perf=1 in URL */}
      <PerfAuditOverlay playerPos={playerPos} rendererRef={rendererRef} />

      {/* TV Mode AirPlay instructions overlay */}
      {tvOverlayOpen && (
        <TvModeOverlay
          onConfirm={(quality) => { setTvOverlayOpen(false); enableTvMode(quality); }}
          onCancel={() => setTvOverlayOpen(false)}
          defaultQuality={tvQuality}
        />
      )}

      {/* Mobile debug overlay — only visible with ?debug=mobile in URL */}
      <MobileDebugOverlay
        layout={mobileLayout}
        zone={detectZone(playerPos.x, playerPos.z)}
        mediaMode={stageFullScreen ? "fullscreen" : stageWatching ? "watch" : "none"}
        playerPos={playerPos}
      />
    </div>
  );
}