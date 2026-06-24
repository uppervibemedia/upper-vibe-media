import React, { useRef, useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Volume2, VolumeX, Music4, SkipForward } from "lucide-react";

/**
 * StageFullScreen — full-screen cinematic video player overlay.
 *
 * UI rules:
 *  - One Exit button top-right (always visible, small)
 *  - Mute icon top-left (always visible, small)
 *  - Title top-center, truncated, below safe area — never overlaps Exit or Mute
 *  - Bottom controls (Next, Play Song, Exit Watch) auto-hide after 3s
 *  - Tap anywhere to show controls again
 *  - No duplicate buttons
 */
export default function StageFullScreen({
  open, video, onClose,
  onStageExitWatchMode, onStageNextVideo, onStagePlaySong,
  onStageMuteToggle, stageMuted,
  isMobile, mobileLayout,
}) {
  const iframeRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const [muted, setMuted] = useState(true);
  const [controlsVisible, setControlsVisible] = useState(true);
  const hideTimerRef = useRef(null);

  const ytId = video?.youtube_video_id || "";
  const title = video?.title || "";
  const thumbnailUrl = video?.thumbnail_url
    || (ytId ? `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg` : null);

  const embedUrl = ytId
    ? `https://www.youtube.com/embed/${ytId}?autoplay=1&mute=1&playsinline=1&enablejsapi=1&rel=0&controls=0&modestbranding=1&origin=${encodeURIComponent(window.location.origin)}`
    : "";

  // Reset on open
  useEffect(() => {
    if (open) {
      setError(false);
      setReady(false);
      setMuted(true);
      showControls();
    }
    return () => { if (hideTimerRef.current) clearTimeout(hideTimerRef.current); };
  }, [open]);

  const showControls = useCallback(() => {
    setControlsVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setControlsVisible(false), 3000);
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const next = !m;
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: "command", func: next ? "mute" : "unMute", args: [] }), "*"
        );
      }
      // Also notify parent if provided
      onStageMuteToggle?.();
      return next;
    });
  }, [onStageMuteToggle]);

  const handleIframeLoad = useCallback(() => {
    setReady(true);
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: "command", func: "playVideo", args: [] }), "*"
      );
    }
  }, []);

  // Safe area top offset
  const saTop = (isMobile && mobileLayout?.sa?.top)
    ? mobileLayout.sa.top
    : 0;
  const saBottom = (isMobile && mobileLayout?.sa?.bottom)
    ? mobileLayout.sa.bottom
    : 0;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.25 } }}
          className="fixed inset-0 z-[300] flex flex-col"
          style={{ background: "#000", touchAction: "manipulation" }}
          onClick={showControls}
          onTouchStart={showControls}
        >
          {/* ── Always-visible top bar: Mute (left) | Title (center) | Exit (right) ── */}
          <div
            className="absolute left-0 right-0 z-10 flex items-center"
            style={{
              top: saTop + 8,
              paddingLeft: "calc(env(safe-area-inset-left, 0px) + 12px)",
              paddingRight: "calc(env(safe-area-inset-right, 0px) + 12px)",
              gap: "8px",
            }}
          >
            {/* Mute button — left */}
            <button
              onTouchStart={(e) => { e.stopPropagation(); toggleMute(); }}
              onClick={(e) => { e.stopPropagation(); toggleMute(); }}
              className="flex-shrink-0 flex items-center justify-center rounded-full transition-all active:scale-95"
              style={{
                background: "rgba(0,0,0,0.55)",
                backdropFilter: "blur(12px)",
                border: "1px solid rgba(255,255,255,0.18)",
                color: muted ? "rgba(255,255,255,0.55)" : "#fff",
                width: 44, height: 44, minWidth: 44, minHeight: 44,
                touchAction: "manipulation",
              }}
              aria-label={muted ? "Unmute" : "Mute"}
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {/* Title — center, truncated, never overlaps buttons */}
            {title && (
              <div className="flex-1 min-w-0 px-1 text-center">
                <p
                  className="text-white/80 font-bold truncate"
                  style={{ fontSize: "13px", lineHeight: "1.3" }}
                >
                  {title}
                </p>
              </div>
            )}

            {/* Exit button — right */}
            <button
              onTouchStart={(e) => { e.stopPropagation(); onClose?.(); }}
              onClick={(e) => { e.stopPropagation(); onClose?.(); }}
              className="flex-shrink-0 flex items-center gap-1.5 px-4 rounded-full font-black text-xs tracking-wider transition-all active:scale-95"
              style={{
                background: "rgba(0,0,0,0.55)",
                backdropFilter: "blur(12px)",
                border: "1px solid rgba(255,255,255,0.18)",
                color: "rgba(255,255,255,0.85)",
                height: 44, minHeight: 44, minWidth: 44,
                touchAction: "manipulation",
              }}
              aria-label="Exit full screen"
            >
              <X className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Exit</span>
            </button>
          </div>

          {/* ── Video / Thumbnail — fills the screen ── */}
          <div className="absolute inset-0">
            {ytId && !error ? (
              <iframe
                ref={iframeRef}
                src={embedUrl}
                title={title || "Stage Video"}
                className="w-full h-full"
                style={{ border: "none" }}
                allow="autoplay; encrypted-media; picture-in-picture"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
                onLoad={handleIframeLoad}
                onError={() => setError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-black">
                {thumbnailUrl
                  ? <img src={thumbnailUrl} alt={title || "Stage"} className="w-full h-full object-contain" />
                  : <p className="text-white/20 text-lg font-heading">Upper Vibe Media</p>
                }
              </div>
            )}
          </div>

          {/* ── Auto-hide bottom controls ── */}
          <motion.div
            animate={{ opacity: controlsVisible ? 1 : 0, y: controlsVisible ? 0 : 12 }}
            transition={{ duration: 0.22 }}
            className="absolute left-0 right-0 z-10 flex items-center justify-center gap-2 px-4"
            style={{
              bottom: saBottom + 12,
              paddingLeft: "calc(env(safe-area-inset-left, 0px) + 16px)",
              paddingRight: "calc(env(safe-area-inset-right, 0px) + 16px)",
              pointerEvents: controlsVisible ? "auto" : "none",
            }}
          >
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-2xl"
              style={{
                background: "rgba(0,0,0,0.72)",
                backdropFilter: "blur(16px)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              {/* Exit Watch — if in watch mode */}
              {onStageExitWatchMode && (
                <button
                  onTouchStart={(e) => { e.stopPropagation(); onStageExitWatchMode(); }}
                  onClick={(e) => { e.stopPropagation(); onStageExitWatchMode(); }}
                  className="flex items-center gap-1 px-3 py-2 rounded-full font-black text-[10px] tracking-wider transition-all active:scale-95"
                  style={{ background: "linear-gradient(135deg,#7C3AED,#9B7EFF)", color: "#fff", minHeight: 36, touchAction: "manipulation" }}
                >
                  <Music4 className="w-3 h-3" /> Exit Watch
                </button>
              )}

              {/* Next */}
              {onStageNextVideo && (
                <button
                  onTouchStart={(e) => { e.stopPropagation(); onStageNextVideo(); showControls(); }}
                  onClick={(e) => { e.stopPropagation(); onStageNextVideo(); showControls(); }}
                  className="flex items-center gap-1 px-3 py-2 rounded-full font-black text-[10px] tracking-wider transition-all active:scale-95"
                  style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.75)", minHeight: 36, touchAction: "manipulation" }}
                >
                  <SkipForward className="w-3 h-3" /> Next
                </button>
              )}

              {/* Play Song */}
              {onStagePlaySong && (
                <button
                  onTouchStart={(e) => { e.stopPropagation(); onStagePlaySong(); showControls(); }}
                  onClick={(e) => { e.stopPropagation(); onStagePlaySong(); showControls(); }}
                  className="flex items-center gap-1 px-3 py-2 rounded-full font-black text-[10px] tracking-wider transition-all active:scale-95"
                  style={{ background: "linear-gradient(135deg,#0080B8,#00A0DC)", color: "#fff", minHeight: 36, touchAction: "manipulation" }}
                >
                  <Music4 className="w-3 h-3" /> Play Song
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}