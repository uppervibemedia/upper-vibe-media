import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, Play } from "lucide-react";
import MobileJoystick from "@/components/vibeworld/MobileJoystick";
import DraggableMediaPlayer from "@/components/vibeworld/DraggableMediaPlayer";
import CityCanvas from "@/components/vibeworld/CityCanvas";
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

export default function UpperVibeCity({ onExit, chatAgeConfirmed = false }) {
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [playerPos, setPlayerPos] = useState({ x: 0, z: 5, rot: 0, animState: "idle" });
  const prevPosRef = useRef({ x: 0, z: 5 });
  const [stageCanvas, setStageCanvas] = useState(null);
  const audioIntensityRef = useRef(0);
  const audioBassRef = useRef(0);
  const audioBeatRef = useRef(0);
  const mobileInputRef = useRef({ x: 0, y: 0, camDx: 0 });
  const [mobileModalOpen, setMobileModalOpen] = useState(false);
  const [editAvatarOpen, setEditAvatarOpen] = useState(false);
  const [avatarVersion, setAvatarVersion] = useState(0); // bump to re-read user data
  const [nearJukebox, setNearJukebox] = useState(false);
  const jukeboxProxVolRef = useRef(1.0);
  const onDanceFloorRef = useRef(false);

  // ── Separate Jukebox audio element — never touches personal player ────────
  const jukeboxAudioRef = useRef(null);       // dedicated <audio> for dance floor
  const jukeboxTrackRef = useRef(null);       // which track is loaded in jukebox
  const personalWasPlayingRef = useRef(false);// was personal player playing on entry?
  const personalTimeRef = useRef(0);          // playback position when paused on entry
  const jukeboxFadeRef = useRef(null);        // fade interval handle

  // ── Dance Floor / Emote state ─────────────────────────────────────────────
  const [isDancing, setIsDancing] = useState(false);
  const isDancingRef = useRef(false);
  isDancingRef.current = isDancing;
  const [activeEmote, setActiveEmote] = useState(null); // { id, label, color, effect, startedAt }
  const emoteTimerRef = useRef(null);
  const wasMovingRef = useRef(false);

  const handleEmote = useCallback((emote) => {
    if (emote.id === "dance") {
      setIsDancing(true);
      setActiveEmote({ ...emote, startedAt: Date.now() });
    } else {
      // Clear any existing emote timer
      if (emoteTimerRef.current) clearTimeout(emoteTimerRef.current);
      setActiveEmote({ ...emote, startedAt: Date.now() });
      // Non-dance emotes last 3 seconds
      emoteTimerRef.current = setTimeout(() => {
        setActiveEmote(null);
      }, 3000);
    }
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

  // ── Stage video state ──────────────────────────────────────────────────
  const [stageVideos, setStageVideos] = useState([]);
  const [stageVideoIdx, setStageVideoIdx] = useState(0);
  const [stageVideoMuted, setStageVideoMuted] = useState(true);
  const [stageWatching, setStageWatching] = useState(false);
  const [stageFullScreen, setStageFullScreen] = useState(false);
  const stageMutedRef = useRef(true);
  const stageIsPlayingRef = useRef(false);
  const stageTogglePlayRef = useRef(null);
  const stagePausedPlayerRef = useRef(false);
  const stageEmbedRef = useRef(null); // StageVideoEmbed ref (handles video + audio)
  const stageScreenPosRef = useRef({ x: -9999, y: -9999, w: 0, h: 0 });
  const preFullscreenWasWatchingRef = useRef(false); // was stage active before fullscreen?
  const fullscreenPausedPlayerRef = useRef(false); // was global playing before fullscreen?
  stageMutedRef.current = stageVideoMuted;

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
  const avatarConfig = {
    avatarType: user?.avatar_type || "neutral",
    skinTone: user?.skin_tone || "medium",
    rpmAvatarUrl: user?.rpm_avatar_url || null,
  };

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
    setStageVideoMuted(true);
    if (stageEmbedRef.current) {
      stageEmbedRef.current.mute();
      stageEmbedRef.current.pause();
    }
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

    // 3) Start stage audio
    setStageWatching(true);
    setStageVideoMuted(false);
    setTimeout(() => {
      if (stageEmbedRef.current) {
        stageEmbedRef.current.unmute();
        stageEmbedRef.current.play();
      }
    }, 300);
  }, [stageFullScreen, pauseGlobal]);

  const handleExitWatchMode = useCallback(() => {
    muteStage();
    // Resume global player ONLY if fullscreen is not open
    if (!stageFullScreen) {
      resumeGlobalIfNeeded(stagePausedPlayerRef);
    }
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
      // Resume stage watching
      setStageWatching(true);
      setStageVideoMuted(false);
      setTimeout(() => {
        if (stageEmbedRef.current) {
          stageEmbedRef.current.unmute();
          stageEmbedRef.current.play();
        }
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
  const movementLocked = stageWatching || stageFullScreen || loungeInputFocused;

  // ── Audio ducking: reduce personal player + jukebox to ~25% when voice is active ──
  useEffect(() => {
    const audio = audioRef?.current;
    const jk = jukeboxAudioRef.current;
    if (voiceActive) {
      if (preVoiceVolumeRef.current === null && audio) {
        preVoiceVolumeRef.current = audio.volume;
      }
      if (audio) audio.volume = 0.25;
      if (jk) jk.volume = 0.15;
    } else {
      if (preVoiceVolumeRef.current !== null && audio) {
        audio.volume = preVoiceVolumeRef.current;
        preVoiceVolumeRef.current = null;
      }
      // Restore jukebox volume if on dance floor
      if (jk && onDanceFloorRef.current) jk.volume = 0.85;
    }
    return () => {
      if (preVoiceVolumeRef.current !== null && audio) {
        audio.volume = preVoiceVolumeRef.current;
        preVoiceVolumeRef.current = null;
      }
    };
  }, [voiceActive, audioRef]);

  const handleStageNextVideo = () => {
    if (stageVideos.length <= 1) return;
    setStageVideoIdx((prev) => (prev + 1) % stageVideos.length);
  };
  const handleStageToggleMute = () => {
    setStageVideoMuted((m) => {
      const next = !m;
      if (!next) {
        // Unmuting — same coordination as Watch on Stage
        if (stageFullScreen) setStageFullScreen(false);
        pauseGlobal();
        stagePausedPlayerRef.current = true;
        setStageWatching(true);
        setTimeout(() => {
          if (stageEmbedRef.current) {
            stageEmbedRef.current.unmute();
            stageEmbedRef.current.play();
          }
        }, 300);
      } else {
        // Muting — same as exit watch mode
        muteStage();
        if (!stageFullScreen) {
          resumeGlobalIfNeeded(stagePausedPlayerRef);
        }
      }
      return next;
    });
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
    const STAGE_X = 0, STAGE_Z = -15;
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

  // Auto-start personalized feed when entering world (only if silent).
  // Uses feedStartedRef to prevent re-triggering when user pauses playback.
  useEffect(() => {
    if (feedLoading || loading || !playTrack) return;
    if (feedStartedRef.current) return; // already initialized — don't restart on state changes
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

  // Keep stable refs for dance floor handlers
  const isPlayingRef = useRef(false);
  isPlayingRef.current = isPlaying;
  const togglePlayRef = useRef(togglePlay);
  togglePlayRef.current = togglePlay;

  // ── Smooth RAF-based crossfade between personal player and jukebox ──────────
  // personalTargetVolRef tracks where the personal audio element should land
  const personalTargetVolRef = useRef(1.0);
  const personalBaseVolRef = useRef(1.0); // original vol before dance floor entry

  const crossfadeRafRef = useRef(null);

  const runCrossfade = useCallback((durationMs = 1200) => {
    cancelAnimationFrame(crossfadeRafRef.current);
    const jk = jukeboxAudioRef.current;
    const personal = audioRef?.current;
    const startTime = performance.now();

    // Snapshot starting volumes
    const jkStart = jk ? jk.volume : 0;
    const jkTarget = personalTargetVolRef.current === 0 ? 0.85 : 0; // entering=fade jk in, exiting=fade jk out
    const personalStart = personal ? personal.volume : 1;
    const personalTarget = personalTargetVolRef.current; // 0 when entering, restored vol when exiting

    const tick = (now) => {
      const t = Math.min(1, (now - startTime) / durationMs);
      // Ease in-out cubic
      const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

      if (jk) jk.volume = jkStart + (jkTarget - jkStart) * ease;
      if (personal) personal.volume = personalStart + (personalTarget - personalStart) * ease;

      if (t < 1) {
        crossfadeRafRef.current = requestAnimationFrame(tick);
      } else {
        // Crossfade done — if jukebox faded out, pause it
        if (jkTarget === 0 && jk) {
          jk.pause();
          jk.currentTime = 0;
        }
      }
    };
    crossfadeRafRef.current = requestAnimationFrame(tick);
  }, [audioRef]);

  // ── Jukebox helpers — operate on the dedicated jukebox <audio> only ────────
  const startJukebox = useCallback((audioUrl) => {
    if (!audioUrl) return;
    // Create the dedicated audio element once
    if (!jukeboxAudioRef.current) {
      jukeboxAudioRef.current = new Audio();
      jukeboxAudioRef.current.loop = true;
    }
    const jk = jukeboxAudioRef.current;
    if (jk.src !== audioUrl) {
      jk.src = audioUrl;
      jk.load();
    }
    jk.volume = 0;
    jk.play().catch(() => {});
    // personalTargetVolRef=0 signals crossfade: jk fades IN, personal fades OUT
    personalTargetVolRef.current = 0;
    runCrossfade(1200);
  }, [runCrossfade]);

  const stopJukebox = useCallback(() => {
    const jk = jukeboxAudioRef.current;
    if (!jk) return;
    // personalTargetVolRef=restored vol signals crossfade: jk fades OUT, personal fades IN
    personalTargetVolRef.current = personalBaseVolRef.current;
    runCrossfade(1000);
  }, [runCrossfade]);

  // Cleanup jukebox on unmount
  useEffect(() => {
    return () => {
      cancelAnimationFrame(crossfadeRafRef.current);
      clearInterval(jukeboxFadeRef.current);
      if (jukeboxAudioRef.current) {
        jukeboxAudioRef.current.pause();
        jukeboxAudioRef.current.src = "";
        jukeboxAudioRef.current = null;
      }
    };
  }, []);

  // ── Dance floor proximity: SEPARATE jukebox audio, never touches personal player ──
  useEffect(() => {
    const DANCE_X = 0, DANCE_Z = -4, DANCE_RADIUS = 7;
    const dx = playerPos.x - DANCE_X;
    const dz = playerPos.z - DANCE_Z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    const isOnFloor = dist < DANCE_RADIUS;

    if (isOnFloor && !onDanceFloorRef.current) {
      // ── ENTERED DANCE FLOOR ──
      onDanceFloorRef.current = true;

      // Save personal player state (position + whether it was playing + current volume)
      const audio = audioRef?.current;
      personalWasPlayingRef.current = isPlayingRef.current;
      personalTimeRef.current = audio?.currentTime ?? 0;
      personalBaseVolRef.current = (audio && audio.volume > 0) ? audio.volume : 1.0;

      // If personal player is paused, briefly un-mute it to full vol so crossfade has something to fade
      if (audio && audio.volume === 0) audio.volume = personalBaseVolRef.current;

      // If personal player wasn't playing, just ensure jukebox fades in from silence (no personal vol change needed)
      if (!isPlayingRef.current) {
        personalTargetVolRef.current = personalBaseVolRef.current; // no vol change needed
      }

      // Start jukebox — crossfade handles fading personal out + jukebox in
      if (!jukeboxTrackRef.current) {
        base44.entities.Track.filter({ is_featured: true, status: "published" }, "-display_order", 8)
          .then((tracks) => {
            const pool = tracks.length > 0 ? tracks : [];
            if (pool.length > 0) {
              const pick = pool[Math.floor(Math.random() * pool.length)];
              jukeboxTrackRef.current = pick;
              startJukebox(pick.audio_url);
            }
          })
          .catch(() => {});
      } else {
        startJukebox(jukeboxTrackRef.current.audio_url);
      }

    } else if (!isOnFloor && onDanceFloorRef.current) {
      // ── LEFT DANCE FLOOR ──
      onDanceFloorRef.current = false;

      // Crossfade: jukebox fades out, personal fades back in
      stopJukebox();

      // Resume personal player playback after crossfade settles (~300ms in)
      if (personalWasPlayingRef.current) {
        personalWasPlayingRef.current = false;
        setTimeout(() => {
          const audio = audioRef?.current;
          if (audio && personalTimeRef.current > 0) {
            audio.currentTime = personalTimeRef.current;
          }
          if (!isPlayingRef.current && togglePlayRef.current) {
            togglePlayRef.current();
          }
        }, 300);
      }
    }
  }, [playerPos.x, playerPos.z, startJukebox, stopJukebox, audioRef]);

  // ── Auto-rotate stage video every 60s when user isn't interacting ──
  useEffect(() => {
    if (stageVideos.length <= 1) return;
    const timer = setInterval(() => {
      if (stageWatching || stageFullScreen) return; // User is actively using stage
      // Don't rotate if user is near the stage (looking at it)
      const STAGE_X = 0, STAGE_Z = -15;
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
      {/* 3D Park */}
      <div className="absolute inset-0">
        <CityCanvas
          onLoaded={() => setLoading(false)}
          onRemoteAvatarClick={handleRemoteAvatarClick}
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
            // Proximity volume only applies to jukebox while on dance floor — never personal player
            const jk = jukeboxAudioRef.current;
            if (jk && onDanceFloorRef.current && !crossfadeRafRef.current) {
              jk.volume = Math.max(0.05, Math.min(0.9, vol * 0.85));
            }
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

      {/* ── Top HUD row: Exit (left) | UVC (right) ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: loading ? 0 : 1 }}
        transition={{ delay: 0.4 }}
        className="absolute top-0 left-0 right-0 z-[55] flex items-center justify-between px-1.5"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 4px)" }}
      >
        {/* Left: icon-only Exit */}
        <button
          onClick={onExit}
          onTouchStart={(e) => e.stopPropagation()}
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
          }}
          aria-label="Exit Vibe City"
        >
          <ChevronLeft style={{ width: "16px", height: "16px" }} />
        </button>

        {/* Exit Watch Mode — persistent when watching stage on mobile */}
        {isMobile && stageWatching && (
          <button
            onTouchStart={(e) => e.stopPropagation()}
            onClick={() => { try { navigator?.vibrate?.(10); } catch {} handleExitWatchMode(); }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-bold transition-all active:scale-95 flex-shrink-0"
            style={{
              background: "linear-gradient(135deg,#7C3AED,#9B7EFF)",
              color: "#fff",
              minHeight: "26px",
              touchAction: "manipulation",
              pointerEvents: "auto",
              boxShadow: "0 0 12px rgba(155,126,255,0.5)",
            }}
          >
            <Play className="w-3 h-3" /> Exit Watch
          </button>
        )}

        {/* Right: tiny UVC badge */}
        <div
          className="flex items-center rounded-full flex-shrink-0"
          style={{
            background: "rgba(255,255,255,0.05)",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255,255,255,0.06)",
            padding: isMobile ? "2px 5px" : "6px 12px",
          }}
        >
          <span className="font-heading font-black text-white/25"
            style={{
              fontSize: isMobile ? "6px" : "10px",
              letterSpacing: isMobile ? "0.08em" : "0.2em",
            }}
          >
            {isMobile ? "UVC" : "UPPER VIBE CITY"}
          </span>
        </div>
      </motion.div>

      {/* World HUD */}
      <WorldHUD
        playerX={playerPos.x}
        playerZ={playerPos.z}
        playerRot={playerPos.rot}
        isMobile={isMobile}
        loading={loading}
        stageVideoTitle={stageVideos[stageVideoIdx]?.title || null}
        stageVideoMuted={stageVideoMuted}
        stageWatching={stageWatching}
        stageVideosCount={stageVideos.length}
        onStageWatchVideo={handleWatchOnStage}
        onStageExitWatchMode={handleExitWatchMode}
        onStageNextVideo={handleStageNextVideo}
        onStageToggleMute={handleStageToggleMute}
        onStagePlaySong={handleStagePlaySong}
        onStageFullScreen={handleStageFullScreen}
        onStageExitFullScreen={handleExitFullScreen}
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
        onEditAvatar={() => setEditAvatarOpen(true)}
        nearJukebox={nearJukebox}
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

      {/* MOBILE: Game HUD — joystick + camera look + music */}
      {!loading && isMobile && (
        <>
          {/* Camera look zone — right half of screen, only empty space */}
          <div
            className="fixed inset-0 z-[45]"
            style={{ pointerEvents: "none" }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                right: 0,
                width: "50%",
                height: "65%",
                pointerEvents: "auto",
                touchAction: "none",
                userSelect: "none",
                WebkitUserSelect: "none",
              }}
              onTouchStart={(e) => {
                e.preventDefault();
                const t = e.changedTouches[0];
                if (t) {
                  mobileInputRef.current._camBaseX = t.clientX;
                  mobileInputRef.current._camActive = true;
                }
              }}
              onTouchMove={(e) => {
                if (!mobileInputRef.current._camActive) return;
                e.preventDefault();
                const t = e.touches[0];
                if (t && mobileInputRef.current._camBaseX !== undefined) {
                  const dx = t.clientX - mobileInputRef.current._camBaseX;
                  mobileInputRef.current.camDx -= dx * 0.0025;
                  mobileInputRef.current._camBaseX = t.clientX;
                }
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                mobileInputRef.current._camActive = false;
                mobileInputRef.current._camBaseX = undefined;
              }}
            />
          </div>

          <MobileJoystick
            onMove={(x, y) => {
              mobileInputRef.current.x = x;
              mobileInputRef.current.y = y;
            }}
          />

          {currentTrack && (
            <DraggableMediaPlayer
              currentTrack={currentTrack}
              isPlaying={isPlaying}
              onTogglePlay={handleGlobalPlayToggle}
              onSkip={handleGlobalSkip}
            />
          )}
        </>
      )}

      {/* ── Edit Avatar overlay — RPM Creator ──────────────────────────── */}
      {editAvatarOpen && (
        <RPMAvatarCreator
          onComplete={async () => {
            setEditAvatarOpen(false);
            setAvatarVersion((v) => v + 1);
          }}
          existingUrl={user?.rpm_avatar_url || null}
        />
      )}

      {/* DESKTOP: Draggable media player */}
      {!loading && !isMobile && currentTrack && (
        <DraggableMediaPlayer
          currentTrack={currentTrack}
          isPlaying={isPlaying}
          onTogglePlay={handleGlobalPlayToggle}
          onSkip={handleGlobalSkip}
        />
      )}
    </div>
  );
}