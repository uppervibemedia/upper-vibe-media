import React, { useRef, useEffect, useState, useCallback, useImperativeHandle, forwardRef } from "react";

/**
 * StageVideoEmbed — YouTube iframe positioned to overlay the 3D stage screen.
 * Single YouTube player handles both video + audio. autoplay muted (browser req),
 * then unmute via user-gesture-triggered postMessage once iframe is loaded.
 */
const StageVideoEmbed = forwardRef(function StageVideoEmbed({ open, video, screenPosRef }, ref) {
  const iframeRef = useRef(null);
  const [error, setError] = useState(false);
  const [ready, setReady] = useState(false);
  const [pos, setPos] = useState({ x: -9999, y: -9999, w: 0, h: 0 });
  const [showUnmuteHint, setShowUnmuteHint] = useState(false);
  const animRef = useRef(null);
  const lastVideoIdRef = useRef(null);
  const mutedRef = useRef(true);
  const pendingUnmuteRef = useRef(false);

  const ytId = video?.youtube_video_id || "";

  // ── Expose mute / unmute / play / pause for parent ───────────
  useImperativeHandle(ref, () => ({
    mute() {
      mutedRef.current = true;
      pendingUnmuteRef.current = false;
      setShowUnmuteHint(false);
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: "command", func: "mute", args: [] }), "*"
        );
      }
    },
    unmute() {
      mutedRef.current = false;
      if (iframeRef.current?.contentWindow && ready) {
        // Iframe is loaded — send unmute immediately
        pendingUnmuteRef.current = false;
        setShowUnmuteHint(false);
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: "command", func: "unMute", args: [] }), "*"
        );
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: "command", func: "setVolume", args: [80] }), "*"
        );
      } else {
        // Iframe not ready yet — queue for handleIframeLoad
        pendingUnmuteRef.current = true;
      }
    },
    play() {
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: "command", func: "playVideo", args: [] }), "*"
        );
      }
    },
    pause() {
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: "command", func: "pauseVideo", args: [] }), "*"
        );
      }
    },
    isMuted() { return mutedRef.current; },
  }));

  // Poll screen position from ref each frame
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

  // When opening, queue unmute (the Watch on Stage click is the user gesture)
  useEffect(() => {
    if (open) {
      setError(false);
      setReady(false);
      setShowUnmuteHint(false);
      mutedRef.current = true;
      pendingUnmuteRef.current = true; // Will be consumed by handleIframeLoad
    } else {
      pendingUnmuteRef.current = false;
      setShowUnmuteHint(false);
    }
  }, [open]);

  // Rebuild iframe when video changes while open
  useEffect(() => {
    if (!open || !ytId) return;
    if (ytId === lastVideoIdRef.current) return;
    lastVideoIdRef.current = ytId;
    setError(false);
    setReady(false);
    mutedRef.current = true;
    pendingUnmuteRef.current = true;
  }, [open, ytId]);

  const embedUrl = ytId
    ? `https://www.youtube.com/embed/${ytId}?autoplay=1&mute=1&playsinline=1&enablejsapi=1&rel=0&controls=0&modestbranding=1&origin=${encodeURIComponent(window.location.origin)}`
    : "";

  const handleIframeLoad = useCallback(() => {
    setReady(true);
    const win = iframeRef.current?.contentWindow;
    if (!win) return;

    // Start playback (muted — required by browser autoplay policy)
    win.postMessage(JSON.stringify({ event: "command", func: "playVideo", args: [] }), "*");

    // Apply pending unmute
    if (pendingUnmuteRef.current) {
      pendingUnmuteRef.current = false;
      // Small delay to let the player fully initialize
      setTimeout(() => {
        const w = iframeRef.current?.contentWindow;
        if (w) {
          w.postMessage(JSON.stringify({ event: "command", func: "unMute", args: [] }), "*");
          w.postMessage(JSON.stringify({ event: "command", func: "setVolume", args: [80] }), "*");
        }
        mutedRef.current = false;
        // Show hint if audio still blocked by browser
        setShowUnmuteHint(true);
        setTimeout(() => setShowUnmuteHint(false), 4000);
      }, 600);
    }
  }, []);

  if (!open || !ytId || pos.w <= 0) return null;

  return (
    <div
      className="fixed z-[70] pointer-events-none overflow-hidden"
      style={{
        left: pos.x,
        top: pos.y,
        width: pos.w,
        height: pos.h,
      }}
    >
      {/* Neon frame glow */}
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
        <div
          className="w-full h-full flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #0a0a1e, #12122e)" }}
        >
          <p className="text-white/15 text-xs font-heading">Upper Vibe Media</p>
        </div>
      )}

      {/* Tap to unmute hint */}
      {showUnmuteHint && ready && (
        <div
          className="absolute bottom-2 left-1/2 -translate-x-1/2 pointer-events-none z-[71]"
          style={{
            background: "rgba(0,0,0,0.7)",
            color: "#fff",
            fontSize: 10,
            fontWeight: 700,
            padding: "4px 10px",
            borderRadius: 8,
            letterSpacing: "0.05em",
          }}
        >
          Tap Unmute Below
        </div>
      )}
    </div>
  );
});

export default StageVideoEmbed;