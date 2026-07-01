import React, { useRef, useEffect, useState, useCallback, useImperativeHandle, forwardRef } from "react";
import { Volume2, VolumeX, Play } from "lucide-react";

/**
 * StageVideoEmbed — YouTube iframe overlaid on the 3D stage screen.
 * - Autoplay muted (required by browsers/iOS).
 * - Shows a "Tap to Unmute" button; user can toggle audio without exiting.
 * - iOS landscape: scales up 50% for a more immersive view.
 */
const StageVideoEmbed = forwardRef(function StageVideoEmbed({ open, video, screenPosRef }, ref) {
  const iframeRef = useRef(null);
  const [error, setError] = useState(false);
  const [ready, setReady] = useState(false);
  const [pos, setPos] = useState({ x: -9999, y: -9999, w: 0, h: 0 });
  const [muted, setMuted] = useState(true);
  const [started, setStarted] = useState(false); // has video started playing?
  const animRef = useRef(null);
  const lastVideoIdRef = useRef(null);

  const ytId = video?.youtube_video_id || "";

  // Detect iOS landscape
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const isLandscape = typeof window !== "undefined" && window.innerWidth > window.innerHeight;

  // ── PostMessage helpers ─────────────────────────────────────────────────────
  const postCmd = useCallback((func, args = []) => {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: "command", func, args }), "*"
    );
  }, []);

  // ── Imperative handle for parent (UpperVibeCity) ─────────────────────────
  useImperativeHandle(ref, () => ({
    mute() {
      setMuted(true);
      postCmd("mute");
    },
    unmute() {
      setMuted(false);
      postCmd("unMute");
      postCmd("setVolume", [80]);
    },
    play() {
      postCmd("playVideo");
      setStarted(true);
    },
    pause() { postCmd("pauseVideo"); },
    isMuted() { return muted; },
  }), [muted, postCmd]);

  // ── Poll screen position ─────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const loop = () => {
      const p = screenPosRef?.current;
      if (p && p.w > 0 && p.h > 0) setPos(p);
      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [open, screenPosRef]);

  // ── Reset on open/close ──────────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      setError(false);
      setReady(false);
      setMuted(true);
      setStarted(false);
    }
  }, [open]);

  // ── Rebuild on video change ──────────────────────────────────────────────
  useEffect(() => {
    if (!open || !ytId || ytId === lastVideoIdRef.current) return;
    lastVideoIdRef.current = ytId;
    setError(false);
    setReady(false);
    setMuted(true);
    setStarted(false);
  }, [open, ytId]);

  const embedUrl = ytId
    ? `https://www.youtube.com/embed/${ytId}?autoplay=1&mute=1&playsinline=1&enablejsapi=1&rel=0&controls=0&modestbranding=1&origin=${encodeURIComponent(window.location.origin)}`
    : "";

  const handleIframeLoad = useCallback(() => {
    setReady(true);
    setStarted(true);
    // Start playback muted (always works on iOS)
    postCmd("playVideo");
    setTimeout(() => {
      postCmd("playVideo");
    }, 80);
  }, [postCmd]);

  // ── User-triggered unmute/mute toggle ───────────────────────────────────
  const handleToggleMute = useCallback((e) => {
    e.stopPropagation();
    if (muted) {
      setMuted(false);
      postCmd("unMute");
      postCmd("setVolume", [80]);
    } else {
      setMuted(true);
      postCmd("mute");
    }
  }, [muted, postCmd]);

  // ── Manual play (iOS fallback) ───────────────────────────────────────────
  const handleManualPlay = useCallback((e) => {
    e.stopPropagation();
    postCmd("playVideo");
    setStarted(true);
  }, [postCmd]);

  if (!open || !ytId || pos.w <= 0) return null;

  // iOS landscape: scale up the embed by 50% around center
  const landscapeScale = isIOS && isLandscape ? 1.5 : 1;

  return (
    <div
      className="fixed z-[70] pointer-events-none overflow-hidden"
      style={{
        left: pos.x,
        top: pos.y,
        width: pos.w,
        height: pos.h,
        transformOrigin: "center center",
        transform: landscapeScale !== 1 ? `scale(${landscapeScale})` : "none",
      }}
    >
      {/* Neon frame */}
      <div
        className="absolute -inset-0.5 pointer-events-none rounded-sm"
        style={{
          boxShadow: "0 0 30px rgba(155,126,255,0.25), 0 0 60px rgba(0,160,220,0.1), 0 0 4px rgba(155,126,255,0.15) inset",
          border: "1px solid rgba(155,126,255,0.15)",
        }}
      />

      {!error ? (
        <iframe
          key={ytId}
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
        <div className="w-full h-full flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #0a0a1e, #12122e)" }}>
          <p className="text-white/15 text-xs font-heading">Upper Vibe Media</p>
        </div>
      )}

      {/* iOS fallback play button only — no audio controls on screen */}
      {!started && ready && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-auto"
          style={{ zIndex: 72 }}
        >
          <button
            onTouchStart={(e) => e.stopPropagation()}
            onClick={handleManualPlay}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-full font-black text-[11px] tracking-wide transition-all hover:brightness-110 active:scale-95"
            style={{
              background: "linear-gradient(135deg,#7C3AED,#9B7EFF)",
              color: "#fff",
              minWidth: 44, minHeight: 44,
              boxShadow: "0 0 20px rgba(124,58,237,0.6)",
              touchAction: "manipulation",
            }}
          >
            <Play className="w-4 h-4 ml-0.5" />
            Tap to Play
          </button>
        </div>
      )}
    </div>
  );
});

export default StageVideoEmbed;