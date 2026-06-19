import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, Play, Pause } from "lucide-react";
import CityCanvas from "@/components/vibeworld/CityCanvas";
import CoverImage from "@/components/shared/CoverImage";
import { usePlayer } from "@/context/PlayerContext";
import { useRadio } from "@/context/RadioContext";
import { useLivePresence } from "@/hooks/useLivePresence";

export default function UpperVibeCity({ onExit }) {
  const [loading, setLoading] = useState(true);

  const playerCtx = usePlayer();
  const radioCtx = useRadio();
  useLivePresence();

  const { currentTrack, isPlaying, togglePlay, playTrack } = playerCtx || {};
  const { allTracks, tracksLoaded } = radioCtx || {};

  // Auto-start music when park loads
  useEffect(() => {
    if (!tracksLoaded || loading) return;
    if (!currentTrack && allTracks?.length > 0 && playTrack) {
      const first = allTracks[0];
      if (first) playTrack(first, "song");
    }
  }, [tracksLoaded, loading, currentTrack, allTracks, playTrack]);

  return (
    <div className="fixed inset-0 z-[60] overflow-hidden" style={{ background: "#87CEEB" }}>
      {/* 3D Park */}
      <div className="absolute inset-0">
        <CityCanvas onLoaded={() => setLoading(false)} />
      </div>

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-sky-200/50">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-green-500/30 border-t-green-600 rounded-full animate-spin" />
            <p className="text-xs text-green-800 font-medium tracking-wider">Entering the park...</p>
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
            WASD to walk &middot; Mouse to look
          </p>
        </motion.div>
      )}

      {/* Bottom now-playing bar */}
      {!loading && currentTrack && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="absolute bottom-0 left-0 right-0 z-20 flex justify-center px-4"
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