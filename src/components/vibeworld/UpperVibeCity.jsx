import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, Compass, Music4, Radio, Sparkles, Flower2, Play, Pause, Loader2, Zap } from "lucide-react";
import CityGame from "@/components/vibeworld/CityGame";
import HoloPanel from "@/components/vibeworld/HoloPanel";
import MusicPanel from "@/components/vibeworld/panels/MusicPanel";
import RadioPanel from "@/components/vibeworld/panels/RadioPanel";
import GardensPanel from "@/components/vibeworld/panels/GardensPanel";
import CoverImage from "@/components/shared/CoverImage";
import { usePlayer } from "@/context/PlayerContext";
import { useRadio } from "@/context/RadioContext";
import { useLivePresence } from "@/hooks/useLivePresence";
import { base44 } from "@/api/base44Client";

const DISTRICT_META = {
  music:        { title: "Music District",         icon: <Music4 className="w-4 h-4" />,   accent: "0,160,220" },
  radio:        { title: "Radio Tower",            icon: <Radio className="w-4 h-4" />,    accent: "155,126,255" },
  gardens:      { title: "Manifestation Gardens",  icon: <Flower2 className="w-4 h-4" />,  accent: "52,211,153" },
  frequencies:  { title: "Hall of Frequencies",    icon: <Zap className="w-4 h-4" />,      accent: "236,72,153" },
};

export default function UpperVibeCity({ onExit }) {
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(null);
  const [currentZone, setCurrentZone] = useState(null);
  const [fatalError, setFatalError] = useState(null);

  // Wrap potentially-throwing hooks
  let playerCtx, radioCtx;
  try {
    playerCtx = usePlayer();
    radioCtx = useRadio();
  } catch (e) {
    if (!fatalError) setFatalError(e.message);
  }

  const { currentTrack, isPlaying, togglePlay, playTrack } = playerCtx || {};
  const { allTracks, tracksLoaded, startRadio, resumeRadio } = radioCtx || {};

  useLivePresence();

  if (fatalError) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#05050f] z-50">
        <div className="text-center px-6">
          <p className="text-red-400 font-bold mb-2">City Load Error</p>
          <p className="text-xs text-white/40 max-w-md mb-4">{fatalError}</p>
          <button onClick={onExit} className="px-4 py-2 rounded-lg bg-cyan-500 text-black text-xs font-bold">Go Back</button>
        </div>
      </div>
    );
  }

  const onNeedLogin = () => base44.auth.redirectToLogin(window.location.href);
  const meta = active ? DISTRICT_META[active] : null;

  // Auto-start music when city loads
  useEffect(() => {
    if (!tracksLoaded || loading) return;
    if (!currentTrack && allTracks?.length > 0 && playTrack) {
      try {
        const first = allTracks[0];
        if (first) playTrack(first, "song");
      } catch {}
    }
  }, [tracksLoaded, loading, currentTrack, allTracks, playTrack]);

  const handleEnterZone = useCallback((zoneId) => {
    if (!zoneId || active) return;
    setActive(zoneId);

    // Auto-start radio when entering radio tower
    if (zoneId === "radio") {
      try { startRadio(); } catch {}
    }
  }, [active, startRadio]);

  const renderPanel = () => {
    switch (active) {
      case "music":       return <MusicPanel onNeedLogin={onNeedLogin} />;
      case "radio":       return <RadioPanel />;
      case "gardens":     return <GardensPanel />;
      case "frequencies": return <FrequencyDoorsPanel onNeedLogin={onNeedLogin} />;
      default:            return null;
    }
  };

  return (
    <div className="fixed inset-0 z-[60] overflow-hidden bg-[#05050f]">


      {/* 3D Walkable City */}
      <div className="absolute inset-0 bg-[#05050f] flex items-center justify-center">
        <div className="text-center px-6">
          <p className="text-cyan-400 font-heading font-black text-lg mb-2">Upper Vibe City</p>
          <p className="text-white/40 text-xs mb-4">3D engine initializing...</p>
        </div>
        {/* <CityGame
          onLoaded={() => setLoading(false)}
          interactionLocked={!!active}
          onZoneChange={setCurrentZone}
          onEnterCurrentZone={handleEnterZone}
        /> */}
      </div>

      {/* Top HUD */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: loading ? 0 : 1 }} transition={{ delay: 0.4 }}
        className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-3 pointer-events-none"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.75rem)" }}
      >
        <button onClick={onExit}
          className="pointer-events-auto inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all hover:bg-white/5"
          style={{ background: "rgba(10,10,30,0.7)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)", backdropFilter: "blur(12px)" }}>
          <ChevronLeft className="w-3.5 h-3.5" /> Exit City
        </button>
        <div className="flex items-center gap-2 pointer-events-auto px-3 py-2 rounded-xl"
          style={{ background: "rgba(10,10,30,0.7)", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(12px)" }}>
          <Compass className="w-3.5 h-3.5" style={{ color: "#00A0DC" }} />
          <span className="font-heading font-black text-[10px] tracking-[0.2em] text-white/70">UPPER VIBE CITY</span>
        </div>
      </motion.div>

      {/* Bottom mini now-playing bar */}
      {!active && currentTrack && (
        <motion.div
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: loading ? 0 : 1, y: loading ? 30 : 0 }} transition={{ delay: 0.6 }}
          className="absolute bottom-0 left-0 right-0 z-20 flex justify-center px-4"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)" }}
        >
          <div className="flex items-center gap-3 px-3 py-2 rounded-2xl max-w-md w-full"
            style={{ background: "rgba(10,10,28,0.8)", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(16px)" }}>
            <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
              <CoverImage src={currentTrack.cover_url} alt={currentTrack.title} className="w-full h-full" iconClassName="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">{currentTrack.title}</p>
              <p className="text-[10px] text-white/40 truncate">{currentTrack.artist_display || currentTrack.artist || "Upper Vibe Media"}</p>
            </div>
            <button onClick={togglePlay}
              className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: "#00A0DC", color: "#000" }}>
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>
          </div>
        </motion.div>
      )}

      {/* Proximity hint */}
      {!active && currentZone && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
          className="absolute top-1/2 left-0 right-0 z-10 flex justify-center pointer-events-none"
        >
          <p className="text-[10px] tracking-wider text-white/25 px-3 py-1.5 rounded-full"
            style={{ background: "rgba(10,10,30,0.4)" }}>
            Press E or tap to enter &nbsp;·&nbsp; WASD to walk
          </p>
        </motion.div>
      )}

      {/* District holo panel */}
      <HoloPanel
        open={!!active}
        onClose={() => setActive(null)}
        title={meta?.title}
        accent={meta?.accent}
        icon={meta?.icon}
      >
        {renderPanel()}
      </HoloPanel>
    </div>
  );
}

// ─── Hall of Frequencies Door Panel ───
function FrequencyDoorsPanel({ onNeedLogin }) {
  const { allTracks, tracksLoaded, playTrack } = usePlayer();
  const { jumpToSong } = useRadio();

  const DOORS = [
    { id: "focus",       label: "Focus",       color: "#3B82F6", icon: "🎯" },
    { id: "motivation",  label: "Motivation",   color: "#F59E0B", icon: "🔥" },
    { id: "wealth",      label: "Wealth",       color: "#10B981", icon: "💎" },
    { id: "confidence",  label: "Confidence",   color: "#EC4899", icon: "🦁" },
    { id: "relaxation",  label: "Relaxation",   color: "#8B5CF6", icon: "🧘" },
    { id: "sleep",       label: "Sleep",        color: "#6366F1", icon: "🌙" },
  ];

  const handleDoor = (doorId) => {
    if (!tracksLoaded || allTracks.length === 0) return;
    // Find tracks matching this mood/frequency category
    const keyword = doorId.toLowerCase();
    const matching = allTracks.filter((t) => {
      const moods = (t.mood_tags || []).map((m) => m.toLowerCase());
      const cats = ((t.category_ids || [])).join(" ").toLowerCase();
      return moods.some((m) => m.includes(keyword)) || cats.includes(keyword);
    });

    if (matching.length > 0) {
      const pick = matching[Math.floor(Math.random() * matching.length)];
      playTrack(pick, "song");
    } else {
      // Fallback: play any random track
      const pick = allTracks[Math.floor(Math.random() * allTracks.length)];
      if (pick) playTrack(pick, "song");
    }
  };

  return (
    <div className="grid grid-cols-2 gap-3">
      {DOORS.map((door) => (
        <button
          key={door.id}
          onClick={() => handleDoor(door.id)}
          className="flex flex-col items-center gap-2 p-4 rounded-2xl transition-all active:scale-95 hover:brightness-110"
          style={{
            background: `rgba(${hexToRgb(door.color)},0.08)`,
            border: `1px solid rgba(${hexToRgb(door.color)},0.25)`,
          }}
        >
          <span className="text-2xl">{door.icon}</span>
          <span className="font-heading font-black text-sm tracking-wide" style={{ color: door.color }}>
            {door.label}
          </span>
        </button>
      ))}
    </div>
  );
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}