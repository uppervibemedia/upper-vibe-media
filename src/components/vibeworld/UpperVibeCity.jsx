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
import useDirectMessaging from "@/hooks/useDirectMessaging";
import { detectZone } from "@/components/vibeworld/zoneDetection";
import { base44 } from "@/api/base44Client";
import { playCoinSound } from "@/lib/vibeCoinSound";
import WorldHUD from "@/components/vibeworld/WorldHUD";
// Resume button removed — DraggableMediaPlayer handles all gesture playback
import RPMAvatarCreator from "@/components/vibeworld/RPMAvatarCreator";
import MessageRequestComposer from "@/components/vibeworld/panels/MessageRequestComposer";
import DirectChatPanel from "@/components/vibeworld/panels/DirectChatPanel";
import AvatarCustomizerPanel from "@/components/vibeworld/AvatarCustomizerPanel";

import useVibeCityAudioMachine from "@/hooks/useVibeCityAudioMachine";
import { pickFreshPersonalizedTrack } from "@/lib/feedEngine";
import {
  subscribe as ramSubscribe,
  getState as ramGetState,
  pauseMyVibe,
  resumeMyVibe,
  pauseUpperVibeRadio,
  resumeUpperVibeRadio,
} from "@/lib/radioAudioManager";
import { setCityGlobalUserManuallyPaused } from "@/lib/vibeCityAudioController";
import HoverboardPanel from "@/components/vibeworld/panels/HoverboardPanel";
import { HOVERBOARD_START, HOVERBOARD_INTERACT_RADIUS } from "@/components/vibeworld/HoverboardRingRun";
// CrystalZone is now decorative-only — no imports needed
import { getSessionCoins, addSessionCoins, resetSessionCoins } from "@/lib/vibeCoinBank";
import { loadWallet, earnCoins, getWalletBalance, isCoinAlreadyCollected } from "@/components/vibeworld/wallet/vibeCoinWallet";
import { grantStarterItems, loadInventory } from "@/components/vibeworld/inventory/inventoryService";
import VibeCoinHUD from "@/components/vibeworld/VibeCoinHUD";
import InventoryPanel from "@/components/vibeworld/inventory/InventoryPanel";
import EmojiEmote from "@/components/vibeworld/EmojiEmote";
import useFollowSystem from "@/hooks/useFollowSystem";
import useBlockSystem from "@/hooks/useBlockSystem";
import useMobileLayout from "@/hooks/useMobileLayout";
import MobileDebugOverlay from "@/components/vibeworld/MobileDebugOverlay";
import PersonalHoverboardHUD from "@/components/vibeworld/PersonalHoverboardHUD";
import FPSMonitor from "@/components/vibeworld/FPSMonitor";

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
  const [worldMode, setWorldMode] = useState("city");
  const [worldSpawn, setWorldSpawn] = useState(null);
  const [transportTarget, setTransportTarget] = useState(null);
  const [transportPrompt, setTransportPrompt] = useState(null);
  const [dismissedTransportTarget, setDismissedTransportTarget] = useState(null);
  const [playerPos, setPlayerPos] = useState({ x: -10, z: -4, rot: -2.55, animState: "idle" });
  // Restore saved return state (position + panel) when returning from SongPage
  const returnState = useRef(readReturnState());
  const returnStateApplied = useRef(false);
  const prevPosRef = useRef({ x: -10, z: -4 });
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
  // Launch handled by LaunchRide — no manual "LAUNCH" button
  // ── Hoverboard state — TWO SEPARATE SYSTEMS ──────────────────
  // A) Neon Surf: temporary beach game board (disappears on exit)
  const [nearHoverboard, setNearHoverboard] = useState(false);
  const [isPlayingNeonSurf, setIsPlayingNeonSurf] = useState(false); // true only while Neon Surf game active
  // B) Personal hoverboard: owned item, equipped from Inventory, city free-roam only
  // (Future: read equipped board from inventory; for now stub = false until user equips)
    const [personalHoverboardActive, setPersonalHoverboardActive] = useState(false);
  const [equippedBoard, setEquippedBoard] = useState(null);
  const [equippedAura, setEquippedAura] = useState(null); // item id of equipped aura glow
  const [equippedAuraColor, setEquippedAuraColor] = useState(null); // hex color for sync
  const [equippedNameplate, setEquippedNameplate] = useState(null);
  const [equippedBadge, setEquippedBadge] = useState(null);
  const [equippedClothing, setEquippedClothing] = useState(null);

  // Item id to hex color for aura — keep minimal, full set in AuraGlow
  const auraColors = {
    "glow_starter": "#00AADD", "shop_glow_starter": "#00AADD",
    "shop_glow_purple": "#9B4FFF", "shop_glow_gold": "#FFD700",
  };

  const [auraActive, setAuraActive] = useState(false);

  // Combined: CityCanvas hbRiding prop = Neon Surf board OR personal board
  const hbRiding = isPlayingNeonSurf || personalHoverboardActive;
  // Crystal Zone — decorative landmark only, no interaction state needed
  const rendererRef = useRef(null);
  const [sessionCoins, setSessionCoins] = useState(() => getSessionCoins());
  const [totalCoins, setTotalCoins] = useState(() => getWalletBalance());
  const [lastCollectCount, setLastCollectCount] = useState(0);
  const [inventoryOpen, setInventoryOpen] = useState(false);

  const jukeboxFadeRef = useRef(null);        // kept for cleanup compat

  // ── iOS detection ref — kept for scroll-lock below ────────────────────────
  const isIOSRef = useRef(false);

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

    // All emotes loop until user presses Stop or moves
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

  // Auto-dance removed: user now spawns outside the dance floor in the plaza area.

  // ── TV Mode — hides joystick/camera visuals for clean mirrored view ──────────
  const [tvMode, setTvMode] = useState(false);
  const [tvQuality, setTvQuality] = useState("smooth"); // "smooth" | "normal"
  const [tvOverlayOpen, setTvOverlayOpen] = useState(false);
  // Track whether any blocking UI is open (panels, modals, zone UIs)
  const [anyBlockingUIOpen, setAnyBlockingUIOpen] = useState(false);
  const [domeFullscreenOpen, setDomeFullscreenOpen] = useState(false);
  const [domeExitTarget, setDomeExitTarget] = useState(null);
  const [hoverboardJumpRequest, setHoverboardJumpRequest] = useState(null);



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
  // stageMuted: single source of truth for stage audio state.
  // Only changed by user action (toggle button) or explicit exit. Never reset by proximity/render.
  const [stageMuted, setStageMuted] = useState(true);
  const stagePausedPlayerRef = useRef(false);
  const stageEmbedRef = useRef(null);
  const stageScreenPosRef = useRef({ x: -9999, y: -9999, w: 0, h: 0 });
  const preFullscreenWasWatchingRef = useRef(false);
  const fullscreenPausedPlayerRef = useRef(false);
  const stageIsPlayingRef = useRef(false);
  const stageTogglePlayRef = useRef(null);
  // Exit cooldown: prevent watch mode from re-triggering immediately after user exits
  const exitCooldownRef = useRef(false);
  const exitCooldownTimerRef = useRef(null);

  useEffect(() => {
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    setIsMobile(isIOS || /Android/i.test(navigator.userAgent));
    isIOSRef.current = isIOS;
  }, []);

  useEffect(() => {
    window.__uvcWorldMode = worldMode;
    return () => { window.__uvcWorldMode = null; };
  }, [worldMode]);

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
  const { allTracks, tracksLoaded, nextRadioSong, currentRadioSong, upNext, startMyVibeQueue } = radioCtx || {};

  // ── Subscribe to RadioAudioManager (My Vibe Radio + Upper Vibe Radio state) ──
  const [ramState, setRamState] = useState(() => ramGetState());
  useEffect(() => {
    const s = ramGetState();
    console.log("[UpperVibeCity] 🌆 City entered | RAM mode:", s.activeMode, "| track:", s.currentTrack?.title || "none", "| playing:", s.isPlaying);
    setCityGlobalUserManuallyPaused(!(s.activeMode === "myVibeRadio" && s.intendedToPlay));
    return ramSubscribe((s) => setRamState(s));
  }, []);

  // Determine what the city media player should show.
  // Source of truth: My Vibe Radio track state only — never a city-only or page-player fallback.
  const [hydratedMyVibeTrack, setHydratedMyVibeTrack] = useState(null);

  const nextMyVibeTrack = upNext?.find((track) => track?.audio_url) || null;
  const activeMyVibeTrack = ramState.activeMode === "myVibeRadio" ? ramState.currentTrack : null;
  const cityTrack = currentRadioSong || activeMyVibeTrack || nextMyVibeTrack || hydratedMyVibeTrack;
  const cityIsPlaying = ramState.activeMode === "myVibeRadio" && ramState.currentTrack?.id === cityTrack?.id ? ramState.isPlaying : false;

  const handleCityTogglePlay = useCallback(() => {
    const sameLoadedTrack = ramState.activeMode === "myVibeRadio" && ramState.currentTrack?.id === cityTrack?.id;
    if (sameLoadedTrack) {
      if (ramState.isPlaying) { setCityGlobalUserManuallyPaused(true); pauseMyVibe(); }
      else { setCityGlobalUserManuallyPaused(false); resumeMyVibe(); }
      return;
    }
    if (cityTrack?.audio_url) {
      // Not active yet — start the visible My Vibe Radio track.
      setCityGlobalUserManuallyPaused(false);
      import("@/lib/radioAudioManager").then((mod) => mod.playMyVibeTrack(cityTrack));
    }
  }, [ramState.activeMode, ramState.currentTrack?.id, ramState.isPlaying, cityTrack]);

  const handleCitySkip = useCallback(() => {
    if (ramState.activeMode === "myVibeRadio" || cityTrack) {
      nextRadioSong?.();
    }
  }, [ramState.activeMode, cityTrack, nextRadioSong]);
  const { user } = useAuth();
  const { sortedTracks, loading: feedLoading, profile: feedProfile } = usePersonalizedFeed(user?.id);

  useEffect(() => {
    const myVibeStateTrack = (ramState.activeMode === "myVibeRadio" ? ramState.currentTrack : null) || currentRadioSong || nextMyVibeTrack;
    if (myVibeStateTrack?.audio_url) {
      setHydratedMyVibeTrack((prev) => prev?.id === myVibeStateTrack.id ? prev : myVibeStateTrack);
      return;
    }
    if (!tracksLoaded || !startMyVibeQueue) return;
    startMyVibeQueue((firstTrack) => {
      if (firstTrack?.audio_url) {
        setHydratedMyVibeTrack((prev) => prev?.id === firstTrack.id ? prev : firstTrack);
      }
    });
  }, [ramState.activeMode, ramState.currentTrack, currentRadioSong, nextMyVibeTrack, tracksLoaded, startMyVibeQueue]);

  // ── Wallet + inventory: load from server on entry ─────────
  useEffect(() => {
    if (!user?.id) return;
    resetSessionCoins();
    setSessionCoins(0);
    loadWallet(user.id).then(({ balance }) => {
      setTotalCoins(balance);
    });
    grantStarterItems(user.id).then(() => {
      // Load inventory to sync equipped items into live world state.
      // On spawn: hoverboard is equipped but NOT active (no board under avatar).
      // Aura loads video-equipped and applies immediately.
      loadInventory(user.id).then((records) => {
        records.forEach((r) => {
          if (!r.equipped) return;
          window.dispatchEvent(new CustomEvent('inventoryUpdate', {
            detail: { itemId: r.item_id, equipped: true, category: r.item_category }
          }));
        });
      });
    }).catch(() => {});
  }, [user?.id]);

  // ── Vibe Coin HUD — event-driven coin collection via new wallet ──
  useEffect(() => {
    const onCollect = async (e) => {
      const { coinIds, source } = e.detail || {};
      if (!coinIds?.length) return;
      const { balance, lifetime, added } = await earnCoins(user?.id || null, coinIds, source || "sky_coin");
      if (added > 0) {
        playCoinSound(added >= 5);
        setLastCollectCount(added);
        setSessionCoins((prev) => prev + added);
        setTotalCoins(balance);
        window.__lrCoinsCollected = 0;
      }
    };
    window.addEventListener("vibeCoinsCollected", onCollect);
    return () => window.removeEventListener("vibeCoinsCollected", onCollect);
  }, [user?.id]);

  // ── Sync wallet after shop purchases ──────────────────────────
  useEffect(() => {
    const onShop = (e) => {
      const { balance } = e.detail || {};
      if (balance != null) {
        setTotalCoins(balance);
      }
    };
    window.addEventListener("vibeCoinsShopPurchase", onShop);

    const onInventoryUpdate = (e) => {
      const { itemId, equipped, category } = e.detail || {};
      if (category === 'hoverboard') {
        if (equipped) {
          setEquippedBoard(itemId);
        } else if (equippedBoard === itemId) {
          setEquippedBoard(null);
          setPersonalHoverboardActive(false); // Force dismount if board is unequipped
        }
      }
      if (category === 'avatar_glow') {
        setAuraActive(equipped);
        setEquippedAura(equipped ? itemId : null);
        setEquippedAuraColor(equipped ? (auraColors[itemId] || "#00AADD") : null);
      }
      if (category === 'nameplate') setEquippedNameplate(equipped ? itemId : null);
      if (category === 'badge') setEquippedBadge(equipped ? itemId : null);
      if (category === 'clothing') setEquippedClothing(equipped ? itemId : null);
    };
    window.addEventListener('inventoryUpdate', onInventoryUpdate);

    return () => {
      window.removeEventListener("vibeCoinsShopPurchase", onShop);
      window.removeEventListener('inventoryUpdate', onInventoryUpdate);
    }
  }, [equippedBoard]);

  // ── Avatar config derived from user data ──────────────────────────────
  // avatarTypeKey: read from sessionStorage (set by AvatarSetup or WorldGate on entry)
  // Falls back to user.avatar_type from profile, then "test-mixamo-female" as new default
  const [testAvatarTypeKey, setTestAvatarTypeKey] = useState(() => {
    try {
      const stored = sessionStorage.getItem("uvc_test_avatar");
      if (stored) return stored;
    } catch {}
    return "test-mixamo-female"; // default: female avatar
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
    // Do NOT reset stageMuted here — preserve user's audio preference for next session
    if (stageEmbedRef.current) {
      stageEmbedRef.current.mute();
      stageEmbedRef.current.pause();
    }
  }, []);

  /** Toggle mute on the stage embed without affecting watch mode or movement.
   *  This is the ONLY place stageMuted should change via user interaction. */
  const handleStageMuteToggle = useCallback(() => {
    setStageMuted((prev) => {
      const next = !prev;
      // Apply to embed immediately
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
    // Respect exit cooldown — ignore proximity-triggered calls within 2.5s of exit
    if (exitCooldownRef.current) return;

    // 1) Close fullscreen if it's open
    if (stageFullScreen) setStageFullScreen(false);

    // 2) Pause global player
    pauseGlobal();
    stagePausedPlayerRef.current = true;

    // 3) Enter watch mode — preserve the user's existing stageMuted preference.
    //    If they unmuted last time, keep it unmuted. iOS autoplay requires muted start,
    //    so we always start muted technically but respect the user's button state.
    setStageWatching(true);
    setTimeout(() => {
      stageEmbedRef.current?.play();
      // Apply current muted state to embed (user may have left it unmuted previously)
      if (!stageMuted) {
        stageEmbedRef.current?.unmute();
      }
    }, 300);
  }, [stageFullScreen, pauseGlobal, stageMuted]);

  const handleExitWatchMode = useCallback(() => {
    muteStage();
    // Resume global player ONLY if fullscreen is not open
    if (!stageFullScreen) {
      resumeGlobalIfNeeded(stagePausedPlayerRef);
    }
    stagePausedPlayerRef.current = false;

    // 2.5s cooldown — prevents proximity from immediately re-triggering watch mode
    exitCooldownRef.current = true;
    if (exitCooldownTimerRef.current) clearTimeout(exitCooldownTimerRef.current);
    exitCooldownTimerRef.current = setTimeout(() => {
      exitCooldownRef.current = false;
    }, 2500);
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
      setStageWatching(true);
      setTimeout(() => { stageEmbedRef.current?.play(); }, 300);
    } else {
      resumeGlobalIfNeeded(fullscreenPausedPlayerRef);
      // Set cooldown so proximity doesn't re-open watch mode immediately
      exitCooldownRef.current = true;
      if (exitCooldownTimerRef.current) clearTimeout(exitCooldownTimerRef.current);
      exitCooldownTimerRef.current = setTimeout(() => { exitCooldownRef.current = false; }, 2500);
    }
  }, [resumeGlobalIfNeeded]);

  // ── Input focus lock (typing in lounge chat) + voice ducking ──
  const [loungeInputFocused, setLoungeInputFocused] = useState(false);
  const [voiceActive, setVoiceActive] = useState(false);
  const preVoiceVolumeRef = useRef(null);

  // ── Movement locked when typing in lounge chat or watching stage ──
  const [ferrisRiding, setFerrisRiding] = useState(false);
  const movementLocked = loungeInputFocused || stageWatching;

  // ── Dance floor boundary — hysteresis to prevent boundary flicker ──────────
  // Use a slightly smaller radius to confirm entry (10.0) vs exit (10.5).
  // A debounce timer ensures the zone only changes after 500ms of stable position.
  const DANCE_FLOOR_CX = 0, DANCE_FLOOR_CZ = -13;
  const DANCE_FLOOR_ENTER_R = 10.0; // must be clearly inside before switching to DJ
  const DANCE_FLOOR_EXIT_R  = 10.5; // must be clearly outside before restoring personal audio
  const dfDx = playerPos.x - DANCE_FLOOR_CX;
  const dfDz = playerPos.z - DANCE_FLOOR_CZ;
  const dfDist = Math.sqrt(dfDx * dfDx + dfDz * dfDz);
  const rawOnDanceFloor = worldMode === "city" && dfDist <= DANCE_FLOOR_ENTER_R;

  // Debounced dance floor state — only flips after 200ms stable (fast enough to feel responsive)
  const [onDanceFloor, setOnDanceFloor] = useState(false);
  const dfDebounceRef = useRef(null);
  const dfStableRef = useRef(false); // current debounced value

  // ═══════════════════════════════════════════════════════════════════════════════
  // iOS Safety: Ref-based dance floor check using RAW position (before throttle)
  // This ref is updated in onPositionChange EVERY frame, not just on React re-render.
  // The safety interval below reads this ref directly — bypassing React state entirely.
  // ═══════════════════════════════════════════════════════════════════════════════
  const rawDfRef = useRef(false);  // true = within enter radius, false = outside exit radius
  const rawPosRef = useRef({ x: -10, z: -4 }); // always tracks latest position
  // Every-frame dance floor ref — written directly by CityCanvas animation loop (bypasses throttle)
  const danceFloorFrameRef = useRef({ x: -10, z: -4, onDanceFloor: false });
  // ── City audio zone signal — synced from every-frame avatar position for iOS/PWA reliability ──
  const [rawDfState, setRawDfState] = useState(false);
  useEffect(() => {
    const id = setInterval(() => setRawDfState(danceFloorFrameRef.current.onDanceFloor), 50);
    return () => clearInterval(id);
  }, []);

  const {
    djTrack,
  } = useVibeCityAudioMachine({
    isUserInsideDanceFloor: worldMode === "city" && rawDfState,
    defaultTrack: cityTrack || hydratedMyVibeTrack,
    playerAudioRef: audioRef,
    suppressExternalPlayer: !stageWatching && !stageFullScreen,
  });

  // ── Hoverboard zone proximity detection ──────────────────────
  useEffect(() => {
    if (worldMode !== "beach") { setNearHoverboard(false); return; }
    const hbdx = playerPos.x - HOVERBOARD_START.x;
    const hbdz = playerPos.z - HOVERBOARD_START.z;
    const dist = Math.sqrt(hbdx * hbdx + hbdz * hbdz);
    setNearHoverboard(dist < HOVERBOARD_INTERACT_RADIUS);
  }, [playerPos.x, playerPos.z, worldMode]);

  // Neon Surf game callbacks — only control the temporary beach game board
  const handleHbStart = useCallback(() => {
    setIsPlayingNeonSurf(true);   // Neon Surf board: active during game only
  }, []);
  const handleHbEnd = useCallback(() => {
    setIsPlayingNeonSurf(false);  // Neon Surf board: removed on exit, avatar returns to walking
  }, []);

  // ── Voice ducking: only applies while outside the dance floor.
  // Inside the dance floor, the city audio machine owns Live DJ volume exclusively.
  useEffect(() => {
    const audio = audioRef?.current;
    if (!audio || rawDfState) return;
    if (voiceActive) {
      if (preVoiceVolumeRef.current === null) preVoiceVolumeRef.current = audio.volume ?? 1.0;
      audio.volume = 0.25;
    } else if (preVoiceVolumeRef.current !== null) {
      audio.volume = preVoiceVolumeRef.current > 0 ? preVoiceVolumeRef.current : personalBaseVolRef.current;
      preVoiceVolumeRef.current = null;
    }
    return () => {
      if (preVoiceVolumeRef.current !== null && !rawDfState) {
        audio.volume = personalBaseVolRef.current;
        preVoiceVolumeRef.current = null;
      }
    };
  }, [voiceActive, rawDfState, audioRef]);

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
  const currentZoneName = detectZone(playerPos.x, playerPos.z)?.name || (worldMode === "beach" ? "Upper Vibe Beach World" : "Plaza");
  const { activeUsers, userCount, isBroadcasting } = useVibeWorldPresence(user, currentZoneName, playerPos, {
    equippedAura,
    equippedAuraColor,
    equippedHoverboard: equippedBoard,
    personalHoverboardActive,
    equippedNameplate,
    equippedBadge,
    equippedClothing,
    avatarTypeKey: testAvatarTypeKey,
    avatarSkinTone: avatarConfig.skinTone,
    avatarStyle: user?.avatar_style || "streetwear",
    avatarOutfitColor: avatarConfig.outfitColorKey,
  }, {
    isDancing,
    personalHoverboardActive,
    isPlayingNeonSurf,
  });

  // ── Follow System ─────────────────────────────────────────────────────
  const followSystem = useFollowSystem(user?.id, user?.full_name || user?.username);

  // ── Block System (persistent) ─────────────────────────────────────────
  const blockSystem = useBlockSystem(user?.id, user?.world_username || "");

  // ── Direct Messaging ──────────────────────────────────────────────────
  const {
    activeChatPeer, chatMessages, notifications, unreadCount, blockedUsers,
    sendMessageRequest, sendMessage, approveRequest, denyRequest,
    openApprovedChat, endChat, blockUser, unblockUser,
    markNotificationHandled, markAllNotificationsRead,
  } = useDirectMessaging(user);

  // Merged block map: union of persistent (blockSystem) and in-session (chat) blocks
  const mergedBlocks = { ...(blockedUsers || {}), ...blockSystem.blockMap };
  const [userInteractionTarget, setUserInteractionTarget] = useState(null);
  // Composer state: open message request composer for a target user
  const [messageComposerTarget, setMessageComposerTarget] = useState(null);

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

  // Open message request composer
  const handleOpenMessageComposer = useCallback((targetUserId, targetUsername) => {
    if (!targetUserId) return;
    setMessageComposerTarget({ userId: targetUserId, username: targetUsername });
  }, []);



  const handleReportUser = useCallback((target) => {
    // Placeholder — could open a report form or trigger a backend function
    try { navigator?.vibrate?.(20); } catch {}
  }, []);

  // Stable callbacks for DirectChatPanel so memo doesn't re-render chat on every presence update
  const activeChatPeerRef = useRef(null);
  activeChatPeerRef.current = activeChatPeer;

  const handleDirectChatBlock = useCallback(() => {
    const peer = activeChatPeerRef.current;
    if (!peer) return;
    blockSystem.blockUser(peer.userId, peer.username);
    blockUser(peer.userId, peer.username);
    endChat();
  }, [blockSystem, blockUser, endChat]);

  const handleDirectChatReport = useCallback(() => {
    handleReportUser(activeChatPeerRef.current);
  }, [handleReportUser]);


  // Keep player refs in sync without adding them as effect deps
  stageIsPlayingRef.current = isPlaying;
  stageTogglePlayRef.current = togglePlay;

  const handleGlobalSkip = useCallback(() => { skipTrack?.(); }, [skipTrack]);

  // ── Bottom player toggle: simple, instant, no stage side-effects ──
  // Guard: don't start personal audio when on the dance floor (DJ owns audio there)
  const handleGlobalPlayToggle = useCallback(() => {
    // On dance floor: player UI is visible but audio is owned by DJ — tap does nothing
    if (onDanceFloor) return;

    // If paused but no track yet, start feed
    if (!isPlaying && !currentTrack && playTrack) {
      const pool = sortedTracks?.length > 0
        ? sortedTracks.slice(0, Math.min(5, sortedTracks.length))
        : allTracks?.length > 0 ? allTracks : [];
      if (pool.length > 0) {
        const pick = pool[Math.floor(Math.random() * pool.length)];
        feedActiveRef.current = true;
        feedIndexRef.current = (sortedTracks?.length > 0 ? sortedTracks : allTracks).indexOf(pick);
        setCityGlobalUserManuallyPaused(false);
        playTrack(pick, "song");
        return;
      }
    }
    setCityGlobalUserManuallyPaused(!!isPlaying);
    togglePlay?.();
  }, [isPlaying, currentTrack, togglePlay, sortedTracks, allTracks, playTrack, onDanceFloor]);

  // ── Stage proximity: auto-exit watch mode when player walks far away ──
  useEffect(() => {
    const STAGE_X = 0, STAGE_Z = -32;
    const dx = playerPos.x - STAGE_X;
    const dz = playerPos.z - STAGE_Z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    const OUTER = 18;

    // Only auto-exit if user explicitly chose Watch Stage and walked away
    if (dist > OUTER && stageWatching && !stageFullScreen) {
      muteStage();
      resumeGlobalIfNeeded(stagePausedPlayerRef);
      // Apply cooldown so they don't get snapped back in
      exitCooldownRef.current = true;
      if (exitCooldownTimerRef.current) clearTimeout(exitCooldownTimerRef.current);
      exitCooldownTimerRef.current = setTimeout(() => { exitCooldownRef.current = false; }, 2500);
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

  // Auto-start personalized feed when entering world.
  // Uses feedStartedRef to prevent re-triggering when user pauses playback.
  // IMPORTANT: Only auto-starts if something was already playing before entry.
  // If nothing was playing, marks feed as ready but stays paused — user taps play.
  useEffect(() => {
    if (feedLoading || loading || !playTrack) return;
    if (feedStartedRef.current) return; // already initialized — don't restart on state changes

    // If RAM (My Vibe Radio / Upper Vibe Radio) is already active, don't start a separate feed
    const ramS = ramGetState();
    if (ramS.activeMode !== null) {
      feedStartedRef.current = true; // mark as handled so we don't re-trigger
      return;
    }

    // If something is already playing via PlayerContext, adopt it into feed mode
    if (currentTrack && isPlaying) {
      feedActiveRef.current = true;
      feedStartedRef.current = true;
      feedIndexRef.current = sortedTracks?.findIndex(t => t.id === currentTrack.id) ?? 0;
      return;
    }

    // Nothing was playing — mark feed as ready but do NOT auto-start
    // Player will show in idle state; user taps play to start the feed
    feedStartedRef.current = true;
    feedActiveRef.current = true;
    if (currentTrack) {
      // Track loaded from previous session (paused) — adopt position without restarting
      feedIndexRef.current = sortedTracks?.findIndex(t => t.id === currentTrack.id) ?? 0;
    }
  }, [feedLoading, loading, currentTrack, isPlaying, sortedTracks, allTracks, playTrack]);

  const personalBaseVolRef = useRef(1.0);

  // Cleanup on unmount — cancel timers and restore personal player volume.
  useEffect(() => {
    return () => {
      console.log("[UpperVibeCity] 🚪 City unmounting — cleaning up timers and DJ audio");
      clearInterval(jukeboxFadeRef.current);
      clearTimeout(dfDebounceRef.current);

      // Restore personal player volume if another city system ducked it.
      const personal = audioRef?.current;
      if (personal) {
        personal.muted = false;
        personal.volume = personalBaseVolRef.current;
      }
    };
  }, [audioRef]);

  // ── Auto-rotate stage video every 60s when user isn't interacting ──
  const handleTransport = useCallback((target) => {
    setTransportPrompt(null);
    setTransportTarget(null);
    setLoading(true);
    setStageWatching(false);
    setStageFullScreen(false);
    setIsPlayingNeonSurf(false);
    setFerrisRiding(false);
    setNearJukebox(false);
    if (target === "beach") {
      setWorldSpawn({ x: 0, z: -9, rot: 0 });
      setPlayerPos({ x: 0, z: -9, rot: 0, animState: "idle" });
      prevPosRef.current = { x: 0, z: -9, rot: 0 };
      setWorldMode("beach");
    } else {
      setWorldSpawn({ x: 12, z: 4, rot: Math.PI });
      setPlayerPos({ x: 12, z: 4, rot: Math.PI, animState: "idle" });
      prevPosRef.current = { x: 12, z: 4, rot: Math.PI };
      setWorldMode("city");
    }
  }, []);

  useEffect(() => {
    if (stageVideos.length <= 1) return;
    const timer = setInterval(() => {
      if (worldMode !== "city" || stageWatching || stageFullScreen) return; // User is actively using stage
      // Don't rotate if user is near the stage (looking at it)
      const STAGE_X = 0, STAGE_Z = -32;
      const dx = playerPos.x - STAGE_X;
      const dz = playerPos.z - STAGE_Z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < 12) return;
      setStageVideoIdx((prev) => (prev + 1) % stageVideos.length);
    }, 60000);
    return () => clearInterval(timer);
  }, [stageVideos.length, stageWatching, stageFullScreen, playerPos.x, playerPos.z, worldMode]);

  return (
    <div className="fixed inset-0 z-[60] overflow-hidden" style={{ background: "#050510" }}>
      {/* 3D Park — key on testAvatarTypeKey forces full remount when avatar type changes */}
      <div className="absolute inset-0" key={`${worldMode}-${testAvatarTypeKey}-${avatarVersion}`}>
        <VibeCoinHUD
          sessionCoins={sessionCoins}
          totalCoins={totalCoins}
          lastCollectCount={lastCollectCount}
          isMobile={isMobile}
          mobileLayout={mobileLayout}
          stageFullScreen={stageFullScreen}
          onOpenInventory={() => setInventoryOpen(true)}
        />
        <CityCanvas
        worldMode={worldMode}
        auraActive={auraActive}
        equippedAura={equippedAura}
        spawnOverride={worldSpawn || (returnState.current ? { x: returnState.current.x, z: returnState.current.z, rot: returnState.current.rot } : null)}
          moveTarget={domeExitTarget}
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
            // Update raw position refs EVERY frame (before throttle) for iOS safety
            rawPosRef.current = { x, z };
            {
              const dfDx = x - DANCE_FLOOR_CX;
              const dfDz = z - DANCE_FLOOR_CZ;
              const isInsideDanceFloor = worldMode === "city" && Math.sqrt(dfDx * dfDx + dfDz * dfDz) <= DANCE_FLOOR_ENTER_R;
              rawDfRef.current = isInsideDanceFloor;
              danceFloorFrameRef.current = { x, z, onDanceFloor: isInsideDanceFloor };
            }
            const prev = prevPosRef.current;
            const dx = x - prev.x;
            const dz = z - prev.z;
            const speed = Math.sqrt(dx * dx + dz * dz);
            // Stop auto-dance as soon as the player starts moving
            if (isDancingRef.current && speed > 0.015) {
              setIsDancing(false);
              setActiveEmote(null);
            }
            // Skip React re-render if position changed less than 0.3 units and rotation < 0.05 rad
            const prevRot = prevPosRef.current.rot ?? 0;
            if (Math.abs(dx) < 0.3 && Math.abs(dz) < 0.3 && Math.abs(rot - prevRot) < 0.05) return;
            const animState = isDancingRef.current ? "dancing" : speed > 0.015 ? "walking" : "idle";
            prevPosRef.current = { x, z, rot };
            setPlayerPos({ x, z, rot, animState });
          }}
          onJukeboxProximity={(near, vol) => {
            setNearJukebox(worldMode === "city" && near);
            jukeboxProxVolRef.current = vol;
          }}
          onTransportProximity={(target) => {
            setTransportTarget(target);
            if (!target) {
              setTransportPrompt(null);
              setDismissedTransportTarget(null);
              return;
            }
            if (!transportPrompt && target !== dismissedTransportTarget) setTransportPrompt(target);
          }}
          isDancing={isDancing}
          activeEmote={activeEmote}
          stageCanvas={worldMode === "city" && stageWatching ? null : worldMode === "city" ? stageCanvas : null}
          audioIntensityRef={audioIntensityRef}
          audioBassRef={audioBassRef}
          audioBeatRef={audioBeatRef}
          locked={movementLocked}
          stageScreenPosRef={stageScreenPosRef}
          mobileInputRef={mobileInputRef}
          remoteUsers={activeUsers}
          avatarConfig={avatarConfig}
          djTrack={djTrack}
          hbRiding={hbRiding}
          isPlayingNeonSurf={isPlayingNeonSurf}
          personalHoverboardActive={personalHoverboardActive}
          hoverboardJumpRequest={hoverboardJumpRequest}
          ferrisRiding={ferrisRiding}
          rendererRef={rendererRef}
          tvMode={tvMode}
          tvQuality={tvQuality}
          danceFloorFrameRef={danceFloorFrameRef}
        />
      </div>

      {/* Transport prompt */}
      {transportTarget && !transportPrompt && !loading && (
        <button
          onClick={() => setTransportPrompt(transportTarget)}
          className="absolute left-1/2 -translate-x-1/2 rounded-2xl font-black tracking-wide transition-all active:scale-95"
          style={{
            zIndex: 230,
            bottom: isMobile ? "calc(150px + env(safe-area-inset-bottom, 0px))" : 92,
            padding: "12px 18px",
            background: "linear-gradient(135deg,#00B8D4,#00E5FF)",
            color: "#001018",
            boxShadow: "0 0 28px rgba(0,229,255,0.35)",
          }}
        >
          {transportTarget === "beach" ? "Enter Upper Vibe Beach World" : "Return to Upper Vibe City"}
        </button>
      )}

      {transportPrompt && (
        <div className="absolute inset-0 flex items-center justify-center px-5" style={{ zIndex: 260, background: "rgba(4,4,14,0.62)", backdropFilter: "blur(10px)" }}>
          <div className="w-full max-w-sm rounded-3xl p-6 text-center" style={{ background: "linear-gradient(160deg,#0d0d22,#080818)", border: "1px solid rgba(0,229,255,0.24)", boxShadow: "0 24px 80px rgba(0,0,0,0.55)" }}>
            <h2 className="font-heading font-black text-xl text-white mb-3">{transportPrompt === "beach" ? "Enter Upper Vibe Beach World?" : "Return to Upper Vibe City?"}</h2>
            <p className="text-sm text-white/45 mb-6">Your avatar, music, inventory, and Vibe Coins stay connected.</p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => handleTransport(transportPrompt)} className="py-3 rounded-2xl font-black text-sm" style={{ background: "linear-gradient(135deg,#00B8D4,#00E5FF)", color: "#000" }}>Enter</button>
              <button onClick={() => { setDismissedTransportTarget(transportPrompt); setTransportPrompt(null); }} className="py-3 rounded-2xl font-black text-sm" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.7)" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 z-30 flex items-center justify-center" style={{ background: "rgba(5,5,16,0.85)" }}>
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-400 rounded-full animate-spin" />
            <p className="text-xs text-purple-200/70 font-medium tracking-wider">Entering the cosmos...</p>
          </div>
        </div>
      )}

      {/* ── Top HUD row: Exit (left) | TV Mode + UVC (right) — hidden during fullscreen ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: (loading || stageFullScreen || domeFullscreenOpen) ? 0 : 1 }}
        transition={{ delay: (stageFullScreen || domeFullscreenOpen) ? 0 : 0.4 }}
        className="absolute top-0 left-0 right-0 flex items-center justify-between"
        style={{
          zIndex: 200,
          pointerEvents: (loading || stageFullScreen || domeFullscreenOpen) ? "none" : "auto",
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

        {/* Right: spacer — TV Mode button is now positioned independently below */}
        <div />
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
        stageFullScreen={stageFullScreen}
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
        onMobileModalChange={(open) => { setMobileModalOpen(open); setAnyBlockingUIOpen(open); }}
        activeUsers={activeUsers}
        userCount={userCount}
        isBroadcasting={isBroadcasting}
        currentUserId={user?.id}
        activeChatPeer={activeChatPeer}
        chatMessages={chatMessages}
        onSelectUser={handleSelectUser}
        onOpenMessageComposer={handleOpenMessageComposer}
        onSendChatMessage={sendMessage}
        onEndChat={endChat}
        onBlockUser={(uid, uname) => {
          blockSystem.blockUser(uid, uname);
          blockUser(uid, uname);
        }}
        onUnblockUser={(uid) => { blockSystem.unblockUser(uid); unblockUser(uid); }}
        onReportUser={handleReportUser}
        blockedUsers={mergedBlocks}
        userInteractionTarget={userInteractionTarget}
        onCloseUserMenu={handleCloseUserMenu}
        onOpenApprovedChat={openApprovedChat}
        onLoungeInputFocus={setLoungeInputFocused}
        onVoiceActive={setVoiceActive}
        notifications={notifications}
        unreadCount={unreadCount}
        onMarkNotificationHandled={markNotificationHandled}
        onMarkAllNotificationsRead={markAllNotificationsRead}
        onApproveRequest={approveRequest}
        onDenyRequest={denyRequest}
        onEmote={handleEmote}
        onStopDance={handleStopDance}
        onEmotePanelOpen={(open) => { if (open) setAnyBlockingUIOpen(true); }}
        isDancing={isDancing}
        activeEmote={activeEmote}
        onEditAvatar={() => setCustomizerOpen(true)}
        onOpenInventory={() => setInventoryOpen(true)}
        onOpenTvMode={() => setTvOverlayOpen(true)}
        onExitCity={onExit}
        onDomeOpenChange={setDomeFullscreenOpen}
        onExitDome={() => setDomeExitTarget({ id: Date.now(), x: -13, z: 2.2, rot: 0 })}
        domeTrack={cityTrack}
        domeIsPlaying={cityIsPlaying}
        nearJukebox={nearJukebox}
        djTrack={djTrack}
        onFerrisRideChange={setFerrisRiding}
        followSystem={followSystem}
        username={user?.world_username || ""}
      />

      {/* Stage cover visualizer (only when not watching — iframe replaces it) */}
      {worldMode === "city" && !stageWatching && (
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
        onStageExitWatchMode={handleExitWatchMode}
        onStageNextVideo={handleStageNextVideo}
        onStagePlaySong={handleStagePlaySong}
        onStageMuteToggle={handleStageMuteToggle}
        stageMuted={stageMuted}
        isMobile={isMobile}
        mobileLayout={mobileLayout}
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

      {/* Launch is handled by LaunchRide — no manual LAUNCH button */}
      {/* Crystal Zone is now a decorative landmark — no UI/interaction */}

      {/* ── Hoverboard Ring Run HUD ── */}
      <HoverboardPanel
        visible={(nearHoverboard || hbRiding) && !personalHoverboardActive}
        isMobile={isMobile}
        mobileLayout={mobileLayout}
        user={user}
        onStartRide={handleHbStart}
        onEndRide={handleHbEnd}
        onCoinsEarned={null}
      />




      {/* ── Avatar Customizer Panel (color + style) ────────────────────── */}
      <AvatarCustomizerPanel
        open={customizerOpen}
        onClose={() => setCustomizerOpen(false)}
        currentStyle={user?.avatar_style || "streetwear"}
        currentSuitColor={user?.avatar_suit_color || "#4a5c3a"}
        isMobile={isMobile}
        user={user}
        onApply={({ outfitColorKey, suitColor, avatarTypeKey: newTypeKey, hairStyleKey: newHairStyle }) => {
          const typeChanged = newTypeKey && newTypeKey !== testAvatarTypeKey;
          if (typeChanged) {
            setTestAvatarTypeKey(newTypeKey);
          }
          // Always remount the world so hair style + avatar type take effect
          setLoading(true);
          setAvatarVersion((v) => v + 1);
        }}
      />

      {/* ── Media Player — mirrors global player state, no separate song selector ── */}
      {(() => {
        if (stageFullScreen) return null;
        const displayTrack = cityTrack;

        // The city player shows the active/default My Vibe track with real metadata.

        // Determine current zone for stage-proximity check
        const currentZone = detectZone(playerPos.x, playerPos.z);
        const nearStage = currentZone?.id === "stage";

        // Hide when stage is watching (stage embed is the audio) or any blocking modal is open
        const shouldHide = stageWatching || mobileModalOpen || activeChatPeer || messageComposerTarget;
        if (shouldHide) return null;

        // TV mode opacity
        const tvOpacity = tvMode && !tvPlayerVisible ? 0 : 1;
        const tvPointerEvents = tvMode && !tvPlayerVisible ? "none" : "auto";

        return (
          <div
            style={{ opacity: tvOpacity, transition: "opacity 0.5s", pointerEvents: tvPointerEvents }}
            onClick={tvMode ? handleTvPlayerTap : undefined}
          >
            <DraggableMediaPlayer
              currentTrack={displayTrack}
              isPlaying={cityIsPlaying}
              onTogglePlay={cityTrack ? handleCityTogglePlay : handleGlobalPlayToggle}
              onSkip={cityTrack ? handleCitySkip : handleGlobalSkip}
              nearStage={nearStage}
              domeMode={domeFullscreenOpen}
            />
          </div>
        );
      })()}

      {/* Floating emoji emotes — non-dance emotes show emoji above avatar */}
      <EmojiEmote activeEmote={activeEmote} isDancing={isDancing} isMobile={isMobile} />

      {/* Performance audit overlay — only visible with ?perf=1 in URL */}
      <PerfAuditOverlay
        playerPos={playerPos}
        rendererRef={rendererRef}
        tvMode={tvMode}
        tvQuality={tvQuality}
      />

      {/* TV Mode AirPlay instructions overlay */}
      {tvOverlayOpen && (
        <TvModeOverlay
          onConfirm={(quality) => { setTvOverlayOpen(false); enableTvMode(quality); }}
          onCancel={() => setTvOverlayOpen(false)}
          defaultQuality={tvQuality}
        />
      )}

      {/* ── Message Request Composer ─────────────────────────── */}
      <AnimatePresence>
        {messageComposerTarget && !activeChatPeer && (
          <MessageRequestComposer
            open={!!messageComposerTarget}
            targetUser={messageComposerTarget}
            isMobile={isMobile}
            onSend={async (text) => {
              const result = await sendMessageRequest(
                messageComposerTarget.userId,
                messageComposerTarget.username,
                text
              );
              return result;
            }}
            onClose={() => setMessageComposerTarget(null)}
          />
        )}
      </AnimatePresence>

      {/* ── Direct Chat Panel (approved chats only) ──────────── */}
      <AnimatePresence>
        {activeChatPeer && (
          <DirectChatPanel
            open={!!activeChatPeer}
            peer={activeChatPeer}
            messages={chatMessages}
            onSend={sendMessage}
            onClose={endChat}
            onBlock={handleDirectChatBlock}
            onReport={handleDirectChatReport}
            currentUserId={user?.id}
            isMobile={isMobile}
          />
        )}
      </AnimatePresence>

      {/* ── Inventory Panel ─────────────────────────────────── */}
      <InventoryPanel
        open={inventoryOpen}
        onClose={() => setInventoryOpen(false)}
        user={user}
        isMobile={isMobile}
      />

      <PersonalHoverboardHUD 
        isMobile={isMobile} 
        mobileLayout={mobileLayout}
        onToggle={() => setPersonalHoverboardActive(p => !p)}
        onJump={() => setHoverboardJumpRequest({ id: Date.now() })}
        personalHoverboardActive={personalHoverboardActive}
        canUsePersonalBoard={!!equippedBoard && !personalHoverboardActive && !isPlayingNeonSurf && !ferrisRiding && !stageWatching && !domeFullscreenOpen && !anyBlockingUIOpen && !nearHoverboard && (worldMode === "beach" || !detectZone(playerPos.x, playerPos.z))}
      />

      {/* FPS monitor — only visible with ?debug=1 in URL or localStorage.uvc_debug=1 */}
      <FPSMonitor sceneRef={rendererRef} remoteUserCount={userCount} />

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