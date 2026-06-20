import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, Play, Pause, Home, Music4, Radio, Compass } from "lucide-react";
import MobileJoystick from "@/components/vibeworld/MobileJoystick";
import MobileMusicHUD from "@/components/vibeworld/MobileMusicHUD";
import { Link } from "react-router-dom";
import CityCanvas from "@/components/vibeworld/CityCanvas";
import StageCoverVisualizer from "@/components/vibeworld/StageCoverVisualizer";
import StageFullScreen from "@/components/vibeworld/StageFullScreen";
import StageVideoEmbed from "@/components/vibeworld/StageVideoEmbed";
import CoverImage from "@/components/shared/CoverImage";
import { usePlayer } from "@/context/PlayerContext";
import { useRadio } from "@/context/RadioContext";
import { useLivePresence } from "@/hooks/useLivePresence";
import { base44 } from "@/api/base44Client";
import WorldHUD from "@/components/vibeworld/WorldHUD";

export default function UpperVibeCity({ onExit, chatAgeConfirmed = false }) {
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [playerPos, setPlayerPos] = useState({ x: 0, z: 5, rot: 0 });
  const [stageCanvas, setStageCanvas] = useState(null);
  const audioIntensityRef = useRef(0);
  const mobileInputRef = useRef({ x: 0, y: 0, camDx: 0 });
  const [mobileModalOpen, setMobileModalOpen] = useState(false);

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
  const { currentTrack, isPlaying, togglePlay, playTrack, skipTrack } = playerCtx || {};
  const { allTracks, tracksLoaded } = radioCtx || {};

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

  // ── Movement locked when watching stage or in full-screen ─
  const movementLocked = stageWatching || stageFullScreen;

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

  useLivePresence();

  // Keep player refs in sync without adding them as effect deps
  stageIsPlayingRef.current = isPlaying;
  stageTogglePlayRef.current = togglePlay;

  const handleGlobalSkip = useCallback(() => { skipTrack?.(); }, [skipTrack]);

  // ── Bottom player toggle: mute all other sources first ────────
  const handleGlobalPlayToggle = useCallback(() => {
    if (isPlaying) {
      // Pausing is always safe
      togglePlay?.();
      return;
    }
    // Starting global player — mute stage + fullscreen first
    muteStage();
    if (stageFullScreen) setStageFullScreen(false);
    stagePausedPlayerRef.current = false;
    fullscreenPausedPlayerRef.current = false;
    togglePlay?.();
  }, [isPlaying, togglePlay, muteStage, stageFullScreen]);

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
    const freqData = new Uint8Array(analyser.frequencyBinCount);
    const loop = () => {
      analyser.getByteFrequencyData(freqData);
      const sum = freqData.reduce((a, b) => a + b, 0);
      audioIntensityRef.current = sum / (freqData.length * 255);
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }, [playerCtx?.analyserNode]);

  // Auto-start a random/featured song when entering world (only if silent)
  useEffect(() => {
    if (!tracksLoaded || loading) return;
    if (currentTrack || isPlaying) return; // Already has music — don't interrupt
    if (allTracks?.length > 0 && playTrack) {
      const featured = allTracks.filter((t) => t.is_featured);
      const pool = featured.length > 0 ? featured : allTracks;
      const pick = pool[Math.floor(Math.random() * pool.length)];
      if (pick) playTrack(pick, "song");
    }
  }, [tracksLoaded, loading, currentTrack, isPlaying, allTracks, playTrack]);

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
          onPositionChange={(x, z, rot) => setPlayerPos({ x, z, rot })}
          stageCanvas={stageWatching ? null : stageCanvas}
          audioIntensityRef={audioIntensityRef}
          locked={movementLocked}
          stageScreenPosRef={stageScreenPosRef}
          mobileInputRef={mobileInputRef}
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

      {/* Top HUD */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: loading ? 0 : 1 }}
        transition={{ delay: 0.4 }}
        className="absolute top-0 left-0 right-0 z-[55] flex items-center justify-between px-4 py-3"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.75rem)" }}
      >
        <button
          onClick={onExit}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all hover:bg-white/20"
          style={{
            background: "rgba(255,255,255,0.3)",
            backdropFilter: "blur(12px)",
            color: "#2E7D32",
            minWidth: "44px",
            minHeight: "44px",
            touchAction: "manipulation",
          }}
        >
          <ChevronLeft className="w-3.5 h-3.5" /> {isMobile ? "Exit City" : "Exit Upper Vibe City"}
        </button>

        {/* Exit Watch Mode — persistent when watching stage on mobile */}
        {isMobile && stageWatching && (
          <button
            onTouchStart={(e) => e.stopPropagation()}
            onClick={() => { try { navigator?.vibrate?.(10); } catch {} handleExitWatchMode(); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-95"
            style={{
              background: "linear-gradient(135deg,#7C3AED,#9B7EFF)",
              color: "#fff",
              minWidth: "44px",
              minHeight: "44px",
              touchAction: "manipulation",
              pointerEvents: "auto",
              boxShadow: "0 0 16px rgba(155,126,255,0.5)",
            }}
          >
            <Play className="w-3.5 h-3.5" /> Exit Watch
          </button>
        )}

        <div
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl"
          style={{
            background: "rgba(255,255,255,0.3)",
            backdropFilter: "blur(12px)",
          }}
        >
          <span className="font-heading font-black text-[10px] tracking-[0.2em] text-green-800">
            UPPER VIBE CITY
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
      />

      {/* Bottom navigation bar — DESKTOP ONLY, removed entirely on mobile */}
      {!loading && !isMobile && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="absolute bottom-0 left-0 right-0 z-[55] flex justify-center px-2"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.5rem)" }}
        >
          <div
            className="flex items-center justify-around gap-0.5 px-1 py-1.5 rounded-2xl max-w-sm w-full"
            style={{
              background: "rgba(255,255,255,0.35)",
              border: "1px solid rgba(255,255,255,0.3)",
              backdropFilter: "blur(16px)",
              minHeight: "44px",
            }}
          >
            {[
              { to: "/", icon: Home, label: "Home" },
              { to: "/music", icon: Music4, label: "Music" },
              { to: "/vibe-world", icon: Compass, label: "Vibe World", active: true },
              { to: "/radio", icon: Radio, label: "Radio" },
            ].map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition-all hover:bg-white/20"
                style={{ color: item.active ? "#2E7D32" : "rgba(0,0,0,0.5)", minWidth: "44px", minHeight: "44px", justifyContent: "center" }}
              >
                <item.icon className="w-4 h-4" />
                <span className="text-[8px] font-bold tracking-wide uppercase">{item.label}</span>
              </Link>
            ))}
          </div>
        </motion.div>
      )}

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
                  mobileInputRef.current.camDx -= dx * 0.005;
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
            <MobileMusicHUD
              currentTrack={currentTrack}
              isPlaying={isPlaying}
              onTogglePlay={handleGlobalPlayToggle}
              onSkip={handleGlobalSkip}
              compact={mobileModalOpen}
            />
          )}
        </>
      )}

      {/* DESKTOP: Full now-playing bar */}
      {!loading && !isMobile && currentTrack && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="absolute bottom-0 left-0 right-0 z-[56] flex justify-center px-4"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)" }}
        >
          <div
            className="flex items-center gap-3 px-3 py-2 rounded-2xl max-w-md w-full"
            style={{
              background: "rgba(255,255,255,0.4)",
              border: "1px solid rgba(255,255,255,0.3)",
              backdropFilter: "blur(16px)",
            }}
          >
            <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
              <CoverImage
                src={currentTrack.cover_url}
                alt={currentTrack.title}
                className="w-full h-full"
                iconClassName="w-4 h-4"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-gray-800 truncate">{currentTrack.title}</p>
              <p className="text-[10px] text-gray-500 truncate">
                {currentTrack.artist_display || currentTrack.artist || "Upper Vibe Media"}
              </p>
            </div>
            <button
              onClick={handleGlobalPlayToggle}
              className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: "#2E7D32", color: "#fff", minWidth: "44px", minHeight: "44px" }}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}