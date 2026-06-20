import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

/**
 * StageFullScreen — clean full-screen overlay showing the stage visual.
 * No YouTube iframe — just the cover art and title.
 */
export default function StageFullScreen({ open, video, onClose }) {
  const thumbnailUrl = video?.thumbnail_url
    || (video?.youtube_video_id
      ? `https://img.youtube.com/vi/${video.youtube_video_id}/maxresdefault.jpg`
      : null);
  const title = video?.title || "";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.3 } }}
          className="fixed inset-0 z-[75] flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.94)", backdropFilter: "blur(12px)" }}
        >
          {/* Exit button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold tracking-wide transition-all hover:bg-white/10"
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.15)",
              color: "rgba(255,255,255,0.7)",
            }}
          >
            <X className="w-3.5 h-3.5" />
            Exit Full Screen
          </button>

          {/* Title */}
          <div className="absolute top-4 left-4 z-10 max-w-[60vw]">
            <p className="text-white/80 text-sm font-bold truncate">
              {title || "Upper Vibe Media"}
            </p>
            <p className="text-white/35 text-[10px]">Main Music Stage</p>
          </div>

          {/* Video display area — 16:9 container */}
          <div
            className="relative w-full max-w-4xl aspect-video mx-4 rounded-xl overflow-hidden"
            style={{
              boxShadow: "0 0 60px rgba(155,126,255,0.3), 0 0 120px rgba(0,160,220,0.15)",
            }}
          >
            {thumbnailUrl ? (
              <img
                src={thumbnailUrl}
                alt={title || "Stage video"}
                className="w-full h-full object-cover"
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #0a0a1e, #12122e)" }}
              >
                <p className="text-white/20 text-lg font-heading">Upper Vibe Media</p>
              </div>
            )}

            {/* Glow frame */}
            <div
              className="absolute inset-0 rounded-xl pointer-events-none"
              style={{
                border: "2px solid rgba(155,126,255,0.2)",
                boxShadow: "inset 0 0 30px rgba(0,160,220,0.06)",
              }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}