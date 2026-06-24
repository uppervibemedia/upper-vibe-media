import React, { useRef, useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { X, Volume2, VolumeX, Music4, SkipForward } from "lucide-react";

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

  // controls=0 prevents YouTube UI; disablekb=1 stops keyboard shortcuts that open YT
  // rel=0, modestbranding=1 minimize YouTube branding
  const embedUrl = ytId
    ? `https://www.youtube.com/embed/${ytId}?autoplay=1&mute=1&playsinline=1&enablejsapi=1&rel=0&controls=0&disablekb=1&modestbranding=1&origin=${encodeURIComponent(window.location.origin)}`
    : "";

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

  const saTop = (isMobile && mobileLayout?.sa?.top) ? mobileLayout.sa.top : 0;
  const saBottom = (isMobile && mobileLayout?.sa?.bottom) ? mobileLayout.sa.bottom : 0;

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[300] flex flex-col"
      style={{ background: "#000" }}
      onPointerDown={showControls}
    >
      {/* ── Video fills the screen ── */}
      <div className="absolute inset-0 z-[1]">
        {ytId ? (
          <>
            <iframe
              ref={iframeRef}
              src={embedUrl}
              title="Stage Video"
              className="w-full h-full"
              style={{ border: "none", display: "block" }}
              allow="autoplay; encrypted-media"
              referrerPolicy="strict-origin-when-cross-origin"
              onLoad={handleIframeLoad}
            />
            {/* Transparent overlay blocks mouse hover from reaching the iframe,
                preventing YouTube's own title/control overlays from appearing.
                Pointer events on our own UI buttons are set explicitly above z-[1]. */}
            <div
              className="absolute inset-0"
              style={{ zIndex: 2, background: "transparent" }}
              onPointerDown={(e) => { e.stopPropagation(); showControls(); }}
            />
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-black">
            {thumbnailUrl
              ? <img src={thumbnailUrl} alt={title || "Stage"} className="w-full h-full object-contain" />
              : <p className="text-white/20 text-lg">Upper Vibe Media</p>
            }
          </div>
        )}
      </div>

      {/* ── Top bar: Mute (left) + Exit (right) — NO title here ── */}
      <div
        className="absolute left-0 right-0 z-[10] flex items-center justify-between"
        style={{
          top: saTop + 8,
          paddingLeft: `max(env(safe-area-inset-left, 0px), 12px)`,
          paddingRight: `max(env(safe-area-inset-right, 0px), 12px)`,
        }}
      >
        {/* Mute */}
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
          }}
          aria-label={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>

        {/* Exit */}
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
          }}
          aria-label="Exit full screen"
        >
          <X className="w-3.5 h-3.5" />
          <span>Exit</span>
        </button>
      </div>

      {/* ── Bottom controls — auto-hide; title lives HERE only ── */}
      <motion.div
        animate={{ opacity: controlsVisible ? 1 : 0, y: controlsVisible ? 0 : 16 }}
        transition={{ duration: 0.2 }}
        className="absolute left-0 right-0 z-[10] flex flex-col items-center gap-1.5"
        style={{
          bottom: saBottom + 16,
          paddingLeft: `max(env(safe-area-inset-left, 0px), 16px)`,
          paddingRight: `max(env(safe-area-inset-right, 0px), 16px)`,
          pointerEvents: controlsVisible ? "auto" : "none",
        }}
      >
        {/* Song title — only shown here, never duplicated */}
        {title && (
          <p
            className="text-white/70 font-bold truncate text-center max-w-[80vw]"
            style={{ fontSize: 12, lineHeight: 1.3, pointerEvents: "none" }}
          >
            {title}
          </p>
        )}

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