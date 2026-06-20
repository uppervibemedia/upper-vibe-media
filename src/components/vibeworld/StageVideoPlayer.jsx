import React, { useEffect, useRef, useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Volume2, VolumeX, Loader2, Music4 } from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";

/**
 * StageVideoPlayer — fullscreen overlay that plays YouTube videos on the big screen.
 *
 * - Shows the YouTube iframe immediately (no artificial timeout)
 * - "Listen to Stage Audio" pauses global player and unmutes video
 * - "Exit Full Screen" returns to world, restores global player
 * - If iframe fails (onError), shows polished fallback with thumbnail
 * - Video plays muted by default
 */

export default function StageVideoPlayer({
  open,
  video,
  muted,
  onClose,
  onToggleMute,
  onPlaySong,
}) {
  const { isPlaying, togglePlay } = usePlayer() || {};
  const wasPlayingRef = useRef(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

  // Reset state every time video or open changes
  useEffect(() => {
    if (open) {
      setIframeLoaded(false);
      setIframeKey((k) => k + 1);
    }
  }, [open, video?.youtube_video_id]);

  const handleIframeLoad = useCallback(() => {
    setIframeLoaded(true);
  }, []);

  const handleIframeError = useCallback(() => {
    // Keep showing — just mark as not loaded so spinner stays
  }, []);

  const handleUnmute = useCallback(() => {
    if (muted) {
      wasPlayingRef.current = isPlaying;
      if (isPlaying && togglePlay) togglePlay();
    }
    onToggleMute?.();
  }, [muted, isPlaying, togglePlay, onToggleMute]);

  const handleMute = useCallback(() => {
    if (!muted) {
      if (wasPlayingRef.current && togglePlay && !isPlaying) togglePlay();
    }
    onToggleMute?.();
  }, [muted, isPlaying, togglePlay, onToggleMute]);

  const handleClose = useCallback(() => {
    if (!muted && wasPlayingRef.current && togglePlay && !isPlaying) {
      togglePlay();
    }
    if (!muted) onToggleMute?.();
    onClose?.();
  }, [muted, isPlaying, togglePlay, onClose, onToggleMute]);

  const embedUrl = video?.youtube_video_id
    ? `https://www.youtube-nocookie.com/embed/${video.youtube_video_id}?autoplay=1&mute=1&controls=1&modestbranding=1&rel=0&playsinline=1&origin=${encodeURIComponent(window.location.origin)}`
    : null;

  const thumbnailUrl = video?.thumbnail_url || (
    video?.youtube_video_id
      ? `https://img.youtube.com/vi/${video.youtube_video_id}/maxresdefault.jpg`
      : null
  );

  return (
    <AnimatePresence>
      {open && video && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.25 } }}
          className="fixed inset-0 z-[70] flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.94)", backdropFilter: "blur(10px)" }}
        >
          {/* ── Exit Full Screen button (top-right) ── */}
          <button
            onClick={handleClose}
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

          {/* ── Title (top-left) ── */}
          <div className="absolute top-4 left-4 z-10 max-w-[60vw]">
            <p className="text-white/80 text-sm font-bold truncate">
              {video.title || "Upper Vibe Media"}
            </p>
            <p className="text-white/35 text-[10px]">Main Music Stage</p>
          </div>

          {/* ── Video area ── */}
          <div
            className="relative w-full max-w-4xl aspect-video mx-4 rounded-xl overflow-hidden"
            style={{
              boxShadow: "0 0 60px rgba(155,126,255,0.3), 0 0 120px rgba(0,160,220,0.15)",
            }}
          >
            {/* Loading spinner overlay */}
            {!iframeLoaded && embedUrl && (
              <div
                className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-xl"
                style={{ background: "#08081c" }}
              >
                {thumbnailUrl && (
                  <img
                    src={thumbnailUrl}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover opacity-20"
                  />
                )}
                <Loader2 className="w-8 h-8 text-purple-400/60 animate-spin" />
                <p className="text-white/35 text-xs tracking-wider">Loading stage video...</p>
              </div>
            )}

            {/* YouTube iframe — always shown when URL exists */}
            {embedUrl ? (
              <iframe
                key={iframeKey}
                src={embedUrl}
                className="w-full h-full"
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
                title={video.title || "Upper Vibe Media"}
                onLoad={handleIframeLoad}
                onError={handleIframeError}
                style={{ border: "none" }}
              />
            ) : (
              /* No embed URL → thumbnail fallback */
              <div
                className="w-full h-full flex flex-col items-center justify-center gap-3 rounded-xl"
                style={{ background: "linear-gradient(135deg, #0a0a1e, #12122e)" }}
              >
                {thumbnailUrl && (
                  <img
                    src={thumbnailUrl}
                    alt={video.title || "Stage video"}
                    className="w-full h-full object-cover opacity-40 absolute inset-0"
                  />
                )}
                <Music4 className="w-10 h-10 text-white/15 relative z-10" />
                <p className="text-white/30 text-sm relative z-10">{video.title || "Upper Vibe Media"}</p>
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

          {/* ── Bottom control bar ── */}
          <div className="absolute bottom-8 left-0 right-0 flex justify-center px-4">
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-2xl"
              style={{
                background: "rgba(0,0,0,0.55)",
                backdropFilter: "blur(16px)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              {/* Mute / Unmute */}
              <button
                onClick={muted ? handleUnmute : handleMute}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full font-black text-xs tracking-wider transition-all hover:brightness-110 active:scale-95"
                style={{
                  background: muted
                    ? "rgba(255,255,255,0.08)"
                    : "linear-gradient(135deg,#7C3AED,#9B7EFF)",
                  border: muted ? "1px solid rgba(255,255,255,0.15)" : "none",
                  color: muted ? "rgba(255,255,255,0.55)" : "#fff",
                }}
              >
                {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                {muted ? "Stage Muted" : "Stage Live"}
              </button>

              {/* Play This Song */}
              {onPlaySong && (
                <button
                  onClick={onPlaySong}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full font-black text-xs tracking-wider transition-all hover:brightness-110 active:scale-95"
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

          {/* Stage audio active notice */}
          <AnimatePresence>
            {!muted && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="absolute top-20 left-1/2 -translate-x-1/2 z-10 px-3 py-1.5 rounded-full"
                style={{
                  background: "rgba(212,168,67,0.18)",
                  border: "1px solid rgba(212,168,67,0.25)",
                }}
              >
                <p className="text-[10px] text-yellow-300/70 font-medium tracking-wide">
                  Music player paused — stage audio live
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}