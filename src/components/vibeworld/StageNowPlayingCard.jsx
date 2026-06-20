import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, Tv2, Music4 } from "lucide-react";

/**
 * Mini "Now Playing" card that follows the user in the UI.
 * Shows current stage video info with small controls.
 * Does NOT show the full video — only a small reference card.
 */
export default function StageNowPlayingCard({
  visible,
  stageVideo,
  stageVideoMuted,
  isPlaying,
  onPlaySong,
  onGoToStage,
  onToggleMute,
}) {
  if (!stageVideo) return null;

  const video = stageVideo;
  const title = video.title || "Stage Video";
  const coverUrl =
    video.thumbnail_url ||
    (video.youtube_video_id
      ? `https://img.youtube.com/vi/${video.youtube_video_id}/maxresdefault.jpg`
      : null);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className="absolute bottom-0 left-0 right-0 z-25 flex justify-center px-4 pointer-events-none"
          style={{
            paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12.5rem)",
          }}
        >
          <div
            className="flex items-center gap-2.5 px-3 py-2 rounded-2xl max-w-xs w-full pointer-events-auto"
            style={{
              background: "rgba(124,58,237,0.2)",
              border: "1px solid rgba(155,126,255,0.3)",
              backdropFilter: "blur(18px)",
            }}
          >
            {/* Cover thumbnail */}
            {coverUrl && (
              <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 bg-purple-900/50">
                <img
                  src={coverUrl}
                  alt={title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = "none";
                  }}
                />
              </div>
            )}

            {/* Title + artist */}
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-purple-100 truncate leading-tight">
                {title}
              </p>
              <p className="text-[8px] text-purple-300/70 truncate font-medium">
                Live on Stage
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {/* Play this song on global player */}
              <button
                onClick={onPlaySong}
                className="w-7 h-7 rounded-full flex items-center justify-center transition-all hover:brightness-125"
                style={{
                  background: "linear-gradient(135deg,#0080B8,#00A0DC)",
                }}
                title="Play on global player"
              >
                <Music4 className="w-3 h-3 text-white" />
              </button>

              {/* Go to stage */}
              <button
                onClick={onGoToStage}
                className="w-7 h-7 rounded-full flex items-center justify-center transition-all hover:brightness-125"
                style={{
                  background: "rgba(155,126,255,0.3)",
                  border: "1px solid rgba(155,126,255,0.4)",
                }}
                title="Go to Stage"
              >
                <Tv2 className="w-3 h-3 text-purple-200" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}