import React, { useState, useEffect, useRef, useCallback } from "react";
import { usePlayer } from "../../context/PlayerContext";

/**
 * MobileMediaControls — PiP + AirPlay overlay for mobile/iPhone
 *
 * CRITICAL RULES (iPhone Safari):
 * ─────────────────────────────────
 * 1. ALL hooks must run unconditionally — no early returns before hooks.
 * 2. PiP requires a <video> element with srcObject = canvas.captureStream().
 *    canvas.captureStream() is NOT supported on iOS Safari → PiP is desktop/Android only.
 * 3. AirPlay on iPhone requires webkitShowPlaybackTargetPicker() on a <video> element
 *    that has audio (not muted). Route the audio element's stream through a MediaStream
 *    OR simply call the method on the audio element directly — Safari 15+ supports both.
 * 4. We ALWAYS render both icons on touch devices. Disabled state (dimmed) if unsupported.
 * 5. The <video> for AirPlay must NOT be muted — AirPlay needs to see audio.
 * 6. Add webkit-airplay="allow" attribute to the audio element at the PlayerContext level.
 */

const PIP_W = 640;
const PIP_H = 360;

// SVG Icons — correct universal symbols
const PiPIcon = ({ active }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Outer screen */}
    <rect x="1" y="4" width="22" height="16" rx="2" stroke="white" strokeWidth="2" fill="none" />
    {/* Inner floating window — bottom right */}
    <rect x="12" y="12" width="9" height="6" rx="1.5"
      fill={active ? "#00C9E0" : "white"}
      stroke={active ? "#00C9E0" : "white"}
      strokeWidth="0"
      opacity={active ? 1 : 0.9}
    />
  </svg>
);

const AirPlayIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Screen/monitor */}
    <path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h18a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-2"
      stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    {/* Triangle/stand pointing up at screen from bottom */}
    <polygon points="12 15 17 21 7 21"
      fill="white" stroke="none" opacity="0.9" />
  </svg>
);

// Draw cover art or visualizer onto the PiP canvas
function drawPiPFrame(ctx, coverImg, track) {
  const W = PIP_W, H = PIP_H;

  // Prefer live visualizer canvas
  const vizCanvas = window._uvPiPCanvas;
  if (vizCanvas) {
    try {
      ctx.drawImage(vizCanvas, 0, 0, W, H);
    } catch {
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, W, H);
    }
  } else if (coverImg?.complete && coverImg.naturalWidth > 0) {
    // Black background + centered cover art
    ctx.fillStyle = "#06060e";
    ctx.fillRect(0, 0, W, H);
    const size = Math.min(W, H) * 0.68;
    const x = (W - size) / 2;
    const y = (H - size) / 2 - H * 0.03;
    ctx.shadowColor = "rgba(0,0,0,0.7)";
    ctx.shadowBlur = 28;
    ctx.drawImage(coverImg, x, y, size, size);
    ctx.shadowBlur = 0;
  } else {
    ctx.fillStyle = "#06060e";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(0,200,220,0.18)";
    ctx.font = `${H * 0.32}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("♪", W / 2, H / 2);
    ctx.textBaseline = "alphabetic";
  }

  // Bottom text bar
  if (track) {
    const barH = H * 0.24;
    const barY = H - barH;
    const grd = ctx.createLinearGradient(0, barY, 0, H);
    grd.addColorStop(0, "rgba(0,0,0,0)");
    grd.addColorStop(0.35, "rgba(0,0,0,0.75)");
    grd.addColorStop(1, "rgba(0,0,0,0.9)");
    ctx.fillStyle = grd;
    ctx.fillRect(0, barY, W, barH);

    const pad = W * 0.04;
    const maxW = W - pad * 2;

    ctx.fillStyle = "rgba(255,255,255,0.93)";
    ctx.font = `bold ${Math.round(H * 0.074)}px sans-serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    let title = track.title || "Upper Vibe Media";
    while (ctx.measureText(title).width > maxW && title.length > 4) title = title.slice(0, -2) + "…";
    ctx.fillText(title, pad, H - barH * 0.42);

    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.font = `${Math.round(H * 0.056)}px sans-serif`;
    let artist = track.artist_display || track.artist || "Upper Vibe Media";
    while (ctx.measureText(artist).width > maxW && artist.length > 4) artist = artist.slice(0, -2) + "…";
    ctx.fillText(artist, pad, H - barH * 0.13);
  }

  // Branding watermark
  ctx.fillStyle = "rgba(255,255,255,0.16)";
  ctx.font = `600 ${Math.round(H * 0.04)}px sans-serif`;
  ctx.textAlign = "right";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("UPPER VIBE MEDIA", W * 0.97, H * 0.96);
  ctx.textAlign = "left";
}

// ─────────────────────────────────────────────────────────────────────────────
export default function MobileMediaControls({ coverUrl, className = "" }) {
  const { currentTrack, audioRef } = usePlayer();

  // ALL state/refs declared before any conditional return
  const [isMobile, setIsMobile]         = useState(false);
  const [isIOS, setIsIOS]               = useState(false);
  const [supportsPiP, setSupportsPiP]   = useState(false);
  const [supportsAP, setSupportsAP]     = useState(false);  // AirPlay
  const [visible, setVisible]           = useState(false);
  const [pipActive, setPipActive]       = useState(false);
  const [toast, setToast]               = useState("");

  const hideTimerRef  = useRef(null);
  const toastTimerRef = useRef(null);
  const canvasRef     = useRef(null);
  const pipVideoRef   = useRef(null);   // dedicated video for PiP (canvas stream)
  const rafRef        = useRef(null);
  const coverImgRef   = useRef(null);

  // ── Detect device on mount ──────────────────────────────────────────────────
  useEffect(() => {
    const ua = navigator.userAgent || "";
    const ios = /iPhone|iPad|iPod/i.test(ua);
    const mobile = ios || /Android/i.test(ua) || navigator.maxTouchPoints > 0;
    const pip = "pictureInPictureEnabled" in document && !!document.pictureInPictureEnabled;
    const ap = typeof window.WebKitPlaybackTargetAvailabilityEvent !== "undefined";

    setIsMobile(mobile);
    setIsIOS(ios);
    setSupportsPiP(pip);
    setSupportsAP(ap);

    console.log("[MobileMediaControls] 🔍 Device detect:", {
      isMobile: mobile,
      isIOS: ios,
      supportsPiP: pip,
      supportsAirPlay: ap,
      maxTouchPoints: navigator.maxTouchPoints,
      ua: ua.slice(0, 100),
    });
  }, []);

  // ── Add webkit-airplay="allow" to the audio element (iPhone requirement) ───
  useEffect(() => {
    const audio = audioRef?.current;
    if (!audio) return;
    // This attribute tells Safari the audio element can be routed via AirPlay
    audio.setAttribute("x-webkit-airplay", "allow");
    audio.setAttribute("webkit-airplay", "allow");
    console.log("[MobileMediaControls] ✅ webkit-airplay attributes set on audio element");
  }, [audioRef]);

  // ── Debug: log visibility + pip state changes ───────────────────────────────
  useEffect(() => {
    console.log("[MobileMediaControls] 🎛 State update:", {
      isMobile,
      isIOS,
      supportsPiP,
      supportsAirPlay: supportsAP,
      controlsVisible: visible,
      pipActive,
      currentPlayerMode: currentTrack ? "playing" : "idle",
      trackTitle: currentTrack?.title || "none",
    });
  }, [isMobile, isIOS, supportsPiP, supportsAP, visible, pipActive, currentTrack]);

  // ── Cover image preload ─────────────────────────────────────────────────────
  const imgSrc = coverUrl || currentTrack?.cover_url;
  useEffect(() => {
    if (!imgSrc) { coverImgRef.current = null; return; }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imgSrc;
    img.onload = () => { coverImgRef.current = img; };
  }, [imgSrc]);

  // ── Show / auto-hide ────────────────────────────────────────────────────────
  const showControls = useCallback(() => {
    setVisible(true);
    clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setVisible(false), 3000);
  }, []);

  // ── Cleanup timers ──────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      clearTimeout(hideTimerRef.current);
      clearTimeout(toastTimerRef.current);
    };
  }, []);

  // ── PiP RAF draw loop ───────────────────────────────────────────────────────
  const stopLoop = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const startLoop = useCallback(() => {
    stopLoop();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const loop = () => {
      drawPiPFrame(ctx, coverImgRef.current, currentTrack);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  }, [currentTrack, stopLoop]);

  useEffect(() => { if (pipActive) startLoop(); }, [currentTrack, pipActive, startLoop]);
  useEffect(() => { if (!pipActive) stopLoop(); }, [pipActive, stopLoop]);

  useEffect(() => {
    const onLeave = () => {
      setPipActive(false);
      console.log("[MobileMediaControls] 📴 PiP exited");
    };
    document.addEventListener("leavepictureinpicture", onLeave);
    return () => document.removeEventListener("leavepictureinpicture", onLeave);
  }, []);

  // Cleanup PiP video on unmount
  useEffect(() => {
    return () => {
      stopLoop();
      if (document.pictureInPictureElement) {
        document.exitPictureInPicture().catch(() => {});
      }
      if (pipVideoRef.current) {
        pipVideoRef.current.remove();
        pipVideoRef.current = null;
      }
    };
  }, [stopLoop]);

  // ── Toast helper ────────────────────────────────────────────────────────────
  const showToast = useCallback((msg) => {
    setToast(msg);
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(""), 2800);
  }, []);

  // ─── NOW it's safe to conditionally render ──────────────────────────────────
  if (!isMobile || !currentTrack) return null;

  // ── AirPlay handler ─────────────────────────────────────────────────────────
  const handleAirPlay = (e) => {
    e.stopPropagation();
    showControls();

    console.log("[MobileMediaControls] 📺 AirPlay tapped", {
      supportsAP,
      hasAudio: !!audioRef?.current,
      audioHasMethod: !!audioRef?.current?.webkitShowPlaybackTargetPicker,
    });

    // On iPhone Safari, webkitShowPlaybackTargetPicker must be called on an
    // HTMLMediaElement (audio or video). Call it on the audio element directly.
    const audio = audioRef?.current;
    if (audio?.webkitShowPlaybackTargetPicker) {
      audio.webkitShowPlaybackTargetPicker();
      console.log("[MobileMediaControls] ✅ AirPlay picker opened via audio element");
      return;
    }

    console.log("[MobileMediaControls] ⚠️ webkitShowPlaybackTargetPicker not available");
    showToast("AirPlay not available on this device/browser");
  };

  // ── PiP handler ─────────────────────────────────────────────────────────────
  const handlePiP = async (e) => {
    e.stopPropagation();
    showControls();

    console.log("[MobileMediaControls] 📱 PiP tapped", {
      supportsPiP,
      isIOS,
      hasPipVideo: !!pipVideoRef.current,
      pipInDocument: !!document.pictureInPictureElement,
    });

    if (!supportsPiP) {
      // iOS Safari does not support canvas captureStream PiP
      showToast(isIOS
        ? "PiP not supported in iPhone Safari — use native iOS PiP from Safari controls"
        : "Picture-in-Picture not supported on this device"
      );
      console.log("[MobileMediaControls] ⚠️ PiP not supported (likely iOS Safari)");
      return;
    }

    // Exit if already in PiP
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture().catch(() => {});
      setPipActive(false);
      console.log("[MobileMediaControls] ✅ PiP exited");
      return;
    }

    // Set up canvas
    const canvas = canvasRef.current;
    if (!canvas) { showToast("PiP setup failed"); return; }
    canvas.width  = PIP_W;
    canvas.height = PIP_H;

    // Draw first frame immediately before requesting PiP
    const ctx = canvas.getContext("2d");
    drawPiPFrame(ctx, coverImgRef.current, currentTrack);

    // Create or reuse the hidden PiP video element
    let video = pipVideoRef.current;
    if (!video) {
      video = document.createElement("video");
      video.muted      = true;
      video.playsInline = true;
      video.setAttribute("playsinline", "");
      video.setAttribute("webkit-playsinline", "");
      // Must be in DOM for requestPictureInPicture to work
      video.style.cssText =
        "position:fixed;top:-9999px;left:-9999px;width:2px;height:2px;" +
        "opacity:0.001;pointer-events:none;z-index:-1;";
      document.body.appendChild(video);
      pipVideoRef.current = video;
      console.log("[MobileMediaControls] ✅ PiP video element appended to body");
    }

    try {
      // canvas.captureStream() only available on desktop Chrome/Firefox/Edge
      if (!canvas.captureStream) {
        throw new Error("captureStream not available (iOS Safari)");
      }
      const stream = canvas.captureStream(30);
      video.srcObject = stream;
      await video.play();
      startLoop();

      await video.requestPictureInPicture();
      setPipActive(true);
      console.log("[MobileMediaControls] ✅ PiP window opened successfully");

      video.addEventListener("leavepictureinpicture", () => {
        setPipActive(false);
        stopLoop();
      }, { once: true });

    } catch (err) {
      console.warn("[MobileMediaControls] ⚠️ PiP failed:", err.name, "-", err.message);
      stopLoop();
      showToast(
        err.message.includes("captureStream")
          ? "PiP not supported in this browser"
          : `PiP error: ${err.message}`
      );
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Hidden canvas — source for PiP video stream */}
      <canvas
        ref={canvasRef}
        width={PIP_W}
        height={PIP_H}
        style={{ position: "absolute", top: -9999, left: -9999, width: 1, height: 1, opacity: 0, pointerEvents: "none" }}
      />

      {/* Full-area touch listener */}
      <div
        className={`absolute inset-0 z-20 ${className}`}
        onTouchStart={showControls}
        onClick={showControls}
        style={{ touchAction: "manipulation" }}
      >
        {/* Top bar — fades in on tap */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 12px 32px 12px",
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0px)" : "translateY(-8px)",
            transition: "opacity 0.22s ease, transform 0.22s ease",
            pointerEvents: visible ? "auto" : "none",
            background: "linear-gradient(180deg, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0) 100%)",
          }}
        >
          {/* ── PiP button ── */}
          <button
            onTouchStart={(e) => e.stopPropagation()}
            onClick={handlePiP}
            title={pipActive ? "Exit Picture-in-Picture" : "Picture-in-Picture"}
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: pipActive ? "rgba(0,201,224,0.3)" : "rgba(0,0,0,0.58)",
              border: `1.5px solid ${pipActive ? "rgba(0,201,224,0.8)" : "rgba(255,255,255,0.28)"}`,
              opacity: supportsPiP ? 1 : 0.42,
              cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
              flexShrink: 0,
            }}
          >
            <PiPIcon active={pipActive} />
          </button>

          {/* ── AirPlay button ── */}
          <button
            onTouchStart={(e) => e.stopPropagation()}
            onClick={handleAirPlay}
            title="AirPlay to TV / Speaker"
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(0,0,0,0.58)",
              border: "1.5px solid rgba(255,255,255,0.28)",
              opacity: supportsAP ? 1 : 0.42,
              cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
              flexShrink: 0,
            }}
          >
            <AirPlayIcon />
          </button>

          {/* Label for clarity on first use */}
          <span style={{
            fontSize: 10,
            color: "rgba(255,255,255,0.45)",
            letterSpacing: "0.06em",
            userSelect: "none",
            pointerEvents: "none",
          }}>
            PiP &nbsp;·&nbsp; AirPlay
          </span>
        </div>

        {/* Toast feedback */}
        {toast !== "" && (
          <div
            style={{
              position: "absolute",
              top: 60,
              left: 12,
              right: 12,
              display: "flex",
              justifyContent: "center",
              pointerEvents: "none",
              zIndex: 30,
            }}
          >
            <div style={{
              padding: "7px 14px",
              borderRadius: 12,
              fontSize: 12,
              color: "rgba(255,255,255,0.82)",
              background: "rgba(0,0,0,0.78)",
              border: "1px solid rgba(255,255,255,0.14)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              textAlign: "center",
              maxWidth: 280,
            }}>
              {toast}
            </div>
          </div>
        )}
      </div>
    </>
  );
}