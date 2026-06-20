import React, { useEffect, useRef, useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Volume2, VolumeX, Play, Music4, AlertTriangle } from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";

/**
 * StageVideoPlayer — fullscreen overlay that plays actual YouTube videos.
 *
 * Rules:
 *  - Video autoplays muted by default (no conflict with global player)
 *  - "Listen with Sound" pauses global player and unmutes video
 *  - Close button restores previous state
 *  - Blocked from navigating to YouTube externally
 *  - Fallback thumbnail + manual start if embed fails
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
  const [embedFailed, setEmbedFailed] = useState(false);
  const [userStarted, setUserStarted] = useState(false);

  // Reset embed state when video changes
  useEffect(() => {
    setEmbedFailed(false);
    setUserStarted(false);
  }, [video?.youtube_video_id]);

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
    if (!muted && wasPlayingRef.current && togglePlay && !isPlaying) {
      togglePlay();
    }
    if (!muted) onToggleMute?.();
    onClose?.();
  }, [muted, isPlaying, togglePlay, onClose, onToggleMute]);

  const handleStartVideo = useCallback(() => {
    setUserStarted(true);
  }, []);

  const handleEmbedError = useCallback(() => {
    setEmbedFailed(true);
  }, []);

  const embedUrl = video?.youtube_video_id
    ? `https://www.youtube.com/embed/${video.youtube_video_id}?autoplay=1&mute=${muted ? 1 : 0}&controls=1&modestbranding=1&rel=0&playsinline=1&enablejsapi=1&fs=0&iv_load_policy=3&cc_load_policy=0`
    : video?.embed_url
      ? `${video.embed_url}?autoplay=1&mute=${muted ? 1 : 0}&controls=1&modestbranding=1&rel=0&playsinline=1`
      : null;

  const showFallback = embedFailed || !embedUrl;
  const thumbnailUrl = video?.thumbnail_url || (
    video?.youtube_video_id
      ? `https://img.youtube.com/vi/${video.youtube_video_id}/hqdefault.jpg`
      : null
  );

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

          {/* Video area */}
          <div className="relative w-full max-w-4xl aspect-video mx-4 rounded-xl overflow-hidden"
            style={{ boxShadow: "0 0 60px rgba(155,126,255,0.3), 0 0 120px rgba(0,160,220,0.15)" }}
          >
            {showFallback ? (
              /* ── Fallback: thumbnail + start button ── */
              <div
                className="w-full h-full flex items-center justify-center relative"
                style={{ background: "#0a0a1e" }}
              >
                {thumbnailUrl && (
                  <img
                    src={thumbnailUrl}
                    alt={video.title || "Stage video"}
                    className="w-full h-full object-cover opacity-40"
                  />
                )}
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <AlertTriangle className="w-8 h-8 text-white/30" />
                  <p className="text-white/40 text-sm">{embedFailed ? "Video failed to load" : "Tap to start video"}</p>
                  <button
                    onClick={handleStartVideo}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-full font-black text-xs tracking-wider transition-all hover:brightness-110 active:scale-95"
                    style={{
                      background: "linear-gradient(135deg,#7C3AED,#9B7EFF)",
                      color: "#fff",
                    }}
                  >
                    <Play className="w-3.5 h-3.5" />
                    Start Stage Video
                  </button>
                </div>
              </div>
            ) : userStarted ? (
              /* ── YouTube iframe — sandboxed to block external navigation ── */
              <iframe
                ref={iframeRef}
                src={embedUrl}
                className="w-full h-full"
                allow="autoplay; encrypted-media"
                allowFullScreen
                title={video.title || "Upper Vibe Media Video"}
                sandbox="allow-scripts allow-same-origin allow-presentation"
                onError={handleEmbedError}
              />
            ) : (
              /* ── Thumbnail with start prompt ── */
              <div
                className="w-full h-full flex items-center justify-center relative"
                style={{ background: "#0a0a1e" }}
              >
                {thumbnailUrl && (
                  <img
                    src={thumbnailUrl}
                    alt={video.title || "Stage video"}
                    className="w-full h-full object-cover opacity-50"
                  />
                )}
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <Play className="w-10 h-10 text-white/40" />
                  <button
                    onClick={handleStartVideo}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-full font-black text-xs tracking-wider transition-all hover:brightness-110 active:scale-95"
                    style={{
                      background: "linear-gradient(135deg,#7C3AED,#9B7EFF)",
                      color: "#fff",
                      boxShadow: "0 0 20px rgba(155,126,255,0.4)",
                    }}
                  >
                    <Play className="w-3.5 h-3.5" />
                    Start Stage Video
                  </button>
                </div>
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

              {/* Play This Song */}
              {onPlaySong && (
                <button
                  onClick={() => onPlaySong()}
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