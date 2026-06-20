import React, { useRef, useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Volume2, VolumeX } from "lucide-react";

/**
 * StageFullScreen — full-screen overlay with embedded YouTube video.
 * Starts playback immediately on open via the user's click gesture.
 */
export default function StageFullScreen({ open, video, onClose }) {
  const iframeRef = useRef(null);
  const [error, setError] = useState(false);
  const [ready, setReady] = useState(false);
  const [muted, setMuted] = useState(true);
  const lastVideoIdRef = useRef(null);

  const ytId = video?.youtube_video_id || "";

  // Build embed URL with autoplay + mute for reliable start
  const embedUrl = ytId
    ? `https://www.youtube.com/embed/${ytId}?autoplay=1&mute=1&playsinline=1&enablejsapi=1&rel=0&controls=0&modestbranding=1&origin=${encodeURIComponent(window.location.origin)}`
    : "";

  // Reset state when opening/closing
  useEffect(() => {
    if (open) {
      setError(false);
      setReady(false);
      setMuted(true);
    }
  }, [open]);

  // PostMessage to iframe to control playback
  useEffect(() => {
    if (!open || !ytId) return;
    lastVideoIdRef.current = ytId;
    setError(false);
  }, [open, ytId]);

  const toggleMuteViaPost = useCallback((shouldMute) => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: "command", func: shouldMute ? "mute" : "unMute", args: [] }),
        "*"
      );
    }
  }, []);

  const handleToggleMute = useCallback(() => {
    setMuted((m) => {
      const next = !m;
      toggleMuteViaPost(next);
      return next;
    });
  }, [toggleMuteViaPost]);

  const handleIframeLoad = useCallback(() => {
    setReady(true);
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: "command", func: "playVideo", args: [] }),
        "*"
      );
    }
  }, []);

  const thumbnailUrl = video?.thumbnail_url
    || (ytId ? `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg` : null);
  const title = video?.title || "";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.3 } }}
          className="fixed inset-0 z-[75] flex flex-col items-center justify-center"
          style={{ background: "rgba(0,0,0,0.95)", backdropFilter: "blur(12px)" }}
        >
          {/* Exit button */}
          <button
            onClick={onClose}
            className="absolute z-10 flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold tracking-wide transition-all hover:bg-white/10"
            style={{
              top: "calc(env(safe-area-inset-top, 0px) + 1rem)",
              right: "1rem",
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.15)",
              color: "rgba(255,255,255,0.7)",
              minWidth: "44px",
              minHeight: "44px",
              pointerEvents: "auto",
            }}
          >
            <X className="w-3.5 h-3.5" />
            Exit Full Screen
          </button>

          {/* Title */}
          <div className="absolute z-10 max-w-[50vw]"
            style={{ top: "calc(env(safe-area-inset-top, 0px) + 1rem)", left: "1rem" }}>
            <p className="text-white/80 text-sm font-bold truncate">{title || "Upper Vibe Media"}</p>
            <p className="text-white/35 text-[10px]">Main Music Stage</p>
          </div>

          {/* Video container — 16:9 */}
          <div
            className="relative w-full max-w-4xl aspect-video mx-4 rounded-xl overflow-hidden"
            style={{
              boxShadow: "0 0 60px rgba(155,126,255,0.3), 0 0 120px rgba(0,160,220,0.15)",
              background: "#000",
            }}
          >
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
              <div
                className="w-full h-full flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #0a0a1e, #12122e)" }}
              >
                {thumbnailUrl ? (
                  <img src={thumbnailUrl} alt={title || "Stage"} className="w-full h-full object-cover" />
                ) : (
                  <p className="text-white/20 text-lg font-heading">Upper Vibe Media</p>
                )}
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

          {/* Mute/Unmute toggle */}
          {ready && ytId && (
            <button
              onClick={handleToggleMute}
              className="mt-4 flex items-center gap-1.5 px-4 py-3 rounded-full font-bold text-xs tracking-wide transition-all hover:brightness-110"
              style={{
                background: muted ? "rgba(255,255,255,0.08)" : "rgba(124,58,237,0.3)",
                border: "1px solid rgba(255,255,255,0.15)",
                color: muted ? "rgba(255,255,255,0.6)" : "#fff",
                minWidth: "44px",
                minHeight: "44px",
                pointerEvents: "auto",
                touchAction: "manipulation",
              }}
            >
              {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              {muted ? "Muted" : "Audio On"}
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}