import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, Play, Pause, Home, Music4, Radio, Compass } from "lucide-react";
import { Link } from "react-router-dom";
import CityCanvas from "@/components/vibeworld/CityCanvas";
import StageScreenVisualizer from "@/components/vibeworld/StageScreenVisualizer";
import CoverImage from "@/components/shared/CoverImage";
import { usePlayer } from "@/context/PlayerContext";
import { useRadio } from "@/context/RadioContext";
import { useLivePresence } from "@/hooks/useLivePresence";
import WorldHUD from "@/components/vibeworld/WorldHUD";

export default function UpperVibeCity({ onExit }) {
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [playerPos, setPlayerPos] = useState({ x: 0, z: 5, rot: 0 });
  const [stageCanvas, setStageCanvas] = useState(null);

  useEffect(() => {
    setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
  }, []);

  // Called by StageScreenVisualizer once the canvas is mounted and animating
  const handleStageCanvasReady = useRef((canvas) => {
    if (canvas && !stageCanvas) setStageCanvas(canvas);
  });

  const playerCtx = usePlayer();
  const radioCtx = useRadio();
  useLivePresence();

  const { currentTrack, isPlaying, togglePlay, playTrack } = playerCtx || {};
  const { allTracks, tracksLoaded } = radioCtx || {};

  // Ocean wave ambient audio — brown noise through low-pass filter
  useEffect(() => {
    let ctx = null;
    let source = null;

    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      const len = ctx.sampleRate * 3;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i++) {
        last = (last + (Math.random() * 2 - 1) * 0.015) / 1.015;
        d[i] = last * 2.5;
      }
      source = ctx.createBufferSource();
      source.buffer = buf;
      source.loop = true;

      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 320;

      const gain = ctx.createGain();
      gain.gain.value = 0.04;

      source.connect(lp);
      lp.connect(gain);
      gain.connect(ctx.destination);
      source.start();
    } catch {
      // Audio not supported — silently skip
    }

    return () => {
      if (source) try { source.stop(); } catch {}
      if (ctx) try { ctx.close(); } catch {}
    };
  }, []);

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
          stageCanvas={stageCanvas}
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
        className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-3 pointer-events-none"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.75rem)" }}
      >
        <button
          onClick={onExit}
          className="pointer-events-auto inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all hover:bg-white/20"
          style={{
            background: "rgba(255,255,255,0.3)",
            backdropFilter: "blur(12px)",
            color: "#2E7D32",
          }}
        >
          <ChevronLeft className="w-3.5 h-3.5" /> Exit Park
        </button>

        <div
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl pointer-events-auto"
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
      {!loading && (
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

      {/* World HUD — zone-specific interactions */}
      <WorldHUD
        playerX={playerPos.x}
        playerZ={playerPos.z}
        playerRot={playerPos.rot}
        isMobile={isMobile}
        loading={loading}
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

      {/* Stage screen visualizer — feeds canvas to CityCanvas for the public stage display */}
      <StageScreenVisualizer onReady={(c) => setStageCanvas(c)} />

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