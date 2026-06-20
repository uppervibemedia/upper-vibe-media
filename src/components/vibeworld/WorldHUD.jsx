import React, { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play, Pause, Music4, Tv2, MessageCircle, Store, Waves,
  Compass, X, Disc3, Sparkles, Library,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { usePlayer } from "@/context/PlayerContext";
import { detectZone, ZONES } from "./zoneDetection";
import CoverImage from "@/components/shared/CoverImage";
import MusicLibraryPanel from "./panels/MusicLibraryPanel";
import LoungePanel from "./panels/LoungePanel";
import VisualizerPanel from "./panels/VisualizerPanel";

const ZONE_ICONS = {
  plaza: Compass,
  stage: Music4,
  dome: Tv2,
  lounge: MessageCircle,
  shop: Store,
  beach: Waves,
};

export default function WorldHUD({
  playerX, playerZ, playerRot,
  isMobile, loading,
}) {
  const { currentTrack, isPlaying, togglePlay, playTrack } = usePlayer() || {};
  const zone = detectZone(playerX, playerZ);

  // Panel states
  const [musicPanelOpen, setMusicPanelOpen] = useState(false);
  const [loungePanelOpen, setLoungePanelOpen] = useState(false);
  const [visualizerOpen, setVisualizerOpen] = useState(false);
  const [chillMode, setChillMode] = useState(false);

  // Featured tracks for stage
  const [featuredTracks, setFeaturedTracks] = useState([]);
  const featuredIdxRef = useRef(0);

  useEffect(() => {
    // Load featured tracks once
    base44.entities.Track.filter({ status: "published", is_featured: true }, "-created_date", 20)
      .then(setFeaturedTracks)
      .catch(() => {});
  }, []);

  const handleStagePlayFeatured = useCallback(() => {
    if (featuredTracks.length === 0) return;
    const idx = featuredIdxRef.current % featuredTracks.length;
    const track = featuredTracks[idx];
    if (track && playTrack) {
      playTrack(track, "song");
    }
  }, [featuredTracks, playTrack]);

  const handleStageNext = useCallback(() => {
    featuredIdxRef.current += 1;
    if (featuredTracks.length === 0) return;
    const idx = featuredIdxRef.current % featuredTracks.length;
    const track = featuredTracks[idx];
    if (track && playTrack) {
      playTrack(track, "song");
    }
  }, [featuredTracks, playTrack]);

  const handleOpenMusicLibrary = useCallback(() => {
    setMusicPanelOpen(true);
  }, []);

  const handleOpenLounge = useCallback(() => {
    setLoungePanelOpen(true);
  }, []);

  if (loading) return null;

  const ZoneIcon = zone ? ZONE_ICONS[zone.id] : null;

  return (
    <>
      {/* ── Zone indicator (top-center) ───────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute top-0 left-1/2 z-20 pointer-events-none"
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

      {/* ── Now Playing (bottom bar in UpperVibeCity handles this) ── */}

      {/* ── Zone-specific action buttons ────────────────────────── */}
      <AnimatePresence>
        {zone?.id === "plaza" && (
          <motion.div
            key="plaza-actions"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-0 left-0 right-0 z-20 flex flex-col items-center gap-2 px-4"
            style={{
              paddingBottom: isMobile
                ? "calc(env(safe-area-inset-bottom, 0px) + 14rem)"
                : "calc(env(safe-area-inset-bottom, 0px) + 7.5rem)",
            }}
          >
            {/* Music Library button */}
            <button
              onClick={handleOpenMusicLibrary}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full font-black text-xs tracking-wider transition-all hover:brightness-110 active:scale-95"
              style={{
                background: "linear-gradient(135deg,#0080B8,#00A0DC)",
                color: "#fff",
                boxShadow: "0 0 20px rgba(0,160,220,0.4)",
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
            className="absolute bottom-0 left-0 right-0 z-20 flex flex-col items-center gap-2 px-4"
            style={{
              paddingBottom: isMobile
                ? "calc(env(safe-area-inset-bottom, 0px) + 14rem)"
                : "calc(env(safe-area-inset-bottom, 0px) + 7.5rem)",
            }}
          >
            <button
              onClick={handleStagePlayFeatured}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full font-black text-xs tracking-wider transition-all hover:brightness-110 active:scale-95"
              style={{
                background: "linear-gradient(135deg,#7C3AED,#9B7EFF)",
                color: "#fff",
                boxShadow: "0 0 20px rgba(155,126,255,0.4)",
              }}
            >
              <Disc3 className="w-3.5 h-3.5" />
              Play Featured Track
            </button>
            <button
              onClick={handleStageNext}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full font-black text-xs tracking-wider transition-all hover:brightness-110 active:scale-95"
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "rgba(255,255,255,0.6)",
              }}
            >
              Next Featured Song →
            </button>
          </motion.div>
        )}

        {zone?.id === "dome" && (
          <motion.div
            key="dome-actions"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-0 left-0 right-0 z-20 flex flex-col items-center gap-2 px-4"
            style={{
              paddingBottom: isMobile
                ? "calc(env(safe-area-inset-bottom, 0px) + 14rem)"
                : "calc(env(safe-area-inset-bottom, 0px) + 7.5rem)",
            }}
          >
            <button
              onClick={() => setVisualizerOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full font-black text-xs tracking-wider transition-all hover:brightness-110 active:scale-95"
              style={{
                background: "linear-gradient(135deg,#7C3AED,#A078FF)",
                color: "#fff",
                boxShadow: "0 0 20px rgba(160,120,255,0.4)",
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
            className="absolute bottom-0 left-0 right-0 z-20 flex flex-col items-center gap-2 px-4"
            style={{
              paddingBottom: isMobile
                ? "calc(env(safe-area-inset-bottom, 0px) + 14rem)"
                : "calc(env(safe-area-inset-bottom, 0px) + 7.5rem)",
            }}
          >
            <button
              onClick={handleOpenLounge}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full font-black text-xs tracking-wider transition-all hover:brightness-110 active:scale-95"
              style={{
                background: "linear-gradient(135deg,#A078FF,#C4A0FF)",
                color: "#fff",
                boxShadow: "0 0 20px rgba(160,120,255,0.4)",
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
            className="absolute bottom-0 left-0 right-0 z-20 flex flex-col items-center gap-2 px-4"
            style={{
              paddingBottom: isMobile
                ? "calc(env(safe-area-inset-bottom, 0px) + 14rem)"
                : "calc(env(safe-area-inset-bottom, 0px) + 7.5rem)",
            }}
          >
            <button
              onClick={() => setChillMode(!chillMode)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full font-black text-xs tracking-wider transition-all hover:brightness-110 active:scale-95"
              style={{
                background: chillMode
                  ? "rgba(0,229,255,0.3)"
                  : "rgba(255,255,255,0.15)",
                border: "1px solid rgba(255,255,255,0.2)",
                color: chillMode ? "#00E5FF" : "rgba(255,255,255,0.8)",
                boxShadow: chillMode ? "0 0 20px rgba(0,229,255,0.3)" : "none",
              }}
            >
              <Waves className="w-3.5 h-3.5" />
              {chillMode ? "Chill Mode On" : "Chill Mode"}
            </button>
          </motion.div>
        )}

        {zone?.id === "shop" && (
          <motion.div
            key="shop-actions"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-0 left-0 right-0 z-20 flex flex-col items-center gap-2 px-4"
            style={{
              paddingBottom: isMobile
                ? "calc(env(safe-area-inset-bottom, 0px) + 14rem)"
                : "calc(env(safe-area-inset-bottom, 0px) + 7.5rem)",
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

      {/* ── Chill mode overlay ────────────────────────────────── */}
      <AnimatePresence>
        {chillMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-15 pointer-events-none"
            style={{
              background: "rgba(0,20,40,0.25)",
              backdropFilter: "blur(1px)",
            }}
          />
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
      />
    </>
  );
}