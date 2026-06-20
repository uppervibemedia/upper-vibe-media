import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, SkipForward, ChevronUp, ChevronDown } from "lucide-react";
import CoverImage from "@/components/shared/CoverImage";

export default function MobileMiniPlayer({
  currentTrack,
  isPlaying,
  onTogglePlay,
  onSkip,
}) {
  const [expanded, setExpanded] = useState(false);

  // iOS touch handler — stops propagation to prevent canvas/camera capture
  const blockTouch = useCallback((e) => {
    e.stopPropagation();
  }, []);

  if (!currentTrack) return null;

  if (!expanded) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute z-[56]"
        style={{
          bottom: "calc(env(safe-area-inset-bottom, 0px) + 0.75rem)",
          right: "0.75rem",
          pointerEvents: "auto",
        }}
      >
        <div
          className="flex items-center gap-2 px-2 py-1.5 rounded-full shadow-lg"
          style={{
            background: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(14px)",
            border: "1px solid rgba(255,255,255,0.15)",
            maxWidth: "70vw",
            touchAction: "manipulation",
          }}
        >
          <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 pointer-events-none" style={{ minWidth: "36px", minHeight: "36px" }}>
            <CoverImage
              src={currentTrack.cover_url}
              alt={currentTrack.title}
              className="w-full h-full"
              iconClassName="w-3 h-3"
            />
          </div>
          <div className="flex-1 min-w-0 pr-1 pointer-events-none">
            <p className="text-[10px] font-bold text-white/90 truncate max-w-[120px]">{currentTrack.title}</p>
          </div>
          <button
            onTouchStart={blockTouch}
            onClick={(e) => { e.stopPropagation(); onTogglePlay?.(); }}
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all hover:brightness-110 active:scale-90"
            style={{
              background: "#2E7D32", color: "#fff",
              minWidth: "36px", minHeight: "36px",
              touchAction: "manipulation", pointerEvents: "auto",
            }}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
          </button>
          <button
            onTouchStart={blockTouch}
            onClick={(e) => { e.stopPropagation(); setExpanded(true); }}
            className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all hover:bg-white/10"
            style={{
              color: "rgba(255,255,255,0.5)",
              minWidth: "28px", minHeight: "28px",
              touchAction: "manipulation", pointerEvents: "auto",
            }}
          >
            <ChevronUp className="w-3 h-3" />
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        key="expanded-player"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 30 }}
        className="absolute inset-x-0 bottom-0 z-[58] flex justify-center px-3"
        style={{
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.5rem)",
          pointerEvents: "auto",
        }}
      >
        <div
          className="w-full max-w-sm rounded-2xl p-3 shadow-xl"
          style={{
            background: "rgba(0,0,0,0.78)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.12)",
            touchAction: "manipulation",
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold tracking-wider text-white/40 uppercase pointer-events-none">Now Playing</span>
            <button
              onTouchStart={blockTouch}
              onClick={() => setExpanded(false)}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:bg-white/10"
              style={{
                color: "rgba(255,255,255,0.5)",
                minWidth: "32px", minHeight: "32px",
                touchAction: "manipulation", pointerEvents: "auto",
              }}
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 shadow-md pointer-events-none">
              <CoverImage
                src={currentTrack.cover_url}
                alt={currentTrack.title}
                className="w-full h-full"
                iconClassName="w-5 h-5"
              />
            </div>
            <div className="flex-1 min-w-0 pointer-events-none">
              <p className="text-sm font-bold text-white truncate">{currentTrack.title}</p>
              <p className="text-[11px] text-white/50 truncate">
                {currentTrack.artist_display || currentTrack.artist || "Upper Vibe Media"}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-center gap-5">
            <button
              onTouchStart={blockTouch}
              onClick={(e) => { e.stopPropagation(); onTogglePlay?.(); }}
              className="w-12 h-12 rounded-full flex items-center justify-center transition-all hover:brightness-110 active:scale-90"
              style={{
                background: "#2E7D32", color: "#fff",
                minWidth: "48px", minHeight: "48px",
                touchAction: "manipulation", pointerEvents: "auto",
              }}
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
            </button>
            <button
              onTouchStart={blockTouch}
              onClick={(e) => { e.stopPropagation(); onSkip?.(); }}
              className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:bg-white/10 active:scale-90"
              style={{
                color: "rgba(255,255,255,0.5)",
                minWidth: "40px", minHeight: "40px",
                touchAction: "manipulation", pointerEvents: "auto",
              }}
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}