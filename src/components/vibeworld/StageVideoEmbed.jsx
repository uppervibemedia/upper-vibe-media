import React, { useRef, useEffect, useState, useCallback } from "react";

/**
 * StageVideoEmbed — YouTube iframe positioned to overlay the 3D stage screen.
 * Renders at the projected screen-space coordinates from CityCanvas.
 */
export default function StageVideoEmbed({ open, video, screenPosRef, onClose }) {
  const iframeRef = useRef(null);
  const [error, setError] = useState(false);
  const [ready, setReady] = useState(false);
  const [pos, setPos] = useState({ x: -9999, y: -9999, w: 0, h: 0 });
  const animRef = useRef(null);
  const lastVideoIdRef = useRef(null);

  const ytId = video?.youtube_video_id || "";

  // Poll screen position from ref each frame
  useEffect(() => {
    if (!open) return;
    const loop = () => {
      const p = screenPosRef?.current;
      if (p && p.w > 0 && p.h > 0) {
        setPos(p);
      }
      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [open, screenPosRef]);

  // Reset on open
  useEffect(() => {
    if (open) {
      setError(false);
      setReady(false);
    }
  }, [open]);

  // Rebuild iframe when video changes
  useEffect(() => {
    if (!open || !ytId) return;
    if (ytId === lastVideoIdRef.current) return;
    lastVideoIdRef.current = ytId;
    setError(false);
    setReady(false);
  }, [open, ytId]);

  const embedUrl = ytId
    ? `https://www.youtube.com/embed/${ytId}?autoplay=1&mute=1&playsinline=1&enablejsapi=1&rel=0&controls=0&modestbranding=1&origin=${encodeURIComponent(window.location.origin)}`
    : "";

  const handleIframeLoad = useCallback(() => {
    setReady(true);
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: "command", func: "playVideo", args: [] }),
        "*"
      );
    }
  }, []);

  if (!open || !ytId || pos.w <= 0) return null;

  return (
    <div
      className="fixed z-[70] pointer-events-auto"
      style={{
        left: pos.x,
        top: pos.y,
        width: pos.w,
        height: pos.h,
      }}
    >
      {/* Neon frame glow */}
      <div
        className="absolute -inset-1 rounded-md pointer-events-none"
        style={{
          boxShadow: "0 0 30px rgba(155,126,255,0.3), 0 0 60px rgba(0,160,220,0.12)",
          border: "1px solid rgba(155,126,255,0.18)",
        }}
      />

      {!error ? (
        <iframe
          ref={iframeRef}
          src={embedUrl}
          title={video?.title || "Stage Video"}
          className="w-full h-full"
          style={{ border: "none", background: "#000" }}
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
          <p className="text-white/15 text-xs font-heading">Upper Vibe Media</p>
        </div>
      )}
    </div>
  );
}