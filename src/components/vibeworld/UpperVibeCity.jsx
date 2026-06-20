import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, Play, Pause, Home, Music4, Radio, Compass } from "lucide-react";
import { Link } from "react-router-dom";
import CityCanvas from "@/components/vibeworld/CityCanvas";
import StageCoverVisualizer from "@/components/vibeworld/StageCoverVisualizer";
import StageVideoPlayer from "@/components/vibeworld/StageVideoPlayer";
import CoverImage from "@/components/shared/CoverImage";
import { usePlayer } from "@/context/PlayerContext";
import { useRadio } from "@/context/RadioContext";
import { useLivePresence } from "@/hooks/useLivePresence";
import { base44 } from "@/api/base44Client";
import WorldHUD from "@/components/vibeworld/WorldHUD";

export default function UpperVibeCity({ onExit }) {
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [playerPos, setPlayerPos] = useState({ x: 0, z: 5, rot: 0 });
  const [stageCanvas, setStageCanvas] = useState(null);
  const audioIntensityRef = useRef(0);

  // ── Stage video state ──────────────────────────────────────────────────
  const [stageVideos, setStageVideos] = useState([]);
  const [stageVideoIdx, setStageVideoIdx] = useState(0);
  const [stageVideoMuted, setStageVideoMuted] = useState(true);
  const [stageVideoPlayerOpen, setStageVideoPlayerOpen] = useState(false);
  const [stageScreenYouTube, setStageScreenYouTube] = useState(false);
  const [stageScreenBounds, setStageScreenBounds] = useState({ visible: false, left: 0, top: 0, width: 0, height: 0 });
  const [stageScreenIframeKey, setStageScreenIframeKey] = useState(0);
  const stageIframeRef = useRef(null);

  useEffect(() => {
    setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
  }, []);

  // ── Fetch YouTube playlist videos for the stage ─────────────────────────
  useEffect(() => {
    base44.functions.invoke("getPlaylistVideos", {})
      .then((res) => {
        const videos = res?.data?.videos;
        if (videos?.length > 0) setStageVideos(videos);
      })
      .catch(() => {});
  }, []);

  // ── Stage video controls ───────────────────────────────────────────────
  const playerCtx = usePlayer();
  const radioCtx = useRadio();
  const { currentTrack, isPlaying, togglePlay, playTrack } = playerCtx || {};
  const { allTracks, tracksLoaded } = radioCtx || {};

  const handleStageWatchVideo = () => {
    setStageVideoPlayerOpen(true);
  };
  const handleStageNextVideo = () => {
    if (stageVideos.length <= 1) return;
    setStageVideoIdx((prev) => (prev + 1) % stageVideos.length);
    setStageScreenIframeKey((k) => k + 1);
  };
  const handleStageToggleMute = () => {
    setStageVideoMuted((m) => {
      const next = !m;
      // Send postMessage to iframe without reloading
      const iframe = stageIframeRef.current;
      if (iframe?.contentWindow) {
        iframe.contentWindow.postMessage(
          JSON.stringify({ event: "command", func: next ? "mute" : "unMute", args: "" }),
          "*"
        );
      }
      // Resume/pause global player
      if (next) {
        if (!isPlaying && togglePlay) togglePlay();
      } else {
        if (isPlaying && togglePlay) togglePlay();
      }
      return next;
    });
  };
  const handleStageWatchOnScreen = () => {
    setStageScreenYouTube(true);
    setStageScreenIframeKey((k) => k + 1);
  };
  const handleStageExitScreen = () => {
    setStageScreenYouTube(false);
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
    if (match) playTrack(match, "song");
  };

  useLivePresence();

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

  // Auto-start music when park loads
  useEffect(() => {
    if (!tracksLoaded || loading) return;
    if (!currentTrack && allTracks?.length > 0 && playTrack) {
      const first = allTracks[0];
      if (first) playTrack(first, "song");
    }
  }, [tracksLoaded, loading, currentTrack, allTracks, playTrack]);

  return (
    <div className="fixed inset-0 z-[60] overflow-hidden" style={{ background: "#050510" }}>
      {/* 3D Park */}
      <div className="absolute inset-0">
        <CityCanvas
          onLoaded={() => setLoading(false)}
          onPositionChange={(x, z, rot) => setPlayerPos({ x, z, rot })}
          stageCanvas={!stageScreenYouTube ? stageCanvas : null}
          audioIntensityRef={audioIntensityRef}
          onStageScreenBounds={setStageScreenBounds}
          movementLocked={stageScreenYouTube}
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
        className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-3"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.75rem)" }}
      >
        <button
          onClick={onExit}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all hover:bg-white/20"
          style={{
            background: "rgba(255,255,255,0.3)",
            backdropFilter: "blur(12px)",
            color: "#2E7D32",
          }}
        >
          <ChevronLeft className="w-3.5 h-3.5" /> Exit Park
        </button>

        <div
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl"
          style={{
            background: "rgba(255,255,255,0.3)",
            backdropFilter: "blur(12px)",
          }}
        >
          <span className="font-heading font-black text-[10px] tracking-[0.2em] text-green-800">
            PARK PROTOTYPE
          </span>
        </div>
      </motion.div>

      {/* Controls hint */}
      {!loading && !stageScreenYouTube && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="absolute top-1/2 left-0 right-0 z-10 flex justify-center pointer-events-none"
        >
          <p
            className="text-[10px] tracking-wider px-3 py-1.5 rounded-full"
            style={{
              background: "rgba(255,255,255,0.25)",
              color: "rgba(0,0,0,0.4)",
            }}
          >
            {isMobile ? "Joystick to walk \u2022 Swipe to look" : "W/S walk \u2022 A/D turn \u2022 Mouse look"}
          </p>
        </motion.div>
      )}

      {/* Watch on Stage mode banner */}
      {stageScreenYouTube && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute top-20 left-0 right-0 z-30 flex justify-center pointer-events-none"
        >
          <div
            className="px-4 py-1.5 rounded-full flex items-center gap-2"
            style={{ background: "rgba(124,58,237,0.25)", border: "1px solid rgba(155,126,255,0.3)" }}
          >
            <span className="text-[10px] text-purple-200 font-medium tracking-wider">
              Press Exit Stage View to walk away
            </span>
          </div>
        </motion.div>
      )}

      {/* In-world YouTube iframe — on the physical stage screen, mute controlled via postMessage */}
      {stageScreenYouTube && stageScreenBounds.visible && stageVideos[stageVideoIdx]?.youtube_video_id && (
        <div
          className="absolute z-50 pointer-events-none"
          style={{
            left: stageScreenBounds.left,
            top: stageScreenBounds.top,
            width: stageScreenBounds.width,
            height: stageScreenBounds.height,
          }}
        >
          <iframe
            ref={stageIframeRef}
            key={stageScreenIframeKey}
            src={`https://www.youtube.com/embed/${stageVideos[stageVideoIdx].youtube_video_id}?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0&playsinline=1&loop=1&playlist=${stageVideos[stageVideoIdx].youtube_video_id}&enablejsapi=1`}
            className="w-full h-full pointer-events-none"
            allow="autoplay; encrypted-media"
            referrerPolicy="strict-origin-when-cross-origin"
            title={stageVideos[stageVideoIdx].title || "Stage video"}
            style={{ border: "none" }}
          />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              border: "2px solid rgba(155,126,255,0.25)",
              boxShadow: "inset 0 0 20px rgba(0,160,220,0.08)",
            }}
          />
        </div>
      )}

      {/* World HUD */}
      <WorldHUD
        playerX={playerPos.x}
        playerZ={playerPos.z}
        playerRot={playerPos.rot}
        isMobile={isMobile}
        loading={loading}
        stageVideoTitle={stageVideos[stageVideoIdx]?.title || null}
        stageVideoMuted={stageVideoMuted}
        stageVideosCount={stageVideos.length}
        stageScreenYouTube={stageScreenYouTube}
        onStageWatchOnScreen={handleStageWatchOnScreen}
        onStageExitScreen={handleStageExitScreen}
        onStageWatchVideo={handleStageWatchVideo}
        onStageNextVideo={handleStageNextVideo}
        onStageToggleMute={handleStageToggleMute}
        onStagePlaySong={handleStagePlaySong}
      />

      {/* Bottom navigation bar */}
      {!loading && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="absolute bottom-0 left-0 right-0 z-20 flex justify-center px-4"
          style={{ paddingBottom: isMobile ? "calc(env(safe-area-inset-bottom, 0px) + 7rem)" : "calc(env(safe-area-inset-bottom, 0px) + 0.5rem)" }}
        >
          <div
            className="flex items-center justify-around gap-1 px-2 py-2 rounded-2xl max-w-sm w-full"
            style={{
              background: "rgba(255,255,255,0.35)",
              border: "1px solid rgba(255,255,255,0.3)",
              backdropFilter: "blur(16px)",
            }}
          >
            {[
              { to: "/", icon: Home, label: "Home" },
              { to: "/music", icon: Music4, label: "Music" },
              { to: "/vibe-world", icon: Compass, label: "Park", active: true },
              { to: "/radio", icon: Radio, label: "Radio" },
            ].map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all hover:bg-white/20"
                style={{ color: item.active ? "#2E7D32" : "rgba(0,0,0,0.5)" }}
              >
                <item.icon className="w-4 h-4" />
                <span className="text-[8px] font-bold tracking-wide uppercase">{item.label}</span>
              </Link>
            ))}
          </div>
        </motion.div>
      )}

      {/* Stage cover visualizer */}
      <StageCoverVisualizer
        onReady={(c) => setStageCanvas(c)}
        video={stageVideos[stageVideoIdx] || null}
        audioIntensityRef={audioIntensityRef}
      />

      {/* Fullscreen stage video player overlay */}
      <StageVideoPlayer
        open={stageVideoPlayerOpen}
        video={stageVideos[stageVideoIdx] || null}
        muted={stageVideoMuted}
        onClose={() => {
          setStageVideoPlayerOpen(false);
          if (!stageVideoMuted) {
            setStageVideoMuted(true);
            if (!isPlaying && togglePlay) togglePlay();
          }
        }}
        onToggleMute={handleStageToggleMute}
        onPlaySong={handleStagePlaySong}
      />

      {/* Bottom now-playing bar */}
      {!loading && currentTrack && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="absolute bottom-0 left-0 right-0 z-20 flex justify-center px-4"
          style={{ paddingBottom: isMobile ? "calc(env(safe-area-inset-bottom, 0px) + 6.5rem)" : "calc(env(safe-area-inset-bottom, 0px) + 1rem)" }}
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
              onClick={togglePlay}
              className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: "#2E7D32", color: "#fff" }}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}