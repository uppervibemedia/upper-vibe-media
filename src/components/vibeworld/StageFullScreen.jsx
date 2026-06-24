import React, { useRef, useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Volume2, VolumeX, Music4, SkipForward } from "lucide-react";

/**
 * StageFullScreen — full-screen cinematic video player overlay.
 *
 * Single source of truth for mute state: `isMuted` lives here only.
 * Parent's stageMuted prop is intentionally ignored to avoid state fights.
 *
 * UI:
 *  - Top bar (always visible): Mute left | Title center | Exit right
 *  - Bottom bar (auto-hide 3s): Exit Watch | Next | Play Song
 *  - Tap anywhere on the dark area to show bottom controls again
 *  - Buttons call stopPropagation so taps don't double-fire
 */
export default function StageFullScreen({
  open, video, onClose,
  onStageExitWatchMode, onStageNextVideo, onStagePlaySong,
  isMobile, mobileLayout, tvMode,
}) {
  const iframeRef = useRef(null);
  const [isMuted, setIsMuted] = useState(true);
  const [controlsVisible, setControlsVisible] = useState(true);
  const hideTimerRef = useRef(null);

  const ytId = video?.youtube_video_id || "";
  const title = video?.title || "";
  const thumbnailUrl = video?.thumbnail_url
    || (ytId ? `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg` : null);

  const embedUrl = ytId
    ? `https://www.youtube.com/embed/${ytId}?autoplay=1&mute=1&playsinline=1&enablejsapi=1&rel=0&controls=0&modestbranding=1&origin=${encodeURIComponent(window.location.origin)}`
    : "";

  // Reset mute + controls on open; clear timer on close
  useEffect(() => {
    if (open) {
      setIsMuted(true);
      showControls();
    }
    return () => clearTimer();
  }, [open]);

  const clearTimer = () => {
    if (hideTimerRef.current) { clearTimeout(hideTimerRef.current); hideTimerRef.current = null; }
  };

  const showControls = useCallback(() => {
    setControlsVisible(true);
    clearTimer();
    const delay = tvMode ? 2000 : 3000;
    hideTimerRef.current = setTimeout(() => setControlsVisible(false), delay);
  }, [tvMode]);

  // Sync hide delay when tvMode changes while overlay is open
  useEffect(() => {
    if (open && controlsVisible) {
      clearTimer();
      const delay = tvMode ? 2000 : 3000;
      hideTimerRef.current = setTimeout(() => setControlsVisible(false), delay);
    }
  }, [tvMode]);

  const postToIframe = useCallback((func) => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: "command", func, args: [] }), "*"
      );
    }
  }, []);

  const toggleMute = useCallback((e) => {
    e?.stopPropagation();
    setIsMuted((prev) => {
      const next = !prev;
      postToIframe(next ? "mute" : "unMute");
      return next;
    });
  }, [postToIframe]);

  const handleIframeLoad = useCallback(() => {
    postToIframe("playVideo");
  }, [postToIframe]);

  // Tap handler for the dark background — shows controls without triggering anything else
  const handleBackgroundTap = useCallback((e) => {
    // Only fire if the tap was directly on this element (not bubbled from a button)
    if (e.target === e.currentTarget) showControls();
  }, [showControls]);

  const saTop = (isMobile && mobileLayout?.sa?.top) ? mobileLayout.sa.top : 0;
  const saBottom = (isMobile && mobileLayout?.sa?.bottom) ? mobileLayout.sa.bottom : 0;

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[300] flex flex-col"
      style={{ background: "#000" }}
    >
      {/* ── Tap zone: covers the whole screen but passes pointer events to children ── */}
      {/* Use onPointerDown on the outer div; children stop propagation so only blank taps fire */}
      <div
        className="absolute inset-0 z-0"
        onPointerDown={showControls}
        style={{ touchAction: "manipulation" }}
      />

      {/* ── Video fills the screen ── */}
      <div className="absolute inset-0 z-[1]">
        {ytId ? (
          <iframe
            ref={iframeRef}
            src={embedUrl}
            title={title || "Stage Video"}
            className="w-full h-full"
            style={{ border: "none", display: "block" }}
            allow="autoplay; encrypted-media; picture-in-picture"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            onLoad={handleIframeLoad}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-black">
            {thumbnailUrl
              ? <img src={thumbnailUrl} alt={title || "Stage"} className="w-full h-full object-contain" />
              : <p className="text-white/20 text-lg">Upper Vibe Media</p>
            }
          </div>
        )}
      </div>

      {/* ── Top bar: always visible, above video ── */}
      <div
        className="absolute left-0 right-0 z-[10] flex items-center"
        style={{
          top: saTop + 8,
          paddingLeft: `max(env(safe-area-inset-left, 0px), 12px)`,
          paddingRight: `max(env(safe-area-inset-right, 0px), 12px)`,
          gap: 8,
          pointerEvents: "none", // children handle their own pointer events
        }}
      >
        {/* Mute — left */}
        <button
          onPointerDown={(e) => { e.stopPropagation(); toggleMute(); }}
          className="flex-shrink-0 flex items-center justify-center rounded-full active:scale-95"
          style={{
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(12px)",
            border: `1px solid ${isMuted ? "rgba(255,255,255,0.2)" : "rgba(155,126,255,0.6)"}`,
            color: isMuted ? "rgba(255,255,255,0.6)" : "#fff",
            width: 44, height: 44, minWidth: 44, minHeight: 44,
            touchAction: "manipulation",
            pointerEvents: "auto",
          }}
          aria-label={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>

        {/* Title — center, single line, truncated */}
        <div className="flex-1 min-w-0 px-1 text-center pointer-events-none overflow-hidden">
          {title && (
            <p className="text-white/75 font-bold truncate" style={{ fontSize: 12, lineHeight: 1.3 }}>
              {title}
            </p>
          )}
        </div>

        {/* Exit — right */}
        <button
          onPointerDown={(e) => { e.stopPropagation(); onClose?.(); }}
          className="flex-shrink-0 flex items-center gap-1.5 px-4 rounded-full font-black text-xs tracking-wider active:scale-95"
          style={{
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255,255,255,0.2)",
            color: "rgba(255,255,255,0.9)",
            height: 44, minHeight: 44, minWidth: 44,
            touchAction: "manipulation",
            pointerEvents: "auto",
          }}
          aria-label="Exit full screen"
        >
          <X className="w-3.5 h-3.5" />
          <span>Exit</span>
        </button>
      </div>

      {/* ── Bottom controls — auto-hide, tap to show ── */}
      <motion.div
        animate={{ opacity: controlsVisible ? 1 : 0, y: controlsVisible ? 0 : 16 }}
        transition={{ duration: 0.2 }}
        className="absolute left-0 right-0 z-[10] flex items-center justify-center"
        style={{
          bottom: saBottom + 16,
          paddingLeft: `max(env(safe-area-inset-left, 0px), 16px)`,
          paddingRight: `max(env(safe-area-inset-right, 0px), 16px)`,
          pointerEvents: controlsVisible ? "auto" : "none",
        }}
      >
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-2xl flex-wrap justify-center"
          style={{
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(18px)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          {onStageExitWatchMode && (
            <button
              onPointerDown={(e) => { e.stopPropagation(); onStageExitWatchMode(); showControls(); }}
              className="flex items-center gap-1 px-3 py-2 rounded-full font-black text-[10px] tracking-wider active:scale-95"
              style={{ background: "linear-gradient(135deg,#7C3AED,#9B7EFF)", color: "#fff", minHeight: 36, touchAction: "manipulation" }}
            >
              <Music4 className="w-3 h-3" /> Exit Watch
            </button>
          )}
          {onStageNextVideo && (
            <button
              onPointerDown={(e) => { e.stopPropagation(); onStageNextVideo(); showControls(); }}
              className="flex items-center gap-1 px-3 py-2 rounded-full font-black text-[10px] tracking-wider active:scale-95"
              style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.8)", minHeight: 36, touchAction: "manipulation" }}
            >
              <SkipForward className="w-3 h-3" /> Next
            </button>
          )}
          {onStagePlaySong && (
            <button
              onPointerDown={(e) => { e.stopPropagation(); onStagePlaySong(); showControls(); }}
              className="flex items-center gap-1 px-3 py-2 rounded-full font-black text-[10px] tracking-wider active:scale-95"
              style={{ background: "linear-gradient(135deg,#0080B8,#00A0DC)", color: "#fff", minHeight: 36, touchAction: "manipulation" }}
            >
              <Music4 className="w-3 h-3" /> Play Song
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}