import React, { useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Volume2, VolumeX, ExternalLink, Play, Music4 } from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";

/**
 * StageVideoPlayer — fullscreen overlay that plays actual YouTube videos.
 *
 * Rules:
 *  - Video autoplays muted by default (no conflict with global player)
 *  - "Listen with Sound" pauses global player and unmutes video
 *  - Close button restores previous state
 *  - "Open Full Video" opens YouTube in a new tab
 */

export default function StageVideoPlayer({
  open,
  video,
  muted,
  onClose,
  onToggleMute,
  onPlaySong,
}) {
  const iframeRef = useRef(null);
  const { isPlaying, togglePlay, currentTrack } = usePlayer() || {};
  const wasPlayingRef = useRef(false);

  // When unmuting, pause global player
  const handleUnmute = useCallback(() => {
    if (muted) {
      wasPlayingRef.current = isPlaying;
      if (isPlaying && togglePlay) togglePlay();
    }
    onToggleMute?.();
  }, [muted, isPlaying, togglePlay, onToggleMute]);

  // When muting, optionally restore global player
  const handleMute = useCallback(() => {
    if (!muted) {
      if (wasPlayingRef.current && togglePlay && !isPlaying) togglePlay();
    }
    onToggleMute?.();
  }, [muted, isPlaying, togglePlay, onToggleMute]);

  const handleClose = useCallback(() => {
    // If we paused the player to unmute, restore it
    if (!muted && wasPlayingRef.current && togglePlay && !isPlaying) {
      togglePlay();
    }
    // Mute on close so next open is muted
    if (!muted) onToggleMute?.();
    onClose?.();
  }, [muted, isPlaying, togglePlay, onClose, onToggleMute]);

  const handleOpenFull = useCallback(() => {
    if (video?.video_url) {
      window.open(video.video_url, "_blank", "noopener");
    }
  }, [video]);

  const handlePlaySongFromVideo = useCallback(() => {
    if (onPlaySong) onPlaySong();
  }, [onPlaySong]);

  return (
    <AnimatePresence>
      {open && video && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.92)", backdropFilter: "blur(8px)" }}
        >
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full flex items-center justify-center transition-all hover:bg-white/10"
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}
          >
            <X className="w-5 h-5 text-white/70" />
          </button>

          {/* Video info header */}
          <div className="absolute top-4 left-4 z-10">
            <p className="text-white/80 text-sm font-bold truncate max-w-[70vw]">
              {video.title || "Upper Vibe Media"}
            </p>
            <p className="text-white/40 text-xs">Main Music Stage</p>
          </div>

          {/* YouTube iframe */}
          <div className="relative w-full max-w-4xl aspect-video mx-4 rounded-xl overflow-hidden"
            style={{ boxShadow: "0 0 60px rgba(155,126,255,0.3), 0 0 120px rgba(0,160,220,0.15)" }}
          >
            {video.youtube_video_id ? (
              <iframe
                ref={iframeRef}
                src={`https://www.youtube.com/embed/${video.youtube_video_id}?autoplay=1&mute=${muted ? 1 : 0}&controls=1&modestbranding=1&rel=0&playsinline=1&enablejsapi=1`}
                className="w-full h-full"
                allow="autoplay; encrypted-media"
                allowFullScreen
                title={video.title || "Upper Vibe Media Video"}
              />
            ) : video.embed_url ? (
              <iframe
                ref={iframeRef}
                src={`${video.embed_url}?autoplay=1&mute=${muted ? 1 : 0}&controls=1&modestbranding=1&rel=0&playsinline=1`}
                className="w-full h-full"
                allow="autoplay; encrypted-media"
                allowFullScreen
                title={video.title || "Upper Vibe Media Video"}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center" style={{ background: "#0a0a1e" }}>
                <p className="text-white/40 text-sm">Video unavailable</p>
              </div>
            )}

            {/* Glow border */}
            <div className="absolute inset-0 rounded-xl pointer-events-none"
              style={{
                border: "2px solid rgba(155,126,255,0.25)",
                boxShadow: "inset 0 0 30px rgba(0,160,220,0.08)",
              }}
            />
          </div>

          {/* Control bar */}
          <div className="absolute bottom-8 left-0 right-0 flex justify-center">
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-2xl"
              style={{
                background: "rgba(0,0,0,0.6)",
                backdropFilter: "blur(16px)",
                border: "1px solid rgba(255,255,255,0.12)",
              }}
            >
              {/* Mute / Unmute */}
              <button
                onClick={muted ? handleUnmute : handleMute}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full font-black text-xs tracking-wider transition-all hover:brightness-110 active:scale-95"
                style={{
                  background: muted
                    ? "rgba(255,255,255,0.1)"
                    : "linear-gradient(135deg,#7C3AED,#9B7EFF)",
                  border: muted ? "1px solid rgba(255,255,255,0.2)" : "none",
                  color: muted ? "rgba(255,255,255,0.6)" : "#fff",
                }}
              >
                {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                {muted ? "Muted" : "Live Sound"}
              </button>

              {/* Open in YouTube */}
              <button
                onClick={handleOpenFull}
                className="flex items-center gap-1.5 px-3 py-2 rounded-full font-black text-xs tracking-wider transition-all hover:brightness-110 active:scale-95"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: "rgba(255,255,255,0.7)",
                }}
              >
                <ExternalLink className="w-3 h-3" />
                YouTube
              </button>

              {/* Play This Song */}
              {onPlaySong && (
                <button
                  onClick={handlePlaySongFromVideo}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-full font-black text-xs tracking-wider transition-all hover:brightness-110 active:scale-95"
                  style={{
                    background: "linear-gradient(135deg,#0080B8,#00A0DC)",
                    color: "#fff",
                  }}
                >
                  <Music4 className="w-3 h-3" />
                  Play Song
                </button>
              )}
            </div>
          </div>

          {/* Audio conflict warning when unmuted */}
          <AnimatePresence>
            {!muted && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute top-20 left-1/2 -translate-x-1/2 z-10 px-4 py-2 rounded-full"
                style={{
                  background: "rgba(212,168,67,0.2)",
                  border: "1px solid rgba(212,168,67,0.3)",
                }}
              >
                <p className="text-[11px] text-yellow-300/80 font-medium">
                  Music player paused — stage audio active
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}